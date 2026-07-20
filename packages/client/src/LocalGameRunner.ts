import { createSeededRandom, PokerGame, type RandomSource } from '@cpc/poker-engine'
import type {
  Player,
  PlayerAction,
  PublicGameState,
  Card,
  TableOptions,
  HandResult,
} from '@cpc/shared'
import {
  createBotStateFromIdentity,
  decideBotDecision,
  getOpponentStats,
  recordHandResult,
  resetHandMemory,
  updateMentalState,
  updateOpponentRead,
} from './bot-tag'
import type { BotState, MentalEvent } from './bot-tag'
import { getPlayerActionLabel, type PlayerActionLabel } from './action-display'
import { createBotContext } from './bot-context'
import { planBotDecisionTiming, sampleTargetReactionMs } from './bot-timing'
import { assessDecisionComplexity } from './bot-decision-complexity'
import type { DecisionComplexity } from './bot-decision-complexity'
import type { ScoredAction } from './bot-decision-types'
import type { BotContext } from './bot-context'
import type { BotDecision } from './bot-tag'
import type { BotDebugDecision, BotDebugProfile } from './bot-debug'
import { getRunoutRevealStages, getRunoutStageDelay } from './community-runout'
import { getBotArchetype } from './bot-archetypes'
import {
  loadPersistentRoster,
  recordSession,
  selectReturningSessionIdentities,
} from './bot-roster-store'
import type {
  BotIdentity,
} from './bot-identities'
import { habitIdsToActiveHabits } from './bot-habits'
import type { ActiveHabit } from './bot-habits'
import type { BotArchetypeId } from './bot-archetypes'

function identityArchetypeId(botState: BotState): BotArchetypeId {
  const name = botState.personality.archetype.name
  if (name === 'Nit') return 'nit'
  if (name === 'LAG') return 'lag'
  if (name === 'Calling Station') return 'calling-station'
  return 'tag'
}
import type {
  SessionDebugRecord,
  SessionDebugRecordV2,
  SessionDecisionSnapshot,
  SessionHistoryEvent,
} from './session-debug-record'
import {
  SESSION_DEBUG_SCHEMA,
  SESSION_DEBUG_SCHEMA_VERSION,
} from './session-debug-record'
import type { DisplayCurrency } from './utils/format'

export type { SessionDecisionSnapshot, SessionHistoryEvent } from './session-debug-record'

export type Listener = () => void

export const SHOWDOWN_DISPLAY_MS = 6000
const UNCONTESTED_RESULT_DISPLAY_MS = 3000

export interface LocalGameState {
  gameState: PublicGameState | null
  myCards: [Card, Card] | null
  lastResults: HandResult[] | null
  isMyTurn: boolean
  playerAvatarKeys: Readonly<Record<string, string>>
  playerActionLabels: Readonly<Record<string, PlayerActionLabel>>
  showdownCards: Readonly<Record<string, [Card, Card]>>
  sessionHistory: readonly SessionHistoryEvent[]
  pendingRebuyPlayerIds: readonly string[]
}

export type RebuyRequestStatus = 'applied' | 'queued' | 'not-needed' | 'unavailable'

