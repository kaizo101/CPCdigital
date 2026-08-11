import type { Card, PlayerAction } from '@cpc/shared'
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
import { resolveTableFormat } from './bot-table-format'
import { getPloSprAdjustments, type PloSprAction } from './plo-spr-strategy'
import { hasAnalysisSkill } from './bot-skill-gates'
import { cardsToHandPattern } from './preflop-ranges'

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
  const { gameView, handAssessment: hand, metrics } = context
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `Fold with ${hand.category}`, context.categoryScores.fold[hand.category]),
    factor('hand-strength', `Strength: ${hand.strength}`, strengthScore('fold', hand.strength)),
    ...bettingFactors('fold', context),
    ...preflopStrategyFactors('fold', context),
    ...preflopEscalationFactors('fold', context),
  ]

  if (gameView.phase === 'preflop' && context.botState.memory.hand.raisedPreflop && metrics.potOdds <= 0.15) {
    contributions.push(factor('betting-context', 'Overwhelming preflop price after raising', -50))
  }
  contributions.push(...multiwayFactors('fold', context))
  contributions.push(...potCommitmentFactors('fold', context))
  contributions.push(...dynamicFoldFactors(context))
  contributions.push(...cbetDefenseFoldAdjustment(context))
  contributions.push(...ploSprFactors('fold', context))
  contributions.push(...ploWrapQualityFactors('fold', context))
  contributions.push(...equityCollapseFactors('fold', context))
  contributions.push(...ploRiverDisciplineFactors('fold', context))
  contributions.push(...ploPositionFactors('fold', context))
  contributions.push(...ploBlockerFactors('fold', context))
  contributions.push(...checkRaiseResponseFactors('fold', context))
  contributions.push(...floatDefenseFactors('fold', context))
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

  if (hand.drawTypes.length > 0 && gameView.phase !== 'river' && !(analysis && gameView.phase === 'flop' && analysis.iAmPreflopAggressor)) {
    contributions.push(factor('hand-strength', 'Free card for draw', 10))
  }
  if (position === 'late') contributions.push(factor('position', 'Late position information', 10))
  if (isRiver && (isAtLeast(hand.category, 'strong')) && !outOfPosition) {
    contributions.push(factor('hand-strength', 'River check in position misses value', -20))
  }

  if (analysis && gameView.phase === 'flop' && analysis.iAmPreflopAggressor) {
    if (hand.category !== 'premium' && hand.category !== 'strong') {
      contributions.push(factor('position', 'Check as PFA on flop — c-bet preferred', -30))
    }
  }
  contributions.push(...ploSprFactors('check', context))
  contributions.push(...ploWrapQualityFactors('check', context))
  contributions.push(...equityCollapseFactors('check', context))
  contributions.push(...ploPositionFactors('check', context))
  contributions.push(...ploBlockerFactors('check', context))
  contributions.push(...checkRaisePlanFactors('check', context))
  contributions.push(...turnBarrelCheckFactors(context))

  return buildAction({ type: 'check' }, intent, contributions)
}

function scoreCall(context: DecisionContext): ScoredAction {
  const { gameView, handAssessment: hand, metrics } = context
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
    ...preflopEscalationFactors('call', context),
  ]

  if (gameView.phase === 'preflop' && context.botState.memory.hand.raisedPreflop && metrics.potOdds <= 0.15) {
    contributions.push(factor('betting-context', 'Overwhelming preflop price after raising', 50))
  }
  contributions.push(...multiwayFactors('call', context))
  contributions.push(...potCommitmentFactors('call', context))
  contributions.push(...forcedAllInRiskFactors(context))
  contributions.push(...cbetDefenseCallBonus(context))
  contributions.push(...opponentProfileFactors('call', context))

  contributions.push(...rangeBasedFactors('call', context))
  contributions.push(...weakCallDownFactors(context))
  contributions.push(...ploSprFactors('call', context))
  contributions.push(...ploWrapQualityFactors('call', context))
  contributions.push(...equityCollapseFactors('call', context))
  contributions.push(...ploRiverDisciplineFactors('call', context))
  contributions.push(...ploPositionFactors('call', context))
  contributions.push(...ploBlockerFactors('call', context))
  contributions.push(...checkRaiseResponseFactors('call', context))
  contributions.push(...checkRaisePlanFactors('call', context))
  contributions.push(...floatDefenseFactors('call', context))

  return buildAction({ type: 'call' }, intent, contributions)
}

