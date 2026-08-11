import type { BettingContext } from '@cpc/shared'
import { params } from './bot-params'
import type { HandStrengthCategory, NutPotential } from './bot-variant-evaluation'
import { isAtLeast } from './bot-variant-evaluation'

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
  /** Player stack at hand start, before blinds and voluntary action. */
  playerStartingStackBb: number
  spr: number
  /** Voluntary chips already invested relative to the stack at hand start. */
  potCommitment: number
  /** Amount required to call relative to the currently remaining stack. */
  forcedAllInRatio: number
  stackDepth: StackDepth
}

export interface DecisionHandProfile {
  category: HandStrengthCategory
  hasDraw: boolean
  nutPotential?: NutPotential
  boardGotWorse?: boolean
  boardWorseSensitivity?: number
  equityCollapse?: number
}

export interface BettingContextFactor {
  label: string
  value: number
}

export interface BettingSituation {
  phase?: string
  /** Voluntary aggressive actions already made preflop; blinds do not count. */
  preflopRaiseCount?: number
  activeOpponents?: number
  /** PLO keeps the full reraise penalty; NLHE uses the looser half-scale. */
  preflopReraisePenaltyScale?: number
}

/** Normalizes the engine's betting values for strategy code and debug output. */
export function deriveDecisionMetrics(
  context: Readonly<BettingContext>,
  bigBlind: number,
): DecisionMetrics {
  const effectiveStackBb = safeRatio(context.effectiveStack, bigBlind)

  const stackShortBb = params.betting.stackShort
  const stackDeepBb = params.betting.stackDeep
  const playerStartingStack = context.playerStartingStack ?? context.playerStack
  const voluntaryHandContribution = context.voluntaryHandContribution ?? 0

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
    playerStartingStackBb: safeRatio(playerStartingStack, bigBlind),
    spr: context.spr,
    potCommitment: clamp(safeRatio(voluntaryHandContribution, playerStartingStack), 0, 1),
    forcedAllInRatio: clamp(safeRatio(context.callAmount, context.playerStack), 0, 1),
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
  preflopRaiseCount?: number,
): number {
  return getBettingContextFactors(action, metrics, hand, { phase, preflopRaiseCount })
    .reduce((sum, factor) => sum + factor.value, 0)
}

export function getBettingContextFactors(
  action: DecisionActionKind,
  metrics: Readonly<DecisionMetrics>,
  hand: Readonly<DecisionHandProfile>,
  situation: Readonly<BettingSituation> = {},
): BettingContextFactor[] {
  if (action === 'check') return []

  const isPreflop = situation.phase === 'preflop'
  const useSpr = !isPreflop

  const priceAdjustment = clamp((0.3 - metrics.potOdds) * params.betting.priceMultiplier, params.betting.priceClampMin, params.betting.priceClampMax)
  const sizingAdjustment = clamp((0.5 - metrics.toCallPotRatio) * params.betting.sizingMultiplier, params.betting.sizingClampMin, params.betting.sizingClampMax)

  if (action === 'fold') {
    const factors = [
      { label: `Pot odds ${(metrics.potOdds * 100).toFixed(1)}%`, value: -priceAdjustment },
      { label: `Bet/pot ratio ${metrics.toCallPotRatio.toFixed(2)}`, value: -sizingAdjustment },
    ]
    return capFactors(factors, params.betting.foldCapMin, params.betting.foldCapMax)
  }

  if (action === 'call') {
    const factors = [
      { label: `Pot odds ${(metrics.potOdds * 100).toFixed(1)}%`, value: priceAdjustment },
      { label: `Bet/pot ratio ${metrics.toCallPotRatio.toFixed(2)}`, value: sizingAdjustment },
    ]

    if (hand.hasDraw) {
      if (!isPreflop && metrics.stackDepth === 'deep') {
        factors.push(impliedOddsFactor(metrics, hand, situation))
      }
      if (metrics.stackDepth === 'short') factors.push({ label: `Short stack ${metrics.effectiveStackBb.toFixed(0)} BB`, value: params.betting.callShortDrawPenalty })
    }
    if (useSpr && metrics.spr <= 2 && (isAtLeast(hand.category, 'strong'))) {
      factors.push({ label: `Low SPR ${metrics.spr.toFixed(2)}`, value: params.betting.callLowSprBonus })
    }
    return capFactors(factors, params.betting.callCapMin, params.betting.callCapMax)
  }

  const factors: BettingContextFactor[] = []
  if (useSpr && metrics.spr <= 3) {
    factors.push({
      label: `Low SPR ${metrics.spr.toFixed(2)}`,
      value: isAtLeast(hand.category, 'strong') ? params.betting.raiseSprBonus : params.betting.raiseSprPenalty,
    })
  }
  if (metrics.stackDepth === 'deep' && hand.hasDraw) {
    factors.push({ label: `Deep stack ${metrics.effectiveStackBb.toFixed(0)} BB`, value: params.betting.raiseDeepDrawBonus })
  }
  if (metrics.toCallPotRatio >= 0.75 && (hand.category === 'air' || hand.hasDraw)) {
    factors.push({ label: `Large bet/pot ratio ${metrics.toCallPotRatio.toFixed(2)}`, value: params.betting.raiseLargeBetPenalty })
  }

  const facingBet = isPreflop
    ? (situation.preflopRaiseCount ?? 0) > 0
    : metrics.toCallPotRatio > 0
  if (facingBet) {
    const factor = isPreflop
      ? (situation.preflopReraisePenaltyScale ?? 0.5)
      : 1
    if (hand.category === 'medium' || hand.category === 'marginal') {
      factors.push({ label: 'Reraising medium hand into a bet', value: Math.round(params.betting.raiseReraiseMedium * factor) })
    }
    if (hand.category === 'weak' || hand.category === 'air') {
      factors.push({ label: 'Reraising without a hand into a bet', value: Math.round(params.betting.raiseReraiseWeak * factor) })
    }
    if (metrics.toCallPotRatio >= 0.5 && hand.category !== 'premium') {
      factors.push({ label: `Facing ${(metrics.toCallPotRatio * 100).toFixed(0)}% pot bet — reraise risk`, value: Math.round(params.betting.raiseReraiseBigBet * factor) })
    }
    if (metrics.potOdds >= 0.35 && hand.category !== 'premium') {
      factors.push({ label: `Good pot odds (${(metrics.potOdds * 100).toFixed(0)}%) — call preferred`, value: Math.round(params.betting.raiseReraiseGoodOdds * factor) })
    }
  }

  return capFactors(factors, params.betting.raiseCapMin, params.betting.raiseCapMax)
}

