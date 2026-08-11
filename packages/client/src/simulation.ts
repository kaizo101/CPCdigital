// Bot archetype calibration across common table formats.
// Run with: npx tsx packages/client/src/simulation.ts

import { createSeededRandom, OMAHA_HIGH, PokerGame } from '@cpc/poker-engine'
import type { Player, PlayerAction, PublicGameState } from '@cpc/shared'
import {
  CALLING_STATION_PERSONALITY,
  createBotStateFromIdentity,
  decideBotDecision,
  LAG_PERSONALITY,
  NIT_PERSONALITY,
  TAG_PERSONALITY,
} from './bot-tag'
import type { BotPersonality, BotState, Position } from './bot-tag'
import type { BotArchetypeId } from './bot-archetypes'
import { createBotContext, getPositionCategory } from './bot-context'
import { resetHandMemory } from './bot-memory'
import { DEFAULT_BOT_ROSTER } from './bot-identities'
import {
  CALIBRATION_METRIC_SCHEMA_VERSION,
  CalibrationHandAccumulator,
  calibrationPercentage,
  calibrationInvariantViolations,
  isWithinCalibrationTarget,
  summarizeShowdown,
} from './calibration-metrics'
import type { HandStrengthCategory } from './bot-variant-evaluation'
import { observeOpponentHistory, type OpponentObservationCursor } from './bot-opponent-observation'
import type { DecisionMetrics } from './bot-decision-metrics'
import { resolveTableFormat } from './bot-table-format'
import {
  CALIBRATION_SNAPSHOT_MARKER,
  type CalibrationRegressionEntry,
  type CalibrationRegressionSnapshot,
} from './calibration-regression'
import { calibrationDealerIndex, calibrationHandSeeds } from './calibration-seeding'

const HANDS_PER_FORMAT = Number(process.env.CALIB_HANDS) || 10_000
const EXIT_ON_FAIL = !process.env.CALIB_NO_EXIT
const BIG_BLIND = 20
const SMALL_BLIND = 10
const STARTING_CHIPS = 2_000
const PRINT_CALIBRATION_DETAIL = process.env.CALIB_DETAIL === '1'
const PRINT_CALIBRATION_SNAPSHOT = process.env.CALIB_JSON === '1'
const HAND_STRENGTH_CATEGORIES: HandStrengthCategory[] = [
  'air',
  'weak',
  'marginal',
  'medium',
  'good',
  'strong',
  'premium',
]

interface FormatConfig {
  name: string
  playerCount: number
  target: {
    vpip: [number, number]
    pfr: [number, number]
    threeBet: [number, number]
    cBet?: [number, number]
    aggressionFactor?: [number, number]
    wtsd?: [number, number]
    foldToCBet?: [number, number]
    turnCBet?: [number, number]
  }
}

interface CalibrationProfile {
  name: string
  seed: string
  archetypeId: BotArchetypeId
  personality: BotPersonality
  formats: FormatConfig[]
}

const CALIB_VARIANT = process.env.CALIB_VARIANT || 'texas-holdem'
const CALIB_PROFILE = process.env.CALIB_PROFILE?.toLowerCase()
const CALIB_FORMAT = process.env.CALIB_FORMAT?.toLowerCase()

const TAG_FORMATS: FormatConfig[] = [
  {
    name: 'Full Ring (9-max)',
    playerCount: 9,
    target: { vpip: [15, 21], pfr: [12, 18], threeBet: [6, 13], cBet: [60, 70], aggressionFactor: [2.0, 3.8], foldToCBet: [40, 52], turnCBet: [45, 54] },
  },
  {
    name: '6-max',
    playerCount: 6,
    target: { vpip: [22, 29], pfr: [18, 25], threeBet: [8, 15], cBet: [64, 74], aggressionFactor: [2.0, 3.8], foldToCBet: [38, 48], turnCBet: [48, 58] },
  },
  {
    name: 'Heads-up',
    playerCount: 2,
    target: { vpip: [45, 65], pfr: [35, 55], threeBet: [12, 22], cBet: [70, 80], aggressionFactor: [2.5, 10.0], foldToCBet: [40, 55], turnCBet: [42, 55] },
  },
]

const NIT_FORMATS: FormatConfig[] = [
  {
    name: 'Full Ring (9-max)',
    playerCount: 9,
    target: { vpip: [9, 15], pfr: [7, 12], threeBet: [3, 9], cBet: [50, 62], aggressionFactor: [2.0, 3.5], foldToCBet: [45, 60], turnCBet: [35, 42] },
  },
  {
    name: '6-max',
    playerCount: 6,
    target: { vpip: [13, 19], pfr: [10, 15], threeBet: [4, 10], cBet: [50, 62], aggressionFactor: [2.0, 3.5], foldToCBet: [55, 65], turnCBet: [38, 46] },
  },
  {
    name: 'Heads-up',
    playerCount: 2,
    target: { vpip: [30, 45], pfr: [16, 35], threeBet: [6, 13], cBet: [54, 64], aggressionFactor: [2.5, 8.0], foldToCBet: [50, 65], turnCBet: [35, 48] },
  },
]

