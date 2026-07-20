import type { BotPersonality } from './bot-types'

export const TAG_PERSONALITY: BotPersonality = {
  name: 'TAG',
  preflopLooseness: { mean: 50, stddev: 5 },
  aggression: { mean: 65, stddev: 10 },
  bluffFrequency: { mean: 25, stddev: 8 },
  riskTolerance: { mean: 50, stddev: 12 },
  patience: { mean: 70, stddev: 10 },
  observationSkill: { mean: 60, stddev: 15 },
  tiltSensitivity: { mean: 40, stddev: 15 },
  tiltRecovery: { mean: 60, stddev: 15 },
  emotionality: { mean: 50, stddev: 10 },
}

export const NIT_PERSONALITY: BotPersonality = {
  name: 'Nit',
  preflopLooseness: { mean: 12, stddev: 4 },
  aggression: { mean: 38, stddev: 7 },
  bluffFrequency: { mean: 8, stddev: 4 },
  riskTolerance: { mean: 25, stddev: 7 },
  patience: { mean: 88, stddev: 6 },
  observationSkill: { mean: 62, stddev: 12 },
  tiltSensitivity: { mean: 24, stddev: 8 },
  tiltRecovery: { mean: 72, stddev: 10 },
  emotionality: { mean: 28, stddev: 8 },
}

export const LAG_PERSONALITY: BotPersonality = {
  name: 'LAG',
  preflopLooseness: { mean: 76, stddev: 7 },
  aggression: { mean: 80, stddev: 8 },
  bluffFrequency: { mean: 48, stddev: 10 },
  riskTolerance: { mean: 68, stddev: 10 },
  patience: { mean: 45, stddev: 10 },
  observationSkill: { mean: 60, stddev: 15 },
  tiltSensitivity: { mean: 45, stddev: 12 },
  tiltRecovery: { mean: 55, stddev: 12 },
  emotionality: { mean: 50, stddev: 10 },
}

export const CALLING_STATION_PERSONALITY: BotPersonality = {
  name: 'Calling Station',
  preflopLooseness: { mean: 82, stddev: 7 },
  aggression: { mean: 22, stddev: 6 },
  bluffFrequency: { mean: 8, stddev: 4 },
  riskTolerance: { mean: 88, stddev: 7 },
  patience: { mean: 25, stddev: 8 },
  observationSkill: { mean: 50, stddev: 15 },
  tiltSensitivity: { mean: 35, stddev: 10 },
  tiltRecovery: { mean: 60, stddev: 12 },
  emotionality: { mean: 35, stddev: 10 },
}

export const BOT_ARCHETYPES = {
  tag: TAG_PERSONALITY,
  nit: NIT_PERSONALITY,
  lag: LAG_PERSONALITY,
  'calling-station': CALLING_STATION_PERSONALITY,
} as const satisfies Record<string, BotPersonality>

export type BotArchetypeId = keyof typeof BOT_ARCHETYPES

export const BOT_ARCHETYPE_IDS = Object.keys(BOT_ARCHETYPES) as BotArchetypeId[]

export const INITIAL_BOT_ARCHETYPES: readonly BotPersonality[] = [
  ...BOT_ARCHETYPE_IDS.map(id => BOT_ARCHETYPES[id]),
]

export function getBotArchetype(id: BotArchetypeId): BotPersonality {
  return BOT_ARCHETYPES[id]
}

export function getBotArchetypeId(archetype: BotPersonality): BotArchetypeId {
  const entry = BOT_ARCHETYPE_IDS.find(id => BOT_ARCHETYPES[id] === archetype)
  if (!entry) throw new Error(`Unknown bot archetype ${archetype.name}`)
  return entry
}

export function createShuffledArchetypeSequence(
  archetypes: readonly BotPersonality[],
  count: number,
  random: () => number = Math.random,
): BotPersonality[] {
  if (count <= 0) return []
  if (archetypes.length === 0) throw new Error('Cannot assign bots without archetypes')

  const sequence: BotPersonality[] = []
  while (sequence.length < count) {
    const bag = [...archetypes]
    for (let index = bag.length - 1; index > 0; index--) {
      const target = Math.min(index, Math.floor(random() * (index + 1)))
      const current = bag[index]
      bag[index] = bag[target]
      bag[target] = current
    }
    sequence.push(...bag.slice(0, count - sequence.length))
  }
  return sequence
}
