import type { BettingContext } from '@cpc/shared'

export type StackDepth = 'short' | 'medium' | 'deep'
export type DecisionActionKind = 'fold' | 'check' | 'call' | 'raise'

export interface DecisionMetrics {
  totalPot: number
  callAmount: number
  potOdds: number
  toCallPotRatio: number
  potRaiseTo: number
  minRaiseTo: number
  maxRaiseTo: number
  playerStack: number
  effectiveStack: number
  effectiveStackBb: number
  spr: number
  callCommitment: number
  stackDepth: StackDepth
}

export interface DecisionHandProfile {
  category: 'air' | 'weak' | 'medium' | 'strong' | 'nuts'
  hasDraw: boolean
}

export interface BettingContextFactor {
  label: string
  value: number
}

/** Normalizes the engine's betting values for strategy code and debug output. */
export function deriveDecisionMetrics(
  context: Readonly<BettingContext>,
  bigBlind: number,
): DecisionMetrics {
  const effectiveStackBb = safeRatio(context.effectiveStack, bigBlind)

  return {
    totalPot: context.totalPot,
    callAmount: context.callAmount,
    potOdds: context.potOdds,
    toCallPotRatio: context.toCallPotRatio,
    potRaiseTo: context.potRaiseTo,
    minRaiseTo: context.minRaiseTo,
    maxRaiseTo: context.maxRaiseTo,
    playerStack: context.playerStack,
    effectiveStack: context.effectiveStack,
    effectiveStackBb,
    spr: context.spr,
    callCommitment: safeRatio(context.callAmount, context.playerStack),
    stackDepth: effectiveStackBb <= 25 ? 'short' : effectiveStackBb >= 100 ? 'deep' : 'medium',
  }
}

/**
 * Utility adjustment shared by all personalities. Positive values make an
 * action more attractive; personality and skill are applied later.
 */
export function getBettingContextAdjustment(
  action: DecisionActionKind,
  metrics: Readonly<DecisionMetrics>,
  hand: Readonly<DecisionHandProfile>,
): number {
  return getBettingContextFactors(action, metrics, hand)
    .reduce((sum, factor) => sum + factor.value, 0)
}

export function getBettingContextFactors(
  action: DecisionActionKind,
  metrics: Readonly<DecisionMetrics>,
  hand: Readonly<DecisionHandProfile>,
): BettingContextFactor[] {
  if (action === 'check') return []

  const priceAdjustment = clamp((0.3 - metrics.potOdds) * 70, -18, 16)
  const sizingAdjustment = clamp((0.5 - metrics.toCallPotRatio) * 18, -14, 8)

  if (action === 'fold') {
    const factors = [
      { label: `Pot odds ${(metrics.potOdds * 100).toFixed(1)}%`, value: -priceAdjustment },
      { label: `Bet/pot ratio ${metrics.toCallPotRatio.toFixed(2)}`, value: -sizingAdjustment },
    ]
    if (metrics.callCommitment >= 0.5 && (hand.category === 'strong' || hand.category === 'nuts')) {
      factors.push({ label: `Call commitment ${(metrics.callCommitment * 100).toFixed(0)}%`, value: -14 })
    }
    return capFactors(factors, -25, 25)
  }

  if (action === 'call') {
    const factors = [
      { label: `Pot odds ${(metrics.potOdds * 100).toFixed(1)}%`, value: priceAdjustment },
      { label: `Bet/pot ratio ${metrics.toCallPotRatio.toFixed(2)}`, value: sizingAdjustment },
    ]

    if (hand.hasDraw) {
      if (metrics.stackDepth === 'deep') factors.push({ label: `Deep stack ${metrics.effectiveStackBb.toFixed(0)} BB`, value: 7 })
      if (metrics.stackDepth === 'short') factors.push({ label: `Short stack ${metrics.effectiveStackBb.toFixed(0)} BB`, value: -7 })
    }
    if (metrics.spr <= 2 && (hand.category === 'strong' || hand.category === 'nuts')) {
      factors.push({ label: `Low SPR ${metrics.spr.toFixed(2)}`, value: 10 })
    }
    if (metrics.callCommitment >= 0.5 && (hand.category === 'air' || hand.category === 'weak')) {
      factors.push({ label: `Call commitment ${(metrics.callCommitment * 100).toFixed(0)}%`, value: -10 })
    }

    return capFactors(factors, -25, 25)
  }

  const factors: BettingContextFactor[] = []
  if (metrics.spr <= 3) {
    factors.push({
      label: `Low SPR ${metrics.spr.toFixed(2)}`,
      value: hand.category === 'strong' || hand.category === 'nuts' ? 12 : -8,
    })
  }
  if (metrics.stackDepth === 'deep' && hand.hasDraw) {
    factors.push({ label: `Deep stack ${metrics.effectiveStackBb.toFixed(0)} BB`, value: 5 })
  }
  if (metrics.toCallPotRatio >= 0.75 && (hand.category === 'air' || hand.hasDraw)) {
    factors.push({ label: `Large bet/pot ratio ${metrics.toCallPotRatio.toFixed(2)}`, value: -8 })
  }
  return capFactors(factors, -20, 20)
}