function scoreRaise(context: DecisionContext): ScoredAction {
  const { handAssessment: hand, position, boardTexture } = context
  const intent = aggressiveIntent(context)
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `Raise with ${hand.category}`, (
      hand.category === 'weak'
        ? (hand.drawTypes.length > 0 ? context.categoryScores.raise['weak-draw'] : context.categoryScores.raise['weak-no-draw'])
        : context.categoryScores.raise[hand.category]
    ) + strengthScore('raise', hand.strength)),
    ...bettingFactors('raise', context),
    ...preflopStrategyFactors('raise', context),
    ...formatPreflopRaiseFactors(context),
    ...streetInitiativeFactors(context),
    ...preflopEscalationFactors('raise', context),
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
  if (
    context.variantId !== 'omaha-high'
    && hand.boardGotWorse
    && (hand.category === 'medium' || hand.category === 'good' || hand.category === 'strong')
  ) {
    contributions.push(factor('hand-strength', 'Board got more dangerous — protect harder', 8))
  }
  if (hand.drawQuality > 50) contributions.push(factor('hand-strength', 'Strong draw equity', params.scoring.raiseBonus.drawQuality))
  if (hand.cleanOuts >= 8) contributions.push(factor('hand-strength', `${hand.cleanOuts} clean outs`, params.scoring.raiseBonus.cleanOuts))
  if (position === 'late') contributions.push(factor('position', 'Late-position leverage', params.scoring.raiseBonus.latePosition))
  if (boardTexture === 'dry' && hand.category === 'air') {
    contributions.push(factor('board-texture', 'Dry board supports bluff', params.scoring.raiseBonus.dryBoardBluff))
  }

  contributions.push(...rangeBasedFactors('raise', context))
  contributions.push(...ploSprFactors('raise', context))
  contributions.push(...ploWrapQualityFactors('raise', context))
  contributions.push(...equityCollapseFactors('raise', context))
  contributions.push(...ploRiverDisciplineFactors('raise', context))
  contributions.push(...ploPositionFactors('raise', context))
  contributions.push(...ploBlockerFactors('raise', context))
  contributions.push(...checkRaiseResponseFactors('raise', context))
  contributions.push(...checkRaisePlanFactors('raise', context))
  contributions.push(...floatDefenseFactors('raise', context))

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
    ...preflopEscalationFactors('all-in', context),
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
  if (context.variantId !== 'omaha-high' && hand.blockerValue >= 30 && hand.category === 'air') {
    contributions.push(factor('hand-strength', 'Relevant blocker', params.scoring.allInMods.blockerValue))
  }
  contributions.push(...ploSprFactors('all-in', context))
  contributions.push(...ploWrapQualityFactors('all-in', context))
  contributions.push(...equityCollapseFactors('all-in', context))
  contributions.push(...ploRiverDisciplineFactors('all-in', context))
  contributions.push(...ploPositionFactors('all-in', context))
  contributions.push(...ploBlockerFactors('all-in', context))
  contributions.push(...checkRaiseResponseFactors('all-in', context))
  contributions.push(...checkRaisePlanFactors('all-in', context))
  contributions.push(...floatDefenseFactors('all-in', context))

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
    if (metrics.effectiveStackBb > 100 && metrics.potCommitment < 0.2) {
      return [factor(
        'betting-context',
        `Deep stack not committed (${metrics.effectiveStackBb.toFixed(0)} BB)`,
        params.scoring.allInMods.uncommittedDeep,
      )]
    }
    if (metrics.effectiveStackBb > 40 && hand.category !== 'premium' && metrics.potCommitment < 0.25) {
      return [factor(
        'betting-context',
        `Stack not committed for shove (${(metrics.potCommitment * 100).toFixed(0)}%)`,
        params.scoring.allInMods.uncommittedStrong,
      )]
    }
    return []
  }

  if (
    metrics.spr >= 6
    && metrics.effectiveStackBb >= 100
    && metrics.potCommitment < 0.25
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

  const aggressiveStreetCount = maxAggressiveStreetCount(context)
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

function maxAggressiveStreetCount(context: DecisionContext): number {
  if (!context.streetAnalysis) return 0
  return Math.max(0, ...[...context.streetAnalysis.opponentLines.values()].map(line => (
    [line.flop, line.turn, line.river].filter(action => (
      action === 'bet' || action === 'bet-call' || action === 'bet-fold' || action === 'check-raise'
    )).length
  )))
}

function bettingFactors(
  action: DecisionActionKind,
  context: DecisionContext,
): ScoreContribution[] {
  return getBettingContextFactors(action, context.metrics, {
    category: context.handAssessment.category,
    hasDraw: context.handAssessment.drawTypes.length > 0,
    nutPotential: context.handAssessment.nutPotential,
  }, {
    phase: context.gameView.phase,
    preflopRaiseCount: context.streetAnalysis?.preflopRaiseCount,
    preflopReraisePenaltyScale: preflopReraisePenaltyScale(context),
    activeOpponents: context.streetAnalysis?.activeOpponents
      ?? Math.max(1, context.activePlayerCount - 1),
  }).map(({ label, value }) => factor('betting-context', label, value))
}

function preflopReraisePenaltyScale(context: DecisionContext): number {
  if (context.variantId !== 'omaha-high') return 0.5
  if (resolveTableFormat(context.tableSize) === 'heads-up') return 0

  const archetype = scoringArchetypeId(context)
  if (archetype === 'tag') return 0.55
  if (archetype === 'calling-station') return 0.5
  return 1
}

function formatPreflopRaiseFactors(context: DecisionContext): ScoreContribution[] {
  if (context.gameView.phase !== 'preflop') return []

  const format = resolveTableFormat(context.tableSize)
  const archetype = scoringArchetypeId(context)
  if (format === 'full-ring' && archetype === 'lag') {
    return [factor('position', 'LAG full-ring — preserve preflop initiative', 3)]
  }
  if (format !== 'heads-up') return []

  if (context.variantId !== 'omaha-high') return []

  const bonus = archetype === 'tag'
    ? 5
    : archetype === 'lag'
      ? 9
      : archetype === 'calling-station' ? 7 : 6
  return [factor(
    'position',
    'PLO heads-up — widen preflop initiative',
    bonus,
  )]
}

function ploSprFactors(
  action: PloSprAction,
  context: DecisionContext,
): ScoreContribution[] {
  return getPloSprAdjustments(action, context)
    .map(({ label, value }) => factor('betting-context', label, value))
}

function ploWrapQualityFactors(
  action: PloSprAction,
  context: DecisionContext,
): ScoreContribution[] {
  const config = params.scoring.ploWrapQualityMods
  if (
    context.variantId !== 'omaha-high'
    || context.gameView.phase === 'preflop'
    || !hasAnalysisSkill(context.botState.skill.level, 'wrapDominance')
  ) return []

  const quality = context.handAssessment.drawTypes.includes('nut-wrap')
    ? 'nut'
    : context.handAssessment.drawTypes.includes('mixed-wrap')
      ? 'mixed'
      : context.handAssessment.drawTypes.includes('second-wrap')
        ? 'second'
        : context.handAssessment.drawTypes.includes('bottom-wrap')
          ? 'bottom'
          : null
  if (!quality) return []

  const qualityConfig = config[quality]
  const baseValue = action === 'all-in' ? qualityConfig.allIn : qualityConfig[action]
  const skillScale = skillLevelFactor(context.botState.skill.level)
  const aggression = Math.max(0, Math.min(1, context.botState.personality.aggression / 100))
  const riskTolerance = Math.max(0, Math.min(1, context.botState.personality.riskTolerance / 100))
  const archetypeScale = quality === 'nut'
    ? 0.75 + aggression * 0.5
    : quality === 'second' || quality === 'bottom'
      ? Math.max(config.minimumDisciplineScale, 1 - riskTolerance)
      : 1

  return [factor(
    'hand-strength',
    `PLO ${quality} wrap — domination-aware straight outs`,
    Math.round(baseValue * skillScale * archetypeScale),
  )]
}

function equityCollapseFactors(
  action: PloSprAction,
  context: DecisionContext,
): ScoreContribution[] {
  const collapse = context.handAssessment.equityCollapse
  if (
    context.variantId !== 'omaha-high'
    || context.gameView.phase === 'preflop'
    || !hasAnalysisSkill(context.botState.skill.level, 'boardDynamics')
    || collapse <= 0
    || (action === 'fold' && context.metrics.callAmount <= 0)
  ) return []

  const config = params.scoring.equityCollapseMods
  const baseValue = action === 'all-in' ? config.allIn : config[action]
  const riskTolerance = Math.max(0, Math.min(1, context.botState.personality.riskTolerance / 100))
  const archetypeScale = Math.max(config.minimumArchetypeScale, 1 - riskTolerance)
  const pressureScale = context.metrics.callAmount > 0
    ? archetypeScale
    : config.openActionScale * archetypeScale
  return [factor(
    'board-texture',
    `PLO equity collapse ${(collapse * 100).toFixed(0)}% after board transition${pressureScale < 1 ? ' (open action)' : ''}`,
    Math.round(baseValue * collapse * pressureScale),
  )]
}

function ploRiverDisciplineFactors(
  action: Exclude<PloSprAction, 'check'>,
  context: DecisionContext,
): ScoreContribution[] {
  const hand = context.handAssessment
  if (
    context.variantId !== 'omaha-high'
    || context.gameView.phase !== 'river'
    || !hasAnalysisSkill(context.botState.skill.level, 'riverDiscipline')
    || context.metrics.callAmount <= 0
    || hand.nutPotential === 'nuts'
    || hand.nutPotential === 'near-nuts'
    || hand.nutPotential === 'second-nuts'
    || isAtLeast(hand.category, 'strong')
  ) return []

  const config = params.scoring.ploRiverDisciplineMods
  const blockerGap = Math.max(0, Math.min(1, 1 - hand.blockerValue / config.blockerThreshold))
  if (blockerGap <= 0) return []

  const riskTolerance = Math.max(0, Math.min(1, context.botState.personality.riskTolerance / 100))
  const archetypeScale = Math.max(config.minimumArchetypeScale, 1 - riskTolerance)
  const pressureStreets = maxAggressiveStreetCount(context)
  const pressureScale = 1 + Math.max(0, pressureStreets - 1) * config.pressureStep
  const overlapScale = hand.equityCollapse > 0 ? config.collapseOverlapScale : 1
  const baseValue = action === 'all-in' ? config.allIn : config[action]
  const value = Math.round(baseValue * blockerGap * archetypeScale * pressureScale * overlapScale)

  return [factor(
    'betting-context',
    `PLO river discipline — ${pressureStreets || 1}-street pressure, blocker ${Math.round(hand.blockerValue)}`
      + `${overlapScale < 1 ? ', collapse overlap reduced' : ''}`,
    value,
  )]
}

function isPostflopInPosition(context: DecisionContext): boolean {
  const players = context.gameView.players
  const botIndex = players.findIndex(player => player.id === context.botId)
  const dealerIndex = players.findIndex(player => player.isDealer)
  const activeActors = players
    .map((player, index) => ({ player, index }))
    .filter(({ player }) => player.status === 'active')
  if (botIndex < 0 || dealerIndex < 0 || activeActors.length < 2) return false

  const postflopOrder = (index: number) => (
    index - ((dealerIndex + 1) % players.length) + players.length
  ) % players.length
  const latestActionOrder = Math.max(...activeActors.map(({ index }) => postflopOrder(index)))
  return postflopOrder(botIndex) === latestActionOrder
}

function ploPositionFactors(
  action: PloSprAction,
  context: DecisionContext,
): ScoreContribution[] {
  if (context.variantId !== 'omaha-high' || context.gameView.phase === 'preflop') return []

  const hand = context.handAssessment
  const config = params.scoring.ploPositionMods
  const inPosition = isPostflopInPosition(context)
  const result: ScoreContribution[] = []
  const freeroll = hasAnalysisSkill(context.botState.skill.level, 'freeroll')
    && context.gameView.phase !== 'river'
    && hand.made
    && isAtLeast(hand.category, 'good')
    && hand.drawTypes.length > 0
    && hand.cleanOuts >= config.freerollMinCleanOuts
    && (hand.nutPotential === 'nuts'
      || hand.nutPotential === 'near-nuts'
      || hand.nutPotential === 'second-nuts'
      || hand.nutPotential === 'strong')

  if (freeroll) {
    const aggressionScale = 0.75 + Math.max(0, Math.min(100, context.botState.personality.aggression)) / 200
    const baseValue = action === 'all-in' ? config.freerollAllIn : {
      fold: config.freerollFold,
      check: config.freerollCheck,
      call: config.freerollCall,
      raise: config.freerollRaise,
    }[action]
    result.push(factor(
      'position',
      `PLO freeroll — made ${hand.nutPotential} hand with ${hand.cleanOuts} clean redraw outs`,
      Math.round(baseValue * aggressionScale),
    ))
  } else if (
    action === 'check'
    && inPosition
    && context.metrics.callAmount <= 0
    && hand.drawTypes.length > 0
  ) {
    result.push(factor('position', 'PLO in position — realize thin redraw for free', config.ipCheckEquity))
  }

  const realizableEquity = hand.drawTypes.length > 0
    || hand.category === 'marginal'
    || hand.category === 'medium'
    || hand.category === 'good'
  const riverDefendable = context.gameView.phase !== 'river'
    || hand.blockerValue > 0
    || hand.nutPotential === 'strong'
  if (
    action === 'fold'
    && !inPosition
    && context.metrics.callAmount > 0
    && realizableEquity
    && riverDefendable
  ) {
    const riskScale = 0.5 + Math.max(0, Math.min(100, context.botState.personality.riskTolerance)) / 200
    result.push(factor(
      'position',
      'PLO out of position — avoid exploitable fold with realizable equity',
      Math.round(config.oopFoldEquity * riskScale),
    ))
  }

  return result
}

function ploBlockerFactors(
  action: PloSprAction,
  context: DecisionContext,
): ScoreContribution[] {
  const hand = context.handAssessment
  if (
    context.variantId !== 'omaha-high'
    || context.gameView.phase === 'preflop'
    || !hasAnalysisSkill(context.botState.skill.level, 'blocker')
    || hand.blockerValue <= 0
  ) return []

  const config = params.scoring.ploBlockerMods
  const blockerScale = Math.max(0, Math.min(1, hand.blockerValue / config.nutThreshold))
  const skillScale = skillLevelFactor(context.botState.skill.level)
  const aggression = Math.max(0, Math.min(1, context.botState.personality.aggression / 100))
  const riskTolerance = Math.max(0, Math.min(1, context.botState.personality.riskTolerance / 100))
  const aggressionScale = 0.75 + aggression * 0.5
  const defenseScale = 0.5 + riskTolerance * 0.5
  const valueCandidate = hand.made && isAtLeast(hand.category, 'good')
  const bluffCandidate = !valueCandidate
    && (hand.category === 'air' || hand.category === 'weak' || hand.category === 'marginal')
  const bluffCatchCandidate = hand.made
    || hand.category === 'medium'
    || hand.category === 'marginal'

  let baseValue = 0
  let archetypeScale = 1
  let role: 'bluff-catch' | 'bluff' | 'value' | null = null

  if (
    (action === 'fold' || action === 'call')
    && context.metrics.callAmount > 0
    && bluffCatchCandidate
  ) {
    baseValue = action === 'fold' ? config.foldDefense : config.callDefense
    archetypeScale = defenseScale
    role = 'bluff-catch'
  } else if (action === 'check' && context.metrics.callAmount <= 0) {
    if (bluffCandidate) {
      baseValue = config.bluffCheck
      archetypeScale = aggressionScale
      role = 'bluff'
    } else if (valueCandidate) {
      baseValue = config.valueCheck
      archetypeScale = aggressionScale
      role = 'value'
    }
  } else if (action === 'raise') {
    if (bluffCandidate) {
      baseValue = config.bluffRaise
      archetypeScale = aggressionScale
      role = 'bluff'
    } else if (valueCandidate) {
      baseValue = config.valueRaise
      archetypeScale = aggressionScale
      role = 'value'
    }
  } else if (action === 'all-in') {
    if (bluffCandidate) {
      baseValue = config.bluffAllIn
      archetypeScale = aggressionScale
      role = 'bluff'
    } else if (valueCandidate) {
      baseValue = config.valueAllIn
      archetypeScale = aggressionScale
      role = 'value'
    }
  }

  if (!role || baseValue === 0) return []
  return [factor(
    'hand-strength',
    `PLO blocker ${Math.round(hand.blockerValue)} — ${role}`,
    Math.round(baseValue * blockerScale * skillScale * archetypeScale),
  )]
}

function checkRaiseResponseFactors(
  action: Exclude<PloSprAction, 'check'>,
  context: DecisionContext,
): ScoreContribution[] {
  const analysis = context.streetAnalysis
  const config = params.scoring.checkRaiseMods
  if (
    context.gameView.phase === 'preflop'
    || !analysis?.opponentCheckRaised
    || context.metrics.callAmount <= 0
    || context.botState.skill.level < config.respectSkillGate
  ) return []

  const hand = context.handAssessment
  const protectedHand = context.variantId === 'omaha-high'
    ? hand.category === 'premium'
      || hand.nutPotential === 'nuts'
      || hand.nutPotential === 'near-nuts'
      || hand.nutPotential === 'second-nuts'
    : isAtLeast(hand.category, 'strong')
  const baseValue = action === 'fold'
    ? protectedHand ? config.foldProtected : config.foldRespect
    : action === 'call'
      ? protectedHand ? config.callProtected : config.callRespect
      : protectedHand
        ? 0
        : action === 'raise' ? config.reraiseRespect : config.allInRespect
  if (baseValue === 0) return []

  const pressureScale = 1 + Math.min(
    config.maxPressureScale - 1,
    Math.max(0, context.metrics.toCallPotRatio) * 0.5,
  )
  const riskTolerance = Math.max(0, Math.min(1, context.botState.personality.riskTolerance / 100))
  const archetypeScale = 0.75 + (1 - riskTolerance) * 0.5
  const variantScale = context.variantId === 'omaha-high' ? config.ploRespectScale : 1
  const skillScale = skillLevelFactor(context.botState.skill.level)

  return [factor(
    'betting-context',
    `Opponent check-raised — ${protectedHand ? 'protected continuation' : 'range-strength respect'}`,
    Math.round(baseValue * pressureScale * archetypeScale * variantScale * skillScale),
  )]
}

function checkRaisePlanFactors(
  action: Exclude<PloSprAction, 'fold'>,
  context: DecisionContext,
): ScoreContribution[] {
  const config = params.scoring.checkRaiseMods
  const analysis = context.streetAnalysis
  if (
    context.gameView.phase === 'preflop'
    || context.botState.skill.level < config.planningSkillGate
    || !analysis
    || analysis.activeOpponents !== 1
  ) return []

  const hand = context.handAssessment
  const valueCandidate = hand.made && (
    isAtLeast(hand.category, 'strong')
    || hand.nutPotential === 'nuts'
    || hand.nutPotential === 'near-nuts'
  ) && hand.equityCollapse === 0
  const semiBluffCandidate = hand.drawTypes.length > 0
    && hand.cleanOuts >= (context.variantId === 'omaha-high' ? 8 : 6)
    && hand.nutPotential !== 'weak'
  if (!valueCandidate && !semiBluffCandidate) return []

  const aggression = Math.max(0, Math.min(1, context.botState.personality.aggression / 100))
  const scale = skillLevelFactor(context.botState.skill.level) * (0.75 + aggression * 0.5)
  const openActionPlan = action === 'check'
    && context.metrics.callAmount <= 0
    && !isPostflopInPosition(context)
    && !analysis.iCheckedCurrentStreet
  const executionOpportunity = action !== 'check'
    && context.metrics.callAmount > 0
    && analysis.iCheckedCurrentStreet === true
    && analysis.iCheckRaisedCurrentStreet !== true
    && analysis.streetAggressor[context.gameView.phase] !== context.botId
  if (!openActionPlan && !executionOpportunity) return []

  let baseValue = 0
  if (openActionPlan) {
    baseValue = valueCandidate ? config.planCheckValue : config.planCheckDraw
  } else if (action === 'call') {
    baseValue = valueCandidate ? config.executeCallValue : config.executeCallDraw
  } else if (action === 'raise') {
    baseValue = valueCandidate ? config.executeRaiseValue : config.executeRaiseDraw
  } else if (action === 'all-in') {
    baseValue = valueCandidate ? config.executeAllInValue : config.executeAllInDraw
  }
  if (baseValue === 0) return []

  return [factor(
    'strategy',
    `Check-raise plan — ${valueCandidate ? 'value trap' : 'nut-draw semi-bluff'}`,
    Math.round(baseValue * scale),
  )]
}

function floatDefenseFactors(
  action: Exclude<PloSprAction, 'check'>,
  context: DecisionContext,
): ScoreContribution[] {
  const config = params.scoring.floatDefenseMods
  const floaters = context.streetAnalysis?.turnFloatPlayerIds ?? []
  if (
    context.variantId !== 'texas-holdem'
    || context.gameView.phase !== 'turn'
    || floaters.length === 0
    || context.metrics.callAmount <= 0
    || context.botState.skill.level < config.skillGate
  ) return []

  const hand = context.handAssessment
  const valueCandidate = hand.made && isAtLeast(hand.category, 'strong')
  const bluffCatchCandidate = hand.made
    && (hand.category === 'marginal' || hand.category === 'medium' || hand.category === 'good')
  const drawCandidate = hand.drawTypes.length > 0 && hand.cleanOuts >= 6
  const blockerBluffCandidate = !hand.made
    && hand.drawTypes.length === 0
    && hand.blockerValue >= 30
    && context.botState.personality.aggression >= 60
  const defendCandidate = valueCandidate || bluffCatchCandidate || drawCandidate
  if (!defendCandidate && !blockerBluffCandidate) return []

  let baseValue = 0
  if (action === 'fold' && defendCandidate) {
    baseValue = config.foldCandidate
  } else if (action === 'call' && defendCandidate) {
    baseValue = valueCandidate ? config.callValue : config.callCandidate
  } else if (action === 'raise') {
    baseValue = valueCandidate
      ? config.raiseValue
      : blockerBluffCandidate
        ? config.raiseBlockerBluff
        : defendCandidate ? config.raiseCandidate : 0
  } else if (action === 'all-in' && valueCandidate) {
    baseValue = config.allInValue
  }
  if (baseValue === 0) return []

  const priceScale = Math.max(
    config.largeBetFloor,
    1 - Math.max(0, context.metrics.toCallPotRatio) * 0.5,
  )
  const boardScale = hand.boardGotWorse ? config.worseBoardScale : 1
  const riskTolerance = Math.max(0, Math.min(1, context.botState.personality.riskTolerance / 100))
  const aggression = Math.max(0, Math.min(1, context.botState.personality.aggression / 100))
  const archetypeScale = action === 'raise' || action === 'all-in'
    ? 0.75 + aggression * 0.5
    : 0.75 + riskTolerance * 0.5
  const read = context.opponentStats
  const readScale = read && read.aggression > 50
    ? 1 + ((read.aggression - 50) / 50) * read.confidence * config.aggressiveReadBoost
    : 1
  const value = Math.round(
    baseValue
    * priceScale
    * boardScale
    * archetypeScale
    * readScale
    * skillLevelFactor(context.botState.skill.level),
  )
  if (value === 0) return []

  return [factor(
    'opponent-read',
    `Turn float detected from ${floaters.join(', ')} — ${valueCandidate ? 'protect value' : blockerBluffCandidate ? 'blocker rebluff' : 'controlled defense'}`,
    value,
  )]
}

type PreflopEscalationAction = 'fold' | 'call' | 'raise' | 'all-in'

function preflopEscalationProfile(context: DecisionContext): {
  raiseCount: number
  coreValue: boolean
  polarizedBluff: boolean
  committed: boolean
} | null {
  if (context.gameView.phase !== 'preflop') return null
  const raiseCount = context.streetAnalysis?.preflopRaiseCount ?? 0
  if (raiseCount < 2) return null

  const config = params.scoring.preflopEscalationMods
  const cards = context.gameView.myCards
  const pattern = context.variantId === 'texas-holdem' && cards.length === 2
    ? cardsToHandPattern(cards as [Card, Card])
    : null
  const deepValueCore = pattern === 'AA' || pattern === 'KK'
  const normalValueCore = context.handAssessment.category === 'premium'
    && context.metrics.effectiveStackBb <= config.maxPolarizedStackBb
  const coreValue = deepValueCore || normalValueCore
  const committed = context.metrics.potCommitment >= config.commitmentGate
  const polarizedBluff = context.variantId === 'texas-holdem'
    && (pattern === 'A5s' || pattern === 'A4s')
    && context.botState.skill.level >= config.skillGate
    && context.botState.personality.aggression >= config.aggressionGate
    && context.metrics.effectiveStackBb <= config.maxPolarizedStackBb

  return { raiseCount, coreValue, polarizedBluff, committed }
}

function preflopEscalationFactors(
  action: PreflopEscalationAction,
  context: DecisionContext,
): ScoreContribution[] {
  const profile = preflopEscalationProfile(context)
  if (!profile) return []
  const config = params.scoring.preflopEscalationMods
  const { raiseCount, coreValue, polarizedBluff, committed } = profile
  let value: number
  let rangeLabel: string

  if (raiseCount === 2) {
    const scores = config.fourBet
    rangeLabel = coreValue ? 'value core' : polarizedBluff ? 'polarized ace blocker' : 'non-core range'
    if (action === 'fold') value = coreValue ? scores.valueFold : polarizedBluff ? scores.polarizedFold : scores.defaultFold
    else if (action === 'call') value = coreValue ? scores.valueCall : polarizedBluff ? scores.polarizedCall : scores.defaultCall
    else if (action === 'raise') value = coreValue ? scores.valueRaise : polarizedBluff ? scores.polarizedRaise : scores.defaultRaise
    else value = coreValue && (committed || context.metrics.effectiveStackBb <= config.shortValueStackBb)
      ? scores.valueAllIn
      : scores.defaultAllIn
  } else if (raiseCount === 3) {
    const scores = config.fiveBet
    const committedPolarizedBluff = polarizedBluff && committed
    rangeLabel = coreValue ? 'value core' : committedPolarizedBluff ? 'committed ace-blocker bluff' : 'fold-to-5-bet range'
    if (action === 'fold') value = coreValue ? scores.valueFold : committedPolarizedBluff ? scores.polarizedFold : scores.defaultFold
    else if (action === 'call') value = coreValue ? scores.valueCall : scores.defaultCall
    else if (action === 'raise') value = coreValue ? scores.valueRaise : committedPolarizedBluff ? scores.polarizedRaise : scores.defaultRaise
    else value = coreValue ? scores.valueAllIn : committedPolarizedBluff ? scores.polarizedAllIn : scores.defaultAllIn
  } else {
    const scores = config.facingFiveBet
    rangeLabel = coreValue ? 'value core' : 'fold-to-escalation range'
    if (action === 'fold') value = coreValue ? scores.valueFold : scores.defaultFold
    else if (action === 'call') value = coreValue ? scores.valueCall : scores.defaultCall
    else if (action === 'raise') value = coreValue
      ? committed ? scores.valueRaiseCommitted : scores.valueRaiseUncommitted
      : scores.defaultRaise
    else value = coreValue ? scores.valueAllIn : scores.defaultAllIn
  }

  return [factor(
    'strategy',
    `${raiseCount + 2}-bet model — ${rangeLabel}`,
    value,
  )]
}

function preflopRaiseDepthBlocked(context: DecisionContext): boolean {
  const profile = preflopEscalationProfile(context)
  if (!profile || profile.raiseCount < 3) return false
  if (profile.coreValue) return false
  return !(profile.raiseCount === 3 && profile.polarizedBluff && profile.committed)
}

function preflopStrategyFactors(
  action: 'fold' | 'check' | 'call' | 'raise',
  context: DecisionContext,
): ScoreContribution[] {
  const preferred = context.preflopRangeAction
  if (context.gameView.phase !== 'preflop' || !preferred) return []
  if (context.botState.memory.hand.raisedPreflop && context.metrics.potOdds <= 0.15) {
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
      equityCollapse: context.handAssessment.equityCollapse,
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
    if (hand.category === 'air' && context.boardTexture === 'dry') {
      result.push(factor('position', 'Bluff C-Bet on dry board as PFA', Math.round(15 * skillFactor)))
    }
    archetypeCbetDiscipline(context, result, skillFactor)
  }

  if ((gameView.phase === 'turn' || gameView.phase === 'river') && analysis.iAmPreflopAggressor) {
    if (analysis.streetAggressor.flop === null && analysis.streetAggressor.turn === null) {
      result.push(factor('position', 'Delayed c-bet after flop checked through', Math.round(params.scoring.streetInitiative.delayedCbet * skillFactor)))
    }
    if (gameView.phase === 'turn' && analysis.streetAggressor.flop === context.botId) {
      const barrel = turnBarrelAdjustment(context)
      if (barrel) {
        result.push(factor(
          'position',
          barrel.label,
          Math.round(barrel.value * turnTendencyFactor(skillFactor)),
        ))
      }
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

  if (analysis.activeOpponents >= 2) {
    const multiwayScale = Math.min(1, (analysis.activeOpponents - 1) / 4)
    if (hand.category === 'weak' || hand.category === 'air') {
      result.push(factor('board-texture', `${analysis.activeOpponents}-way pot — weak hands lose value`, Math.round(params.scoring.streetInitiative.multiwayWeak * multiwayScale)))
    }
    if (hand.category === 'medium') {
      result.push(factor('board-texture', `${analysis.activeOpponents}-way pot — medium hands cautious`, Math.round(params.scoring.streetInitiative.multiwayMedium * multiwayScale)))
    }
  }

  const cbetRaiseCandidateScale = isFacingContinuationBet(context)
    ? cbetDefenseCandidateScale(context, true)
    : 0
  if (cbetRaiseCandidateScale > 0) {
    const riskTolerance = context.botState.personality.riskTolerance
    const riskFactor = 1 - (riskTolerance - 50) / 100
    const variant = context.variantId === 'omaha-high' ? 'plo' : 'nlhe'
    const archetype = scoringArchetypeId(context)
    const format = resolveTableFormat(context.tableSize)
    const raiseBase = params.scoring.cbetDefenseRaiseBase[variant][archetype][format]
    result.push(factor('position', 'Defend C-Bet with a raise — apply pressure back', Math.round(raiseBase * riskFactor * skillFactor * cbetRaiseCandidateScale)))
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

function turnBarrelAdjustment(context: DecisionContext): { value: number; label: string } | null {
  const analysis = context.streetAnalysis
  const hand = context.handAssessment
  if (
    context.gameView.phase !== 'turn'
    || !analysis?.iAmPreflopAggressor
    || analysis.streetAggressor.flop !== context.botId
  ) return null

  const variant = context.variantId === 'omaha-high' ? 'plo' : 'nlhe'
  const format = resolveTableFormat(context.tableSize)
  const archetype = scoringArchetypeId(context)
  const config = params.scoring.turnBarrelMods[variant][archetype][format]
  const airCandidate = hand.category === 'air'
    && !hand.boardGotWorse
    && (
      context.boardTexture === 'dry'
      || hand.drawTypes.length > 0
      || hand.blockerValue >= 10
    )
  const value = hand.category === 'air'
    ? airCandidate ? config.air : 0
    : config.nonAir
  if (value === 0) return null

  return {
    value,
    label: hand.category === 'air'
      ? 'Double-barrel — selective turn bluff'
      : 'Double-barrel — continue turn pressure',
  }
}

function turnBarrelCheckFactors(context: DecisionContext): ScoreContribution[] {
  const barrel = turnBarrelAdjustment(context)
  if (!barrel) return []
  const skillFactor = skillLevelFactor(context.botState.skill.level)
  const value = -Math.round(
    barrel.value
    * turnTendencyFactor(skillFactor),
  )
  if (value === 0) return []
  return [factor(
    'position',
    barrel.value > 0
      ? 'Double-barrel plan — checking surrenders initiative'
      : 'Double-barrel restraint — prefer pot control',
    value,
  )]
}

function turnTendencyFactor(skillFactor: number): number {
  return 0.55 + skillFactor * 0.45
}

function archetypeCbetDiscipline(
  context: DecisionContext,
  result: ScoreContribution[],
  skillFactor: number,
): void {
  const archetypeName = context.botState.personality.archetype.name
  const hand = context.handAssessment
  const isPLO = context.variantId === 'omaha-high'
  const format = resolveTableFormat(context.tableSize)
  const isHU = format === 'heads-up'

  if (hand.category === 'premium' || hand.category === 'strong') return

  let disciplineBase = 0
  if (archetypeName === 'LAG') {
    disciplineBase = isPLO ? -16 : (isHU ? 0 : -7)
  } else if (archetypeName === 'Nit') {
    disciplineBase = isHU ? -6 : format === 'six-max' ? -4 : 4
  } else if (archetypeName === 'Calling Station' && !isPLO && isHU) {
    disciplineBase = 5
  } else {
    return
  }

  const categoryScale = hand.category === 'air'
    ? 1.3
    : hand.category === 'weak'
      ? 1.1
      : 1.0

  result.push(factor(
    'personality',
    `${archetypeName} C-Bet discipline — curb over-aggression${isPLO ? ' (PLO)' : ''}${isHU ? ' (HU)' : ''}`,
    Math.round(disciplineBase * categoryScale * skillFactor),
  ))
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

function multiwayFactors(
  action: 'fold' | 'call',
  context: DecisionContext,
): ScoreContribution[] {
  const { activePlayerCount, handAssessment: hand } = context
  if (activePlayerCount <= 2 || hand.category !== 'weak') return []

  const multiwayScale = Math.min(1, (activePlayerCount - 2) / 4)
  const base = action === 'fold' ? 15 : -20
  return [factor(
    'hand-strength',
    `Weak hand with ${activePlayerCount} active players`,
    Math.round(base * multiwayScale),
  )]
}

function potCommitmentFactors(
  action: 'fold' | 'call',
  context: DecisionContext,
): ScoreContribution[] {
  const config = params.scoring.commitmentBehavior
  const { metrics, botState } = context
  if (metrics.potCommitment <= config.minimumPotCommitment) return []

  const commitmentSeverity = clip(
    (metrics.potCommitment - config.minimumPotCommitment)
      / (1 - config.minimumPotCommitment),
    0,
    1,
  )
  const skillSusceptibility = clip(
    (config.skillZeroAt - botState.skill.level)
      / (config.skillZeroAt - config.skillFullAt),
    0,
    1,
  )
  const patiencePressure = Math.max(0, 50 - botState.mentalState.patience) / 100
  const mentalMultiplier = clip(
    1 + (botState.mentalState.tilt / 200) + patiencePressure,
    1,
    config.maximumMentalMultiplier,
  )
  const susceptibility = clip(
    skillSusceptibility
      * config.archetypeMultiplier[scoringArchetypeId(context)]
      * mentalMultiplier,
    0,
    1,
  )
  const value = Math.round(config.maximumCallBonus * commitmentSeverity * susceptibility)
  if (value === 0) return []

  return [factor(
    'betting-context',
    `Voluntary pot commitment ${(metrics.potCommitment * 100).toFixed(0)}% — sunk-cost tendency`,
    action === 'call' ? value : -value,
  )]
}

function forcedAllInRiskFactors(context: DecisionContext): ScoreContribution[] {
  const config = params.scoring.commitmentBehavior
  const { metrics, handAssessment: hand, botState } = context
  const categoryPenalty = config.forcedCategoryPenalty[hand.category]
  if (
    categoryPenalty === 0
    || metrics.forcedAllInRatio <= config.forcedAllInStart
    || metrics.potOdds <= config.freePriceThreshold
  ) return []

  const stackSeverity = clip(
    (metrics.forcedAllInRatio - config.forcedAllInStart)
      / (config.forcedAllInFull - config.forcedAllInStart),
    0,
    1,
  )
  const priceSeverity = clip(
    (metrics.potOdds - config.freePriceThreshold)
      / (config.fullPriceThreshold - config.freePriceThreshold),
    0,
    1,
  )
  const riskTolerance = clip(botState.personality.riskTolerance / 100, 0, 1)
  const riskScale = config.maximumRiskScale
    - riskTolerance * (config.maximumRiskScale - config.minimumRiskScale)
  const value = Math.round(categoryPenalty * stackSeverity * priceSeverity * riskScale)
  if (value === 0) return []

  return [factor(
    'betting-context',
    `Forced all-in ${(metrics.forcedAllInRatio * 100).toFixed(0)}% — variance risk`,
    value,
  )]
}

function dynamicFoldFactors(context: DecisionContext): ScoreContribution[] {
  const { gameView, handAssessment: hand, metrics, streetAnalysis } = context
  if (gameView.phase === 'preflop' || metrics.toCallPotRatio <= 0) return []

  const result: ScoreContribution[] = []

  const isPLO = context.variantId === 'omaha-high'
  const riskTolerance = context.botState.personality.riskTolerance
  const riskFactor = 1 - (riskTolerance - 50) / 100
  const isLag = context.botState.personality.archetype.name === 'LAG'
  const isNit = context.botState.personality.archetype.name === 'Nit'
  const isCS = context.botState.personality.archetype.name === 'Calling Station'
  const tableFormat = resolveTableFormat(context.tableSize)
  const variantBoost = isPLO
    ? (isLag ? 0.9 : 1.3)
    : (isLag ? 0.95 : 1.0)
  const huMultiplier = !isPLO && tableFormat === 'heads-up'
    ? (isCS ? 3.2 : isLag ? 1.8 : isNit ? 1.0 : 1.7)
    : 1.0
  const basePenalty = tableFormat === 'full-ring' ? -12 : -21
  const baseCategoryMultiplier: Record<string, number> = isNit
    ? { air: 0.3, weak: 1.0, marginal: 1.0, medium: 1.0, good: 1.2 }
    : isLag
      ? { air: 0.3, weak: 0.75, marginal: 1.0, medium: 1.4, good: 1.6 }
      : { air: 0.35, weak: 0.65, marginal: 0.92, medium: 1.3, good: 1.5 }
  const catMul = baseCategoryMultiplier[hand.category] ?? 1.0

  if (gameView.phase === 'flop') {
    const isPFA = streetAnalysis?.iAmPreflopAggressor
    const handInDefenseRange = isPLO
      ? hand.category === 'air' || hand.category === 'weak' || hand.category === 'marginal' || hand.category === 'medium'
      : tableFormat === 'heads-up'
        ? hand.category === 'air' || hand.category === 'weak' || hand.category === 'marginal' || hand.category === 'medium'
        : hand.category === 'weak' || hand.category === 'marginal' || hand.category === 'medium'
    if (isFacingContinuationBet(context) && handInDefenseRange) {
      result.push(factor('betting-context', 'C-Bet defense — call with equity', Math.round(basePenalty * catMul * riskFactor * variantBoost * huMultiplier)))
    } else if (isPFA && hand.category !== 'air') {
      result.push(factor('betting-context', 'PFA defending flop lead', Math.round(-7 * riskFactor * variantBoost)))
    }
  }

  if (gameView.phase === 'turn' && metrics.toCallPotRatio > 0 && isAtLeast(hand.category, 'medium')) {
    result.push(factor('betting-context', 'Turn defense — continue with medium+ hands', Math.round(-6 * riskFactor)))
  }

  if (!isPLO && metrics.spr <= 3 && isAtLeast(hand.category, 'medium')) {
    result.push(factor('betting-context', `Low SPR ${metrics.spr.toFixed(2)} — pot committed, defend`, Math.round(-14 * riskFactor)))
  } else if (!isPLO && metrics.spr <= 5 && isAtLeast(hand.category, 'marginal')) {
    result.push(factor('betting-context', `Moderate SPR ${metrics.spr.toFixed(2)} — defend more often`, Math.round(-6 * riskFactor)))
  }

  const stats = context.opponentStats
  if (stats && stats.confidence > 0.5 && stats.aggression > 55 && isAtLeast(hand.category, 'marginal')) {
    result.push(factor('opponent-read', 'Aggressive opponent — defend wider against pressure', Math.round(-4 * riskFactor)))
  }

  return result
}

function cbetDefenseCallBonus(context: DecisionContext): ScoreContribution[] {
  if (!isFacingContinuationBet(context)) return []
  const candidateScale = cbetDefenseCandidateScale(context, false)
  if (candidateScale <= 0) return []

  const variant = context.variantId === 'omaha-high' ? 'plo' : 'nlhe'
  const archetype = scoringArchetypeId(context)
  const format = resolveTableFormat(context.tableSize)
  const value = Math.round(
    params.scoring.cbetDefenseCallBonus[variant][archetype][format] * candidateScale,
  )
  if (value === 0) return []

  return [factor(
    'betting-context',
    value > 0
      ? 'C-Bet defense — continue with realizable equity'
      : 'C-Bet defense — prefer raise or fold over a marginal call',
    value,
  )]
}

function cbetDefenseFoldAdjustment(context: DecisionContext): ScoreContribution[] {
  if (!isFacingContinuationBet(context)) return []
  const candidateScale = cbetDefenseCandidateScale(context, false)
  if (candidateScale <= 0) return []
  const variant = context.variantId === 'omaha-high' ? 'plo' : 'nlhe'
  const archetype = scoringArchetypeId(context)
  const format = resolveTableFormat(context.tableSize)
  const callBonus = params.scoring.cbetDefenseCallBonus[variant][archetype][format]
  if (callBonus === 0) return []

  return [factor(
    'betting-context',
    callBonus > 0
      ? 'C-Bet defense mix — folding realizable equity too often'
      : 'C-Bet defense mix — disciplined marginal fold',
    -Math.round(callBonus * 0.5 * candidateScale),
  )]
}

function cbetDefenseCandidateScale(context: DecisionContext, allowBlockerAir: boolean): number {
  const hand = context.handAssessment
  if (hand.category === 'air') {
    if (hand.drawTypes.length > 0 || (allowBlockerAir && hand.blockerValue >= 20)) return 1

    const format = resolveTableFormat(context.tableSize)
    if (
      context.variantId === 'texas-holdem'
      && format === 'six-max'
      && context.streetAnalysis?.activeOpponents === 1
      && scoringArchetypeId(context) === 'calling-station'
    ) return 1
    if (context.variantId !== 'texas-holdem' || format !== 'heads-up') return 0

    const archetype = scoringArchetypeId(context)
    if (archetype === 'lag') return 0.75
    if (archetype === 'calling-station') return 1
    return 0
  }
  return hand.category === 'weak' || hand.category === 'marginal' || hand.category === 'medium'
    ? 1
    : 0
}

function isFacingContinuationBet(context: DecisionContext): boolean {
  const analysis = context.streetAnalysis
  if (
    context.gameView.phase !== 'flop'
    || context.metrics.toCallPotRatio <= 0
    || !analysis
    || analysis.iAmPreflopAggressor
  ) return false

  const preflopAggressor = analysis.streetAggressor.preflop
  return preflopAggressor !== null && analysis.streetAggressor.flop === preflopAggressor
}

function scoringArchetypeId(context: DecisionContext): 'tag' | 'nit' | 'lag' | 'calling-station' {
  const name = context.botState.personality.archetype.name
  if (name === 'Nit') return 'nit'
  if (name === 'LAG') return 'lag'
  if (name === 'Calling Station') return 'calling-station'
  return 'tag'
}
