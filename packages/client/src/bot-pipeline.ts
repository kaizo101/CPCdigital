import type { PlayerAction } from '@cpc/shared'
import { applyPersonalityModifiers } from './bot-action-modifiers'
import { scoreActions } from './bot-action-scoring'
import {
  defaultRandom,
  weightedChoice,
  type RandomSource,
} from './bot-action-selection'
import type { DecisionContext, ScoredAction } from './bot-decision-types'
import {
  addPerceptionReasons,
  applySkillPerception,
  type SkillPerceptionError,
} from './bot-skill-perception'

export { applyPersonalityModifiers } from './bot-action-modifiers'
export { scoreActions } from './bot-action-scoring'
export { weightedChoice } from './bot-action-selection'
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
  allActions: ScoredAction[]
  chosenUtility: number
  perceptionErrors: SkillPerceptionError[]
  stateUpdates: {
    raisedPreflop?: boolean
    lastAction?: 'bet' | 'check' | 'call' | 'fold' | null
    lastStreet?: string | null
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
  const chosenAction = weightedChoice(personalityActions, rng)
  const chosenScored = personalityActions.find(candidate => sameAction(candidate.action, chosenAction))
  const stateUpdates = deriveStateUpdates(chosenAction, context)

  return {
    action: chosenAction,
    allActions: personalityActions,
    chosenUtility: chosenScored?.utility ?? 0,
    perceptionErrors: perception.errors,
    stateUpdates,
  }
}

function deriveStateUpdates(
  action: PlayerAction,
  context: DecisionContext,
): DecisionResult['stateUpdates'] {
  const updates: DecisionResult['stateUpdates'] = { lastStreet: context.gameView.phase }

  if (action.type === 'raise') {
    updates.lastAction = 'bet'
    if (context.gameView.phase === 'preflop') updates.raisedPreflop = true
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

function sameAction(left: PlayerAction, right: PlayerAction): boolean {
  return left.type === right.type
    && (left.type !== 'raise' || (right.type === 'raise' && left.amount === right.amount))
}