const LAG_FORMATS: FormatConfig[] = [
  {
    name: 'Full Ring (9-max)',
    playerCount: 9,
    target: { vpip: [22, 31], pfr: [17, 26], threeBet: [8, 18], cBet: [65, 80], aggressionFactor: [1.8, 4.2], foldToCBet: [40, 48], turnCBet: [52, 62] },
  },
  {
    name: '6-max',
    playerCount: 6,
    target: { vpip: [28, 40], pfr: [22, 33], threeBet: [10, 20], cBet: [65, 80], aggressionFactor: [2.0, 4.2], foldToCBet: [38, 46], turnCBet: [55, 65] },
  },
  {
    name: 'Heads-up',
    playerCount: 2,
    target: { vpip: [65, 87], pfr: [45, 68], threeBet: [14, 28], cBet: [88, 98], aggressionFactor: [3.0, 10.0], foldToCBet: [30, 45], turnCBet: [50, 65] },
  },
]

const CALLING_STATION_FORMATS: FormatConfig[] = [
  {
    name: 'Full Ring (9-max)',
    playerCount: 9,
    target: { vpip: [28, 43], pfr: [5, 14], threeBet: [1, 8], cBet: [44, 54], aggressionFactor: [0.5, 2.0], foldToCBet: [28, 42], turnCBet: [28, 35] },
  },
  {
    name: '6-max',
    playerCount: 6,
    target: { vpip: [38, 56], pfr: [7, 17], threeBet: [2, 9], cBet: [44, 54], aggressionFactor: [0.5, 2.0], foldToCBet: [30, 40], turnCBet: [30, 38] },
  },
  {
    name: 'Heads-up',
    playerCount: 2,
    target: { vpip: [62, 85], pfr: [15, 36], threeBet: [2, 13], cBet: [38, 48], aggressionFactor: [1.0, 3.0], foldToCBet: [25, 40], turnCBet: [25, 38] },
  },
]

// Omaha (PLO) targets — higher VPIP, lower AF, more calling
const PLO_TAG_FORMATS: FormatConfig[] = [
  {
    name: 'Full Ring (9-max)',
    playerCount: 9,
    target: { vpip: [22, 33], pfr: [12, 20], threeBet: [5, 11], cBet: [35, 55], aggressionFactor: [1.5, 3.5], wtsd: [22, 32], foldToCBet: [45, 52], turnCBet: [40, 48] },
  },
  {
    name: '6-max',
    playerCount: 6,
    target: { vpip: [28, 39], pfr: [15, 24], threeBet: [7, 13], cBet: [35, 55], aggressionFactor: [1.5, 3.5], wtsd: [22, 32], foldToCBet: [42, 50], turnCBet: [42, 50] },
  },
  {
    name: 'Heads-up',
    playerCount: 2,
    target: { vpip: [45, 65], pfr: [30, 48], threeBet: [10, 20], cBet: [40, 60], aggressionFactor: [2.0, 5.0], wtsd: [22, 32], foldToCBet: [38, 52], turnCBet: [38, 52] },
  },
]

const PLO_NIT_FORMATS: FormatConfig[] = [
  {
    name: 'Full Ring (9-max)',
    playerCount: 9,
    target: { vpip: [14, 22], pfr: [8, 14], threeBet: [3, 7], cBet: [30, 50], aggressionFactor: [1.5, 3.5], wtsd: [22, 28], foldToCBet: [55, 65], turnCBet: [32, 40] },
  },
  {
    name: '6-max',
    playerCount: 6,
    target: { vpip: [18, 28], pfr: [10, 17], threeBet: [4, 9], cBet: [30, 50], aggressionFactor: [1.5, 4.0], wtsd: [22, 28], foldToCBet: [52, 62], turnCBet: [35, 42] },
  },
  {
    name: 'Heads-up',
    playerCount: 2,
    target: { vpip: [30, 45], pfr: [15, 30], threeBet: [6, 12], cBet: [35, 55], aggressionFactor: [2.0, 4.5], wtsd: [22, 28], foldToCBet: [45, 60], turnCBet: [32, 45] },
  },
]

const PLO_LAG_FORMATS: FormatConfig[] = [
  {
    name: 'Full Ring (9-max)',
    playerCount: 9,
    target: { vpip: [29, 40], pfr: [18, 28], threeBet: [8, 16], cBet: [40, 60], aggressionFactor: [2.0, 4.2], wtsd: [28, 34], foldToCBet: [38, 46], turnCBet: [45, 54] },
  },
  {
    name: '6-max',
    playerCount: 6,
    target: { vpip: [35, 48], pfr: [22, 32], threeBet: [9, 18], cBet: [40, 60], aggressionFactor: [2.0, 4.2], wtsd: [28, 34], foldToCBet: [36, 44], turnCBet: [48, 58] },
  },
  {
    name: 'Heads-up',
    playerCount: 2,
    target: { vpip: [50, 70], pfr: [35, 52], threeBet: [12, 24], cBet: [45, 65], aggressionFactor: [3.0, 8.0], wtsd: [28, 34], foldToCBet: [30, 45], turnCBet: [42, 58] },
  },
]

