import type { BotContext } from './bot-context'

export type HandStrengthCategory = 'premium' | 'strong' | 'good' | 'medium' | 'marginal' | 'weak' | 'air'

export function isAtLeast(c: HandStrengthCategory, min: HandStrengthCategory): boolean {
  const order: HandStrengthCategory[] = ['premium', 'strong', 'good', 'medium', 'marginal', 'weak', 'air']
  return order.indexOf(c) <= order.indexOf(min)
}
export type NutPotential = 'nuts' | 'near-nuts' | 'strong' | 'medium' | 'weak'
export type BoardTexture = 'dry' | 'neutral' | 'wet'

/** Variant-neutral strategic description consumed by the decision engine. */
export interface VariantHandAssessment {
  category: HandStrengthCategory
  rank: number
  made: boolean
  relativeStrength: number
  showdownValue: number
  nutPotential: NutPotential
  vulnerability: number
  drawQuality: number
  cleanOuts: number
  blockerValue: number
  drawTypes: string[]
  boardGotWorse: boolean
  strength: number  // 0-100 numeric hand strength (replaces category for base scoring)
}

export interface VariantEvaluation {
  variantId: string
  handAssessment: VariantHandAssessment
  boardTexture: BoardTexture
  /** Variant-specific sizing suggestion; the decision engine still scores the raise. */
  preferredRaiseTo?: number
}

/** A variant owns card/board interpretation, but never action selection. */
export interface VariantEvaluator {
  readonly variantId: string
  evaluate(context: Readonly<BotContext>): VariantEvaluation
}
