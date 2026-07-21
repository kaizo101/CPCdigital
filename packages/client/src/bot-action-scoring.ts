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
  const { gameView, handAssessment: hand, metrics, opponentStats, playerCount } = context
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `Fold with ${hand.category}`, params.scoring.handStrength.fold[hand.category]),
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
  const intent: ActionIntent = (isAtLeast(hand.category, 'strong'))
    && (!isRiver || outOfPosition)
    ? 'trap'
    : 'pot-control'
  const contributions: ScoreContribution[] = [
    baseContribution(),
    factor('hand-strength', `Check with ${hand.category}`, params.scoring.handStrength.check[hand.category]),
    ...preflopStrategyFactors('check', context),
  ]

  if (hand.drawTypes.length > 0) contributions.push(factor('hand-strength', 'Free card for draw', 10))
  if (position === 'late') contributions.push(factor('position', 'Late position information', 10))
  if (isRiver && (isAtLeast(hand.category, 'strong')) && !outOfPosition) {
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
      : isAtLeast(hand.category, 'strong')
        ? (isRiver && !outOfPosition) ? 'value' : 'trap'
        : 'pot-control'
  const handValue = (isAtLeast(hand.category, 'strong')) && !isRiver
    ? params.scoring.handStrength.call.strong
    : params.scoring.handStrength.call[hand.category]
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
    factor('hand-strength', `Raise with ${hand.category}`, (
      hand.category === 'weak'
        ? (hand.drawTypes.length > 0 ? params.scoring.handStrength.raise['weak-draw'] : params.scoring.handStrength.raise['weak-no-draw'])
        : params.scoring.handStrength.raise[hand.category]
    )),
    ...bettingFactors('raise', context),
    ...preflopStrategyFactors('raise', context),
    ...streetInitiativeFactors(context),
  ]

  if (hand.relativeStrength > 70) contributions.push(factor('hand-strength', 'High relative strength', params.scoring.raiseBonus.highRelStrength))
  else if (hand.relativeStrength < 30) contributions.push(factor('hand-strength', 'Low relative strength', params.scoring.raiseBonus.lowRelStrength))

  if (hand.nutPotential === 'nuts') contributions.push(factor('hand-strength', 'Nut potential', params.scoring.raiseBonus.nutPotential))
  else if (hand.nutPotential === 'near-nuts') contributions.push(factor('hand-strength', 'Near-nut potential', params.scoring.raiseBonus.nearNutPotential))
  if (hand.vulnerability > 60) contributions.push(factor('hand-strength', 'Protection against draws', params.scoring.raiseBonus.vulnerability))
  if (hand.boardGotWorse && (hand.category === 'medium' || hand.category === 'good' || hand.category === 'strong')) {
    contributions.push(factor('hand-strength', 'Board got more dangerous — protect harder', 8))
  }
  if (hand.drawQuality > 50) contributions.push(factor('hand-strength', 'Strong draw equity', params.scoring.raiseBonus.drawQuality))
  if (hand.cleanOuts >= 8) contributions.push(factor('hand-strength', `${hand.cleanOuts} clean outs`, params.scoring.raiseBonus.cleanOuts))
  if (position === 'late') contributions.push(factor('position', 'Late-position leverage', params.scoring.raiseBonus.latePosition))
  if (boardTexture === 'dry' && hand.category === 'air') {
    contributions.push(factor('board-texture', 'Dry board supports bluff', params.scoring.raiseBonus.dryBoardBluff))
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
    factor('hand-strength', `All-in with ${hand.category}`, (
      hand.category === 'weak'
        ? (hand.drawTypes.length > 0 ? params.scoring.handStrength.allIn['weak-draw'] : params.scoring.handStrength.allIn['weak-no-draw'])
        : params.scoring.handStrength.allIn[hand.category]
    )),
    ...bettingFactors('raise', context),
    ...preflopStrategyFactors('raise', context),
  ]

  if (metrics.spr <= 2) contributions.push(factor('betting-context', `Low SPR ${metrics.spr.toFixed(2)}`, params.scoring.allInMods.lowSpr))
  if (metrics.spr >= 6) contributions.push(factor('betting-context', `High SPR ${metrics.spr.toFixed(2)}`, params.scoring.allInMods.highSpr))
  if (metrics.effectiveStackBb >= 100) {
    contributions.push(factor('betting-context', `Deep stack ${metrics.effectiveStackBb.toFixed(0)} BB`, params.scoring.allInMods.deepStack))
  }
  if (metrics.effectiveStack > 0 && metrics.playerStack > metrics.effectiveStack * 2) {
    contributions.push(factor('betting-context', 'Stack greatly exceeds effective stack', params.scoring.allInMods.exceedsEffectiveStack))
  }
  if (hand.blockerValue >= 30 && hand.category === 'air') {
    contributions.push(factor('hand-strength', 'Relevant blocker', params.scoring.allInMods.blockerValue))
  }

  return buildAction({ type: 'all-in' }, aggressiveIntent(context), contributions)
}

function aggressiveIntent(context: DecisionContext): ActionIntent {
  const hand = context.handAssessment
  if (isAtLeast(hand.category, 'strong')) return 'value'
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
  }, context.gameView.phase).map(({ label, value }) => factor('betting-context', label, value))
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
    } : undefined,
    context.botState.skill.level,
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

  result.push(...opponentSizingFactors(context))

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

  const playerHasSuit = context.gameView.myCards.some(c => c.suit === maxSuit)
  if (playerHasSuit) return 0

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

function opponentSizingFactors(context: DecisionContext): ScoreContribution[] {
  const result: ScoreContribution[] = []
  const analysis = context.streetAnalysis
  if (!analysis || context.gameView.phase === 'preflop') return result

  const skill = context.botState.skill.level
  const skillFactor = skillLevelFactor(skill)
  if (skillFactor < 0.3) return result

  const phase = context.gameView.phase as 'flop' | 'turn' | 'river'
  const streetAggressor = analysis.streetAggressor[phase]
  if (!streetAggressor || streetAggressor === context.botId) return result

  const toCallRatio = context.metrics.toCallPotRatio
  if (toCallRatio <= 0) return result

  const read = context.botState.reads.opponents.get(streetAggressor)
  if (!read) return result

  const tell = getSizingTell(read, toCallRatio)
  if (!tell) return result

  if (tell.deviation > params.sizingTell.overbet) {
    result.push(factor('opponent-read',
      `Opponent ${streetAggressor}: ${tell.label} (2x=${(tell.deviation).toFixed(1)})`,
      Math.round(params.sizingTell.overbetPenalty * skillFactor)))
  } else {
    result.push(factor('opponent-read',
      `Opponent ${streetAggressor}: ${tell.label} (${tell.deviation.toFixed(1)}x)`,
      Math.round(params.sizingTell.moderatePenalty * skillFactor)))
  }

  return result
}

function detectReraiseLevel(context: DecisionContext): number {
  const analysis = context.streetAnalysis
  if (!analysis || context.gameView.phase === 'preflop') return 0

  const phase = context.gameView.phase as 'flop' | 'turn' | 'river'
  const streetAggressor = analysis.streetAggressor[phase]
  if (!streetAggressor) return 0

  if (streetAggressor === context.botId) return 0

  return 1
}