const PLO_CS_FORMATS: FormatConfig[] = [
  {
    name: 'Full Ring (9-max)',
    playerCount: 9,
    target: { vpip: [32, 48], pfr: [5, 14], threeBet: [0.5, 7], cBet: [20, 41], aggressionFactor: [0.5, 2.0], wtsd: [28, 45], foldToCBet: [30, 40], turnCBet: [22, 30] },
  },
  {
    name: '6-max',
    playerCount: 6,
    target: { vpip: [42, 60], pfr: [7, 17], threeBet: [1, 8], cBet: [20, 40], aggressionFactor: [0.5, 2.1], wtsd: [28, 45], foldToCBet: [28, 38], turnCBet: [25, 32] },
  },
  {
    name: 'Heads-up',
    playerCount: 2,
    target: { vpip: [60, 82], pfr: [15, 32], threeBet: [3, 12], cBet: [25, 45], aggressionFactor: [0.8, 2.5], wtsd: [28, 45], foldToCBet: [25, 42], turnCBet: [25, 38] },
  },
]

const CALIBRATION_PROFILES: CalibrationProfile[] = CALIB_VARIANT === 'omaha-high' ? [
  {
    name: 'TAG (PLO)',
    seed: 'tag-plo-calibration-v1',
    archetypeId: 'tag',
    personality: TAG_PERSONALITY,
    formats: PLO_TAG_FORMATS,
  },
  {
    name: 'Nit (PLO)',
    seed: 'nit-plo-calibration-v1',
    archetypeId: 'nit',
    personality: NIT_PERSONALITY,
    formats: PLO_NIT_FORMATS,
  },
  {
    name: 'LAG (PLO)',
    seed: 'lag-plo-calibration-v1',
    archetypeId: 'lag',
    personality: LAG_PERSONALITY,
    formats: PLO_LAG_FORMATS,
  },
  {
    name: 'Calling Station (PLO)',
    seed: 'cs-plo-calibration-v1',
    archetypeId: 'calling-station',
    personality: CALLING_STATION_PERSONALITY,
    formats: PLO_CS_FORMATS,
  },
] : [
  {
    name: 'TAG',
    seed: 'tag-calibration-v1',
    archetypeId: 'tag',
    personality: TAG_PERSONALITY,
    formats: TAG_FORMATS,
  },
  {
    name: 'Nit',
    seed: 'nit-calibration-v1',
    archetypeId: 'nit',
    personality: NIT_PERSONALITY,
    formats: NIT_FORMATS,
  },
  {
    name: 'LAG',
    seed: 'lag-calibration-v1',
    archetypeId: 'lag',
    personality: LAG_PERSONALITY,
    formats: LAG_FORMATS,
  },
  {
    name: 'Calling Station',
    seed: 'calling-station-calibration-v1',
    archetypeId: 'calling-station',
    personality: CALLING_STATION_PERSONALITY,
    formats: CALLING_STATION_FORMATS,
  },
]

interface PositionStats {
  hands: number
  vpipHands: number
  pfrHands: number
  cBetOpps: number
  cBets: number
}

interface PostflopStats {
  betsAndRaises: number
  calls: number
  wentToShowdown: number
  wonAtShowdown: number
  handsSeenFlop: number
  handsSeenTurn: number
  handsSeenRiver: number
  foldToCBetOpps: number
  foldToCBets: number
  turnCBetOpps: number
  turnCBets: number
  aggressionByStreet: Record<'flop' | 'turn' | 'river', { aggressive: number; calls: number }>
  aggressionByRole: Record<'pfa' | 'non-pfa', { aggressive: number; calls: number }>
  aggressionByPressure: Record<'facing-bet' | 'open-action', { aggressive: number; calls: number }>
  activeOpponentTotal: number
  activeOpponentSamples: number
}

interface SimulationStats {
  handsPlayed: number
  playerHands: number
  vpipHands: number
  pfrHands: number
  threeBets: number
  threeBetOpportunities: number
  threeBetByCategory: Record<HandStrengthCategory, {
    opportunities: number
    threeBets: number
  }>
  positions: Record<Position, PositionStats>
  postflop: PostflopStats
  actions: Record<PlayerAction['type'], number>
  deepOpenShoves: number
  uncommittedDeepShoves: number
  actionErrors: number
  durationMs: number
  decisionTrace?: Record<string, Record<string, Record<string, number>>>
}

function createPlayers(playerCount: number): Player[] {
  return Array.from({ length: playerCount }, (_, index) => ({
    id: `bot-${index}`,
    name: `Bot ${index + 1}`,
    role: 'player',
    chips: STARTING_CHIPS,
    seatIndex: index,
    isConnected: true,
    isSittingOut: false,
    status: 'waiting',
    roundBet: 0,
  }))
}

