import type { DecisionContext, ScoreContribution } from './bot-decision-types'

/**
 * Small, local PLO4 pilot. These weights are hypotheses for controlled A/B
 * testing, not solver frequencies or a general hand ranking.
 */
export function ploPreflopStructureFactors(
  action: 'call' | 'raise',
  context: DecisionContext,
): ScoreContribution[] {
  const profile = context.handAssessment.ploPreflopProfile
  const analysis = context.streetAnalysis
  if (context.variantId !== 'omaha-high'
    || context.gameView.phase !== 'preflop'
    || !profile
    || !analysis
    || context.position !== 'late') return []

  // Shallow decisions are deliberately unchanged. Deep-stack influence grows
  // continuously from 40 BB to its full pilot weight at 100 BB.
  const depth = Math.max(0, Math.min(1, (context.metrics.effectiveStackBb - 40) / 60))
  if (depth === 0) return []

  const priorCall = [...analysis.opponentLines.values()].some(line =>
    line.preflopRole === 'limper' || line.preflopRole === 'caller')
  const unopenedLateRaise = action === 'raise' && analysis.preflopRaiseCount === 0 && !priorCall
  const facingOpenLateCall = action === 'call' && analysis.preflopRaiseCount === 1 && !priorCall
  if (!unopenedLateRaise && !facingOpenLateCall) return []

  const coordination = profile.coordinatedRundown * (unopenedLateRaise ? 3 : 4) * depth
  const nutSuit = profile.nutSuitCount * (unopenedLateRaise ? 1 : 2) * depth
  const factors: ScoreContribution[] = []
  if (coordination > 0) factors.push({
    category: 'strategy',
    label: 'PLO4 coordinated four-card structure (deep, late)',
    value: coordination,
  })
  if (nutSuit > 0) factors.push({
    category: 'strategy',
    label: 'PLO4 ace-high usable suit (deep, late)',
    value: nutSuit,
  })
  return factors
}
