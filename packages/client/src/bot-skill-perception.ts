import type { RandomSource } from './bot-action-selection'
import type { DecisionContext, ScoredAction } from './bot-decision-types'

export type PerceptionField =
  | 'relative-strength'
  | 'vulnerability'
  | 'draws'
  | 'clean-outs'
  | 'blocker-value'
  | 'pot-odds'
  | 'bet-size'
  | 'spr'
  | 'opponent-vpip'
  | 'opponent-aggression'
  | 'opponent-fold-to-bet'

export interface SkillPerceptionError {
  field: PerceptionField
  label: string
  actual: number | string[]
  perceived: number | string[]
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

  hand.relativeStrength = perceivedNumber(
    errors, 'relative-strength', 'Relative hand strength', hand.relativeStrength,
    gaussian(rng) * 12 * errorScale, 0, 100,
  )
  hand.vulnerability = perceivedNumber(
    errors, 'vulnerability', 'Vulnerability', hand.vulnerability,
    gaussian(rng) * 12 * errorScale, 0, 100,
  )
  hand.blockerValue = perceivedNumber(
    errors, 'blocker-value', 'Blocker value', hand.blockerValue,
    gaussian(rng) * 15 * errorScale, 0, 100,
  )

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

  return {
    context: { ...context, handAssessment: hand, metrics, opponentStats },
    errors,
  }
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

function formatValue(value: number | string[]): string {
  return Array.isArray(value) ? value.join(', ') || 'none' : Number(value.toFixed(3)).toString()
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}
