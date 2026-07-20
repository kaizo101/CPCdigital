import type { PlayerAction } from '@cpc/shared'
import {
  calculateContextualRaiseTo,
  getBettingContextFactors,
  type DecisionActionKind,
} from './bot-decision-metrics'
import type {
  ActionIntent,
  DecisionContext,
  ScoredAction,
  ScoreContribution,
} from './bot-decision-types'
import { estimateOpponentRanges, rangeStrengthModifier } from './bot-range-estimation'
import { roundToCents } from './utils/format'

export function scoreActions(context: DecisionContext): ScoredAction[] {
  const actions: ScoredAction[] = []
  const legal = context.legalActions

  if (legal.check) actions.push(scoreCheck(context))
  if (legal.fold) actions.push(scoreFold(context))
  if (legal.callAmount != null) actions.push(scoreCall(context))
  if (legal.raise) actions.push(scoreRaise(context))
  if (legal.allInAmount != null) actions.push(scoreAllIn(context))

  return actions
}

function scoreFold(context: DecisionContext): ScoredAction {
  const { gameView, handAssessment: hand, metrics, opponentStats, playerCount } = context
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `Fold with ${hand.category}`, {
      air: 10,
      weak: -10,
      medium: -30,
      strong: -50,
      nuts: -50,
    }[hand.category]),
    ...bettingFactors('fold', context),
    ...preflopStrategyFactors('fold', context),
  ]

  if (gameView.phase === 'preflop' && context.botState.memory.hand.raisedPreflop && metrics.potOdds <= 0.15) {
    contributions.push(factor('betting-context', 'Overwhelming preflop price after raising', -50))
  }
  if (playerCount > 3 && hand.category === 'weak') {
    contributions.push(factor('hand-strength', 'Weak hand in multiway pot', 15))
  }
  if (opponentStats && opponentStats.confidence > 0.5) {
    if (opponentStats.aggression > 60 && hand.category === 'weak') {
      contributions.push(factor('opponent-read', 'Aggressive opponent', 10))
    }
    if (opponentStats.aggression < 40 && hand.category === 'medium') {
      contributions.push(factor('opponent-read', 'Passive opponent', -10))
    }
  }

  contributions.push(...rangeBasedFactors('fold', context))

  return buildAction({ type: 'fold' }, 'fold', contributions)
}

function scoreCheck(context: DecisionContext): ScoredAction {
  const { handAssessment: hand, position, gameView } = context
  const isRiver = gameView.phase === 'river'
  const outOfPosition = position === 'early' || position === 'blinds'
  const intent: ActionIntent = (hand.category === 'strong' || hand.category === 'nuts')
    && (!isRiver || outOfPosition)
    ? 'trap'
    : 'pot-control'
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `Check with ${hand.category}`, {
      air: 20,
      weak: 20,
      medium: 10,
      strong: -30,
      nuts: -30,
    }[hand.category]),
    ...preflopStrategyFactors('check', context),
  ]

  if (hand.drawTypes.length > 0) contributions.push(factor('hand-strength', 'Free card for draw', 10))
  if (position === 'late') contributions.push(factor('position', 'Late position information', 10))
  if (isRiver && (hand.category === 'strong' || hand.category === 'nuts') && !outOfPosition) {
    contributions.push(factor('hand-strength', 'River check in position misses value', -20))
  }

  contributions.push(...rangeBasedFactors('call', context))

  return buildAction({ type: 'check' }, intent, contributions)
}