function createStats(): SimulationStats {
  return {
    handsPlayed: 0,
    playerHands: 0,
    vpipHands: 0,
    pfrHands: 0,
    threeBets: 0,
    threeBetOpportunities: 0,
    threeBetByCategory: Object.fromEntries(
      HAND_STRENGTH_CATEGORIES.map(category => [
        category,
        { opportunities: 0, threeBets: 0 },
      ]),
    ) as SimulationStats['threeBetByCategory'],
    positions: {
      early: { hands: 0, vpipHands: 0, pfrHands: 0, cBetOpps: 0, cBets: 0 },
      middle: { hands: 0, vpipHands: 0, pfrHands: 0, cBetOpps: 0, cBets: 0 },
      late: { hands: 0, vpipHands: 0, pfrHands: 0, cBetOpps: 0, cBets: 0 },
      blinds: { hands: 0, vpipHands: 0, pfrHands: 0, cBetOpps: 0, cBets: 0 },
    },
    postflop: {
      betsAndRaises: 0,
      calls: 0,
      wentToShowdown: 0,
      wonAtShowdown: 0,
      handsSeenFlop: 0,
      handsSeenTurn: 0,
      handsSeenRiver: 0,
      foldToCBetOpps: 0,
      foldToCBets: 0,
      turnCBetOpps: 0,
      turnCBets: 0,
      aggressionByStreet: {
        flop: { aggressive: 0, calls: 0 },
        turn: { aggressive: 0, calls: 0 },
        river: { aggressive: 0, calls: 0 },
      },
      aggressionByRole: {
        pfa: { aggressive: 0, calls: 0 },
        'non-pfa': { aggressive: 0, calls: 0 },
      },
      aggressionByPressure: {
        'facing-bet': { aggressive: 0, calls: 0 },
        'open-action': { aggressive: 0, calls: 0 },
      },
      activeOpponentTotal: 0,
      activeOpponentSamples: 0,
    },
    actions: { fold: 0, check: 0, call: 0, raise: 0, 'all-in': 0 },
    deepOpenShoves: 0,
    uncommittedDeepShoves: 0,
    actionErrors: 0,
    durationMs: 0,
    decisionTrace: {},
  }
}

function resetBotForHand(botState: BotState): void {
  resetHandMemory(botState.memory)
}

