import type { BotContext } from './bot-context'
import type { DecisionResult } from './bot-pipeline'

export interface ComplexityFactor {
  label: string
  value: number
}

export interface DecisionComplexity {
  score: number
  utilityGap: number | null
  facingAllIn: boolean
  chosenAllIn: boolean
  difficultAllIn: boolean
  factors: ComplexityFactor[]
}

export function assessDecisionComplexity(
  context: Readonly<BotContext>,
  decision: Readonly<DecisionResult>,
): DecisionComplexity {
  const factors: ComplexityFactor[] = []
  const utilities = decision.allActions
    .map(action => action.utility)
    .sort((left, right) => right - left)
  const utilityGap = utilities.length >= 2 ? utilities[0] - utilities[1] : null

  if (utilityGap != null) {
    if (utilityGap <= 5) factors.push({ label: 'Very close action utilities', value: 30 })
    else if (utilityGap <= 15) factors.push({ label: 'Close action utilities', value: 20 })
    else if (utilityGap <= 30) factors.push({ label: 'Meaningful alternative action', value: 10 })
  }

  if (decision.allActions.length >= 4) factors.push({ label: 'Many legal alternatives', value: 10 })
  else if (decision.allActions.length === 3) factors.push({ label: 'Several legal alternatives', value: 5 })

  if (context.publicState.phase === 'river') factors.push({ label: 'River decision', value: 12 })
  else if (context.publicState.phase === 'turn') factors.push({ label: 'Turn decision', value: 6 })

  const livePlayers = context.publicState.players.filter(player =>
    player.status === 'active' || player.status === 'all-in'
  ).length
  if (livePlayers > 2) factors.push({ label: 'Multiway pot', value: Math.min(15, (livePlayers - 2) * 5) })

  const commitment = context.bettingContext.playerStack > 0
    ? context.bettingContext.callAmount / context.bettingContext.playerStack
    : 0
  if (commitment >= 0.25) {
    factors.push({ label: `Stack commitment ${(commitment * 100).toFixed(0)}%`, value: Math.min(20, commitment * 20) })
  }
  if (context.bettingContext.toCallPotRatio >= 0.75) {
    factors.push({ label: 'Large bet relative to pot', value: 10 })
  }

  const facingAllIn = context.actionHistory.some(event =>
    event.type === 'PlayerActed'
    && event.phase === context.publicState.phase
    && event.action.type === 'all-in'
  )
  const chosenAllIn = decision.action.type === 'all-in'
  if (facingAllIn) factors.push({ label: 'Facing all-in', value: 25 })
  if (chosenAllIn) factors.push({ label: 'Considering chosen all-in', value: 15 })

  const difficultAllIn = (facingAllIn || chosenAllIn)
    && ((utilityGap != null && utilityGap <= 15) || commitment >= 0.25)
  const rawScore = factors.reduce((sum, factor) => sum + factor.value, 0)

  return {
    score: Math.max(0, Math.min(100, rawScore)),
    utilityGap,
    facingAllIn,
    chosenAllIn,
    difficultAllIn,
    factors,
  }
}