function scoreCall(context: DecisionContext): ScoredAction {
  const { gameView, handAssessment: hand, metrics, opponentStats, playerCount } = context
  const isRiver = gameView.phase === 'river'
  const outOfPosition = context.position === 'early' || context.position === 'blinds'
  const intent: ActionIntent = hand.drawTypes.length > 0
    ? 'draw'
    : hand.category === 'medium'
      ? 'bluff-catch'
      : hand.category === 'strong' || hand.category === 'nuts'
        ? (isRiver && !outOfPosition) ? 'value' : 'trap'
        : 'pot-control'
  const handValue = (hand.category === 'strong' || hand.category === 'nuts') && !isRiver
    ? -10
    : hand.category === 'medium'
      ? 20
      : hand.category === 'weak'
        ? 10
        : -25
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `Call with ${hand.category}`, handValue),
    ...bettingFactors('call', context),
    ...preflopStrategyFactors('call', context),
  ]

  if (gameView.phase === 'preflop' && context.botState.memory.hand.raisedPreflop && metrics.potOdds <= 0.15) {
    contributions.push(factor('betting-context', 'Overwhelming preflop price after raising', 50))
  }
  if (playerCount > 3 && hand.category === 'weak') {
    contributions.push(factor('hand-strength', 'Weak hand in multiway pot', -20))
  }
  if (opponentStats && opponentStats.confidence > 0.5) {
    if (opponentStats.aggression < 40) contributions.push(factor('opponent-read', 'Passive opponent', 10))
    if (opponentStats.aggression > 60 && hand.category === 'medium') {
      contributions.push(factor('opponent-read', 'Aggressive opponent', -5))
    }
    if (opponentStats.vpip > 40 && hand.category === 'strong') {
      contributions.push(factor('opponent-read', 'Loose opponent', 10))
    }
  }

  contributions.push(...rangeBasedFactors('call', context))

  return buildAction({ type: 'call' }, intent, contributions)
}

function scoreRaise(context: DecisionContext): ScoredAction {
  const { handAssessment: hand, position, boardTexture } = context
  const intent = aggressiveIntent(context)
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `Raise with ${hand.category}`, {
      air: -25,
      weak: hand.drawTypes.length > 0 ? 15 : -25,
      medium: 5,
      strong: 30,
      nuts: 40,
    }[hand.category]),
    ...bettingFactors('raise', context),
    ...preflopStrategyFactors('raise', context),
    ...streetInitiativeFactors(context),
  ]

  if (hand.relativeStrength > 70) contributions.push(factor('hand-strength', 'High relative strength', 10))
  else if (hand.relativeStrength < 30) contributions.push(factor('hand-strength', 'Low relative strength', -10))

  if (hand.nutPotential === 'nuts') contributions.push(factor('hand-strength', 'Nut potential', 15))
  else if (hand.nutPotential === 'near-nuts') contributions.push(factor('hand-strength', 'Near-nut potential', 8))
  if (hand.vulnerability > 60) contributions.push(factor('hand-strength', 'Protection against draws', 5))
  if (hand.drawQuality > 50) contributions.push(factor('hand-strength', 'Strong draw equity', 8))
  if (hand.cleanOuts >= 8) contributions.push(factor('hand-strength', `${hand.cleanOuts} clean outs`, 10))
  if (position === 'late') contributions.push(factor('position', 'Late-position leverage', 15))
  if (boardTexture === 'dry' && hand.category === 'air') {
    contributions.push(factor('board-texture', 'Dry board supports bluff', 10))
  }

  contributions.push(...rangeBasedFactors('raise', context))

  return buildAction(
    { type: 'raise', amount: calculateRaiseTo(context) },
    intent,
    contributions,
  )
}