function simulateFormat(
  profile: CalibrationProfile,
  format: FormatConfig,
  numHands = HANDS_PER_FORMAT,
): SimulationStats {
  const players = createPlayers(format.playerCount)
  const seedNamespace = `${profile.seed}:${format.name}`
  const identities = DEFAULT_BOT_ROSTER.identities
    .filter(identity => identity.archetypeId === profile.archetypeId && !identity.maniac)
  const botStates = new Map<string, BotState>(
    players.map((player, index) => {
      const identity = identities[index % identities.length]
      const sessionRandom = createSeededRandom(
        `${seedNamespace}:session:${player.id}:${identity.id}`,
      )
      return [
        player.id,
        createBotStateFromIdentity(identity, profile.personality, sessionRandom),
      ]
    })
  )
  const stats = createStats()
  const startedAt = Date.now()
  const observationCursors = new Map<string, OpponentObservationCursor>()

  for (let handNumber = 0; handNumber < numHands; handNumber++) {
    for (const player of players) resetBotForHand(botStates.get(player.id)!)

    const handSeeds = calibrationHandSeeds(seedNamespace, handNumber)
    const decisionRandom = createSeededRandom(handSeeds.decisions)
    const game = new PokerGame(players, {
      bigBlind: BIG_BLIND,
      smallBlind: SMALL_BLIND,
      seed: handSeeds.deck,
      initialDealerIndex: calibrationDealerIndex(handNumber, format.playerCount),
      ...(CALIB_VARIANT === 'omaha-high' ? { variant: OMAHA_HIGH } : {}),
    })

    game.startHand()
    stats.handsPlayed++
    observationCursors.clear()
    for (const player of players) {
      observationCursors.set(player.id, { eventCount: 0, vpipPlayers: new Set() })
    }

    const initialState = game.getPublicState()
    const positions = new Map<string, Position>()
    for (const player of initialState.players.filter(candidate => candidate.status === 'active')) {
      const position = getPosition(initialState, player.id)
      positions.set(player.id, position)
      stats.positions[position].hands++
      stats.playerHands++
    }

    const metricAccumulator = new CalibrationHandAccumulator()
    const flopSeenPlayers = new Set<string>()
    const turnSeenPlayers = new Set<string>()
    const riverSeenPlayers = new Set<string>()
    let pfa: string | null = null
    let actionCount = 0
    const maxActions = format.playerCount * 30

    let state = game.getPublicState()
    while (state.phase !== 'waiting') {
      if (!state.currentPlayerId) throw new Error(`${format.name}: hand ${handNumber + 1} has no current player`)
      if (++actionCount > maxActions) throw new Error(`${format.name}: hand ${handNumber + 1} exceeded ${maxActions} actions`)

      const botId = state.currentPlayerId
      const player = state.players.find(candidate => candidate.id === botId)
      const botView = game.getPlayerView(botId)
      const holeCards = botView.ownCards
      const botState = botStates.get(botId)
      if (!player || !holeCards || !botState) throw new Error(`${format.name}: missing state for ${botId}`)

      observeOpponentHistory(
        botId,
        botState,
        game.getPublicHandHistory(),
        observationCursors.get(botId)!,
        profile.archetypeId,
      )

      let action: PlayerAction
      let handCategory: HandStrengthCategory | null = null
      let decisionMetrics: DecisionMetrics | null = null
      let nutPotential: string | null = null
      try {
        const botContext = createBotContext(botId, botView, game.getPublicHandHistory(), profile.archetypeId)
        const decision = decideBotDecision(botContext, botState, decisionRandom)
        action = decision.action
        handCategory = decision.evaluation.handAssessment.category
        nutPotential = decision.evaluation.handAssessment.nutPotential
        decisionMetrics = decision.metrics
        game.applyAction(botId, action)
      } catch {
        stats.actionErrors++
        const ctx = game.getPublicState().bettingContext
        action = ctx?.legalActions.check ? { type: 'check' } : { type: 'fold' }
        game.applyAction(botId, action)
      }

      stats.actions[action.type]++
      if (
        action.type === 'all-in'
        && state.phase === 'preflop'
        && state.currentBet <= state.bigBlind
        && (state.bettingContext?.legalActions.allInAmount ?? 0) > state.currentBet
        && (decisionMetrics?.effectiveStackBb ?? 0) > 40
      ) {
        stats.deepOpenShoves++
      }
      const aggressiveAllIn = action.type === 'all-in'
        && (state.bettingContext?.legalActions.allInAmount ?? 0) > state.currentBet
      if (aggressiveAllIn && decisionMetrics) {
        const uncommittedPreflop = state.phase === 'preflop' && (
          (decisionMetrics.effectiveStackBb > 100 && decisionMetrics.potCommitment < 0.2)
          || (
            decisionMetrics.effectiveStackBb > 40
            && handCategory !== 'premium'
            && decisionMetrics.potCommitment < 0.25
          )
        )
        const uncommittedPostflop = state.phase !== 'preflop'
          && decisionMetrics.spr >= 6
          && decisionMetrics.effectiveStackBb >= 100
          && decisionMetrics.potCommitment < 0.25
          && nutPotential !== 'nuts'
        if (uncommittedPreflop || uncommittedPostflop) stats.uncommittedDeepShoves++
      }
      const metricDelta = metricAccumulator.recordAction({
        phase: state.phase,
        playerId: botId,
        action,
        currentBet: state.currentBet,
        allInAmount: state.bettingContext?.legalActions.allInAmount,
      })
      pfa = metricDelta.preflopAggressorId

      if (metricDelta.threeBetOpportunity && handCategory) {
        stats.threeBetByCategory[handCategory].opportunities++
      }
      if (metricDelta.threeBet && handCategory) {
        stats.threeBetByCategory[handCategory].threeBets++
      }

      if (process.env.CALIB_TRACE === '1') {
        const streetKey = state.phase as string
        const roleKey = botId === pfa ? 'pfa' : 'non-pfa'
        const pressureKey = (state.bettingContext?.toCall ?? 0) > 0 ? 'facing-bet' : 'open-action'
        const catKey = process.env.CALIB_CONTEXT_TRACE === '1' && state.phase !== 'preflop'
          ? `${handCategory ?? 'unknown'}:${roleKey}:${pressureKey}`
          : handCategory ?? 'unknown'
        const actKey = action.type as string
        const byCat = stats.decisionTrace![streetKey] ?? (stats.decisionTrace![streetKey] = {})
        const byAct = byCat[catKey] ?? (byCat[catKey] = {})
        byAct[actKey] = (byAct[actKey] ?? 0) + 1
      }

      // Postflop tracking
      if (state.phase !== 'preflop') {
        const activePlayers = state.players.filter(candidate => (
          candidate.status === 'active' || candidate.status === 'all-in'
        )).length
        stats.postflop.activeOpponentTotal += Math.max(0, activePlayers - 1)
        stats.postflop.activeOpponentSamples++

        if (state.communityCards.length >= 3) {
          for (const candidate of state.players) {
            if (candidate.status === 'active' || candidate.status === 'all-in') {
              flopSeenPlayers.add(candidate.id)
              if (state.communityCards.length >= 4) turnSeenPlayers.add(candidate.id)
              if (state.communityCards.length >= 5) riverSeenPlayers.add(candidate.id)
            }
          }
        }

        if (metricDelta.cBetOpportunity) {
          const pos = positions.get(botId)
          if (pos) stats.positions[pos].cBetOpps++
          if (metricDelta.cBet && pos) {
            stats.positions[pos].cBets++
          }
        }

        if (metricDelta.foldToCBetOpportunity) {
          stats.postflop.foldToCBetOpps++
          if (metricDelta.foldToCBet) stats.postflop.foldToCBets++
        }

        // Turn C-Bet: the flop c-bettor can continue on an unled turn.
        if (metricDelta.turnCBetOpportunity) {
          stats.postflop.turnCBetOpps++
          if (metricDelta.turnCBet) {
            stats.postflop.turnCBets++
          }
        }

        // AF: postflop aggression
        const aggressionClass = metricDelta.aggressionClass
        if (aggressionClass === 'aggressive') {
          stats.postflop.betsAndRaises++
        }
        if (aggressionClass === 'call') {
          stats.postflop.calls++
        }
        const street = state.phase as 'flop' | 'turn' | 'river'
        const role = metricDelta.aggressionRole ?? 'non-pfa'
        const pressure = (state.bettingContext?.toCall ?? 0) > 0
          ? 'facing-bet'
          : 'open-action'
        if (aggressionClass === 'aggressive') {
          stats.postflop.aggressionByStreet[street].aggressive++
          stats.postflop.aggressionByRole[role].aggressive++
          stats.postflop.aggressionByPressure[pressure].aggressive++
        } else if (aggressionClass === 'call') {
          stats.postflop.aggressionByStreet[street].calls++
          stats.postflop.aggressionByRole[role].calls++
          stats.postflop.aggressionByPressure[pressure].calls++
        }
      }

      state = game.getPublicState()
    }

    stats.vpipHands += metricAccumulator.vpipPlayers.size
    stats.pfrHands += metricAccumulator.pfrPlayers.size
    stats.threeBets += metricAccumulator.threeBetPlayers.size
    stats.threeBetOpportunities += metricAccumulator.threeBetOpportunityPlayers.size

    for (const playerId of metricAccumulator.vpipPlayers) {
      const position = positions.get(playerId)
      if (position) stats.positions[position].vpipHands++
    }
    for (const playerId of metricAccumulator.pfrPlayers) {
      const position = positions.get(playerId)
      if (position) stats.positions[position].pfrHands++
    }

    // C-Bet opportunities: last preflop aggressor could open flop betting.

    // Showdown tracking: hand reached showdown
    const results = game.getLastHandResults()
    const history = game.getPublicHandHistory()
    for (const [botId, botState] of botStates) {
      observeOpponentHistory(
        botId,
        botState,
        history,
        observationCursors.get(botId)!,
        profile.archetypeId,
      )
    }
    const revealedPlayerIds = history
      .filter((event): event is Extract<(typeof history)[number], { type: 'CardsRevealed' }> => event.type === 'CardsRevealed')
      .map(event => event.playerId)
    const showdown = summarizeShowdown(flopSeenPlayers, revealedPlayerIds)
    stats.postflop.handsSeenFlop += showdown.handsSeenFlop
    stats.postflop.wentToShowdown += showdown.wentToShowdown
    const reachedTurn = history.some(event => event.type === 'CommunityCardDealt' && event.phase === 'turn')
    const reachedRiver = history.some(event => event.type === 'CommunityCardDealt' && event.phase === 'river')
    if (reachedTurn) {
      for (const playerId of revealedPlayerIds) turnSeenPlayers.add(playerId)
    }
    if (reachedRiver) {
      for (const playerId of revealedPlayerIds) riverSeenPlayers.add(playerId)
    }
    stats.postflop.handsSeenTurn += turnSeenPlayers.size
    stats.postflop.handsSeenRiver += riverSeenPlayers.size
    if (showdown.wentToShowdown > 0) {
      stats.postflop.wonAtShowdown += new Set(
        results.filter(result => result.amount > 0).map(result => result.playerId),
      ).size
    }
  }

  stats.durationMs = Date.now() - startedAt
  return stats
}

