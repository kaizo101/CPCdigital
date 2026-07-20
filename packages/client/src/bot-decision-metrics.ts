import type { BettingContext } from '@cpc/shared'
import { params } from './bot-params'

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

  const stackShortBb = params.betting.stackShort
  const stackDeepBb = params.betting.stackDeep

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
    stackDepth: effectiveStackBb <= stackShortBb ? 'short' : effectiveStackBb >= stackDeepBb ? 'deep' : 'medium',
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
  phase?: string,
): number {
  return getBettingContextFactors(action, metrics, hand, phase)
    .reduce((sum, factor) => sum + factor.value, 0)
}

export function getBettingContextFactors(
  action: DecisionActionKind,
  metrics: Readonly<DecisionMetrics>,
  hand: Readonly<DecisionHandProfile>,
  phase?: string,
): BettingContextFactor[] {
  if (action === 'check') return []

  const priceAdjustment = clamp((0.3 - metrics.potOdds) * params.betting.priceMultiplier, params.betting.priceClampMin, params.betting.priceClampMax)
  const sizingAdjustment = clamp((0.5 - metrics.toCallPotRatio) * params.betting.sizingMultiplier, params.betting.sizingClampMin, params.betting.sizingClampMax)

  if (action === 'fold') {
    const factors = [
      { label: `Pot odds ${(metrics.potOdds * 100).toFixed(1)}%`, value: -priceAdjustment },
      { label: `Bet/pot ratio ${metrics.toCallPotRatio.toFixed(2)}`, value: -sizingAdjustment },
    ]
    if (metrics.callCommitment >= 0.5 && (hand.category === 'strong' || hand.category === 'nuts')) {
      factors.push({ label: `Call commitment ${(metrics.callCommitment * 100).toFixed(0)}%`, value: params.betting.foldCommitmentPenalty })
    }
    return capFactors(factors, params.betting.foldCapMin, params.betting.foldCapMax)
  }

  if (action === 'call') {
    const factors = [
      { label: `Pot odds ${(metrics.potOdds * 100).toFixed(1)}%`, value: priceAdjustment },
      { label: `Bet/pot ratio ${metrics.toCallPotRatio.toFixed(2)}`, value: sizingAdjustment },
    ]

    if (hand.hasDraw) {
      if (metrics.stackDepth === 'deep') factors.push({ label: `Deep stack ${metrics.effectiveStackBb.toFixed(0)} BB`, value: params.betting.callDeepDrawBonus })
      if (metrics.stackDepth === 'short') factors.push({ label: `Short stack ${metrics.effectiveStackBb.toFixed(0)} BB`, value: params.betting.callShortDrawPenalty })
    }
    if (metrics.spr <= 2 && (hand.category === 'strong' || hand.category === 'nuts')) {
      factors.push({ label: `Low SPR ${metrics.spr.toFixed(2)}`, value: params.betting.callLowSprBonus })
    }
    if (metrics.callCommitment >= 0.5 && (hand.category === 'air' || hand.category === 'weak')) {
      factors.push({ label: `Call commitment ${(metrics.callCommitment * 100).toFixed(0)}%`, value: params.betting.callCommitmentPenalty })
    }

    return capFactors(factors, params.betting.callCapMin, params.betting.callCapMax)
  }

  const factors: BettingContextFactor[] = []
  if (metrics.spr <= 3) {
    factors.push({
      label: `Low SPR ${metrics.spr.toFixed(2)}`,
      value: hand.category === 'strong' || hand.category === 'nuts' ? params.betting.raiseSprBonus : params.betting.raiseSprPenalty,
    })
  }
  if (metrics.stackDepth === 'deep' && hand.hasDraw) {
    factors.push({ label: `Deep stack ${metrics.effectiveStackBb.toFixed(0)} BB`, value: params.betting.raiseDeepDrawBonus })
  }
  if (metrics.toCallPotRatio >= 0.75 && (hand.category === 'air' || hand.hasDraw)) {
    factors.push({ label: `Large bet/pot ratio ${metrics.toCallPotRatio.toFixed(2)}`, value: params.betting.raiseLargeBetPenalty })
  }

  const facingBet = metrics.toCallPotRatio > 0 && phase !== 'preflop'
  if (facingBet) {
    if (hand.category === 'medium') {
      factors.push({ label: 'Reraising medium hand into a bet', value: params.betting.raiseReraiseMedium })
    }
    if (hand.category === 'weak' || hand.category === 'air') {
      factors.push({ label: 'Reraising without a hand into a bet', value: params.betting.raiseReraiseWeak })
    }
    if (metrics.toCallPotRatio >= 0.5 && hand.category !== 'nuts') {
      factors.push({ label: `Facing ${(metrics.toCallPotRatio * 100).toFixed(0)}% pot bet — reraise risk`, value: params.betting.raiseReraiseBigBet })
    }
    if (metrics.potOdds >= 0.35 && hand.category !== 'nuts') {
      factors.push({ label: `Good pot odds (${(metrics.potOdds * 100).toFixed(0)}%) — call preferred`, value: params.betting.raiseReraiseGoodOdds })
    }
  }

  return capFactors(factors, params.betting.raiseCapMin, params.betting.raiseCapMax)
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
  },
  skillLevel?: number,
): number {
  let potFraction = hand.category === 'nuts'
    ? params.betting.raisePotFraction.nuts
    : hand.category === 'strong'
      ? params.betting.raisePotFraction.strong
      : hand.hasDraw
        ? params.betting.raisePotFraction.draw
        : hand.category === 'medium'
          ? params.betting.raisePotFraction.medium
          : params.betting.raisePotFraction.default

  if (boardTexture === 'wet') potFraction += params.betting.raiseSizingMods.wetBoard
  if (boardTexture === 'dry') potFraction += params.betting.raiseSizingMods.dryBoard
  if (position === 'late') potFraction += params.betting.raiseSizingMods.latePosition
  if (metrics.spr <= 3 && (hand.category === 'strong' || hand.category === 'nuts')) potFraction += params.betting.raiseSizingMods.lowSprStrong

  if (streetContext) {
    if (streetContext.iAmPreflopAggressor && boardTexture === 'dry') potFraction += params.betting.raiseSizingMods.cbetDry
    if (streetContext.activeOpponents && streetContext.activeOpponents >= 3) potFraction += params.betting.raiseSizingMods.multiway
    if (streetContext.opponentShowedWeakness && hand.category === 'air') potFraction += params.betting.raiseSizingMods.weaknessBluff
    if (streetContext.opponentCheckRaised && hand.category !== 'nuts') potFraction += params.betting.raiseSizingMods.checkRaiseCaution
  }

  // Short-stack survival: reduce sizing to avoid pot-committing with non-nut hands
  if (metrics.effectiveStackBb <= 50 && hand.category !== 'nuts') {
    const shortFactor = Math.max(0.4, metrics.effectiveStackBb / 50)
    potFraction *= shortFactor
  }

  // Reraising into a bet: smaller sizing needed for fold equity
  if (metrics.toCallPotRatio > 0 && hand.category !== 'nuts') {
    potFraction *= 0.75
  }

  if (skillLevel != null && skillLevel < 100) {
    const errorScale = (100 - skillLevel) / 100
    potFraction += deterministicSizingError(potFraction, errorScale)
    if (skillLevel < 50 && errorScale > 0.5) {
      potFraction += errorScale > 0.7 ? -0.2 : 0.2
    }
  }

  potFraction = clamp(potFraction, params.betting.raiseFractionMin, params.betting.raiseFractionMax)
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