export class LocalGameRunner {
  private game: PokerGame | null = null
  private players: Player[] = []
  private heroId: string = 'hero'
  private botIds: Set<string> = new Set()
  private botStates: Map<string, BotState> = new Map()
  private botIdentities: Map<string, BotIdentity> = new Map()
  private botHabits: Map<string, ActiveHabit[]> = new Map()
  private observedEventCountByBot = new Map<string, number>()
  private observedVpipPlayersByBot = new Map<string, Set<string>>()
  private listeners: Set<Listener> = new Set()
  private botTimer: ReturnType<typeof setTimeout> | null = null
  private autoStartTimer: ReturnType<typeof setTimeout> | null = null
  private runoutTimer: ReturnType<typeof setTimeout> | null = null
  private _lastResults: HandResult[] | null = null
  private playerActionLabels: Record<string, PlayerActionLabel> = {}
  private showdownCards: Record<string, [Card, Card]> = {}
  private sessionHistory: SessionHistoryEvent[] = []
  private sessionDecisionSnapshots: any[] = []
  private botDebugDecisions: BotDebugDecision[] = []
  private previousSnapshotActionCountPerHand = new Map<number, number>()
  private nextBotDebugSequence = 1
  private pendingRebuyPlayerIds = new Set<string>()
  private startingChips = 0
  private runoutStartCardCount: number | null = null
  private visibleCommunityCardCount: number | null = null
  private currentHandNumber = 0
  private capturedHandEventCount = 0
  private capturedDecisionSnapshotCount = 0
  private botRandom: RandomSource = Math.random
  private identityRandom: RandomSource = Math.random
  private timingRandom: RandomSource = Math.random
  private sessionOptions: TableOptions | null = null
  private sessionStartedAt: string | null = null

