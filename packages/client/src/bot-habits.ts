import type { DecisionContext, ScoredAction, ScoreContribution } from './bot-decision-types'
import { createSeededRandom } from '@cpc/poker-engine'

export interface HabitDefinition {
  id: string
  name: string
  description: string
}

export interface ActiveHabit {
  definition: HabitDefinition
  fired: boolean
  modifier: (action: ScoredAction, context: DecisionContext) => ScoreContribution[]
}

export const HABIT_DEFINITIONS: HabitDefinition[] = [
  {
    id: 'cbet-dry',
    name: 'Auto-cbet dry flops',
    description: 'Almost always continuation-bets on dry, unconnected boards as the preflop aggressor.',
  },
  {
    id: 'check-back-medium',
    name: 'Checks back medium hands',
    description: 'Frequently checks back medium-strength made hands on later streets instead of betting for value.',
  },
  {
    id: 'defend-blinds-wide',
    name: 'Defends blinds wide',
    description: 'Calls or 3-bets from the blinds with a wider-than-expected range against late-position opens.',
  },
  {
    id: 'overbet-bluff-river',
    name: 'Overbets bluff rivers',
    description: 'Occasionally uses large overbets as river bluffs when the board favors their perceived range.',
  },
  {
    id: 'slowplay-monsters',
    name: 'Slowplays monsters',
    description: 'Tends to check or call with very strong hands to trap, rather than raising immediately.',
  },
  {
    id: 'limp-reraise-premium',
    name: 'Limp-reraises premium',
    description: 'Occasionally limp-reraises with premium hands (AA, KK) instead of opening normally.',
  },
  {
    id: 'float-flop',
    name: 'Floats flop light',
    description: 'Calls flop continuation-bets with weak hands or air, planning to take the pot away on later streets.',
  },
  {
    id: 'donk-bet',
    name: "Donk-bets into aggressor",
    description: 'Occasionally leads out into the preflop aggressor on favorable boards instead of checking.',
  },
  {
    id: 'three-barrel-bluff',
    name: 'Three-barrel bluffs',
    description: 'Capable of firing all three streets as a bluff when the board runs out favorably.',
  },
  {
    id: 'fold-to-pressure',
    name: 'Folds to pressure',
    description: 'Frequently folds medium-strength hands when facing aggression on later streets.',
  },
  {
    id: 'sticky-postflop',
    name: 'Sticky postflop',
    description: 'Reluctant to fold after seeing a flop, often calling down with marginal holdings.',
  },
  {
    id: 'polarized-threebet',
    name: 'Polarized 3-bets',
    description: 'Only 3-bets with the very best hands or as a bluff — rarely with medium-strength hands.',
  },
]

const HABITS_PER_IDENTITY_MIN = 2
const HABITS_PER_IDENTITY_MAX = 4

export function generateIdentityHabits(
  identitySeed: string,
  archetypeId: string,
): ActiveHabit[] {
  const random = createSeededRandom(`${identitySeed}:habits`)
  const count = HABITS_PER_IDENTITY_MIN
    + Math.floor(random() * (HABITS_PER_IDENTITY_MAX - HABITS_PER_IDENTITY_MIN + 1))

  const archetypePreferences: Partial<Record<string, string[]>> = {
    tag: ['cbet-dry', 'check-back-medium', 'overbet-bluff-river', 'slowplay-monsters', 'three-barrel-bluff', 'polarized-threebet'],
    nit: ['check-back-medium', 'fold-to-pressure', 'slowplay-monsters', 'polarized-threebet'],
    lag: ['cbet-dry', 'float-flop', 'three-barrel-bluff', 'overbet-bluff-river', 'donk-bet', 'defend-blinds-wide', 'limp-reraise-premium'],
    'calling-station': ['sticky-postflop', 'defend-blinds-wide', 'check-back-medium', 'fold-to-pressure'],
  }

  const preferred = archetypePreferences[archetypeId] ?? HABIT_DEFINITIONS.map(h => h.id)
  const others = HABIT_DEFINITIONS.map(h => h.id).filter(id => !preferred.includes(id))

  const weighted: string[] = []
  for (const id of preferred) {
    weighted.push(id, id, id)
  }
  for (const id of others) {
    weighted.push(id)
  }

  const selected = new Set<string>()
  while (selected.size < count) {
    const idx = Math.floor(random() * weighted.length)
    selected.add(weighted[idx])
  }

  return habitIdsToActiveHabits(identitySeed, [...selected])
}

export function habitIdsToActiveHabits(
  identitySeed: string,
  habitIds: string[],
): ActiveHabit[] {
  const habitMap = new Map(HABIT_DEFINITIONS.map(h => [h.id, h]))
  const consistencyRandom = createSeededRandom(`${identitySeed}:habit-consistency`)

  return habitIds.map(id => {
    const def = habitMap.get(id)
    if (!def) throw new Error(`Unknown habit id: ${id}`)
    const consistency = 0.55 + consistencyRandom() * 0.35
    const modifier = createHabitModifier(def.id, consistency)
    return { definition: def, fired: false, modifier }
  })
}

