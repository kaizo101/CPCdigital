import type { CategoryScoreTable } from './bot-variant-evaluation'

export const NLHE_CATEGORY_SCORES: CategoryScoreTable = {
  fold: { air: 10, weak: 5, marginal: -5, medium: -30, good: -42, strong: -50, premium: -50 },
  check: { air: 10, weak: 10, marginal: 8, medium: 5, good: -15, strong: -30, premium: -30 },
  call: { air: -25, weak: -5, marginal: 5, medium: 20, good: -5, strong: -10, premium: -10 },
  raise: { air: -25, 'weak-draw': 15, 'weak-no-draw': -25, weak: -20, marginal: -10, medium: 5, good: 20, strong: 30, premium: 40 },
  allIn: { air: -42, 'weak-draw': -18, 'weak-no-draw': -42, weak: -35, marginal: -25, medium: -15, good: 10, strong: 28, premium: 42 },
}

/** Omaha PLO scores — more conservative calling, but not too extreme.
 *  "medium" in PLO is weaker than NLHE, so calls are suppressed.
 *  Fold values stay close to NLHE to avoid VPIP collapse. */
export const PLO_CATEGORY_SCORES: CategoryScoreTable = {
  fold: { air: 10, weak: 8, marginal: -2, medium: -20, good: -38, strong: -48, premium: -50 },
  check: { air: 10, weak: 10, marginal: 8, medium: 5, good: -12, strong: -28, premium: -30 },
  call: { air: -30, weak: -8, marginal: 0, medium: 8, good: -8, strong: -8, premium: -10 },
  raise: { air: -25, 'weak-draw': 18, 'weak-no-draw': -25, weak: -18, marginal: -8, medium: 10, good: 22, strong: 32, premium: 42 },
  allIn: { air: -42, 'weak-draw': -15, 'weak-no-draw': -42, weak: -35, marginal: -25, medium: -18, good: 8, strong: 25, premium: 40 },
}
