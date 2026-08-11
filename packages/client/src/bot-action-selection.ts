import type { PlayerAction } from '@cpc/shared'
import type { ScoredAction } from './bot-decision-types'

export interface RandomSource {
  random(): number
}

export interface SelectionDiagnostics {
  bestUtility: number
  runnerUpUtility: number | null
  utilityGap: number | null
  plausibilityThreshold: number
  plausibleCandidateCount: number
}

export const defaultRandom: RandomSource = {
  random: () => Math.random(),
}

export function weightedChoice(
  actions: ScoredAction[],
  rng: RandomSource = defaultRandom,
): PlayerAction {
  return weightedCandidateChoice(actions, rng).action
}

export function weightedCandidateChoice(
  actions: ScoredAction[],
  rng: RandomSource = defaultRandom,
): ScoredAction {
  const eligibleActions = actions.filter(action => action.selectionEligible !== false)
  const candidates = eligibleActions.filter(action => action.utility > 0)
  if (candidates.length === 0) {
    if (eligibleActions.length > 0) {
      const best = eligibleActions.reduce((a, b) => a.utility > b.utility ? a : b)
      return best
    }
    return {
      candidateId: 'fallback:fold',
      action: { type: 'fold' },
      intent: 'fold',
      utility: 0,
      contributions: [],
      selectionEligible: true,
    }
  }

  const sorted = [...candidates].sort((left, right) => right.utility - left.utility)
  const threshold = sorted[0].utility * 0.85
  const plausible = sorted.filter(action => action.utility >= threshold)
  if (plausible.length === 1) return plausible[0]

  const totalUtility = plausible.reduce((sum, action) => sum + action.utility, 0)
  let choice = rng.random() * totalUtility
  for (const candidate of plausible) {
    choice -= candidate.utility
    if (choice <= 0) return candidate
  }
  return plausible[0]
}

export function selectionDiagnostics(actions: ScoredAction[]): SelectionDiagnostics {
  const eligible = actions
    .filter(action => action.selectionEligible !== false)
    .sort((left, right) => right.utility - left.utility)
  const bestUtility = eligible[0]?.utility ?? 0
  const runnerUpUtility = eligible[1]?.utility ?? null
  const plausibilityThreshold = bestUtility * 0.85
  return {
    bestUtility,
    runnerUpUtility,
    utilityGap: runnerUpUtility == null ? null : bestUtility - runnerUpUtility,
    plausibilityThreshold,
    plausibleCandidateCount: eligible.filter(action => (
      action.utility > 0 && action.utility >= plausibilityThreshold
    )).length,
  }
}
