import { createSeededRandom, PokerGame } from '@cpc/poker-engine'
import type { Player } from '@cpc/shared'
import type { BotIdentity, RebuyPolicy } from '../bot-identities'
import { createBotStateFromIdentity } from '../bot-state'
import { getBotArchetype } from '../bot-archetypes'
import { habitIdsToActiveHabits } from '../bot-habits'
import type { ActiveHabit } from '../bot-habits'
import { loadPersistentRoster } from '../bot-roster-store'
import type { BotState } from '../bot-tag'

export type RebuyRequestStatus = 'applied' | 'queued' | 'not-needed' | 'unavailable'

export interface CashOutPolicy {
  softThresholdBb: number
  hardThresholdBb: number
  minimumHands: number
  chancePerHand: number
}

export function getCashOutPolicy(identity: BotIdentity): CashOutPolicy {
  const base = identity.maniac
    ? { soft: 480, hard: 800, hands: 40, chance: 0.025 }
    : identity.archetypeId === 'nit'
      ? { soft: 240, hard: 500, hands: 20, chance: 0.12 }
      : identity.archetypeId === 'tag'
        ? { soft: 300, hard: 600, hands: 25, chance: 0.09 }
        : identity.archetypeId === 'calling-station'
          ? { soft: 360, hard: 700, hands: 30, chance: 0.06 }
          : { soft: 420, hard: 800, hands: 35, chance: 0.04 }
  const riskAdjustment = Math.round((identity.traits.riskTolerance - 50) * 1.5)
  const softThresholdBb = Math.max(200, Math.min(650, base.soft + riskAdjustment))
  const hardThresholdBb = Math.max(
    softThresholdBb + 100,
    Math.min(800, base.hard + Math.round(riskAdjustment / 2)),
  )

  return {
    softThresholdBb,
    hardThresholdBb: Math.min(800, hardThresholdBb),
    minimumHands: base.hands,
    chancePerHand: base.chance,
  }
}

export class BotRebuyManager {
  pendingRebuyPlayerIds = new Set<string>()
  rebuysUsed = new Map<string, number>()
  leftTableBots = new Set<string>()
  replacementQueue: { botId: string; availableAfterHand: number }[] = []
  joinedAtHandByBot = new Map<string, number>()

  private _rebuyEnabled = true
  private _startingChips = 0

  private game: PokerGame | null
  private players: Player[]
  private botIds: Set<string>
  private botIdentities: Map<string, BotIdentity>
  private botStates: Map<string, BotState>
  private botHabits: Map<string, ActiveHabit[]>
  private observedEventCountByBot: Map<string, number>
  private observedVpipPlayersByBot: Map<string, Set<string>>
  private playerNames: Map<string, string>
  private onChanged: (() => void) | null
  private random: () => number

  constructor(
    game: PokerGame | null,
    players: Player[],
    botIds: Set<string>,
    botIdentities: Map<string, BotIdentity>,
    botStates: Map<string, BotState>,
    botHabits: Map<string, ActiveHabit[]>,
    observedEventCountByBot: Map<string, number>,
    observedVpipPlayersByBot: Map<string, Set<string>>,
    playerNames: Map<string, string>,
    startingChips: number,
    rebuyEnabled: boolean,
    onChanged?: () => void,
    random: () => number = Math.random,
  ) {
    this.game = game
    this.players = players
    this.botIds = botIds
    this.botIdentities = botIdentities
    this.botStates = botStates
    this.botHabits = botHabits
    this.observedEventCountByBot = observedEventCountByBot
    this.observedVpipPlayersByBot = observedVpipPlayersByBot
    this.playerNames = playerNames
    this._startingChips = startingChips
    this._rebuyEnabled = rebuyEnabled
    this.onChanged = onChanged ?? null
    this.random = random
  }

  get rebuyEnabled(): boolean {
    return this._rebuyEnabled
  }

  get startingChips(): number {
    return this._startingChips
  }

