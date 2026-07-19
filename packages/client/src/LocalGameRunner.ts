import { createSeededRandom, PokerGame, type HandEvent, type RandomSource } from '@cpc/poker-engine'
import type {
  Player,
  PlayerAction,
  PublicGameState,
  Card,
  DecisionSnapshot,
  TableOptions,
  HandResult,
} from '@cpc/shared'
import {
  createBotState,
  decideTagDecision,
  getOpponentStats,
  recordHandResult,
  resetHandMemory,
  TAG_PERSONALITY,
  updateMentalState,
  updateOpponentRead,
} from './bot-tag'
import type { BotState, MentalEvent } from './bot-tag'
import { getPlayerActionLabel, type PlayerActionLabel } from './action-display'
import { createBotContext } from './bot-context'
import { planBotDecisionTiming, sampleTargetReactionMs } from './bot-timing'
import { assessDecisionComplexity } from './bot-decision-complexity'
import type { DecisionComplexity } from './bot-decision-complexity'
import type { BotContext } from './bot-context'
import type { TagDecision } from './bot-tag'
import type { BotDebugDecision } from './bot-debug'

export type Listener = () => void

export const SHOWDOWN_DISPLAY_MS = 6000
const UNCONTESTED_RESULT_DISPLAY_MS = 3000

export interface SessionHistoryEvent {
  handNumber: number
  event: HandEvent
}

export interface SessionDecisionSnapshot {
  handNumber: number
  snapshot: DecisionSnapshot
}

export interface LocalGameState {
  gameState: PublicGameState | null
  myCards: [Card, Card] | null
  lastResults: HandResult[] | null
  isMyTurn: boolean
  playerActionLabels: Readonly<Record<string, PlayerActionLabel>>
  showdownCards: Readonly<Record<string, [Card, Card]>>
  sessionHistory: readonly SessionHistoryEvent[]
}

export class LocalGameRunner {
  private game: PokerGame | null = null
  private players: Player[] = []
  private heroId: string = 'hero'
  private botIds: Set<string> = new Set()
  private botStates: Map<string, BotState> = new Map()
  private observedEventCountByBot = new Map<string, number>()
  private observedVpipPlayersByBot = new Map<string, Set<string>>()
  private listeners: Set<Listener> = new Set()
  private botTimer: ReturnType<typeof setTimeout> | null = null
  private autoStartTimer: ReturnType<typeof setTimeout> | null = null
  private _lastResults: HandResult[] | null = null
  private playerActionLabels: Record<string, PlayerActionLabel> = {}
  private showdownCards: Record<string, [Card, Card]> = {}
  private sessionHistory: SessionHistoryEvent[] = []
  private sessionDecisionSnapshots: SessionDecisionSnapshot[] = []
  private botDebugDecisions: BotDebugDecision[] = []
  private nextBotDebugSequence = 1
  private currentHandNumber = 0
  private capturedHandEventCount = 0
  private capturedDecisionSnapshotCount = 0
  private botRandom: RandomSource = Math.random
  private timingRandom: RandomSource = Math.random

