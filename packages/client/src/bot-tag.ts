import type { PlayerAction, PublicGameState } from '@cpc/shared'
import { updateMentalState } from './bot-mental'
import { createBotState, createBotStateFromIdentity } from './bot-state'
import { getOpponentStats, shouldActOnRead, updateOpponentRead, updateOpponentSizing } from './bot-reads'
import { applyDecisionMemory, recordHandResult, resetHandMemory } from './bot-memory'
import { decideAction as pipelineDecide, type DecisionResult } from './bot-pipeline'
import type { BotState, BotPersonality, Position, MentalEvent } from './bot-types'
import type { ActiveHabit } from './bot-habits'
import type { DecisionContext } from './bot-pipeline'
import { analyzeStreetAction } from './bot-street-analysis'
import type { BotContext } from './bot-context'
import { deriveDecisionMetrics, type DecisionMetrics } from './bot-decision-metrics'
import { params } from './bot-params'
import type { VariantEvaluation, VariantHandAssessment } from './bot-variant-evaluation'
import { evaluateBotVariant } from './bot-variant-registry'
import { calculateChipUnit, roundToCents } from './utils/format'
import { getPreflopAction, getPreflopSituation } from './preflop-ranges'
import {
  CALLING_STATION_PERSONALITY,
  LAG_PERSONALITY,
  NIT_PERSONALITY,
  TAG_PERSONALITY,
} from './bot-archetypes'

export type { BotState, BotPersonality, Position, MentalEvent }
export { CALLING_STATION_PERSONALITY, LAG_PERSONALITY, NIT_PERSONALITY, TAG_PERSONALITY }
export type HandAssessment = VariantHandAssessment
export {
  applyDecisionMemory,
  createBotState,
  createBotStateFromIdentity,
  getOpponentStats,
  recordHandResult,
  resetHandMemory,
  updateMentalState,
  updateOpponentRead,
  updateOpponentSizing,
}

export interface BotDecision {
  action: PlayerAction
  decisionResult: DecisionResult
  evaluation: VariantEvaluation
  metrics: DecisionMetrics
}

// Main decision function using Pipeline for postflop
export function decideBotDecision(
  botContext: Readonly<BotContext>,
  botState: BotState,
  random: () => number = Math.random,
  botHabits?: ActiveHabit[],
): TagDecision {
  const {
    publicState: state,
    playerId: botId,
    ownCards: holeCards,
    bettingContext,
  } = botContext
  const me = state.players.find(p => p.id === botId)
  if (!me) throw new Error(`Missing bot player ${botId}`)

  const { totalPot: livePot, legalActions } = bettingContext
  const position = botContext.position.category
  const playerCount = state.players.filter(p => p.status !== 'folded' && p.status !== 'waiting').length
  const evaluation = evaluateBotVariant(botContext)
  const { handAssessment, boardTexture, preferredRaiseTo, categoryScores } = evaluation
  const metrics = deriveDecisionMetrics(bettingContext, state.bigBlind)

  const streetAnalysis = analyzeStreetAction(
    botId,
    botContext.actionHistory,
    state.phase,
    state.players.filter(p => p.status !== 'folded' && p.status !== 'waiting').map(p => p.id),
  )

  // Prefer the opponent whose aggression created the current decision. In
  // checked or multiway spots, use the active opponent with the strongest read.
  const latestAggressor = [...botContext.actionHistory].reverse().find(event =>
    event.type === 'PlayerActed'
    && event.phase === state.phase
    && event.playerId !== botId
    && (
      event.action.type === 'raise'
      || (event.action.type === 'all-in' && event.totalBet > event.currentBetBefore)
    )
  )
  const activeOpponents = state.players.filter(player =>
    player.id !== botId
    && player.status !== 'folded'
    && player.status !== 'waiting'
  )
  const opponent = latestAggressor
    ? activeOpponents.find(player => player.id === latestAggressor.playerId)
    : [...activeOpponents].sort((left, right) => {
        const leftSamples = botState.reads.opponents.get(left.id)?.handsSampled ?? 0
        const rightSamples = botState.reads.opponents.get(right.id)?.handsSampled ?? 0
        return rightSamples - leftSamples
      })[0]
  let opponentStats = undefined
  if (opponent) {
    const read = botState.reads.opponents.get(opponent.id)
    if (read && shouldActOnRead(read, botState.mentalState, identityArchetypeId(botState))) {
      opponentStats = getOpponentStats(read)
    }
  }

  // Create BotGameView (fair information only)
  const gameView = {
    myCards: holeCards,
    board: state.communityCards,
    pot: livePot,
    currentBet: state.currentBet,
    minRaiseTo: bettingContext.minRaiseTo,
    maxRaiseTo: bettingContext.maxRaiseTo,
    canRaise: !!(
      legalActions.raise
      || (legalActions.allInAmount != null && legalActions.allInAmount > state.currentBet)
    ),
    bigBlind: state.bigBlind,
    smallBlind: state.smallBlind,
    phase: state.phase as any,
    players: state.players.map(p => ({
      id: p.id,
      chips: p.chips,
      roundBet: p.roundBet,
      status: p.status,
      isDealer: p.id === state.players[state.dealerIndex]?.id
    })),
    dealerIndex: state.dealerIndex,
  }

  const context: DecisionContext = {
    gameView,
    variantId: evaluation.variantId,
    botId,
    botState,
    position,
    playerCount,
    boardTexture,
    handAssessment,
    metrics,
    legalActions,
    preferredRaiseTo,
    categoryScores,
    preflopRangeAction: state.phase === 'preflop' && holeCards.length === 2
      ? getPreflopAction(
          holeCards,
          position,
          getPreflopSituation(state, position),
          botContext.position.tableSize,
          preflopRangeFactor(
            botState.personality.preflopLooseness,
            botContext.position.tableSize,
            botState.personality.riskTolerance,
          ),
          preflopRaiseRangeFactor(
            botState.personality.preflopLooseness,
            botState.personality.aggression,
            botContext.position.tableSize,
          ),
        )
      : undefined,
    opponentStats,
    botHabits,
    streetAnalysis,
  }

  const result = pipelineDecide(context, { random })
  const action = result.action

  // Apply state updates from the decision (separated for purity)
  applyDecisionMemory(botState.memory, result.stateUpdates)

  const legalAction = legalizeBotAction(state, me, action)
  return {
    action: legalAction,
    decisionResult: { ...result, action: legalAction },
    evaluation,
    metrics,
  }
}

