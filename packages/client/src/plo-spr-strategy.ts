import type { DecisionContext } from './bot-decision-types'
import { params } from './bot-params'
import { isAtLeast } from './bot-variant-evaluation'

export type PloSprAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in'

export interface PloSprZoneWeights {
  commitment: number
  protection: number
  draw: number
}

export interface PloSprAdjustment {
  label: string
  value: number
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function fallingWeight(value: number, fullAt: number, zeroAt: number): number {
  return clamp01((zeroAt - value) / (zeroAt - fullAt))
}

function risingWeight(value: number, zeroAt: number, fullAt: number): number {
  return clamp01((value - zeroAt) / (fullAt - zeroAt))
}

function triangularWeight(value: number, start: number, peak: number, end: number): number {
  return value <= peak
    ? risingWeight(value, start, peak)
    : fallingWeight(value, peak, end)
}

function plateauWeight(
  value: number,
  start: number,
  full: number,
  fade: number,
  end: number,
): number {
  if (value <= full) return risingWeight(value, start, full)
  if (value <= fade) return 1
  return fallingWeight(value, fade, end)
}

/** Continuous membership weights avoid strategy cliffs at the nominal zone borders. */
export function getPloSprZoneWeights(spr: number): PloSprZoneWeights {
  const zone = params.scoring.ploSprZones
  return {
    commitment: fallingWeight(spr, zone.commitmentStart, zone.commitmentEnd),
    protection: triangularWeight(
      spr,
      zone.protectionStart,
      zone.protectionPeak,
      zone.protectionEnd,
    ),
    draw: plateauWeight(spr, zone.drawStart, zone.drawFull, zone.drawFade, zone.drawEnd),
  }
}

function scaled(value: number, weight: number): number {
  return Math.round(value * weight)
}

function add(
  result: PloSprAdjustment[],
  label: string,
  value: number,
  weight: number,
): void {
  const weightedValue = scaled(value, weight)
  if (weightedValue !== 0) result.push({ label, value: weightedValue })
}

/** PLO-only action evidence for the three overlapping SPR strategy zones. */
export function getPloSprAdjustments(
  action: PloSprAction,
  context: Readonly<DecisionContext>,
): PloSprAdjustment[] {
  if (context.variantId !== 'omaha-high' || context.gameView.phase === 'preflop') return []

  const result: PloSprAdjustment[] = []
  const hand = context.handAssessment
  const config = params.scoring.ploSprZones
  const weights = getPloSprZoneWeights(context.metrics.spr)
  const premiumDraw = hand.drawTypes.includes('nut-flush-draw')
    || hand.drawTypes.includes('wrap-13+')
    || (hand.drawTypes.includes('combo-draw') && hand.cleanOuts >= 8)
  const highEquityMadeHand = hand.made
    && isAtLeast(hand.category, 'good')
    && hand.nutPotential !== 'weak'
  const commitmentHand = highEquityMadeHand || premiumDraw
  const vulnerableMadeHand = hand.made
    && hand.rank >= 3
    && hand.rank <= 6
    && hand.vulnerability >= 60
  const strongDraw = hand.drawTypes.length > 0
    && hand.drawQuality >= 5
    && hand.cleanOuts >= 8
  const realizableEquity = isAtLeast(hand.category, 'marginal')
    || hand.drawTypes.length > 0

  if (commitmentHand) {
    const value = action === 'fold'
      ? config.commitmentFoldStrong
      : action === 'call'
        ? config.commitmentCallStrong
        : action === 'raise'
          ? config.commitmentRaiseStrong
          : action === 'all-in'
            ? config.commitmentAllInStrong
            : 0
    add(result, `PLO commitment zone SPR ${context.metrics.spr.toFixed(2)} — strong/nut equity`, value, weights.commitment)
  } else {
    const riskTolerance = clamp01(context.botState.personality.riskTolerance / 100)
    const disciplineWeight = 1 - (riskTolerance * config.commitmentRiskReduction)
    const value = action === 'fold'
      ? config.commitmentFoldNonStrong
      : action === 'call' || action === 'raise' || action === 'all-in'
        ? config.commitmentContinueNonStrong
        : 0
    add(
      result,
      `PLO commitment zone SPR ${context.metrics.spr.toFixed(2)} — non-strong equity`,
      value,
      weights.commitment * disciplineWeight,
    )
    if (action === 'raise' && realizableEquity) {
      const aggression = clamp01(context.botState.personality.aggression / 100)
      add(
        result,
        `PLO commitment zone SPR ${context.metrics.spr.toFixed(2)} — risk-weighted equity pressure`,
        config.commitmentRiskRaise,
        weights.commitment * riskTolerance * aggression,
      )
    }
  }

  if (vulnerableMadeHand) {
    const value = action === 'fold'
      ? config.protectionFoldVulnerable
      : action === 'check' || action === 'call'
        ? config.protectionPassiveVulnerable
        : action === 'raise'
          ? config.protectionRaiseVulnerable
          : config.protectionAllInVulnerable
    add(result, `PLO protection zone SPR ${context.metrics.spr.toFixed(2)} — vulnerable made hand`, value, weights.protection)
  } else if (action === 'fold' && realizableEquity) {
    add(
      result,
      `PLO protection zone SPR ${context.metrics.spr.toFixed(2)} — retain realizable equity`,
      config.protectionFoldEquity,
      weights.protection,
    )
  }

  if (strongDraw) {
    const value = action === 'fold'
      ? config.drawFoldStrong
      : action === 'check'
        ? config.drawCheckStrong
        : action === 'call'
          ? config.drawCallStrong
          : action === 'raise'
            ? config.drawRaiseStrong
            : 0
    add(result, `PLO draw zone SPR ${context.metrics.spr.toFixed(2)} — strong clean draw`, value, weights.draw)
  }

  return result
}