function scoreAllIn(context: DecisionContext): ScoredAction {
  const { gameView, handAssessment: hand, legalActions, metrics } = context
  const allInAmount = legalActions.allInAmount ?? 0
  const passiveAllIn = allInAmount <= gameView.currentBet
  if (passiveAllIn) {
    const call = scoreCall(context)
    return { ...call, action: { type: 'all-in' } }
  }

  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `All-in with ${hand.category}`, {
      air: -42,
      weak: hand.drawTypes.length > 0 ? -18 : -42,
      medium: -15,
      strong: 28,
      nuts: 42,
    }[hand.category]),
    ...bettingFactors('raise', context),
    ...preflopStrategyFactors('raise', context),
  ]

  if (metrics.spr <= 2) contributions.push(factor('betting-context', `Low SPR ${metrics.spr.toFixed(2)}`, 12))
  if (metrics.spr >= 6) contributions.push(factor('betting-context', `High SPR ${metrics.spr.toFixed(2)}`, -42))
  if (metrics.effectiveStackBb >= 100) {
    contributions.push(factor('betting-context', `Deep stack ${metrics.effectiveStackBb.toFixed(0)} BB`, -10))
  }
  if (metrics.effectiveStack > 0 && metrics.playerStack > metrics.effectiveStack * 2) {
    contributions.push(factor('betting-context', 'Stack greatly exceeds effective stack', -35))
  }
  if (hand.blockerValue >= 30 && hand.category === 'air') {
    contributions.push(factor('hand-strength', 'Relevant blocker', 5))
  }

  return buildAction({ type: 'all-in' }, aggressiveIntent(context), contributions)
}

function aggressiveIntent(context: DecisionContext): ActionIntent {
  const hand = context.handAssessment
  if (hand.category === 'strong' || hand.category === 'nuts') return 'value'
  if (hand.drawTypes.length > 0) return 'semi-bluff'
  if (hand.category === 'medium') return 'protection'
  return 'bluff'
}

function bettingFactors(
  action: DecisionActionKind,
  context: DecisionContext,
): ScoreContribution[] {
  return getBettingContextFactors(action, context.metrics, {
    category: context.handAssessment.category,
    hasDraw: context.handAssessment.drawTypes.length > 0,
  }).map(({ label, value }) => factor('betting-context', label, value))
}

function preflopStrategyFactors(
  action: 'fold' | 'check' | 'call' | 'raise',
  context: DecisionContext,
): ScoreContribution[] {
  const preferred = context.preflopRangeAction
  if (context.gameView.phase !== 'preflop' || !preferred) return []
  if (context.botState.memory.hand.raisedPreflop && context.metrics.potOdds <= 0.15) return []

  const values: Record<typeof preferred, Record<typeof action, number>> = {
    fold: { fold: 35, check: 15, call: -45, raise: -60 },
    call: { fold: -25, check: 5, call: 30, raise: -25 },
    raise: { fold: -35, check: -20, call: -10, raise: 30 },
  }
  return [factor(
    'strategy',
    `Archetype preflop range prefers ${preferred}`,
    values[preferred][action],
  )]
}

function calculateRaiseTo(context: DecisionContext): number {
  if (context.preferredRaiseTo != null) return roundToCents(context.preferredRaiseTo)
  const sa = context.streetAnalysis
  return roundToCents(calculateContextualRaiseTo(
    context.metrics,
    {
      category: context.handAssessment.category,
      hasDraw: context.handAssessment.drawTypes.length > 0,
    },
    context.boardTexture,
    context.position,
    sa ? {
      iAmPreflopAggressor: sa.iAmPreflopAggressor,
      activeOpponents: sa.activeOpponents,
      opponentShowedWeakness: sa.opponentShowedWeakness,
      opponentCheckRaised: sa.opponentCheckRaised,
      isSqueezeSpot: sa.isSqueezeSpot,
    } : undefined,
    context.botState.skill.level,
  ))
}

function buildAction(
  action: PlayerAction,
  intent: ActionIntent,
  contributions: ScoreContribution[],
): ScoredAction {
  const rawUtility = 50 + contributions.reduce((sum, contribution) => sum + contribution.value, 0)
  const utility = Math.max(0, Math.min(100, rawUtility))
  if (utility !== rawUtility) {
    contributions.push(factor('base', 'Utility cap', utility - rawUtility))
  }
  return { action, intent, utility, contributions }
}

function baseContribution(): ScoreContribution {
  return factor('base', 'Neutral action baseline', 0)
}

function factor(
  category: ScoreContribution['category'],
  label: string,
  value: number,
): ScoreContribution {
  return { category, label, value }
}

function skillLevelFactor(skill: number): number {
  if (skill >= 90) return 1
  if (skill >= 70) return 0.85
  if (skill >= 50) return 0.65
  if (skill >= 30) return 0.4
  return 0.2
}

