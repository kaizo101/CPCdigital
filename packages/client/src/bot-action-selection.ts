import type { PlayerAction } from '@cpc/shared'
import type { ScoredAction } from './bot-decision-types'

export interface RandomSource {
  random(): number
}

export const defaultRandom: RandomSource = {
  random: () => Math.random(),
}

export function weightedChoice(
  actions: ScoredAction[],
  rng: RandomSource = defaultRandom,
): PlayerAction {
  const candidates = actions.filter(action => action.utility > 0)
  if (candidates.length === 0) return { type: 'fold' }

  const sorted = [...candidates].sort((left, right) => right.utility - left.utility)
  const threshold = sorted[0].utility * 0.85
  const plausible = sorted.filter(action => action.utility >= threshold)
  if (plausible.length === 1) return plausible[0].action

  const totalUtility = plausible.reduce((sum, action) => sum + action.utility, 0)
  let choice = rng.random() * totalUtility
  for (const candidate of plausible) {
    choice -= candidate.utility
    if (choice <= 0) return candidate.action
  }
  return plausible[0].action
}
