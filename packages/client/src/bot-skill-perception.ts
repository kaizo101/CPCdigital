import type { RandomSource } from './bot-action-selection'
import type { DecisionContext, ScoredAction } from './bot-decision-types'
import { analysisSkillWeight, hasAnalysisSkill } from './bot-skill-gates'
import { rangeFromScore } from './bot-range-estimation'

export type PerceptionField =
  | 'relative-strength'
  | 'vulnerability'
  | 'draws'
  | 'clean-outs'
  | 'blocker-value'
  | 'nut-potential'
  | 'board-dynamics'
  | 'wrap-quality'
  | 'pot-odds'
  | 'bet-size'
  | 'spr'
  | 'opponent-vpip'
  | 'opponent-aggression'
  | 'opponent-fold-to-bet'
  | 'paired-board-hierarchy'
  | 'opponent-position-range'
  | 'opponent-range-board'
  | 'opponent-card-removal'

export interface SkillPerceptionError {
  field: PerceptionField
  label: string
  actual: number | string | string[]
  perceived: number | string | string[]
}

export interface SkillPerceptionResult {
  context: DecisionContext
  errors: SkillPerceptionError[]
}

/**
 * Builds a flawed private evaluation without mutating fair engine information.
 * Skill 100 sees the evaluated inputs exactly; lower skill increases error size.
 */