function getPosition(state: Readonly<PublicGameState>, playerId: string): Position {
  const players = state.players.filter(player => player.status !== 'waiting')
  const playerIndex = players.findIndex(player => player.id === playerId)
  const dealer = state.players[state.dealerIndex]
  const dealerIndex = players.findIndex(player => player.id === dealer?.id)
  if (playerIndex < 0 || dealerIndex < 0) return 'middle'

  const playerCount = players.length
  const positionsFromDealer = (playerIndex - dealerIndex + playerCount) % playerCount
  return getPositionCategory(positionsFromDealer, playerCount)
}

function targetLabel(value: number, target: [number, number]): string {
  if (value < target[0]) return 'too tight'
  if (value > target[1]) return 'too loose'
  return 'in range'
}

function createRegressionEntry(
  profile: CalibrationProfile,
  format: FormatConfig,
  stats: SimulationStats,
): CalibrationRegressionEntry {
  let cBetOpportunities = 0
  let cBets = 0
  for (const position of ['early', 'middle', 'late', 'blinds'] as const) {
    cBetOpportunities += stats.positions[position].cBetOpps
    cBets += stats.positions[position].cBets
  }

  const postflop = stats.postflop
  return {
    variant: CALIB_VARIANT === 'omaha-high' ? 'omaha-high' : 'texas-holdem',
    archetype: profile.archetypeId,
    format: resolveTableFormat(format.playerCount),
    hands: stats.handsPlayed,
    metrics: {
      vpip: calibrationPercentage(stats.vpipHands, stats.playerHands),
      pfr: calibrationPercentage(stats.pfrHands, stats.playerHands),
      threeBet: calibrationPercentage(stats.threeBets, stats.threeBetOpportunities),
      cBet: calibrationPercentage(cBets, cBetOpportunities),
      foldToCBet: calibrationPercentage(postflop.foldToCBets, postflop.foldToCBetOpps),
      turnCBet: calibrationPercentage(postflop.turnCBets, postflop.turnCBetOpps),
      wtsd: calibrationPercentage(postflop.wentToShowdown, postflop.handsSeenFlop),
      aggressionFactor: postflop.calls > 0
        ? postflop.betsAndRaises / postflop.calls
        : 0,
    },
    invariants: {
      invalidActions: stats.actionErrors,
      deepOpenShoves: stats.deepOpenShoves,
      uncommittedDeepShoves: stats.uncommittedDeepShoves,
      metricViolations: calibrationInvariantViolations({
        threeBets: stats.threeBets,
        threeBetOpportunities: stats.threeBetOpportunities,
        cBets,
        cBetOpportunities,
        foldToCBets: postflop.foldToCBets,
        foldToCBetOpportunities: postflop.foldToCBetOpps,
        handsSeenFlop: postflop.handsSeenFlop,
        handsSeenTurn: postflop.handsSeenTurn,
        handsSeenRiver: postflop.handsSeenRiver,
        wentToShowdown: postflop.wentToShowdown,
        wonAtShowdown: postflop.wonAtShowdown,
      }),
    },
  }
}