  setGame(game: PokerGame | null): void {
    this.game = game
  }

  setRebuyEnabled(enabled: boolean): void {
    this._rebuyEnabled = enabled
  }

  setStartingChips(chips: number): void {
    this._startingChips = chips
  }

  requestRebuy(playerId: string): RebuyRequestStatus {
    if (!this.game || this._startingChips <= 0) return 'unavailable'
    const player = this.game.getPublicState().players.find(candidate => candidate.id === playerId)
    if (!player) return 'unavailable'
    if (player.chips >= this._startingChips) return 'not-needed'

    this.pendingRebuyPlayerIds.add(playerId)
    if (this.game.getPublicState().phase === 'waiting') {
      this.applyPendingRebuys()
      this.onChanged?.()
      return 'applied'
    }

    this.onChanged?.()
    return 'queued'
  }

  applyPendingRebuys(): void {
    if (!this.game || this.game.getPublicState().phase !== 'waiting') return

    for (const playerId of this.pendingRebuyPlayerIds) {
      const player = this.players.find(candidate => candidate.id === playerId)
      if (player && player.chips < this._startingChips) {
        player.chips = this._startingChips
        player.isSittingOut = false
        this.game.setPlayerChips(playerId, this._startingChips)
        this.game.setPlayerSittingOut(playerId, false)
      }
    }
    this.pendingRebuyPlayerIds.clear()
  }

  processAutoRebuys(): void {
    if (!this._rebuyEnabled) return

    for (const botId of this.botIds) {
      if (this.leftTableBots.has(botId)) continue
      const identity = this.botIdentities.get(botId)
      if (!identity) continue
      const policy = identity.rebuyPolicy
      if (!policy) continue // should not happen after v0.7 migration

      const player = this.players.find(p => p.id === botId)
      if (!player) continue

      const bb = this.game?.getPublicState().bigBlind ?? 20

      if (player.chips <= 0) {
        if (policy.leaveOnBust) {
          this.leftTableBots.add(botId)
          this.game?.setPlayerSittingOut(botId, true)
          continue
        }

        const used = this.rebuysUsed.get(botId) ?? 0
        if (policy.maxRebuys > 0 && used < policy.maxRebuys) {
          const rebuyAmount = policy.rebuyThresholdBb != null
            ? policy.rebuyThresholdBb * bb
            : this._startingChips
          player.chips = rebuyAmount
          this.game?.setPlayerChips(botId, rebuyAmount)
          this.rebuysUsed.set(botId, used + 1)
        } else {
          this.leftTableBots.add(botId)
          this.game?.setPlayerSittingOut(botId, true)
        }
      } else if (policy.rebuyWhenShortBb != null) {
        const playerBb = bb > 0 ? player.chips / bb : 0
        if (playerBb < policy.rebuyWhenShortBb) {
          const used = this.rebuysUsed.get(botId) ?? 0
          if (used < policy.maxRebuys) {
            const rebuyAmount = policy.rebuyThresholdBb != null
              ? policy.rebuyThresholdBb * bb
              : this._startingChips
            player.chips = rebuyAmount
            this.game?.setPlayerChips(botId, rebuyAmount)
            this.rebuysUsed.set(botId, used + 1)
          }
        }
      }
    }
  }

