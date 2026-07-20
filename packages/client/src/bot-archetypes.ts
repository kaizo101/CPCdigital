import type { BotPersonality } from './bot-types'
import { params } from './bot-params'

function toPersonality(name: string, p: typeof params.archetypes.tag): BotPersonality {
  return {
    name,
    preflopLooseness: { ...p.preflopLooseness },
    aggression: { ...p.aggression },
    bluffFrequency: { ...p.bluffFrequency },
    riskTolerance: { ...p.riskTolerance },
    patience: { ...p.patience },
    observationSkill: { ...p.observationSkill },
    tiltSensitivity: { ...p.tiltSensitivity },
    tiltRecovery: { ...p.tiltRecovery },
    emotionality: { ...p.emotionality },
  }
}

export const TAG_PERSONALITY: BotPersonality = toPersonality('TAG', params.archetypes.tag)

export const NIT_PERSONALITY: BotPersonality = toPersonality('Nit', params.archetypes.nit)

export const LAG_PERSONALITY: BotPersonality = toPersonality('LAG', params.archetypes.lag)

export const CALLING_STATION_PERSONALITY: BotPersonality = toPersonality('Calling Station', params.archetypes['calling-station'])

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