export function decideBotAction(
  botContext: Readonly<BotContext>,
  botState: BotState,
  random: () => number = Math.random,
): PlayerAction {
  return decideBotDecision(botContext, botState, random).action
}

/** Compatibility aliases while callers migrate from the original TAG-only entry point. */
export const decideTagDecision = decideBotDecision
export const decideTagAction = decideBotAction
export type TagDecision = BotDecision

export function preflopRangeFactor(
  preflopLooseness: number,
  tableSize: number = 6,
  riskTolerance: number = 50,
): number {
  const looseness = Math.max(0, Math.min(100, preflopLooseness))
  const clampedTableSize = Math.max(2, Math.min(9, tableSize))
  const risk = Math.max(0, Math.min(100, riskTolerance))
  const tableExpansionRate = clampedTableSize <= 6
    ? ((clampedTableSize - 2) / 4) * params.preflop.rangeFactorTableExpansionNear
    : params.preflop.rangeFactorTableExpansionNear + (((clampedTableSize - 6) / 3) * params.preflop.rangeFactorTableExpansionFar)
  const veryLooseExpansion = Math.max(0, looseness - 70) * tableExpansionRate
  const shortHandedDefenseExpansion = Math.max(0, risk - 80)
    * Math.max(0, looseness - 75)
    * 0.008
    * (Math.max(0, 6 - clampedTableSize) / 4)
  return params.preflop.rangeFactorBase + (looseness * params.preflop.rangeFactorLoosenessMul) + veryLooseExpansion + shortHandedDefenseExpansion
}

export function preflopRaiseRangeFactor(
  preflopLooseness: number,
  aggression: number,
  tableSize: number = 6,
): number {
  const rangeFactor = preflopRangeFactor(preflopLooseness, tableSize)
  const clampedAggression = Math.max(0, Math.min(100, aggression))
  if (clampedAggression >= params.preflop.raiseRangeLowAggCutoff) return rangeFactor
  return rangeFactor * (params.preflop.raiseRangeLowAggCompress + (clampedAggression / 100))
}

function identityArchetypeId(botState: BotState): 'tag' | 'nit' | 'lag' | 'calling-station' {
  const name = botState.personality.archetype.name
  if (name === 'Nit') return 'nit'
  if (name === 'LAG') return 'lag'
  if (name === 'Calling Station') return 'calling-station'
  return 'tag'
}

function legalizeBotAction(
  state: PublicGameState,
  player: PublicGameState['players'][number],
  action: PlayerAction,
): PlayerAction {
  const bettingContext = state.bettingContext
  if (!bettingContext || bettingContext.playerId !== player.id) {
    throw new Error(`Missing betting context for bot ${player.id}`)
  }
  const legal = bettingContext.legalActions
  const passiveAction: PlayerAction = legal.check
    ? { type: 'check' }
    : legal.callAmount != null
      ? { type: 'call' }
      : { type: 'fold' }

  if (action.type === 'fold') return legal.fold ? action : passiveAction
  if (action.type === 'check') return legal.check ? action : passiveAction
  if (action.type === 'call') return legal.callAmount != null ? action : passiveAction
  if (action.type === 'all-in') return legal.allInAmount != null ? action : passiveAction

  const aggressiveAllIn = legal.allInAmount != null && legal.allInAmount > state.currentBet
  if (!legal.raise) return aggressiveAllIn ? { type: 'all-in' } : passiveAction

  const betStep = calculateChipUnit(state.smallBlind, state.bigBlind)
  const snappedAmount = roundToCents(Math.round(action.amount / betStep) * betStep)
  const raiseAmount = Math.max(legal.raise.minAmount, snappedAmount)
  if (raiseAmount >= legal.raise.maxAmount) {
    return legal.allInAmount != null ? { type: 'all-in' } : { type: 'raise', amount: legal.raise.maxAmount }
  }

  return { type: 'raise', amount: raiseAmount }
}
