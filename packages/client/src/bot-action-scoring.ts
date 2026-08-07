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
import { isAtLeast } from './bot-variant-evaluation'
import { estimateOpponentRanges, rangeStrengthModifier } from './bot-range-estimation'
import { getSizingTell } from './bot-reads'
import { roundToCents } from './utils/format'
import { params } from './bot-params'

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
  const { gameView, handAssessment: hand, metrics, playerCount } = context
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `Fold with ${hand.category}`, context.categoryScores.fold[hand.category]),
    factor('hand-strength', `Strength: ${hand.strength}`, strengthScore('fold', hand.strength)),
    ...bettingFactors('fold', context),
    ...preflopStrategyFactors('fold', context),
  ]

  if (gameView.phase === 'preflop' && context.botState.memory.hand.raisedPreflop && metrics.potOdds <= 0.15) {
    contributions.push(factor('betting-context', 'Overwhelming preflop price after raising', -50))
  }
  if (playerCount > 3 && hand.category === 'weak') {
    contributions.push(factor('hand-strength', 'Weak hand in multiway pot', 15))
  }
  contributions.push(...opponentProfileFactors('fold', context))

  contributions.push(...rangeBasedFactors('fold', context))

  return buildAction({ type: 'fold' }, 'fold', contributions)
}

function scoreCheck(context: DecisionContext): ScoredAction {
  const { handAssessment: hand, position, gameView } = context
  const isRiver = gameView.phase === 'river'
  const outOfPosition = position === 'early' || position === 'blinds'
  const intent: ActionIntent = (isAtLeast(hand.category, 'strong'))
    && (!isRiver || outOfPosition)
    ? 'trap'
    : 'pot-control'
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `Check with ${hand.category}`, context.categoryScores.check[hand.category]),
    factor('hand-strength', `Strength: ${hand.strength}`, strengthScore('check', hand.strength)),
    ...preflopStrategyFactors('check', context),
  ]

  const analysis = context.streetAnalysis

  // Free card for draw: only benefits non-PFA callers, not the preflop aggressor
  // Must have remaining cards (not river) and the draw must be mathematically possible
  if (hand.drawTypes.length > 0 && gameView.phase !== 'river' && !(analysis && gameView.phase === 'flop' && analysis.iAmPreflopAggressor)) {
    contributions.push(factor('hand-strength', 'Free card for draw', 10))
  }
  if (position === 'late') contributions.push(factor('position', 'Late position information', 10))
  if (isRiver && (isAtLeast(hand.category, 'strong')) && !outOfPosition) {
    contributions.push(factor('hand-strength', 'River check in position misses value', -20))
  }

  // C-Bet opportunity missed: PFA checking flop is too passive
  if (analysis && gameView.phase === 'flop' && analysis.iAmPreflopAggressor) {
    if (hand.category !== 'premium' && hand.category !== 'strong') {
      contributions.push(factor('position', 'Check as PFA on flop — c-bet preferred', -30))
    }
  }

  return buildAction({ type: 'check' }, intent, contributions)
}

function scoreCall(context: DecisionContext): ScoredAction {
  const { gameView, handAssessment: hand, metrics, playerCount } = context
  const isRiver = gameView.phase === 'river'
  const outOfPosition = context.position === 'early' || context.position === 'blinds'
  const intent: ActionIntent = hand.drawTypes.length > 0
    ? 'draw'
    : hand.category === 'medium'
      ? 'bluff-catch'
      : isAtLeast(hand.category, 'strong')
        ? (isRiver && !outOfPosition) ? 'value' : 'trap'
        : 'pot-control'
  const handValue = (isAtLeast(hand.category, 'strong')) && !isRiver
    ? context.categoryScores.call.strong
    : context.categoryScores.call[hand.category]
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `Call with ${hand.category}`, handValue + strengthScore('call', hand.strength)),
    ...bettingFactors('call', context),
    ...preflopStrategyFactors('call', context),
  ]

  if (gameView.phase === 'preflop' && context.botState.memory.hand.raisedPreflop && metrics.potOdds <= 0.15) {
    contributions.push(factor('betting-context', 'Overwhelming preflop price after raising', 50))
  }
  if (playerCount > 3 && hand.category === 'weak') {
    contributions.push(factor('hand-strength', 'Weak hand in multiway pot', -20))
  }
  contributions.push(...opponentProfileFactors('call', context))

  contributions.push(...rangeBasedFactors('call', context))
  contributions.push(...weakCallDownFactors(context))

  return buildAction({ type: 'call' }, intent, contributions)
}

