import type { BotState } from './bot-types'
import type { ScoredAction, ScoreContribution } from './bot-decision-types'

export function applyPersonalityModifiers(
  actions: ScoredAction[],
  botState: BotState,
): ScoredAction[] {
  const { aggression, bluffFrequency } = botState.personality
  const { tilt, confidence, patience } = botState.mentalState

  return actions.map(scored => {
    const contributions: ScoreContribution[] = []
    const aggressiveAction = scored.action.type === 'raise'
      || (scored.action.type === 'all-in' && ['value', 'protection', 'semi-bluff', 'bluff'].includes(scored.intent))

    if (aggressiveAction) {
      contributions.push({
        category: 'personality',
        label: 'Aggression',
        value: (aggression - 50) / 5,
      })
    }
    if (scored.action.type === 'fold') {
      contributions.push({
        category: 'personality',
        label: 'Aggression reduces folding',
        value: -(aggression - 50) / 10,
      })
    }
    if (aggressiveAction && scored.intent === 'bluff') {
      contributions.push({
        category: 'personality',
        label: 'Bluff frequency',
        value: (bluffFrequency - 50) / 10,
      })
    }

    if (tilt > 50) {
      const intensity = (tilt - 50) / 50
      if (aggressiveAction) {
        contributions.push({ category: 'mental-state', label: 'Tilt aggression', value: intensity * 15 })
      }
      if (scored.action.type === 'fold') {
        contributions.push({ category: 'mental-state', label: 'Tilt reduces folding', value: -(intensity * 10) })
      }
    }

    if (confidence < 40) {
      const intensity = (40 - confidence) / 40
      if (scored.action.type === 'fold') {
        contributions.push({ category: 'mental-state', label: 'Low confidence caution', value: intensity * 10 })
      }
      if (aggressiveAction) {
        contributions.push({ category: 'mental-state', label: 'Low confidence reduces aggression', value: -(intensity * 8) })
      }
    }

    if (patience < 40 && (scored.action.type === 'call' || aggressiveAction)) {
      contributions.push({
        category: 'mental-state',
        label: 'Low patience',
        value: ((40 - patience) / 40) * 8,
      })
    }

    return addContributions(scored, contributions)
  })
}

function addContributions(scored: ScoredAction, additions: ScoreContribution[]): ScoredAction {
  const adjustment = additions.reduce((sum, contribution) => sum + contribution.value, 0)
  const rawUtility = scored.utility + adjustment
  const utility = clampUtility(rawUtility)
  if (utility !== rawUtility) {
    additions.push({ category: 'base', label: 'Modifier utility cap', value: utility - rawUtility })
  }
  return {
    ...scored,
    utility,
    contributions: [...scored.contributions, ...additions],
  }
}

function clampUtility(value: number): number {
  return Math.max(0, Math.min(100, value))
}
