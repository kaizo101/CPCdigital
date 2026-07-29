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

export class BotRebuyManager {
  pendingRebuyPlayerIds = new Set<string>()
  rebuysUsed = new Map<string, number>()
  leftTableBots = new Set<string>()
  replacementQueue: { botId: string; availableAfterHand: number }[] = []

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
        this.spawnReplacement(entry.botId)
        this.replacementQueue.splice(i, 1)
      }
    }
  }

  private spawnReplacement(botId: string): void {
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
    this.leftTableBots.delete(botId)
    this.playerNames.set(botId, freshIdentity.name)

    const player = this.players.find(p => p.id === botId)
    if (player) {
      player.chips = this._startingChips
      this.game?.setPlayerChips(botId, this._startingChips)
      this.game?.setPlayerSittingOut(botId, false)
    }
  }

  reset(): void {
    this.pendingRebuyPlayerIds.clear()
    this.rebuysUsed.clear()
    this.leftTableBots.clear()
    this.replacementQueue = []
    this._rebuyEnabled = true
    this._startingChips = 0
  }
}