function scoreRaise(context: DecisionContext): ScoredAction {
  const { handAssessment: hand, position, boardTexture } = context
  const intent = aggressiveIntent(context)
  const depthFactors = preflopRaiseDepthFactors(context)
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `Raise with ${hand.category}`, (
      hand.category === 'weak'
        ? (hand.drawTypes.length > 0 ? context.categoryScores.raise['weak-draw'] : context.categoryScores.raise['weak-no-draw'])
        : context.categoryScores.raise[hand.category]
    ) + strengthScore('raise', hand.strength)),
    ...bettingFactors('raise', context),
    ...preflopStrategyFactors('raise', context),
    ...streetInitiativeFactors(context),
    ...depthFactors,
  ]

  if (hand.relativeStrength > 70) contributions.push(factor('hand-strength', 'High relative strength', params.scoring.raiseBonus.highRelStrength))
  else if (hand.relativeStrength < 30) contributions.push(factor('hand-strength', 'Low relative strength', params.scoring.raiseBonus.lowRelStrength))

  if (hand.nutPotential === 'nuts') contributions.push(factor('hand-strength', 'Nut potential', params.scoring.raiseBonus.nutPotential))
  else if (hand.nutPotential === 'near-nuts') contributions.push(factor('hand-strength', 'Near-nut potential', params.scoring.raiseBonus.nearNutPotential))
  else if (hand.nutPotential === 'second-nuts') contributions.push(factor('hand-strength', 'Second-nut potential', params.scoring.raiseBonus.secondNutPotential))
  if (hand.vulnerability > 60) contributions.push(factor('hand-strength', 'Protection against draws', params.scoring.raiseBonus.vulnerability))
  const vulnerablePloMadeHand = context.variantId === 'omaha-high'
    && context.gameView.board.length < 5
    && hand.made
    && hand.rank >= 4
    && hand.rank <= 6
    && hand.vulnerability > 60
  if (vulnerablePloMadeHand) {
    contributions.push(factor(
      'hand-strength',
      'PLO vulnerable made hand — deny equity',
      boardTexture === 'wet' ? 8 : 6,
    ))
  }
  if (hand.boardGotWorse && (hand.category === 'medium' || hand.category === 'good' || hand.category === 'strong')) {
    const sensitivity = context.variantId === 'omaha-high' ? 0.4 : 1
    contributions.push(factor('hand-strength', 'Board got more dangerous — protect harder', Math.round(8 * sensitivity)))
  }
  if (hand.drawQuality > 50) contributions.push(factor('hand-strength', 'Strong draw equity', params.scoring.raiseBonus.drawQuality))
  if (hand.cleanOuts >= 8) contributions.push(factor('hand-strength', `${hand.cleanOuts} clean outs`, params.scoring.raiseBonus.cleanOuts))
  if (position === 'late') contributions.push(factor('position', 'Late-position leverage', params.scoring.raiseBonus.latePosition))
  if (boardTexture === 'dry' && hand.category === 'air') {
    contributions.push(factor('board-texture', 'Dry board supports bluff', params.scoring.raiseBonus.dryBoardBluff))
  }

  contributions.push(...rangeBasedFactors('raise', context))

  const scored = buildAction(
    { type: 'raise', amount: calculateRaiseTo(context) },
    intent,
    contributions,
  )
  return preflopRaiseDepthBlocked(context)
    ? { ...scored, selectionEligible: false }
    : scored
}