function printStats(
  format: FormatConfig,
  stats: SimulationStats,
  regressionEntry: CalibrationRegressionEntry,
): boolean {
  const { vpip, pfr, threeBet } = regressionEntry.metrics

  console.log(`\n=== ${format.name} ===`)
  console.log(`Hands: ${stats.handsPlayed.toLocaleString('en-US')} · Player-hands: ${stats.playerHands.toLocaleString('en-US')} · ${stats.durationMs}ms`)
  const averageActiveOpponents = stats.postflop.activeOpponentSamples > 0
    ? stats.postflop.activeOpponentTotal / stats.postflop.activeOpponentSamples
    : 0
  console.log(
    `Table format: ${resolveTableFormat(format.playerCount)} (${format.playerCount} seats) · `
    + `Avg active opponents/postflop decision: ${averageActiveOpponents.toFixed(2)}`,
  )
  console.log(`VPIP: ${vpip.toFixed(2)}% (target ${format.target.vpip.join('–')}%, ${targetLabel(vpip, format.target.vpip)})`)
  console.log(`PFR:  ${pfr.toFixed(2)}% (target ${format.target.pfr.join('–')}%, ${targetLabel(pfr, format.target.pfr)})`)
  console.log(
    `3-bet: ${threeBet.toFixed(2)}% `
    + `(target ${format.target.threeBet.join('–')}%, ${targetLabel(threeBet, format.target.threeBet)}; `
    + `${stats.threeBets}/${stats.threeBetOpportunities} opportunities)`,
  )
  if (PRINT_CALIBRATION_DETAIL) {
    const categorySummary = HAND_STRENGTH_CATEGORIES
      .map(category => {
        const values = stats.threeBetByCategory[category]
        return values.opportunities > 0
          ? `${category} ${values.threeBets}/${values.opportunities} `
            + `(${calibrationPercentage(values.threeBets, values.opportunities).toFixed(1)}%)`
          : null
      })
      .filter((value): value is string => value !== null)
      .join(' · ')
    console.log(`3-bet by category: ${categorySummary}`)
  }

  console.log('Positions:')
  for (const position of ['early', 'middle', 'late', 'blinds'] as const) {
    const positionStats = stats.positions[position]
    if (positionStats.hands === 0) continue
    console.log(
      `  ${position.padEnd(7)} ${positionStats.hands.toString().padStart(6)} hands · ` +
      `VPIP ${calibrationPercentage(positionStats.vpipHands, positionStats.hands).toFixed(2).padStart(5)}% · ` +
      `PFR ${calibrationPercentage(positionStats.pfrHands, positionStats.hands).toFixed(2).padStart(5)}%`
    )
  }

  const totalActions = Object.values(stats.actions).reduce((sum, count) => sum + count, 0)
  const actionSummary = Object.entries(stats.actions)
    .map(([action, count]) => `${action} ${calibrationPercentage(count, totalActions).toFixed(1)}%`)
    .join(' · ')
  console.log(`Actions: ${actionSummary}`)
  console.log(`Deep open shoves >40 BB: ${stats.deepOpenShoves}`)
  console.log(`Uncommitted deep shoves: ${stats.uncommittedDeepShoves}`)

  // Postflop metrics
  const pf = stats.postflop
  let totalCBetOpps = 0
  let totalCBets = 0
  for (const pos of ['early', 'middle', 'late', 'blinds'] as const) {
    totalCBetOpps += stats.positions[pos].cBetOpps
    totalCBets += stats.positions[pos].cBets
  }
  const {
    cBet,
    foldToCBet,
    turnCBet,
    aggressionFactor: af,
    wtsd,
  } = regressionEntry.metrics
  const wssd = calibrationPercentage(pf.wonAtShowdown, pf.wentToShowdown)
  const invariantViolations = regressionEntry.invariants.metricViolations

  let allWithin = true
  console.log(
    `C-Bet: ${cBet.toFixed(1)}% (${totalCBets}/${totalCBetOpps} opportunities)`
    + (format.target.cBet ? ` (target ${format.target.cBet.join('–')}%, ${targetLabel(cBet, format.target.cBet)})` : ''),
  )
  console.log(
    `Fold-to-CBet: ${foldToCBet.toFixed(1)}% (${pf.foldToCBets}/${pf.foldToCBetOpps} opportunities)`
    + (format.target.foldToCBet ? ` (target ${format.target.foldToCBet.join('–')}%, ${targetLabel(foldToCBet, format.target.foldToCBet)})` : ''),
  )
  console.log(
    `Turn C-Bet: ${turnCBet.toFixed(1)}% (${pf.turnCBets}/${pf.turnCBetOpps} opportunities)`
    + (format.target.turnCBet ? ` (target ${format.target.turnCBet.join('–')}%, ${targetLabel(turnCBet, format.target.turnCBet)})` : ''),
  )
  console.log(
    `AF: ${af.toFixed(2)} (${pf.betsAndRaises} aggressive/${pf.calls} calls)`
    + (format.target.aggressionFactor ? ` (target ${format.target.aggressionFactor.join('–')}, ${targetLabel(af, format.target.aggressionFactor)})` : ''),
  )
  console.log(
    `WTSD: ${wtsd.toFixed(1)}% (${pf.wentToShowdown}/${pf.handsSeenFlop} flop-seen)`
    + (format.target.wtsd ? ` (target ${format.target.wtsd.join('–')}%, ${targetLabel(wtsd, format.target.wtsd)})` : ''),
  )
  console.log(`W$SD: ${wssd.toFixed(1)}%`)
  console.log(`Invalid-action fallbacks: ${stats.actionErrors}`)
  if (invariantViolations.length > 0) {
    console.log(`Metric invariant violations: ${invariantViolations.join('; ')}`)
  }

  const afLabel = (values: { aggressive: number; calls: number }) =>
    `${values.calls > 0 ? (values.aggressive / values.calls).toFixed(2) : 'n/a'} (${values.aggressive}/${values.calls})`
  console.log(
    `AF by street: flop ${afLabel(pf.aggressionByStreet.flop)} · `
    + `turn ${afLabel(pf.aggressionByStreet.turn)} · river ${afLabel(pf.aggressionByStreet.river)}`,
  )
  console.log(
    `AF by role: PFA ${afLabel(pf.aggressionByRole.pfa)} · `
    + `non-PFA ${afLabel(pf.aggressionByRole['non-pfa'])}`,
  )
  console.log(
    `AF by pressure: facing-bet ${afLabel(pf.aggressionByPressure['facing-bet'])} · `
    + `open-action ${afLabel(pf.aggressionByPressure['open-action'])}`,
  )

  if (PRINT_CALIBRATION_DETAIL) {
    console.log(
      `Showdown funnel: flop ${pf.handsSeenFlop} · turn ${pf.handsSeenTurn} · `
      + `river ${pf.handsSeenRiver} · showdown ${pf.wentToShowdown}`,
    )
  }

  if (process.env.CALIB_TRACE === '1' && stats.decisionTrace) {
    for (const streetKey of ['preflop', 'flop', 'turn', 'river']) {
      const byCat = stats.decisionTrace[streetKey]
      if (!byCat) continue
      console.log(`\n  Trace ${streetKey}:`)
      for (const catKey of Object.keys(byCat)) {
        const acts = byCat[catKey]
        const total = Object.values(acts).reduce((sum, count) => sum + count, 0)
        if (total === 0) continue
        const parts = Object.entries(acts)
          .map(([a, c]) => `${a} ${(c / total * 100).toFixed(0)}%`)
          .join(' · ')
        console.log(`    ${catKey.padEnd(9)} n=${total}  ${parts}`)
      }
    }
  }

  if (format.target.cBet) allWithin = allWithin && isWithinCalibrationTarget(cBet, format.target.cBet!)
  if (format.target.aggressionFactor) allWithin = allWithin && isWithinCalibrationTarget(af, format.target.aggressionFactor!)
  if (format.target.wtsd) allWithin = allWithin && isWithinCalibrationTarget(wtsd, format.target.wtsd!)
  if (format.target.foldToCBet) allWithin = allWithin && isWithinCalibrationTarget(foldToCBet, format.target.foldToCBet!)
  if (format.target.turnCBet) allWithin = allWithin && isWithinCalibrationTarget(turnCBet, format.target.turnCBet!)
  return isWithinCalibrationTarget(vpip, format.target.vpip)
    && isWithinCalibrationTarget(pfr, format.target.pfr)
    && isWithinCalibrationTarget(threeBet, format.target.threeBet)
    && allWithin
    && invariantViolations.length === 0
    && stats.deepOpenShoves === 0
    && stats.uncommittedDeepShoves === 0
    && stats.actionErrors === 0
}