  processCashOuts(currentHandNumber: number): string | null {
    if (!this.game || this.game.getPublicState().phase !== 'waiting') return null

    const bb = this.game.getPublicState().bigBlind
    if (bb <= 0) return null

    for (const botId of this.botIds) {
      if (this.leftTableBots.has(botId)) continue
      const identity = this.botIdentities.get(botId)
      const player = this.players.find(candidate => candidate.id === botId)
      if (!identity || !player || player.chips <= 0 || player.isSittingOut) continue

      const policy = getCashOutPolicy(identity)
      const stackBb = player.chips / bb
      if (stackBb < policy.softThresholdBb) continue

      const joinedAt = this.joinedAtHandByBot.get(botId) ?? 0
      const handsAtTable = currentHandNumber - joinedAt
      const hardCashOut = stackBb >= policy.hardThresholdBb
      if (!hardCashOut && handsAtTable < policy.minimumHands) continue

      const thresholdProgress = Math.max(0, Math.min(1, (
        stackBb - policy.softThresholdBb
      ) / Math.max(1, policy.hardThresholdBb - policy.softThresholdBb)))
      const cashOutChance = policy.chancePerHand + thresholdProgress * 0.25
      if (!hardCashOut && this.random() >= cashOutChance) continue

      this.leftTableBots.add(botId)
      player.chips = 0
      player.isSittingOut = true
      this.game.setPlayerChips(botId, 0)
      this.game.setPlayerSittingOut(botId, true)
      return botId
    }

    return null
  }

  processReplacements(currentHandNumber: number): void {
    for (const botId of this.leftTableBots) {
      if (this.replacementQueue.some(r => r.botId === botId)) continue
      const player = this.players.find(p => p.id === botId)
      if (player && player.chips <= 0) {
        const delay = 2 + Math.floor(this.random() * 5)
        this.replacementQueue.push({
          botId,
          availableAfterHand: currentHandNumber + delay,
        })
      }
    }

    if (this.replacementQueue.length === 0) return

    const gs = this.game?.getPublicState()
    if (!gs) return

    const eligible = gs.players.filter(p => p.chips > 0 && !p.isSittingOut).length
    const urgent = eligible < 2

    for (let i = this.replacementQueue.length - 1; i >= 0; i--) {
      const entry = this.replacementQueue[i]
      const player = this.players.find(p => p.id === entry.botId)
      if (player && player.chips > 0) {
        this.replacementQueue.splice(i, 1)
        this.leftTableBots.delete(entry.botId)
        continue
      }
      if (urgent || currentHandNumber >= entry.availableAfterHand) {
        this.spawnReplacement(entry.botId, currentHandNumber)
        this.replacementQueue.splice(i, 1)
      }
    }
  }

  private spawnReplacement(botId: string, currentHandNumber: number): void {
    const oldIdentity = this.botIdentities.get(botId)
    if (!oldIdentity) return

    const { roster } = loadPersistentRoster()
    const usedIds = new Set([...this.botIdentities.values()].map((id: BotIdentity) => id.id))
    const candidates = roster.identities.filter(id => !usedIds.has(id.id))
    const freshIdentity = candidates[Math.floor(this.random() * candidates.length)]
    if (!freshIdentity) return

    const archetype = getBotArchetype(freshIdentity.archetypeId)
    const sessionRandom = createSeededRandom(`replacement:${freshIdentity.id}`)
    const botState = createBotStateFromIdentity(freshIdentity, archetype, sessionRandom)
    const habits = habitIdsToActiveHabits(freshIdentity.identitySeed, freshIdentity.habitIds)

    this.botStates.set(botId, botState)
    this.botIdentities.set(botId, freshIdentity)
    this.botHabits.set(botId, habits)
    this.observedEventCountByBot.set(botId, 0)
    this.observedVpipPlayersByBot.set(botId, new Set())
    this.rebuysUsed.set(botId, 0)
    this.joinedAtHandByBot.set(botId, currentHandNumber)
    this.leftTableBots.delete(botId)
    this.playerNames.set(botId, freshIdentity.name)

    const player = this.players.find(p => p.id === botId)
    if (player) {
      player.name = freshIdentity.name
      player.chips = this._startingChips
      player.isSittingOut = false
      this.game?.upsertPlayer(player)
    }
  }

  reset(): void {
    this.pendingRebuyPlayerIds.clear()
    this.rebuysUsed.clear()
    this.leftTableBots.clear()
    this.replacementQueue = []
    this.joinedAtHandByBot.clear()
    this._rebuyEnabled = true
    this._startingChips = 0
  }
}