function scoreAllIn(context: DecisionContext): ScoredAction {
  const { gameView, handAssessment: hand, legalActions, metrics } = context
  const allInAmount = legalActions.allInAmount ?? 0
  const passiveAllIn = allInAmount <= gameView.currentBet
  if (passiveAllIn) {
    const call = scoreCall(context)
    return { ...call, action: { type: 'all-in' } }
  }

  const riskFactors = aggressiveAllInRiskFactors(context)
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `All-in with ${hand.category}`, (
      hand.category === 'weak'
        ? (hand.drawTypes.length > 0 ? context.categoryScores.allIn['weak-draw'] : context.categoryScores.allIn['weak-no-draw'])
        : context.categoryScores.allIn[hand.category]
    ) + strengthScore('all-in', hand.strength)),
    ...bettingFactors('raise', context),
    ...preflopStrategyFactors('raise', context),
    ...riskFactors,
  ]

  if (gameView.phase !== 'preflop' && metrics.spr <= 2) {
    contributions.push(factor('betting-context', `Low SPR ${metrics.spr.toFixed(2)}`, params.scoring.allInMods.lowSpr))
  }
  if (gameView.phase !== 'preflop' && metrics.spr >= 6) {
    contributions.push(factor('betting-context', `High SPR ${metrics.spr.toFixed(2)}`, params.scoring.allInMods.highSpr))
  }
  if (metrics.effectiveStackBb >= 100) {
    contributions.push(factor('betting-context', `Deep stack ${metrics.effectiveStackBb.toFixed(0)} BB`, params.scoring.allInMods.deepStack))
  }
  if (metrics.effectiveStack > 0 && metrics.playerStack > metrics.effectiveStack * 2) {
    contributions.push(factor('betting-context', 'Stack greatly exceeds effective stack', params.scoring.allInMods.exceedsEffectiveStack))
  }
  if (hand.blockerValue >= 30 && hand.category === 'air') {
    contributions.push(factor('hand-strength', 'Relevant blocker', params.scoring.allInMods.blockerValue))
  }

  const scored = buildAction({ type: 'all-in' }, aggressiveIntent(context), contributions)
  return riskFactors.length > 0
    ? { ...scored, selectionEligible: false }
    : scored
}

function aggressiveIntent(context: DecisionContext): ActionIntent {
  const hand = context.handAssessment
  if (isAtLeast(hand.category, 'strong')) return 'value'
  if (hand.category === 'medium' && hand.made && hand.drawTypes.length === 0) return 'value'
  if (hand.drawTypes.length > 0) return 'semi-bluff'
  if (hand.category === 'medium') return 'protection'
  return 'bluff'
}

function aggressiveAllInRiskFactors(context: DecisionContext): ScoreContribution[] {
  const { gameView, handAssessment: hand, metrics } = context
  const preflop = gameView.phase === 'preflop'

  if (preflop) {
    if (preflopRaiseDepthBlocked(context)) {
      const proposedLevel = (context.streetAnalysis?.preflopRaiseCount ?? 0) + 2
      return [factor(
        'betting-context',
        `${proposedLevel}-bet shove requires a premium hand`,
        params.scoring.allInMods.uncommittedStrong,
      )]
    }
    const unopenedOrLimped = gameView.currentBet <= gameView.bigBlind
    if (unopenedOrLimped && metrics.effectiveStackBb > 40) {
      return [factor(
        'betting-context',
        `Deep-stack open shove ${metrics.effectiveStackBb.toFixed(0)} BB`,
        params.scoring.allInMods.deepOpenShove,
      )]
    }
    if (metrics.effectiveStackBb > 100 && metrics.callCommitment < 0.2) {
      return [factor(
        'betting-context',
        `Deep stack not committed (${metrics.effectiveStackBb.toFixed(0)} BB)`,
        params.scoring.allInMods.uncommittedDeep,
      )]
    }
    if (metrics.effectiveStackBb > 40 && hand.category !== 'premium' && metrics.callCommitment < 0.25) {
      return [factor(
        'betting-context',
        `Stack not committed for shove (${(metrics.callCommitment * 100).toFixed(0)}%)`,
        params.scoring.allInMods.uncommittedStrong,
      )]
    }
    return []
  }

  if (
    metrics.spr >= 6
    && metrics.effectiveStackBb >= 100
    && metrics.callCommitment < 0.25
    && hand.nutPotential !== 'nuts'
  ) {
    return [factor(
      'betting-context',
      `Deep postflop shove without commitment (SPR ${metrics.spr.toFixed(2)})`,
      params.scoring.allInMods.uncommittedPostflop,
    )]
  }

  return []
}