function impliedOddsFactor(
  metrics: Readonly<DecisionMetrics>,
  hand: Readonly<DecisionHandProfile>,
  situation: Readonly<BettingSituation>,
): BettingContextFactor {
  const config = params.betting.callImpliedOdds
  const stackRange = Math.max(1, config.maxEffectiveStackBb - params.betting.stackDeep)
  const stackProgress = clamp(
    (metrics.effectiveStackBb - params.betting.stackDeep) / stackRange,
    0,
    1,
  )
  const stackScale = 1 + stackProgress * (config.maxStackScale - 1)
  const nutScale = hand.nutPotential
    ? config.nutPotentialScale[hand.nutPotential]
    : 1
  const activeOpponents = Math.max(1, Math.round(situation.activeOpponents ?? 1))
  const multiwayAdjustment = Math.min(
    config.maxMultiwayAdjustment,
    Math.max(0, activeOpponents - 1) * config.multiwayStep,
  )
  const dominatedDraw = hand.nutPotential === 'medium' || hand.nutPotential === 'weak'
  const multiwayScale = dominatedDraw
    ? 1 - multiwayAdjustment
    : 1 + multiwayAdjustment
  const value = Math.round(clamp(
    params.betting.callDeepDrawBonus * stackScale * nutScale * multiwayScale,
    config.minimumBonus,
    config.maximumBonus,
  ))

  return {
    label: `Implied odds · ${metrics.effectiveStackBb.toFixed(0)} BB effective · ${hand.nutPotential ?? 'unknown'} draw · ${activeOpponents} opponent${activeOpponents === 1 ? '' : 's'}`,
    value,
  }
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
  situation: Readonly<BettingSituation> = {},
): number {
  let potFraction = hand.category === 'premium'
    ? params.betting.raisePotFraction.premium
    : hand.category === 'strong'
      ? params.betting.raisePotFraction.strong
      : hand.category === 'good'
        ? params.betting.raisePotFraction.good
        : hand.hasDraw
          ? params.betting.raisePotFraction.draw
          : hand.category === 'medium'
            ? params.betting.raisePotFraction.medium
            : params.betting.raisePotFraction.default

  if (boardTexture === 'wet') potFraction += params.betting.raiseSizingMods.wetBoard
  if (boardTexture === 'dry') potFraction += params.betting.raiseSizingMods.dryBoard
  if ((hand.equityCollapse ?? 0) > 0 && hand.category !== 'air') {
    potFraction -= 0.12 * (hand.equityCollapse ?? 0)
  } else if (hand.boardGotWorse && hand.category !== 'air') {
    potFraction += 0.08 * (hand.boardWorseSensitivity ?? 1)
  }
  if (position === 'late') potFraction += params.betting.raiseSizingMods.latePosition
  if (situation.phase !== 'preflop' && metrics.spr <= 3 && (isAtLeast(hand.category, 'strong'))) {
    potFraction += params.betting.raiseSizingMods.lowSprStrong
  }

  if (streetContext) {
    if (streetContext.iAmPreflopAggressor && boardTexture === 'dry') potFraction += params.betting.raiseSizingMods.cbetDry
    if (streetContext.activeOpponents && streetContext.activeOpponents >= 3) potFraction += params.betting.raiseSizingMods.multiway
    if (streetContext.opponentShowedWeakness && hand.category === 'air') potFraction += params.betting.raiseSizingMods.weaknessBluff
    if (streetContext.opponentCheckRaised && hand.category !== 'premium') potFraction += params.betting.raiseSizingMods.checkRaiseCaution
  }

  // Short-stack survival: reduce sizing to avoid pot-committing with non-nut hands
  if (metrics.effectiveStackBb <= 50 && hand.category !== 'premium') {
    const shortFactor = Math.max(0.4, metrics.effectiveStackBb / 50)
    potFraction *= shortFactor
  }

  // Reraising into a bet: smaller sizing needed for fold equity
  const facingVoluntaryBet = situation.phase === 'preflop'
    ? (situation.preflopRaiseCount ?? 0) > 0
    : metrics.toCallPotRatio > 0
  if (facingVoluntaryBet && hand.category !== 'premium') {
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
