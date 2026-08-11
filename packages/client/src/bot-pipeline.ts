import type { PlayerAction } from '@cpc/shared'
import { applyPersonalityModifiers } from './bot-action-modifiers'
import { scoreActions } from './bot-action-scoring'
import {
  defaultRandom,
  selectionDiagnostics,
  weightedCandidateChoice,
  type SelectionDiagnostics,
  type RandomSource,
} from './bot-action-selection'
import type { DecisionContext, ScoredAction } from './bot-decision-types'
import {
  addPerceptionReasons,
  applySkillPerception,
  type SkillPerceptionError,
} from './bot-skill-perception'
import { isNlheRiverBetFoldOpening } from './bot-line-planning'

export { applyPersonalityModifiers } from './bot-action-modifiers'
export { scoreActions } from './bot-action-scoring'
export { weightedChoice } from './bot-action-selection'
export { selectionDiagnostics } from './bot-action-selection'
export type { RandomSource } from './bot-action-selection'
export { applySkillPerception } from './bot-skill-perception'
export type { SkillPerceptionError } from './bot-skill-perception'
export type {
  ActionIntent,
  BotGameView,
  DecisionContext,
  ScoredAction,
  ScoreCategory,
  ScoreContribution,
} from './bot-decision-types'

export interface DecisionResult {
  action: PlayerAction
  chosenCandidateId: string
  allActions: ScoredAction[]
  chosenUtility: number
  selectionDiagnostics: SelectionDiagnostics
  perceptionErrors: SkillPerceptionError[]
  perceivedHandAssessment: DecisionContext['handAssessment']
  perceivedOpponentRanges: NonNullable<DecisionContext['opponentRanges']>
  objectiveHandAssessment: DecisionContext['handAssessment']
  objectiveOpponentRanges: NonNullable<DecisionContext['opponentRanges']>
  objectiveStreetAnalysis: DecisionContext['streetAnalysis']
  stateUpdates: {
    raisedPreflop?: boolean
    lastAction?: 'bet' | 'check' | 'call' | 'fold' | null
    lastStreet?: string | null
    betFoldStreet?: string | null
  }
}

/** Pure orchestration: score, modify perception, then select an action. */
export function decideAction(
  context: DecisionContext,
  rng: RandomSource = defaultRandom,
): DecisionResult {
  const perception = applySkillPerception(context, rng)
  const scoredActions = addPerceptionReasons(
    scoreActions(perception.context),
    perception.errors,
  )
  const personalityActions = applyPersonalityModifiers(scoredActions, context)
  const chosenScored = weightedCandidateChoice(personalityActions, rng)
  const chosenAction = chosenScored.action
  const stateUpdates = deriveStateUpdates(chosenAction, context)

  return {
    action: chosenAction,
    chosenCandidateId: chosenScored.candidateId,
    allActions: personalityActions,
    chosenUtility: chosenScored.utility,
    selectionDiagnostics: selectionDiagnostics(personalityActions),
    perceptionErrors: perception.errors,
    perceivedHandAssessment: perception.context.handAssessment,
    perceivedOpponentRanges: perception.context.opponentRanges ?? [],
    objectiveHandAssessment: context.handAssessment,
    objectiveOpponentRanges: context.opponentRanges ?? [],
    objectiveStreetAnalysis: context.streetAnalysis,
    stateUpdates,
  }
}

function deriveStateUpdates(
  action: PlayerAction,
  context: DecisionContext,
): DecisionResult['stateUpdates'] {
  const updates: DecisionResult['stateUpdates'] = {
    lastStreet: context.gameView.phase,
    betFoldStreet: null,
  }

  if (action.type === 'raise') {
    updates.lastAction = 'bet'
    if (context.gameView.phase === 'preflop') updates.raisedPreflop = true
    if (isNlheRiverBetFoldOpening(context)) updates.betFoldStreet = context.gameView.phase
    return updates
  }

  if (action.type === 'all-in') {
    const amount = context.legalActions.allInAmount ?? 0
    updates.lastAction = amount > context.gameView.currentBet ? 'bet' : 'call'
    if (updates.lastAction === 'bet' && context.gameView.phase === 'preflop') {
      updates.raisedPreflop = true
    }
    return updates
  }

  updates.lastAction = action.type
  return updates
}