export function calculateContextualRaiseTo(
  metrics: Readonly<DecisionMetrics>,
  hand: Readonly<DecisionHandProfile>,
  boardTexture: 'dry' | 'wet' | 'neutral',
  position: 'early' | 'middle' | 'late' | 'blinds',
  streetContext?: {
    iAmPreflopAggressor?: boolean
    activeOpponents?: number
    opponentShowedWeakness?: boolean
    opponentCheckRaised?: boolean
    isSqueezeSpot?: boolean
  },
  skillLevel?: number,
): number {
  let potFraction = hand.category === 'nuts'
    ? 0.9
    : hand.category === 'strong'
      ? 0.75
      : hand.hasDraw
        ? 0.65
        : hand.category === 'medium'
          ? 0.55
          : 0.45

  if (boardTexture === 'wet') potFraction += 0.1
  if (boardTexture === 'dry') potFraction -= 0.1
  if (position === 'late') potFraction -= 0.05
  if (metrics.spr <= 3 && (hand.category === 'strong' || hand.category === 'nuts')) potFraction += 0.15

  if (streetContext) {
    if (streetContext.iAmPreflopAggressor && boardTexture === 'dry') potFraction -= 0.05
    if (streetContext.activeOpponents && streetContext.activeOpponents >= 3) potFraction += 0.1
    if (streetContext.opponentShowedWeakness && hand.category === 'air') potFraction -= 0.1
    if (streetContext.opponentCheckRaised && hand.category !== 'nuts') potFraction -= 0.15
    if (streetContext.isSqueezeSpot) potFraction += 0.15
  }

  if (skillLevel != null && skillLevel < 100) {
    const errorScale = (100 - skillLevel) / 100
    potFraction += deterministicSizingError(potFraction, errorScale)
    if (skillLevel < 50 && errorScale > 0.5) {
      potFraction += errorScale > 0.7 ? -0.2 : 0.2
    }
  }

  potFraction = clamp(potFraction, 0.33, 1)
  const callTo = metrics.potRaiseTo - metrics.totalPot - metrics.callAmount
  const potAfterCall = metrics.totalPot + metrics.callAmount
  const target = callTo + (potAfterCall * potFraction)
  return Math.max(metrics.minRaiseTo, Math.min(metrics.maxRaiseTo, target))
}

function deterministicSizingError(baseFraction: number, errorScale: number): number {
  const scaledError = errorScale * 0.15
  return (baseFraction > 0.7 ? -1 : 1) * scaledError
}

function safeRatio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function capFactors(
  factors: BettingContextFactor[],
  minimum: number,
  maximum: number,
): BettingContextFactor[] {
  const total = factors.reduce((sum, factor) => sum + factor.value, 0)
  const capped = clamp(total, minimum, maximum)
  if (capped !== total) factors.push({ label: 'Betting-context cap', value: capped - total })
  return factors
}