function weakCallDownFactors(context: DecisionContext): ScoreContribution[] {
  const { gameView, handAssessment: hand, streetAnalysis } = context
  if (
    context.variantId !== 'texas-holdem'
    || !streetAnalysis
    || (gameView.phase !== 'turn' && gameView.phase !== 'river')
    || (hand.category !== 'air' && hand.category !== 'weak')
    || hand.drawTypes.length > 0
  ) return []

  const aggressiveStreetCount = Math.max(0, ...[...streetAnalysis.opponentLines.values()].map(line => (
    [line.flop, line.turn, line.river].filter(action => (
      action === 'bet' || action === 'bet-call' || action === 'bet-fold' || action === 'check-raise'
    )).length
  )))
  const contributions: ScoreContribution[] = []

  if (aggressiveStreetCount >= 2) {
    contributions.push(factor(
      'betting-context',
      `${aggressiveStreetCount}-street pressure against weak showdown value`,
      gameView.phase === 'river'
        ? params.scoring.callDownMods.weakRiverPressure
        : params.scoring.callDownMods.weakTurnPressure,
    ))
  }
  if (gameView.phase === 'river' && !hand.made) {
    contributions.push(factor(
      'hand-strength',
      'No made hand at showdown',
      params.scoring.callDownMods.riverNoMadeHand,
    ))
  }

  return contributions
}

function bettingFactors(
  action: DecisionActionKind,
  context: DecisionContext,
): ScoreContribution[] {
  return getBettingContextFactors(action, context.metrics, {
    category: context.handAssessment.category,
    hasDraw: context.handAssessment.drawTypes.length > 0,
  }, {
    phase: context.gameView.phase,
    preflopRaiseCount: context.streetAnalysis?.preflopRaiseCount,
  }).map(({ label, value }) => factor('betting-context', label, value))
}

function preflopRaiseDepthFactors(context: DecisionContext): ScoreContribution[] {
  if (context.gameView.phase !== 'preflop') return []
  const raiseCount = context.streetAnalysis?.preflopRaiseCount ?? 0
  if (raiseCount < 2 || context.handAssessment.category === 'premium') return []

  const proposedLevel = raiseCount + 2
  const variantFactor = context.variantId === 'omaha-high' ? 8 : 6
  return [factor(
    'strategy',
    `${proposedLevel}-bet depth tightens non-premium range`,
    -variantFactor * (raiseCount - 1),
  )]
}

function preflopRaiseDepthBlocked(context: DecisionContext): boolean {
  return context.gameView.phase === 'preflop'
    && (context.streetAnalysis?.preflopRaiseCount ?? 0) >= 3
    && context.handAssessment.category !== 'premium'
}

function preflopStrategyFactors(
  action: 'fold' | 'check' | 'call' | 'raise',
  context: DecisionContext,
): ScoreContribution[] {
  const preferred = context.preflopRangeAction
  if (context.gameView.phase !== 'preflop' || !preferred) return []
  if (context.botState.memory.hand.raisedPreflop && context.metrics.potOdds <= 0.15) {
    // Already raised and facing tiny re-raise — can't fold, but don't blindly re-raise
    if (action === 'fold') return [factor('strategy', 'Overwhelming preflop price after raising', -50)]
    if (action === 'raise' && preferred !== 'raise') {
      return [factor('strategy', 'Reraising without premium hand', -35)]
    }
    return [factor('strategy', 'Must defend after raising — call', 15)]
  }

  const isPlo = context.variantId === 'omaha-high'
  const values: Record<typeof preferred, Record<typeof action, number>> = isPlo
    ? {
        fold: { fold: 12, check: 5, call: -15, raise: -20 },
        call: { fold: -10, check: 2, call: 10, raise: 0 },
        'call-or-fold': { fold: 2, check: 2, call: 8, raise: -12 },
        'raise-or-call': { fold: -12, check: -4, call: 3, raise: 17 },
        raise: { fold: -14, check: -8, call: -5, raise: 12 },
      }
    : {
        fold: { fold: 35, check: 15, call: -45, raise: -60 },
        call: { fold: -25, check: 5, call: 30, raise: -25 },
        'call-or-fold': { fold: 15, check: 5, call: 10, raise: -30 },
        'raise-or-call': { fold: -30, check: -10, call: 10, raise: 15 },
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
      boardGotWorse: context.handAssessment.boardGotWorse,
      boardWorseSensitivity: context.variantId === 'omaha-high' ? 0.4 : 1,
    },
    context.boardTexture,
    context.position,
    sa ? {
      iAmPreflopAggressor: sa.iAmPreflopAggressor,
      activeOpponents: sa.activeOpponents,
      opponentShowedWeakness: sa.opponentShowedWeakness,
      opponentCheckRaised: sa.opponentCheckRaised,
    } : undefined,
    context.botState.skill.level,
    {
      phase: context.gameView.phase,
      preflopRaiseCount: context.streetAnalysis?.preflopRaiseCount,
    },
  ))
}

