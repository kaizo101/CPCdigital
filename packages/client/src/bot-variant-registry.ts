import type { BotContext } from './bot-context'
import type { VariantEvaluation, VariantEvaluator } from './bot-variant-evaluation'
import { nlheVariantEvaluator } from './nlhe-hand-evaluation'
import { omahaVariantEvaluator } from './omaha-hand-evaluation'

const evaluators = new Map<string, VariantEvaluator>([
  [nlheVariantEvaluator.variantId, nlheVariantEvaluator],
  [omahaVariantEvaluator.variantId, omahaVariantEvaluator],
])

export function evaluateBotVariant(context: Readonly<BotContext>): VariantEvaluation {
  const variantId = context.publicState.variantId
  const evaluator = evaluators.get(variantId)
  if (!evaluator) throw new Error(`No bot evaluator registered for variant ${variantId}`)
  return evaluator.evaluate(context)
}