  get state(): LocalGameState {
    if (!this.game) {
      return {
        gameState: null,
        myCards: null,
        lastResults: this._lastResults,
        isMyTurn: false,
        playerActionLabels: {},
        showdownCards: {},
        sessionHistory: [...this.sessionHistory],
      }
    }
    const playerView = this.game.getPlayerView(this.heroId)
    const gs = playerView.state
    return {
      gameState: gs,
      myCards: playerView.ownCards,
      lastResults: this._lastResults,
      isMyTurn: gs.currentPlayerId === this.heroId,
      playerActionLabels: { ...this.playerActionLabels },
      showdownCards: { ...this.showdownCards },
      sessionHistory: [...this.sessionHistory],
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Private debug/analysis data; deliberately excluded from public UI state. */
  getPrivateDecisionSnapshots(): readonly SessionDecisionSnapshot[] {
    return [...this.sessionDecisionSnapshots]
  }

  /** Private local-only bot analysis; never included in public game state. */
  getBotDebugDecisions(): readonly BotDebugDecision[] {
    return [...this.botDebugDecisions]
  }

  private notify(): void {
    for (const l of this.listeners) l()
  }

  setupTable(options: TableOptions, botCount: number): Player[] {
    this.cleanup()

    if (!Number.isFinite(options.smallBlind) || options.smallBlind <= 0) throw new Error('Small blind must be positive')
    if (!Number.isFinite(options.bigBlind) || options.bigBlind <= 0) throw new Error('Big blind must be positive')
    if (options.smallBlind > options.bigBlind) throw new Error('Small blind cannot exceed big blind')
    if (!Number.isFinite(options.startingChips) || options.startingChips < options.bigBlind) {
      throw new Error('Starting chips must cover at least one big blind')
    }
    if (!Number.isInteger(options.maxPlayers) || options.maxPlayers < 2 || options.maxPlayers > 9) {
      throw new Error('Max players must be an integer from 2 to 9')
    }
    const effectiveBotCount = Math.min(
      Math.max(1, Math.floor(botCount)),
      options.maxPlayers - 1,
    )
    const seedNamespace = options.seed === undefined
      ? null
      : `${typeof options.seed}:${String(options.seed)}`
    this.botRandom = seedNamespace === null
      ? Math.random
      : createSeededRandom(`${seedNamespace}:bots`)
    this.timingRandom = seedNamespace === null
      ? Math.random
      : createSeededRandom(`${seedNamespace}:timing`)

    const hero: Player = {
      id: this.heroId,
      name: 'You',
      role: 'admin',
      chips: options.startingChips,
      seatIndex: 0,
      isConnected: true,
      isSittingOut: false,
      status: 'waiting',
      roundBet: 0,
    }

    this.players = [hero]
    this.botIds.clear()
    this.botStates.clear()
    this.observedEventCountByBot.clear()
    this.observedVpipPlayersByBot.clear()
    this.playerActionLabels = {}
    this.sessionHistory = []
    this.sessionDecisionSnapshots = []
    this.botDebugDecisions = []
    this.nextBotDebugSequence = 1
    this.currentHandNumber = 0
    this.capturedHandEventCount = 0
    this.capturedDecisionSnapshotCount = 0

    for (let i = 0; i < effectiveBotCount; i++) {
      const botId = `bot-${i}`
      this.botIds.add(botId)
      this.botStates.set(botId, createBotState(TAG_PERSONALITY, 50, this.botRandom))
      const bot: Player = {
        id: botId,
        name: `Bot ${i + 1}`,
        role: 'player',
        chips: options.startingChips,
        seatIndex: i + 1,
        isConnected: true,
        isSittingOut: false,
        status: 'waiting',
        roundBet: 0,
      }
      this.players.push(bot)
    }

    this.game = new PokerGame(this.players, {
      bigBlind: options.bigBlind,
      smallBlind: options.smallBlind,
      ...(seedNamespace === null ? {} : { seed: `${seedNamespace}:deck` }),
    })

    this.notify()
    return this.players
  }

  startHand(): void {
    if (!this.game) return
    if (this.game.getPublicState().phase !== 'waiting') return

    const eligible = this.players.filter(p => p.chips > 0 && !p.isSittingOut)
    if (eligible.length < 2) return

    this._lastResults = null
    this.playerActionLabels = {}
    this.showdownCards = {}
    this.observedEventCountByBot.clear()
    this.observedVpipPlayersByBot.clear()

    for (const botState of this.botStates.values()) {
      resetHandMemory(botState.memory)
    }

    for (const p of this.players) {
      if (p.chips > 0 && !p.isSittingOut) {
        this.game.setPlayerChips(p.id, p.chips)
        this.game.setPlayerSittingOut(p.id, false)
      } else {
        this.game.setPlayerSittingOut(p.id, true)
      }
    }

    this.currentHandNumber++
    this.capturedHandEventCount = 0
    this.capturedDecisionSnapshotCount = 0
    this.game.startHand()
    this.captureSessionHistory()
    this.notify()
    this.scheduleBotAction()
  }

  playerAction(action: PlayerAction): void {
    if (!this.game) return
    try {
      this.applyAction(this.heroId, action)
      this.syncChips()
      this.notify()
      this.scheduleBotAction()
      this.checkHandEnd()
    } catch (err) {
      console.error('[LocalGameRunner] action failed:', (err as Error).message)
    }
  }

  private scheduleBotAction(): void {
    if (this.botTimer) clearTimeout(this.botTimer)
    this.botTimer = null

    if (!this.game) return
    const gs = this.game.getPublicState()
    if (gs.phase === 'waiting' || gs.phase === 'showdown') return
    if (!gs.currentPlayerId || !this.botIds.has(gs.currentPlayerId)) return

    const decisionStartedAt = monotonicNow()
    const botView = this.game.getPlayerView(gs.currentPlayerId)
    const currentGs = botView.state
    if (currentGs.currentPlayerId !== gs.currentPlayerId) return

    const botId = gs.currentPlayerId
    const holeCards = botView.ownCards
    const botState = this.botStates.get(botId)
    if (!holeCards || !botState) return

    this.updateOpponentReads(botId, botState)

    let action: PlayerAction
    let botContext: BotContext
    let decision: TagDecision
    let complexity: DecisionComplexity
    try {
      botContext = createBotContext(botId, botView, this.game.getPublicHandHistory())
      decision = decideTagDecision(botContext, botState, this.botRandom)
      action = decision.action
      complexity = assessDecisionComplexity(botContext, decision.decisionResult)
    } catch (err) {
      console.error('[LocalGameRunner] bot decision failed:', (err as Error).message)
      return
    }

    const targetReactionMs = sampleTargetReactionMs(this.timingRandom, complexity)
    const timing = planBotDecisionTiming(targetReactionMs, monotonicNow() - decisionStartedAt)
    this.botDebugDecisions.push({
      sequence: this.nextBotDebugSequence++,
      handNumber: this.currentHandNumber,
      playerId: botId,
      playerName: currentGs.players.find(player => player.id === botId)?.name ?? botId,
      profile: {
        archetype: botState.personality.archetype.name,
        personality: {
          aggression: botState.personality.aggression,
          bluffFrequency: botState.personality.bluffFrequency,
          riskTolerance: botState.personality.riskTolerance,
          patience: botState.personality.patience,
        },
        skill: { ...botState.skill },
        mentalState: {
          tilt: botState.mentalState.tilt,
          confidence: botState.mentalState.confidence,
          patience: botState.mentalState.patience,
          momentum: botState.mentalState.momentum,
        },
        memory: {
          handsPlayed: botState.memory.handsPlayed,
          handsWon: botState.memory.handsWon,
          raisedPreflop: botState.memory.hand.raisedPreflop,
          lastAction: botState.memory.hand.lastAction,
        },
        reads: [...botState.reads.opponents.values()].map(read => ({
          playerId: read.playerId,
          handsSampled: read.handsSampled,
          ...getOpponentStats(read),
        })),
      },
      context: botContext,
      evaluation: decision.evaluation,
      metrics: decision.metrics,
      decision: decision.decisionResult,
      complexity,
      timing,
    })
    if (this.botDebugDecisions.length > 50) this.botDebugDecisions.shift()
    this.notify()
    this.botTimer = setTimeout(() => {
      if (!this.game) return
      if (this.game.getPublicState().currentPlayerId !== botId) return
      try {
        this.applyAction(botId, action)
        this.syncChips()
        this.notify()
        this.scheduleBotAction()
        this.checkHandEnd()
      } catch (err) {
        console.error('[LocalGameRunner] bot action failed:', (err as Error).message)
      }
    }, timing.remainingDelayMs)
  }

  private applyAction(playerId: string, action: PlayerAction): void {
    if (!this.game) return

    const phaseBeforeAction = this.game.getPublicState().phase
    const label = getPlayerActionLabel(action, this.game.getPublicState().currentBet)
    this.game.applyAction(playerId, action)
    this.captureSessionHistory()
    this.captureDecisionSnapshots()
    const phaseAfterAction = this.game.getPublicState().phase

    if (phaseAfterAction !== phaseBeforeAction) {
      this.playerActionLabels = {}
      return
    }

    if (label) this.playerActionLabels[playerId] = label
    else delete this.playerActionLabels[playerId]
  }

  private updateOpponentReads(botId: string, botState: BotState): void {
    const history = this.game?.getPublicHandHistory() ?? []
    const observationSkill = botState.skill.observation

    const startIndex = this.observedEventCountByBot.get(botId) ?? 0
    const newEvents = history.slice(startIndex)
    const observedVpipPlayers = this.observedVpipPlayersByBot.get(botId) ?? new Set<string>()
    this.observedVpipPlayersByBot.set(botId, observedVpipPlayers)

    // Track actions from opponents
    for (const event of newEvents) {
      if (event.type === 'PlayerActed') {
        const actionPlayerId = event.playerId
        if (this.botIds.has(actionPlayerId)) continue

        const action = event.action

        // VPIP tracking
        if ((action.type === 'call' || action.type === 'raise' || action.type === 'all-in') && !observedVpipPlayers.has(actionPlayerId)) {
          updateOpponentRead(botState.reads, actionPlayerId, 'vpip', observationSkill)
          observedVpipPlayers.add(actionPlayerId)
        } else if (action.type === 'fold' && event.phase === 'preflop' && !observedVpipPlayers.has(actionPlayerId)) {
          updateOpponentRead(botState.reads, actionPlayerId, 'no-vpip', observationSkill)
          observedVpipPlayers.add(actionPlayerId)
        }

        // Aggression tracking
        if (action.type === 'raise') {
          updateOpponentRead(botState.reads, actionPlayerId, 'aggression', observationSkill)
        } else if (action.type === 'call' || action.type === 'check') {
          updateOpponentRead(botState.reads, actionPlayerId, 'no-aggression', observationSkill)
        }

        if (action.type === 'fold') {
          updateOpponentRead(botState.reads, actionPlayerId, 'foldToBet', observationSkill)
        } else if (action.type === 'call' || action.type === 'raise') {
          updateOpponentRead(botState.reads, actionPlayerId, 'no-fold', observationSkill)
        }
      }
    }

    this.observedEventCountByBot.set(botId, history.length)
  }

  private checkHandEnd(): void {
    if (!this.game) return
    const gs = this.game.getPublicState()
    if (gs.phase !== 'waiting') return

    const results = this.game.getLastHandResults()
    this._lastResults = results
    this.showdownCards = { ...this.game.getRevealedCards() }
    const bigBlind = this.game?.getPublicState().bigBlind ?? 20

    // Update mental state for all bots based on hand results
    for (const [botId, botState] of this.botStates) {
      const event = this.detectMentalEvent(botId, results, bigBlind, gs)
      recordHandResult(
        botState.memory,
        results.some(result => result.playerId === botId && result.amount > 0),
      )
      if (event) {
        updateMentalState(botState.mentalState, botState.personality, event, bigBlind)
      }
    }

    this.syncChips()
    this.notify()

    if (this.autoStartTimer) clearTimeout(this.autoStartTimer)
    const resultDisplayMs = Object.keys(this.showdownCards).length > 0
      ? SHOWDOWN_DISPLAY_MS
      : UNCONTESTED_RESULT_DISPLAY_MS
    this.autoStartTimer = setTimeout(() => {
      this.startHand()
    }, resultDisplayMs)
  }

  private detectMentalEvent(botId: string, results: HandResult[], bigBlind: number, gameState: any): MentalEvent | null {
    const wonResult = results.find(r => r.playerId === botId && r.amount > 0)
    const potSize = results.reduce((sum, r) => sum + r.amount, 0)
    const potBb = potSize / bigBlind

    // Find the opponent who won (if any)
    const opponentWinner = results.find(r => r.playerId !== botId && r.amount > 0)
    const opponentId = opponentWinner?.playerId

    if (wonResult) {
      // Bot won
      if (potBb < 5) {
        return { type: 'won-small-pot', potBb }
      } else if (potBb > 20) {
        // Check if it was a suckout or successful bluff
        return { type: 'suckout-win', potBb }
      } else {
        return { type: 'won-small-pot', potBb }
      }
    } else {
      // Bot lost
      if (potBb < 5) {
        return { type: 'lost-small-pot', potBb, opponentId }
      } else if (potBb > 20) {
        // Check if it was a bad beat or cooler
        return { type: 'lost-big-pot', potBb, opponentId }
      } else {
        return { type: 'lost-small-pot', potBb, opponentId }
      }
    }
  }

  private syncChips(): void {
    if (!this.game) return
    const gs = this.game.getPublicState()
    for (const p of this.players) {
      const updated = gs.players.find(gp => gp.id === p.id)
      if (updated) p.chips = updated.chips
    }
  }

  private captureSessionHistory(): void {
    if (!this.game || this.currentHandNumber === 0) return
    const handEvents = this.game.getPublicHandHistory()
    for (const event of handEvents.slice(this.capturedHandEventCount)) {
      this.sessionHistory.push({ handNumber: this.currentHandNumber, event })
    }
    this.capturedHandEventCount = handEvents.length
  }

  private captureDecisionSnapshots(): void {
    if (!this.game || this.currentHandNumber === 0) return
    const snapshots = this.game.getPrivateDecisionSnapshots()
    for (const snapshot of snapshots.slice(this.capturedDecisionSnapshotCount)) {
      this.sessionDecisionSnapshots.push({ handNumber: this.currentHandNumber, snapshot })
    }
    this.capturedDecisionSnapshotCount = snapshots.length
  }

  cleanup(): void {
    if (this.botTimer) clearTimeout(this.botTimer)
    if (this.autoStartTimer) clearTimeout(this.autoStartTimer)
    this.botTimer = null
    this.autoStartTimer = null
    this.game = null
    this._lastResults = null
    this.showdownCards = {}
    this.sessionHistory = []
    this.sessionDecisionSnapshots = []
    this.botDebugDecisions = []
    this.nextBotDebugSequence = 1
    this.currentHandNumber = 0
    this.capturedHandEventCount = 0
    this.capturedDecisionSnapshotCount = 0
    this.botStates.clear()
    this.observedEventCountByBot.clear()
    this.observedVpipPlayersByBot.clear()
    this.botRandom = Math.random
    this.timingRandom = Math.random
  }

  setSittingOut(sittingOut: boolean): void {
    if (!this.game) return
    const gs = this.game.getPublicState()
    if (gs.phase !== 'waiting') return
    this.game.setPlayerSittingOut(this.heroId, sittingOut)
    const p = this.players.find(p => p.id === this.heroId)
    if (p) p.isSittingOut = sittingOut
    this.notify()
  }
}

function monotonicNow(): number {
  return globalThis.performance?.now() ?? Date.now()
}