let calibrationFailed = false
const regressionEntries: CalibrationRegressionEntry[] = []
console.log(`\n=== CPCdigital Calibration — ${CALIB_VARIANT === 'omaha-high' ? 'Omaha High (PLO)' : 'Texas Hold\'em (NLHE)'} · metric schema v${CALIBRATION_METRIC_SCHEMA_VERSION} ===`)
for (const profile of CALIBRATION_PROFILES.filter(
  profile => !CALIB_PROFILE || profile.archetypeId === CALIB_PROFILE || profile.name.toLowerCase().includes(CALIB_PROFILE),
)) {
  console.log(`\n${profile.name} simulation · ${HANDS_PER_FORMAT.toLocaleString('en-US')} hands per format`)
  for (const format of profile.formats.filter(
    format => !CALIB_FORMAT || format.name.toLowerCase().includes(CALIB_FORMAT),
  )) {
    const stats = simulateFormat(profile, format)
    const regressionEntry = createRegressionEntry(profile, format, stats)
    regressionEntries.push(regressionEntry)
    if (!printStats(format, stats, regressionEntry)) calibrationFailed = true
  }
}

if (PRINT_CALIBRATION_SNAPSHOT) {
  const snapshot: CalibrationRegressionSnapshot = {
    metricSchemaVersion: CALIBRATION_METRIC_SCHEMA_VERSION,
    handsPerFormat: HANDS_PER_FORMAT,
    entries: regressionEntries,
  }
  console.log(`${CALIBRATION_SNAPSHOT_MARKER}${JSON.stringify(snapshot)}`)
}

if (calibrationFailed && EXIT_ON_FAIL) throw new Error('Bot calibration missed at least one target range')