function buildAction(
  action: PlayerAction,
  intent: ActionIntent,
  contributions: ScoreContribution[],
): ScoredAction {
  const rawUtility = params.scoring.utilityBaseline + contributions.reduce((sum, contribution) => sum + contribution.value, 0)
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

function strengthScore(action: 'fold' | 'check' | 'call' | 'raise' | 'all-in', strength: number): number {
  const w = params.scoring.strengthWeights
  switch (action) {
    case 'fold': return clip(Math.round((w.foldNeutral - strength) * 0.15), -8, 8)
    case 'check': return clip(Math.round((w.checkNeutral - strength) * 0.1), -5, 5)
    case 'call': return clip(Math.round((strength - w.callNeutral) * 0.12), -6, 6)
    case 'raise': return clip(Math.round((strength - w.raiseNeutral) * 0.15), -8, 8)
    case 'all-in': return clip(Math.round((strength - w.allInNeutral) * 0.15), -10, 10)
  }
}

function clip(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function skillLevelFactor(skill: number): number {
  for (const tier of params.scoring.skillTiers) {
    if (skill >= tier.threshold) return tier.factor
  }
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

  if (gameView.phase === 'flop' && analysis.iAmPreflopAggressor) {
    result.push(factor('position', 'Continuation bet opportunity', Math.round(params.scoring.streetInitiative.cbetOpportunity * skillFactor)))
    // PFA with air on dry board: classic bluff C-Bet scenario
    if (hand.category === 'air' && context.boardTexture === 'dry') {
      result.push(factor('position', 'Bluff C-Bet on dry board as PFA', Math.round(15 * skillFactor)))
    }
  }

  if ((gameView.phase === 'turn' || gameView.phase === 'river') && analysis.iAmPreflopAggressor) {
    if (analysis.streetAggressor.flop === null && analysis.streetAggressor.turn === null) {
      result.push(factor('position', 'Delayed c-bet after flop checked through', Math.round(params.scoring.streetInitiative.delayedCbet * skillFactor)))
    }
  }

  if (analysis.opponentShowedWeakness && skillFactor >= 0.3) {
    if (hand.category === 'air') {
      result.push(factor('position', 'Opponent showed weakness — steal opportunity', Math.round(params.scoring.streetInitiative.weaknessSteal * skillFactor)))
    }
    if (isAtLeast(hand.category, 'strong')) {
      result.push(factor('position', 'Opponent showed weakness — trap value', Math.round(params.scoring.streetInitiative.weaknessTrap * skillFactor)))
    }
  }

  if (analysis.opponentCheckRaised && skillFactor >= 0.2) {
    result.push(factor('position', 'Opponent check-raised — proceed with caution', Math.round(params.scoring.streetInitiative.checkRaiseCaution * skillFactor)))
  }

  if (analysis.activeOpponents >= 3) {
    if (hand.category === 'weak' || hand.category === 'air') {
      result.push(factor('board-texture', 'Multiway pot — weak hands lose value', params.scoring.streetInitiative.multiwayWeak))
    }
    if (hand.category === 'medium') {
      result.push(factor('board-texture', 'Multiway pot — medium hands cautious', params.scoring.streetInitiative.multiwayMedium))
    }
  }

  const opponentLines = [...(analysis.opponentLines.values() ?? [])]
  const strongOpponentLines = opponentLines.filter(l =>
    l.preflop === 'raised' && (l.flop?.startsWith('bet') || l.turn?.startsWith('bet')),
  )
  if (strongOpponentLines.length > 0 && hand.category !== 'premium') {
    result.push(factor('position', `Opponent shows strength (${strongOpponentLines.length} players)`, Math.round(params.scoring.streetInitiative.opponentStrength * skillFactor)))
  }

  const weakOpponentLines = opponentLines.filter(l =>
    l.flop === 'check-call' || l.turn === 'check-call' || l.flop === 'check-fold' || l.turn === 'check-fold',
  )
  if (weakOpponentLines.length > 0 && weakOpponentLines.length === opponentLines.length) {
    if (hand.category !== 'air') {
      result.push(factor('position', 'All opponents passive — value bet opportunity', Math.round(params.scoring.streetInitiative.passiveTableValue * skillFactor)))
    }
  }

  const flushAwareness = detectFlushDanger(context)
  if (flushAwareness > 0 && skillFactor >= 0.3) {
    result.push(factor('board-texture',
      `${flushAwareness} suited on board — no redraw`,
      Math.round(params.scoring.streetInitiative.flushDangerPerCard * flushAwareness * skillFactor)))
  }

  const boardDangers = assessBoardDangers(context.gameView)
  for (const danger of boardDangers) {
    result.push(factor('board-texture', danger.label, Math.round(danger.value * skillFactor)))
  }

  const reraiseLevel = detectReraiseLevel(context)
  if (reraiseLevel >= 1 && skillFactor >= 0.3) {
    result.push(factor('position', `Reraise spot (${reraiseLevel + 1}-bet) — tighten range`,
      params.scoring.streetInitiative.reraiseBase + reraiseLevel * params.scoring.streetInitiative.reraisePerLevel))
  }

  return result
}

function rangeBasedFactors(
  action: 'fold' | 'call' | 'raise',
  context: DecisionContext,
): ScoreContribution[] {
  const analysis = context.streetAnalysis
  if (!analysis) return []

  const ranges = estimateOpponentRanges(analysis)
  if (ranges.length === 0) return []

  const result: ScoreContribution[] = []

  for (const range of ranges) {
    const mods = rangeStrengthModifier(range.strength)
    const lineValue = action === 'fold' ? mods.fold : action === 'call' ? mods.call : mods.raise
    if (lineValue !== 0) {
      result.push(factor('opponent-read', `${range.summary} ${range.playerId}`, lineValue))
    }

    result.push(...opponentSizingEvidenceFactors(action, context, range.playerId))
  }

  return result
}

function opponentProfileFactors(
  action: 'fold' | 'call',
  context: DecisionContext,
): ScoreContribution[] {
  const stats = context.opponentStats
  if (!stats || stats.confidence <= 0.5 || context.metrics.toCallPotRatio <= 0) return []

  const hand = context.handAssessment
  const result: ScoreContribution[] = []
  const preflop = context.gameView.phase === 'preflop'
  const weakOrMedium = hand.category === 'air'
    || hand.category === 'weak'
    || hand.category === 'marginal'
    || hand.category === 'medium'

  if (stats.aggression < 40 && weakOrMedium) {
    const value = preflop ? 8 : 2
    result.push(factor(
      'opponent-read',
      'Normally passive opponent shows aggression',
      action === 'fold' ? value : -value,
    ))
  } else if (stats.aggression > 60 && hand.category === 'medium') {
    const value = preflop ? 4 : 2
    result.push(factor(
      'opponent-read',
      'Aggressive opponent can apply wider pressure',
      action === 'fold' ? -value : value,
    ))
  }

  if (action === 'call' && stats.vpip > 40 && isAtLeast(hand.category, 'strong')) {
    result.push(factor('opponent-read', 'Loose opponent can pay off value', 6))
  }

  return result
}

function detectFlushDanger(context: DecisionContext): number {
  const cards = context.gameView.board
  if (cards.length < 3) return 0

  const suitCounts = new Map<string, number>()
  for (const card of cards) {
    suitCounts.set(card.suit, (suitCounts.get(card.suit) ?? 0) + 1)
  }

  let maxSuit = ''
  let maxCount = 0
  for (const [suit, count] of suitCounts) {
    if (count > maxCount) { maxSuit = suit; maxCount = count }
  }

  if (maxCount < 3) return 0

  const playerSuitCount = context.gameView.myCards.filter(c => c.suit === maxSuit).length
  const holeCardsPerPlayer = context.gameView.myCards.length
  const neededForRedraw = holeCardsPerPlayer >= 4 ? 2 : 1
  if (playerSuitCount >= neededForRedraw) return 0

  return maxCount
}

function assessBoardDangers(gameView: { board: { suit: string; rank: string }[] }): { label: string; value: number }[] {
  const cards = gameView.board
  if (cards.length < 3) return []

  const dangers: { label: string; value: number }[] = []

  const ranks = cards.map(c => {
    const r: Record<string, number> = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 }
    return r[c.rank] ?? 0
  }).sort((a, b) => a - b)

  if (ranks.length >= 4) {
    for (let i = 0; i < ranks.length - 3; i++) {
      if (ranks[i + 3] - ranks[i] <= 4) {
        dangers.push({ label: 'Connected board — straight danger', value: params.scoring.boardDangers.connected })
        break
      }
    }
  }

  const rankCounts = new Map<number, number>()
  for (const r of ranks) rankCounts.set(r, (rankCounts.get(r) ?? 0) + 1)
  let pairs = 0
  for (const count of rankCounts.values()) {
    if (count === 2) pairs++
    if (count >= 3) {
      dangers.push({ label: 'Trips on board — boat danger', value: params.scoring.boardDangers.trips })
      break
    }
  }
  if (pairs === 1) {
    dangers.push({ label: 'Paired board — trips possible', value: params.scoring.boardDangers.paired })
  }
  if (pairs >= 2) {
    dangers.push({ label: 'Two pair on board — full house danger', value: params.scoring.boardDangers.twoPair })
  }

  const broadwayCards = ranks.filter(r => r >= 10).length
  if (broadwayCards >= 3) {
    dangers.push({ label: `${broadwayCards} broadways — straight/boat possible`, value: params.scoring.boardDangers.broadway })
  }

  return dangers
}

function opponentSizingEvidenceFactors(
  action: 'fold' | 'call' | 'raise',
  context: DecisionContext,
  opponentId: string,
): ScoreContribution[] {
  const analysis = context.streetAnalysis
  if (!analysis || context.gameView.phase === 'preflop' || context.metrics.toCallPotRatio <= 0) return []

  const skill = context.botState.skill.level
  if (skill < params.sizingTell.skillGate) return []
  const skillFactor = skillLevelFactor(skill)

  const phase = context.gameView.phase as 'flop' | 'turn' | 'river'
  const streetAggressor = analysis.streetAggressor[phase]
  if (streetAggressor !== opponentId) return []

  const read = context.botState.reads.opponents.get(opponentId)
  const potFraction = analysis.opponentLines.get(opponentId)?.aggressivePotFractions[phase]
  if (!read || potFraction == null) return []

  const tell = getSizingTell(read, potFraction, true)
  if (!tell) return []

  const overbetPenalty = tell.kind === 'massive-overbet'
    ? params.sizingTell.overbetPenalty
    : params.sizingTell.moderatePenalty
  const smallBetPressure = Math.abs(params.sizingTell.moderatePenalty)
  const smallBetRaiseFactor = clip(context.botState.personality.aggression / 60, 0.25, 1.25)
  const rawValue = tell.kind === 'small-bet'
    ? action === 'fold'
      ? -smallBetPressure
      : action === 'call'
        ? Math.ceil(smallBetPressure / 2)
        : smallBetPressure * smallBetRaiseFactor
    : action === 'fold' ? Math.abs(overbetPenalty) : action === 'call' ? Math.ceil(overbetPenalty / 2) : overbetPenalty
  const value = Math.round(rawValue * skillFactor)

  return value === 0 ? [] : [factor(
    'opponent-read',
    `Opponent ${opponentId}: ${tell.label} (${tell.deviation.toFixed(1)}x)`,
    value,
  )]
}

function detectReraiseLevel(context: DecisionContext): number {
  const analysis = context.streetAnalysis
  if (!analysis) return 0
  if (context.gameView.phase === 'preflop') return analysis.preflopRaiseCount

  const phase = context.gameView.phase as 'flop' | 'turn' | 'river'
  const streetAggressor = analysis.streetAggressor[phase]
  if (!streetAggressor) return 0

  if (streetAggressor === context.botId) return 0

  return 1
}
