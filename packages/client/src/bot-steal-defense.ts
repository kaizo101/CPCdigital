import type { DecisionContext, ScoreContribution } from './bot-decision-types'
import { analysisSkillWeight } from './bot-skill-gates'

type DefenseAction = 'fold' | 'call' | 'raise'

// Conservative pilot bounds, not target statistics: keep sparse or short-stack
// observations from turning an ordinary late open into a forced counterattack.
const MIN_OPPORTUNITIES = 6
const FULL_CONFIDENCE_OPPORTUNITIES = 14
const MIN_EFFECTIVE_STACK_BB = 25
const ORDINARY_STEAL_FREQUENCY = { button: 0.45, cutoff: 0.35 } as const

/** Strategic response to a *repeatedly observed* unopened late-position raise. */
export function stealDefenseFactors(
  action: DefenseAction,
  context: DecisionContext,
): ScoreContribution[] {
  const spot = context.stealSpot
  const preferred = context.preflopRangeAction
  if (
    context.gameView.phase !== 'preflop'
    || !spot
    || !preferred
    || preferred === 'fold'
    || context.botState.memory.hand.raisedPreflop
    || context.metrics.effectiveStackBb < MIN_EFFECTIVE_STACK_BB
  ) return []

  const sample = context.botState.reads.opponents.get(spot.openerId)?.steals?.[spot.position]
  if (!sample || sample.opportunities < MIN_OPPORTUNITIES) return []
  const frequency = sample.attempts / sample.opportunities
  const ordinaryFrequency = ORDINARY_STEAL_FREQUENCY[spot.position]
  const excess = Math.max(0, (frequency - ordinaryFrequency) / (1 - ordinaryFrequency))
  const sampleConfidence = Math.min(1,
    (sample.opportunities - MIN_OPPORTUNITIES + 1)
    / (FULL_CONFIDENCE_OPPORTUNITIES - MIN_OPPORTUNITIES + 1))
  const skillWeight = analysisSkillWeight(context.botState.skill.level, 'positionAwareRanges')
  const signal = excess * sampleConfidence * skillWeight
  if (signal <= 0) return []

  const archetype = context.botState.personality.archetype.name
  const callStyle = archetype === 'Calling Station' ? 1.2 : archetype === 'Nit' ? 0.55 : 1
  const raiseStyle = archetype === 'Calling Station' ? 0.25 : archetype === 'Nit' ? 0.5 : archetype === 'LAG' ? 1.1 : 1
  const variantScale = context.variantId === 'omaha-high' ? 0.7 : 1
  const label = `${spot.position} steal read ${sample.attempts}/${sample.opportunities}`

  let value = 0
  if (action === 'fold' && preferred === 'call-or-fold') value = -8 * signal * callStyle * variantScale
  if (action === 'call' && preferred !== 'raise') value = 14 * signal * callStyle * variantScale
  if (
    action === 'raise'
    && (preferred === 'raise' || preferred === 'raise-or-call')
    && ['medium', 'good', 'strong', 'premium'].includes(context.handAssessment.category)
  ) value = 12 * signal * raiseStyle * variantScale

  return value === 0 ? [] : [{ category: 'opponent-read', label, value }]
}
