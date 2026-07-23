import type { DecisionComplexity } from './bot-decision-complexity'

export interface BotTimingPolicy {
  minimumReactionMs: number
  maximumReactionMs: number
  maximumComplexityBonusMs: number
  difficultAllInBonusMs: number
  hardMaximumReactionMs: number
}

export interface BotDecisionTiming {
  targetReactionMs: number
  computationMs: number
  remainingDelayMs: number
}

const NLHE_TIMING: Readonly<BotTimingPolicy> = {
  minimumReactionMs: 1800,
  maximumReactionMs: 4500,
  maximumComplexityBonusMs: 3500,
  difficultAllInBonusMs: 3000,
  hardMaximumReactionMs: 12000,
}

const OMAHA_TIMING: Readonly<BotTimingPolicy> = {
  minimumReactionMs: 3000,
  maximumReactionMs: 8000,
  maximumComplexityBonusMs: 5000,
  difficultAllInBonusMs: 4000,
  hardMaximumReactionMs: 20000,
}

export function getBotTiming(variantId: string): Readonly<BotTimingPolicy> {
  switch (variantId) {
    case 'omaha-high': return OMAHA_TIMING
    default: return NLHE_TIMING
  }
}

export const DEFAULT_BOT_TIMING: Readonly<BotTimingPolicy> = NLHE_TIMING

export function sampleTargetReactionMs(
  random: () => number,
  complexity?: Pick<DecisionComplexity, 'score' | 'difficultAllIn'>,
  policy: Readonly<BotTimingPolicy> = DEFAULT_BOT_TIMING,
): number {
  const minimum = Math.max(0, policy.minimumReactionMs)
  const maximum = Math.max(minimum, policy.maximumReactionMs)
  const roll = Math.max(0, Math.min(1, random()))
  const baseReaction = minimum + ((maximum - minimum) * roll)
  const complexityBonus = (Math.max(0, Math.min(100, complexity?.score ?? 0)) / 100)
    * Math.max(0, policy.maximumComplexityBonusMs)
  const allInBonus = complexity?.difficultAllIn
    ? Math.max(0, policy.difficultAllInBonusMs)
    : 0
  return Math.min(
    Math.max(maximum, policy.hardMaximumReactionMs),
    baseReaction + complexityBonus + allInBonus,
  )
}

export function planBotDecisionTiming(
  targetReactionMs: number,
  computationMs: number,
): BotDecisionTiming {
  const target = Math.max(0, targetReactionMs)
  const computation = Math.max(0, computationMs)
  return {
    targetReactionMs: target,
    computationMs: computation,
    remainingDelayMs: Math.max(0, target - computation),
  }
}