  get state(): LocalGameState {
    if (!this.game) {
      return {
        gameState: null,
        myCards: null,
        lastResults: this._lastResults,
        isMyTurn: false,
        playerAvatarKeys: {},
        playerActionLabels: {},
        showdownCards: {},
        sessionHistory: [...this.sessionHistory],
        pendingRebuyPlayerIds: [...this.pendingRebuyPlayerIds],
      }
    }
    const playerView = this.game.getPlayerView(this.heroId)
    const sourceGameState = playerView.state
    const gs = this.visibleCommunityCardCount == null
      ? sourceGameState
      : {
          ...sourceGameState,
          communityCards: sourceGameState.communityCards.slice(0, this.visibleCommunityCardCount),
        }
    return {
      gameState: gs,
      myCards: playerView.ownCards,
      lastResults: this._lastResults,
      isMyTurn: gs.currentPlayerId === this.heroId,
      playerAvatarKeys: Object.fromEntries(
        [...this.botIdentities].map(([playerId, identity]) => [playerId, identity.avatarKey]),
      ),
      playerActionLabels: { ...this.playerActionLabels },
      showdownCards: { ...this.showdownCards },
      sessionHistory: [...this.sessionHistory],
      pendingRebuyPlayerIds: [...this.pendingRebuyPlayerIds],
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
    return this.botDebugDecisions.slice(-50)
  }

  createSessionDebugRecord(appVersion: string, displayCurrency: DisplayCurrency): SessionDebugRecordV2 {
    if (!this.sessionOptions || !this.sessionStartedAt) {
      throw new Error('Cannot export a debug record before a session has started')
    }
    const exportedAt = new Date().toISOString()

    const gameActive = this.game && this.game.getPublicState().phase !== 'waiting'
    const lastCompleteHand = gameActive ? this.currentHandNumber - 1 : this.currentHandNumber
    const firstIncludedHand = Math.max(1, lastCompleteHand - 4)

    const compactBotDecisions = this.botDebugDecisions
      .filter(d => d.handNumber >= firstIncludedHand)
      .map(d => ({
        sequence: d.sequence,
        handNumber: d.handNumber,
        playerId: d.playerId,
        playerName: d.playerName,
        snapshot: {
          phase: d.context.publicState.phase,
          hand: `${d.context.ownCards[0].rank}${d.context.ownCards[0].suit[0]} ${d.context.ownCards[1].rank}${d.context.ownCards[1].suit[0]}`,
          board: d.context.publicState.communityCards.map(c => `${c.rank}${c.suit[0]}`).join(' ') || '-',
          potOdds: Math.round(d.metrics.potOdds * 100),
          spr: Math.round(d.metrics.spr * 10) / 10,
          tilt: d.profile.mentalState.tilt,
          confidence: d.profile.mentalState.confidence,
        },
        action: d.decision.action,
        scores: flattenContributions(d.decision.allActions),
        perceptionErrors: d.decision.perceptionErrors.map(e =>
          `${e.label}: ${typeof e.actual === 'number' ? e.actual.toFixed(1) : e.actual} → ${typeof e.perceived === 'number' ? e.perceived.toFixed(1) : e.perceived}`,
        ),
        complexity: d.complexity,
        timing: d.timing,
      }))

    const record: SessionDebugRecordV2 = {
      schema: 'cpcdigital.session-debug',
      schemaVersion: 2,
      app: { name: 'CPCdigital', version: appVersion },
      exportedAt,
      session: {
        startedAt: this.sessionStartedAt,
        currentHandNumber: this.currentHandNumber,
        displayCurrency,
        config: { ...this.sessionOptions },
        players: this.players.map(player => ({ ...player })),
        currentGameState: this.game ? this.game.getPublicState() : null,
        lastResults: this._lastResults?.map(result => ({ ...result })) ?? null,
        pendingRebuyPlayerIds: [...this.pendingRebuyPlayerIds],
      },
      botProfiles: [...this.botStates.entries()].map(([playerId, botState]) => ({
        playerId,
        profile: createBotDebugProfile(botState),
      })),
      botIdentities: [...this.botIdentities.entries()].map(([playerId, identity]) => ({
        playerId,
        identity,
      })),
      history: this.sessionHistory.filter(h => h.handNumber >= firstIncludedHand),
      decisionSnapshots: this.sessionDecisionSnapshots.filter(s => s.handNumber >= firstIncludedHand),
      botDecisions: compactBotDecisions,
    }
    return structuredClone(record)
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
    this.identityRandom = seedNamespace === null
      ? Math.random
      : createSeededRandom(`${seedNamespace}:identities`)
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
    this.botIdentities.clear()
    this.botHabits.clear()
    this.observedEventCountByBot.clear()
    this.observedVpipPlayersByBot.clear()
    this.playerActionLabels = {}
    this.sessionHistory = []
    this.sessionDecisionSnapshots = []
    this.botDebugDecisions = []
    this.previousSnapshotActionCountPerHand.clear()
    this.nextBotDebugSequence = 1
    this.pendingRebuyPlayerIds.clear()
    this.startingChips = options.startingChips
    this.runoutStartCardCount = null
    this.visibleCommunityCardCount = null
    this.currentHandNumber = 0
    this.capturedHandEventCount = 0
    this.capturedDecisionSnapshotCount = 0
    this.sessionOptions = { ...options }
    this.sessionStartedAt = new Date().toISOString()

    const { roster, sessionLog } = loadPersistentRoster()
    const sessionIdentities = selectReturningSessionIdentities(
      roster,
      effectiveBotCount,
      sessionLog,
      this.identityRandom,
    )
    const identityIds: string[] = []
    for (let i = 0; i < effectiveBotCount; i++) {
      const botId = `bot-${i}`
      this.botIds.add(botId)
      const identity = sessionIdentities[i]
      const archetype = getBotArchetype(identity.archetypeId)
      const sessionRandom = seedNamespace === null
        ? Math.random
        : createSeededRandom(`${seedNamespace}:session:${identity.id}`)
      this.botIdentities.set(botId, identity)
      this.botStates.set(botId, createBotStateFromIdentity(identity, archetype, sessionRandom))
      this.botHabits.set(botId, habitIdsToActiveHabits(identity.identitySeed, identity.habitIds))
      identityIds.push(identity.id)
      const bot: Player = {
        id: botId,
        name: identity.name,
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

    recordSession(identityIds)

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

    this.applyPendingRebuys()

    const eligible = this.players.filter(p => p.chips > 0 && !p.isSittingOut)
    if (eligible.length < 2) return

    this._lastResults = null
    this.runoutStartCardCount = null
    this.visibleCommunityCardCount = null
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
    let decision: BotDecision
    let complexity: DecisionComplexity
    try {
      botContext = createBotContext(botId, botView, this.game.getPublicHandHistory())
      decision = decideBotDecision(botContext, botState, this.botRandom, this.botHabits.get(botId))
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
      profile: createBotDebugProfile(botState),
      context: botContext,
      evaluation: decision.evaluation,
      metrics: decision.metrics,
      decision: decision.decisionResult,
      complexity,
      timing,
    })
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

    const stateBeforeAction = this.game.getPublicState()
    const phaseBeforeAction = stateBeforeAction.phase
    const label = getPlayerActionLabel(action, this.game.getPublicState().currentBet)
    this.game.applyAction(playerId, action)
    this.captureSessionHistory()
    this.captureDecisionSnapshots()
    const phaseAfterAction = this.game.getPublicState().phase
    const stateAfterAction = this.game.getPublicState()
    if (
      stateAfterAction.phase === 'waiting'
      && stateAfterAction.communityCards.length > stateBeforeAction.communityCards.length
    ) {
      this.runoutStartCardCount = stateBeforeAction.communityCards.length
      this.visibleCommunityCardCount = stateBeforeAction.communityCards.length
    }

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
    const archetypeId = identityArchetypeId(botState)

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
          updateOpponentRead(botState.reads, actionPlayerId, 'vpip', observationSkill, archetypeId)
          observedVpipPlayers.add(actionPlayerId)
        } else if (action.type === 'fold' && event.phase === 'preflop' && !observedVpipPlayers.has(actionPlayerId)) {
          updateOpponentRead(botState.reads, actionPlayerId, 'no-vpip', observationSkill, archetypeId)
          observedVpipPlayers.add(actionPlayerId)
        }

        // Aggression tracking
        if (action.type === 'raise') {
          updateOpponentRead(botState.reads, actionPlayerId, 'aggression', observationSkill, archetypeId)
        } else if (action.type === 'call' || action.type === 'check') {
          updateOpponentRead(botState.reads, actionPlayerId, 'no-aggression', observationSkill, archetypeId)
        }

        if (action.type === 'fold') {
          updateOpponentRead(botState.reads, actionPlayerId, 'foldToBet', observationSkill, archetypeId)
        } else if (action.type === 'call' || action.type === 'raise') {
          updateOpponentRead(botState.reads, actionPlayerId, 'no-fold', observationSkill, archetypeId)
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
    const resultDisplayMs = Object.keys(this.showdownCards).length > 0
      ? SHOWDOWN_DISPLAY_MS
      : UNCONTESTED_RESULT_DISPLAY_MS
    const revealStages = this.runoutStartCardCount == null
      ? []
      : getRunoutRevealStages(this.runoutStartCardCount, gs.communityCards.length)

    if (revealStages.length > 0) {
      this._lastResults = null
      this.notify()
      this.revealRunoutStages(
        revealStages,
        0,
        results,
        resultDisplayMs,
        getRunoutStageDelay(this.runoutStartCardCount ?? 0),
      )
      return
    }

    this.finishHandPresentation(results, resultDisplayMs)
  }

  private revealRunoutStages(
    stages: readonly number[],
    stageIndex: number,
    results: HandResult[],
    resultDisplayMs: number,
    stageDelayMs: number,
  ): void {
    if (this.runoutTimer) clearTimeout(this.runoutTimer)
    this.runoutTimer = setTimeout(() => {
      this.runoutTimer = null
      this.visibleCommunityCardCount = stages[stageIndex]
      this.notify()

      if (stageIndex + 1 < stages.length) {
        this.revealRunoutStages(stages, stageIndex + 1, results, resultDisplayMs, stageDelayMs)
        return
      }

      this.finishHandPresentation(results, resultDisplayMs)
    }, stageDelayMs)
  }

  private finishHandPresentation(results: HandResult[], resultDisplayMs: number): void {
    this.visibleCommunityCardCount = null
    this.runoutStartCardCount = null
    this._lastResults = results
    this.notify()

    if (this.autoStartTimer) clearTimeout(this.autoStartTimer)
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
    const handNumber = this.currentHandNumber
    let previousCount = this.previousSnapshotActionCountPerHand.get(handNumber) ?? 0

    for (const snapshot of snapshots.slice(this.capturedDecisionSnapshotCount)) {
      const currentActionHistoryLength = snapshot.actionHistory.length
      const newEvents = snapshot.actionHistory.slice(previousCount)

      this.sessionDecisionSnapshots.push({
        decisionIndex: snapshot.decisionIndex,
        handNumber,
        playerId: snapshot.playerId,
        visibleState: snapshot.visibleState,
        ownCards: snapshot.ownCards,
        bettingContext: snapshot.bettingContext,
        position: snapshot.position,
        newActionHistoryEvents: newEvents,
        chosenAction: snapshot.chosenAction,
        source: snapshot.source,
      })

      previousCount = currentActionHistoryLength
    }

    this.previousSnapshotActionCountPerHand.set(handNumber, previousCount)
    this.capturedDecisionSnapshotCount = snapshots.length
  }

  requestRebuy(playerId: string): RebuyRequestStatus {
    if (!this.game || this.startingChips <= 0) return 'unavailable'
    const player = this.game.getPublicState().players.find(candidate => candidate.id === playerId)
    if (!player) return 'unavailable'
    if (player.chips >= this.startingChips) return 'not-needed'

    this.pendingRebuyPlayerIds.add(playerId)
    if (this.game.getPublicState().phase === 'waiting') {
      this.applyPendingRebuys()
      this.notify()
      return 'applied'
    }

    this.notify()
    return 'queued'
  }

  private applyPendingRebuys(): void {
    if (!this.game || this.game.getPublicState().phase !== 'waiting') return

    for (const playerId of this.pendingRebuyPlayerIds) {
      const player = this.players.find(candidate => candidate.id === playerId)
      if (player && player.chips < this.startingChips) {
        player.chips = this.startingChips
        this.game.setPlayerChips(playerId, this.startingChips)
      }
    }
    this.pendingRebuyPlayerIds.clear()
  }

  cleanup(): void {
    if (this.botTimer) clearTimeout(this.botTimer)
    if (this.autoStartTimer) clearTimeout(this.autoStartTimer)
    if (this.runoutTimer) clearTimeout(this.runoutTimer)
    this.botTimer = null
    this.autoStartTimer = null
    this.runoutTimer = null
    this.game = null
    this._lastResults = null
    this.showdownCards = {}
    this.sessionHistory = []
    this.sessionDecisionSnapshots = []
    this.botDebugDecisions = []
    this.previousSnapshotActionCountPerHand.clear()
    this.nextBotDebugSequence = 1
    this.pendingRebuyPlayerIds.clear()
    this.startingChips = 0
    this.runoutStartCardCount = null
    this.visibleCommunityCardCount = null
    this.currentHandNumber = 0
    this.capturedHandEventCount = 0
    this.capturedDecisionSnapshotCount = 0
    this.botStates.clear()
    this.botIdentities.clear()
    this.botHabits.clear()
    this.observedEventCountByBot.clear()
    this.observedVpipPlayersByBot.clear()
    this.botRandom = Math.random
    this.identityRandom = Math.random
    this.timingRandom = Math.random
    this.sessionOptions = null
    this.sessionStartedAt = null
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

function createBotDebugProfile(botState: BotState): BotDebugProfile {
  return {
    archetype: botState.personality.archetype.name,
    personality: {
      preflopLooseness: botState.personality.preflopLooseness,
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
  }
}

function monotonicNow(): number {
  return globalThis.performance?.now() ?? Date.now()
}

function flattenContributions(allActions: ScoredAction[]): string[] {
  return allActions.map(action => {
    const actionLabel = action.action.type === 'raise'
      ? `raise ${action.action.amount}`
      : action.action.type
    const contribs = action.contributions
      .filter(c => c.value !== 0)
      .map(c => `${c.label} (${c.value >= 0 ? '+' : ''}${Math.round(c.value)})`)
      .join(', ')
    return `[${actionLabel} u=${Math.round(action.utility)}] ${contribs}`
  })
}
