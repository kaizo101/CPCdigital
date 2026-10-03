import type { Card } from '@cpc/shared'
import type { DecisionContext, ScoreContribution } from './bot-decision-types'
import { cardsToHandPattern } from './preflop-ranges'

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/**
 * Caution about the actual price paid, not an estimate of the opponent's cards.
 * In particular, a strong starting hand is not automatically a strong hand
 * against a deep preflop shove, and a top pair is not an automatic overbet call.
 */
export function expensiveCallDefenseFactors(
  action: 'fold' | 'call',
  context: DecisionContext,
): ScoreContribution[] {
  const risk = context.gameView.phase === 'preflop'
    ? deepPreflopPriceRisk(context)
    : postflopOverbetPriceRisk(context)
  if (risk <= 0) return []

  return [{
    category: 'betting-context',
    label: context.gameView.phase === 'preflop'
      ? 'Deep preflop call pressure'
      : 'Overbet price pressure on non-nut made hand',
    value: action === 'fold' ? risk : -risk,
  }]
}

function deepPreflopPriceRisk(context: DecisionContext): number {
  const { metrics, gameView, handAssessment } = context
  if (
    context.variantId !== 'texas-holdem'
    || (context.streetAnalysis?.preflopRaiseCount ?? 0) < 1
    || gameView.myCards.length !== 2
    || metrics.callAmount <= 0
    || metrics.playerStartingStackBb <= 40
  ) return 0

  const pattern = cardsToHandPattern(gameView.myCards as [Card, Card])
  const valueScale = pattern === 'AA' || pattern === 'KK'
    ? 0
    : pattern === 'QQ' || pattern === 'AKs' || pattern === 'AKo' || pattern === 'JJ'
      ? 0.2
      : pattern === 'TT' || pattern === 'AQs'
        ? 0.6
        : handAssessment.category === 'premium' ? 0.2 : 1
  if (valueScale === 0) return 0

  const startingStack = metrics.playerStartingStackBb * gameView.bigBlind
  const callFraction = startingStack > 0 ? metrics.callAmount / startingStack : 0
  const stackScale = clamp01((callFraction - 0.25) / 0.5)
  const priceScale = clamp01((metrics.potOdds - 0.3) / 0.15)
  const depthScale = clamp01((metrics.playerStartingStackBb - 40) / 40)
  const commitmentScale = 1 - clamp01(metrics.potCommitment / 0.25)
  const skillScale = 0.75 + clamp01(context.botState.skill.level / 100) * 0.25
  const archetypeScale = context.botState.personality.archetype.name === 'Calling Station'
    ? 0.75
    : context.botState.personality.archetype.name === 'LAG' ? 0.9 : 1
  return Math.round(55 * stackScale * priceScale * depthScale * commitmentScale * skillScale * archetypeScale * valueScale)
}

function postflopOverbetPriceRisk(context: DecisionContext): number {
  const { metrics, handAssessment: hand } = context
  if (
    context.variantId !== 'texas-holdem'
    || metrics.callAmount <= 0
    || metrics.potOdds <= 1 / 3
    || !hand.made
    || hand.rank < 2
    || hand.rank > 3
    || hand.nutPotential === 'nuts'
    || hand.nutPotential === 'near-nuts'
    || hand.drawQuality >= 65
  ) return 0

  // Pot odds use the pot *including* the bet. One pot-sized bet costs 1/3
  // of the final pot; a three-pot bet costs 3/7. The gradient is continuous.
  const priceScale = clamp01((metrics.potOdds - 1 / 3) / (0.45 - 1 / 3))
  const handScale = hand.rank === 2 ? 1 : 0.6
  const skillScale = 0.75 + clamp01(context.botState.skill.level / 100) * 0.25
  const archetypeScale = context.botState.personality.archetype.name === 'Calling Station'
    ? 0.75
    : context.botState.personality.archetype.name === 'LAG' ? 0.9 : 1
  return Math.round(55 * priceScale * handScale * skillScale * archetypeScale)
}
