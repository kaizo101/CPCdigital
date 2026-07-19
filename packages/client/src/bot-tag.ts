import type { PlayerAction, PublicGameState } from '@cpc/shared'
import { updateMentalState } from './bot-mental'
import { createBotState } from './bot-state'
import { getOpponentStats, updateOpponentRead } from './bot-reads'
import { applyDecisionMemory, recordHandResult, resetHandMemory } from './bot-memory'
import { decideAction as pipelineDecide, type DecisionResult } from './bot-pipeline'
import type { BotState, BotPersonality, Position, MentalEvent } from './bot-types'
import type { DecisionContext } from './bot-pipeline'
import type { BotContext } from './bot-context'
import { deriveDecisionMetrics, type DecisionMetrics } from './bot-decision-metrics'
import { evaluateBotVariant } from './bot-variant-registry'
import type { VariantEvaluation, VariantHandAssessment } from './bot-variant-evaluation'
import { calculateChipUnit, roundToCents } from './utils/format'

export type { BotState, BotPersonality, Position, MentalEvent }
export type HandAssessment = VariantHandAssessment
export {
  applyDecisionMemory,
  createBotState,
  getOpponentStats,
  recordHandResult,
  resetHandMemory,
  updateMentalState,
  updateOpponentRead,
}

// TAG Personality (as distribution for variance)
export const TAG_PERSONALITY: BotPersonality = {
  name: 'TAG',
  aggression: { mean: 65, stddev: 10 },
  bluffFrequency: { mean: 25, stddev: 8 },
  riskTolerance: { mean: 50, stddev: 12 },
  patience: { mean: 70, stddev: 10 },
  observationSkill: { mean: 60, stddev: 15 },
  tiltSensitivity: { mean: 40, stddev: 15 },  // Moderate tilt sensitivity
  tiltRecovery: { mean: 60, stddev: 15 },    // Good recovery
  emotionality: { mean: 50, stddev: 10 },    // Balanced emotionality
}

export interface TagDecision {
  action: PlayerAction
  decisionResult: DecisionResult
  evaluation: VariantEvaluation
  metrics: DecisionMetrics
}

// Main decision function using Pipeline for postflop
export function decideTagDecision(
  botContext: Readonly<BotContext>,
  botState: BotState,
  random: () => number = Math.random,
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
  const { handAssessment, boardTexture, preferredRaiseTo } = evaluation
  const metrics = deriveDecisionMetrics(bettingContext, state.bigBlind)

  // Get opponent stats if available
  const opponent = state.players.find(p => p.id !== botId && p.status === 'active')
  let opponentStats = undefined
  if (opponent) {
    const read = botState.reads.opponents.get(opponent.id)
    if (read && read.handsSampled > 5) {
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
    botId,
    botState,
    position,
    playerCount,
    boardTexture,
    handAssessment,
    metrics,
    legalActions,
    preferredRaiseTo,
    opponentStats
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

export function decideTagAction(
  botContext: Readonly<BotContext>,
  botState: BotState,
  random: () => number = Math.random,
): PlayerAction {
  return decideTagDecision(botContext, botState, random).action
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
  if (raiseAmount >= legal.raise.maxAmount) return { type: 'all-in' }

  return { type: 'raise', amount: raiseAmount }
}