export function applySkillPerception(
  context: DecisionContext,
  rng: RandomSource,
): SkillPerceptionResult {
  const skill = clamp(context.botState.skill.level, 0, 100)
  const errorScale = (100 - skill) / 100
  if (errorScale === 0) return { context, errors: [] }

  const errors: SkillPerceptionError[] = []
  const hand = {
    ...context.handAssessment,
    drawTypes: [...context.handAssessment.drawTypes],
  }
  const metrics = { ...context.metrics }
  const plo = context.variantId === 'omaha-high'
  const nlhe = context.variantId === 'texas-holdem'

  if (nlhe && hand.rank === 3 && boardContainsPair(context.gameView.board)) {
    const weight = analysisSkillWeight(skill, 'pairedBoardHierarchy')
    hand.relativeStrength = blendedPerception(
      errors,
      'paired-board-hierarchy',
      'Paired-board relative strength',
      hand.relativeStrength,
      50,
      weight,
    )
    hand.showdownValue = blendedPerception(
      errors,
      'paired-board-hierarchy',
      'Paired-board showdown value',
      hand.showdownValue,
      50,
      weight,
    )
    hand.strength = blendedPerception(
      errors,
      'paired-board-hierarchy',
      'Paired-board action strength',
      hand.strength,
      50,
      weight,
    )
  }

  if (plo && !hasAnalysisSkill(skill, 'boardDynamics') && hand.equityCollapse > 0) {
    errors.push({
      field: 'board-dynamics',
      label: 'Board transition',
      actual: hand.equityCollapse,
      perceived: 0,
    })
    hand.equityCollapse = 0
    hand.boardGotWorse = false
  }

  if (plo && !hasAnalysisSkill(skill, 'nutPotential') && hand.nutPotential !== 'medium') {
    errors.push({
      field: 'nut-potential',
      label: 'Nut potential',
      actual: hand.nutPotential,
      perceived: 'medium',
    })
    hand.nutPotential = 'medium'
    if (hand.equityCollapse > 0) hand.equityCollapse = 0.5
  }

  hand.relativeStrength = perceivedNumber(
    errors, 'relative-strength', 'Relative hand strength', hand.relativeStrength,
    gaussian(rng) * 12 * errorScale, 0, 100,
  )
  hand.vulnerability = perceivedNumber(
    errors, 'vulnerability', 'Vulnerability', hand.vulnerability,
    gaussian(rng) * 12 * errorScale, 0, 100,
  )
  const blockerDelta = gaussian(rng) * 15 * errorScale
  if (plo && !hasAnalysisSkill(skill, 'blocker')) {
    if (hand.blockerValue > 0) {
      errors.push({
        field: 'blocker-value',
        label: 'Blocker value',
        actual: hand.blockerValue,
        perceived: 0,
      })
    }
    hand.blockerValue = 0
  } else {
    hand.blockerValue = perceivedNumber(
      errors, 'blocker-value', 'Blocker value', hand.blockerValue,
      blockerDelta, 0, 100,
    )
  }

  if (plo && !hasAnalysisSkill(skill, 'wrapDominance')) {
    const wrapQualityTypes: readonly string[] = ['nut-wrap', 'mixed-wrap', 'second-wrap', 'bottom-wrap']
    const qualityTypes = hand.drawTypes.filter(type => wrapQualityTypes.includes(type))
    if (qualityTypes.length > 0) {
      hand.drawTypes = hand.drawTypes.filter(type => !wrapQualityTypes.includes(type))
      const rawOutFloor = hand.drawTypes.includes('wrap-13+')
        ? 13
        : hand.drawTypes.includes('wrap-8+')
          ? 8
          : hand.cleanOuts
      errors.push({
        field: 'wrap-quality',
        label: 'Wrap quality',
        actual: qualityTypes,
        perceived: `raw ${rawOutFloor}-out estimate`,
      })
      hand.cleanOuts = Math.max(hand.cleanOuts, rawOutFloor)
    }
  }

  if (hand.drawTypes.length > 0 && rng.random() < errorScale * 0.35) {
    const actualDraws = [...hand.drawTypes]
    hand.drawTypes = []
    hand.drawQuality = Math.round(hand.drawQuality * 0.4)
    errors.push({
      field: 'draws',
      label: 'Missed draw',
      actual: actualDraws,
      perceived: [],
    })
  }

  const perceivedOuts = Math.round(clamp(
    hand.cleanOuts + (gaussian(rng) * 3 * errorScale),
    0,
    20,
  ))
  if (perceivedOuts !== hand.cleanOuts) {
    errors.push({
      field: 'clean-outs',
      label: 'Clean outs',
      actual: hand.cleanOuts,
      perceived: perceivedOuts,
    })
    hand.cleanOuts = perceivedOuts
  }

  metrics.potOdds = perceivedNumber(
    errors, 'pot-odds', 'Pot odds', metrics.potOdds,
    gaussian(rng) * 0.08 * errorScale, 0, 1,
  )
  metrics.toCallPotRatio = perceivedNumber(
    errors, 'bet-size', 'Bet-to-pot ratio', metrics.toCallPotRatio,
    metrics.toCallPotRatio * gaussian(rng) * 0.2 * errorScale, 0, Number.MAX_SAFE_INTEGER,
  )
  metrics.spr = perceivedNumber(
    errors, 'spr', 'Stack-to-pot ratio', metrics.spr,
    metrics.spr * gaussian(rng) * 0.2 * errorScale, 0, Number.MAX_SAFE_INTEGER,
  )

  const opponentStats = context.opponentStats ? { ...context.opponentStats } : undefined
  if (opponentStats) {
    const readScale = errorScale * (1.25 - clamp(opponentStats.confidence, 0, 1))
    opponentStats.vpip = perceivedNumber(
      errors, 'opponent-vpip', 'Opponent VPIP', opponentStats.vpip,
      gaussian(rng) * 18 * readScale, 0, 100,
    )
    opponentStats.aggression = perceivedNumber(
      errors, 'opponent-aggression', 'Opponent aggression', opponentStats.aggression,
      gaussian(rng) * 18 * readScale, 0, 100,
    )
    opponentStats.foldToBet = perceivedNumber(
      errors, 'opponent-fold-to-bet', 'Opponent fold-to-bet', opponentStats.foldToBet,
      gaussian(rng) * 18 * readScale, 0, 100,
    )
  }

  const opponentRanges = context.opponentRanges?.map(range => {
    const positionWeight = analysisSkillWeight(skill, 'positionAwareRanges')
    const boardWeight = analysisSkillWeight(skill, 'rangeBoardInteraction')
    const removalWeight = analysisSkillWeight(skill, 'cardRemoval')
    const positionAdjustment = range.positionAdjustment * positionWeight
    const roleAdjustment = range.roleAdjustment * positionWeight
    let boardFitAdjustment = 0
    let tripsRepresentation = range.tripsRepresentation

    if (range.baseTripsRepresentation != null) {
      const cardRemovalScale = 1 + ((range.cardRemovalScale ?? 1) - 1) * removalWeight
      const multiwayScale = 1 + ((range.multiwayScale ?? 1) - 1) * removalWeight
      tripsRepresentation = clamp(range.baseTripsRepresentation * cardRemovalScale * multiwayScale, 0, 1)
      boardFitAdjustment = boardWeight === 0 ? 0 : (tripsRepresentation - 0.4) * 12 * boardWeight
    }

    recordPerception(errors, 'opponent-position-range', `Position/role range ${range.playerId}`,
      range.positionAdjustment + range.roleAdjustment, positionAdjustment + roleAdjustment)
    recordPerception(errors, 'opponent-range-board', `Board fit ${range.playerId}`,
      range.boardFitAdjustment, boardFitAdjustment)
    if (range.tripsRepresentation != null && tripsRepresentation != null) {
      recordPerception(errors, 'opponent-card-removal', `Card removal ${range.playerId}`,
        range.tripsRepresentation, tripsRepresentation)
    }

    const score = range.lineScore + positionAdjustment + roleAdjustment + boardFitAdjustment
    return rangeFromScore({
      ...range,
      score,
      positionAdjustment,
      roleAdjustment,
      boardFitAdjustment,
      tripsRepresentation,
    })
  })

  return {
    context: { ...context, handAssessment: hand, metrics, opponentStats, opponentRanges },
    errors,
  }
}