function streetInitiativeFactors(context: DecisionContext): ScoreContribution[] {
  const analysis = context.streetAnalysis
  if (!analysis) return []

  const skill = context.botState.skill.level
  const skillFactor = skillLevelFactor(skill)

  const result: ScoreContribution[] = []
  const { gameView } = context
  const hand = context.handAssessment

  if (analysis.squeezeOpportunity && skillFactor >= 0.4) {
    result.push(factor('position', 'Squeeze opportunity — dead money in pot', Math.round(10 * skillFactor)))
  }

  if (analysis.isSqueezeSpot && skillFactor >= 0.5) {
    result.push(factor('position', 'Squeeze spot — 3-bet wide for fold equity', Math.round(8 * skillFactor)))
  }

  if (gameView.phase === 'flop' && analysis.iAmPreflopAggressor) {
    result.push(factor('position', 'Continuation bet opportunity', Math.round(12 * skillFactor)))
  }

  if ((gameView.phase === 'turn' || gameView.phase === 'river') && analysis.iAmPreflopAggressor) {
    if (analysis.streetAggressor.flop === null && analysis.streetAggressor.turn === null) {
      result.push(factor('position', 'Delayed c-bet after flop checked through', Math.round(8 * skillFactor)))
    }
  }

  if (analysis.opponentShowedWeakness && skillFactor >= 0.3) {
    if (hand.category === 'air') {
      result.push(factor('position', 'Opponent showed weakness — steal opportunity', Math.round(10 * skillFactor)))
    }
    if (hand.category === 'strong' || hand.category === 'nuts') {
      result.push(factor('position', 'Opponent showed weakness — trap value', Math.round(-5 * skillFactor)))
    }
  }

  if (analysis.opponentCheckRaised && skillFactor >= 0.2) {
    result.push(factor('position', 'Opponent check-raised — proceed with caution', Math.round(-8 * skillFactor)))
  }

  if (analysis.activeOpponents >= 3) {
    if (hand.category === 'weak' || hand.category === 'air') {
      result.push(factor('board-texture', 'Multiway pot — weak hands lose value', -10))
    }
    if (hand.category === 'medium') {
      result.push(factor('board-texture', 'Multiway pot — medium hands cautious', -5))
    }
  }

  const opponentLines = [...(analysis.opponentLines.values() ?? [])]
  const strongOpponentLines = opponentLines.filter(l =>
    l.preflop === 'raised' && (l.flop?.startsWith('bet') || l.turn?.startsWith('bet')),
  )
  if (strongOpponentLines.length > 0 && hand.category !== 'nuts' && skillFactor >= 0.4) {
    result.push(factor('position', `Opponent shows strength (${strongOpponentLines.length} players)`, Math.round(-7 * skillFactor)))
  }

  const weakOpponentLines = opponentLines.filter(l =>
    l.flop === 'check-call' || l.turn === 'check-call' || l.flop === 'check-fold' || l.turn === 'check-fold',
  )
  if (weakOpponentLines.length > 0 && weakOpponentLines.length === opponentLines.length) {
    if (hand.category !== 'air') {
      result.push(factor('position', 'All opponents passive — value bet opportunity', Math.round(8 * skillFactor)))
    }
  }

  return result
}

function rangeBasedFactors(
  action: 'fold' | 'call' | 'raise',
  context: DecisionContext,
): ScoreContribution[] {
  const analysis = context.streetAnalysis
  if (!analysis) return []

  const ranges = estimateOpponentRanges(analysis, context.botId)
  if (ranges.length === 0) return []

  const result: ScoreContribution[] = []

  for (const range of ranges) {
    const mods = rangeStrengthModifier(range.strength)
    const value = action === 'fold' ? mods.fold : action === 'call' ? mods.call : mods.raise
    if (value !== 0) {
      result.push(factor('opponent-read', `${range.summary} ${range.playerId}`, value))
    }
  }

  return result
}