export function sampleHabitsForDecision(
  habits: ActiveHabit[],
  decisionRandom: () => number,
): ActiveHabit[] {
  return habits.filter(() => decisionRandom() < 0.7)
}

function createHabitModifier(
  habitId: string,
  consistency: number,
): (action: ScoredAction, context: DecisionContext) => ScoreContribution[] {
  const c = consistency
  return (action, context) => {
    const phase = context.gameView.phase
    const hand = context.handAssessment
    const ai = (value: number) => value * (0.5 + c * 0.5)

    switch (habitId) {
      case 'cbet-dry': {
        if (phase === 'flop' && context.boardTexture === 'dry') {
          if (action.action.type === 'raise' && action.intent === 'value') {
            return [{ category: 'personality', label: 'Habit: auto-cbet dry', value: ai(10) }]
          }
          if (action.action.type === 'check' || action.action.type === 'fold') {
            return [{ category: 'personality', label: 'Habit: auto-cbet dry', value: ai(-8) }]
          }
        }
        return []
      }
      case 'check-back-medium': {
        if ((phase === 'turn' || phase === 'river') && hand.category === 'medium') {
          if (action.action.type === 'check' || action.action.type === 'call') {
            return [{ category: 'personality', label: 'Habit: checks back medium', value: ai(12) }]
          }
          if (action.action.type === 'raise') {
            return [{ category: 'personality', label: 'Habit: checks back medium', value: ai(-10) }]
          }
        }
        return []
      }
      case 'defend-blinds-wide': {
        if (phase === 'preflop') {
          const isBlind = context.position === 'blinds'
          if (isBlind && (action.action.type === 'call' || action.action.type === 'raise')) {
            return [{ category: 'personality', label: 'Habit: defends blinds wide', value: ai(10) }]
          }
          if (isBlind && action.action.type === 'fold') {
            return [{ category: 'personality', label: 'Habit: defends blinds wide', value: ai(-8) }]
          }
        }
        return []
      }
      case 'overbet-bluff-river': {
        if (phase === 'river' && action.action.type === 'raise' && hand.category === 'air') {
          return [{ category: 'personality', label: 'Habit: overbet bluff river', value: ai(8) }]
        }
        return []
      }
      case 'slowplay-monsters': {
        if (hand.category === 'nuts') {
          if (action.action.type === 'check' || action.action.type === 'call') {
            return [{ category: 'personality', label: 'Habit: slowplays monsters', value: ai(12) }]
          }
          if (action.action.type === 'raise') {
            return [{ category: 'personality', label: 'Habit: slowplays monsters', value: ai(-12) }]
          }
        }
        return []
      }
      case 'limp-reraise-premium': {
        if (phase === 'preflop' && hand.category === 'strong') {
          if (action.action.type === 'call') {
            return [{ category: 'personality', label: 'Habit: limp with premium', value: ai(8) }]
          }
        }
        return []
      }
      case 'float-flop': {
        if (phase === 'flop' && (hand.category === 'weak' || hand.category === 'air')) {
          if (action.action.type === 'call') {
            return [{ category: 'personality', label: 'Habit: floats flop', value: ai(10) }]
          }
          if (action.action.type === 'fold') {
            return [{ category: 'personality', label: 'Habit: floats flop', value: ai(-8) }]
          }
        }
        return []
      }
      case 'donk-bet': {
        if (phase === 'flop' || phase === 'turn') {
          if (action.action.type === 'raise' && hand.category === 'medium') {
            return [{ category: 'personality', label: 'Habit: donk-bets', value: ai(8) }]
          }
        }
        return []
      }
      case 'three-barrel-bluff': {
        if (phase === 'river' && hand.category === 'air') {
          if (action.action.type === 'raise') {
            return [{ category: 'personality', label: 'Habit: three-barrel bluff', value: ai(10) }]
          }
        }
        return []
      }
      case 'fold-to-pressure': {
        if ((phase === 'turn' || phase === 'river') && hand.category === 'medium') {
          if (action.action.type === 'fold') {
            return [{ category: 'personality', label: 'Habit: folds to pressure', value: ai(12) }]
          }
          if (action.action.type === 'call') {
            return [{ category: 'personality', label: 'Habit: folds to pressure', value: ai(-10) }]
          }
        }
        return []
      }
      case 'sticky-postflop': {
        if ((phase === 'flop' || phase === 'turn' || phase === 'river') && hand.category !== 'air') {
          if (action.action.type === 'call') {
            return [{ category: 'personality', label: 'Habit: sticky postflop', value: ai(10) }]
          }
          if (action.action.type === 'fold') {
            return [{ category: 'personality', label: 'Habit: sticky postflop', value: ai(-8) }]
          }
        }
        return []
      }
      case 'polarized-threebet': {
        if (phase === 'preflop' && action.action.type === 'raise') {
          if (hand.category === 'medium') {
            return [{ category: 'personality', label: 'Habit: polarized 3-bets', value: ai(-10) }]
          }
        }
        return []
      }
      default:
        return []
    }
  }
}