function blendedPerception(
  errors: SkillPerceptionError[],
  field: PerceptionField,
  label: string,
  actual: number,
  generic: number,
  weight: number,
): number {
  const perceived = generic + (actual - generic) * weight
  recordPerception(errors, field, label, actual, perceived)
  return perceived
}

function recordPerception(
  errors: SkillPerceptionError[],
  field: PerceptionField,
  label: string,
  actual: number,
  perceived: number,
): void {
  if (Math.abs(perceived - actual) > 0.000_001) {
    errors.push({ field, label, actual, perceived })
  }
}

function boardContainsPair(cards: readonly { rank: string }[]): boolean {
  const ranks = new Set<string>()
  for (const card of cards) {
    if (ranks.has(card.rank)) return true
    ranks.add(card.rank)
  }
  return false
}

export function addPerceptionReasons(
  actions: ScoredAction[],
  errors: readonly SkillPerceptionError[],
): ScoredAction[] {
  if (errors.length === 0) return actions
  return actions.map(action => ({
    ...action,
    contributions: [
      ...action.contributions,
      ...errors.map(error => ({
        category: 'skill-perception' as const,
        label: `${error.label}: ${formatValue(error.actual)} → ${formatValue(error.perceived)}`,
        value: 0,
      })),
    ],
  }))
}

function perceivedNumber(
  errors: SkillPerceptionError[],
  field: PerceptionField,
  label: string,
  actual: number,
  delta: number,
  minimum: number,
  maximum: number,
): number {
  const perceived = clamp(actual + delta, minimum, maximum)
  if (Math.abs(perceived - actual) > 0.000_001) {
    errors.push({ field, label, actual, perceived })
  }
  return perceived
}

function gaussian(rng: RandomSource): number {
  const u1 = Math.max(rng.random(), Number.EPSILON)
  const u2 = rng.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function formatValue(value: number | string | string[]): string {
  if (Array.isArray(value)) return value.join(', ') || 'none'
  if (typeof value === 'string') return value
  return Number(value.toFixed(3)).toString()
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}
