import { createSeededRandom } from '@cpc/poker-engine'
import {
  BOT_ARCHETYPE_IDS,
  createShuffledArchetypeSequence,
  getBotArchetype,
  getBotArchetypeId,
  type BotArchetypeId,
} from './bot-archetypes'
import { generateIdentityHabits } from './bot-habits'

import { rollFromDistribution } from './bot-state'

export const BOT_ROSTER_SCHEMA_VERSION = 1
export const BOT_IDENTITY_GENERATOR_VERSION = 2
export const DEFAULT_BOT_ROSTER_SEED = 'cpcdigital-global-roster-v1'

const MANIAC_CHANCE = 0.2

const MANIAC_TRAIT_BOOST: Partial<Record<keyof BotIdentityTraits, number>> = {
  preflopLooseness: 15,
  aggression: 10,
  bluffFrequency: 20,
  riskTolerance: 15,
  patience: -20,
  tiltSensitivity: 10,
  emotionality: 10,
}

export interface BotIdentityTraits {
  preflopLooseness: number
  aggression: number
  bluffFrequency: number
  riskTolerance: number
  patience: number
  observation: number
  tiltSensitivity: number
  tiltRecovery: number
  emotionality: number
}

/** Stable, JSON-safe identity. Runtime/session state deliberately lives elsewhere. */
export interface BotIdentity {
  id: string
  generatorVersion: typeof BOT_IDENTITY_GENERATOR_VERSION
  identitySeed: string
  name: string
  avatarKey: string
  archetypeId: BotArchetypeId
  skill: number
  traits: BotIdentityTraits
  maniac: boolean
  habitIds: string[]
}

export interface BotRoster {
  schemaVersion: typeof BOT_ROSTER_SCHEMA_VERSION
  generatorVersion: typeof BOT_IDENTITY_GENERATOR_VERSION
  seed: string
  identities: BotIdentity[]
}

export const INITIAL_BOT_IDENTITY_NAMES = [
  'Mara', 'Elias', 'Nika', 'Tom', 'Juno', 'Levin', 'Sora', 'Mina',
  'Theo', 'Kira', 'Noel', 'Liv', 'Dario', 'Elin', 'Sami', 'Tessa',
  'Milan', 'Runa', 'Jan', 'Alva', 'Robin', 'Mira', 'Lio', 'Nele',
  'Yara', 'Finn', 'Enya', 'David', 'Leni', 'Armin', 'Cleo', 'Jonas',
  // 0.4: +12
  'Zora', 'Bela', 'Nuri', 'Oskar', 'Hedi', 'Ivo', 'Jara', 'Kuno',
  'Lale', 'Mateo', 'Nila', 'Otto',
] as const

export function generateBotRoster(
  names: readonly string[] = INITIAL_BOT_IDENTITY_NAMES,
  seed: string = DEFAULT_BOT_ROSTER_SEED,
): BotRoster {
  const normalizedNames = names.map(name => name.trim())
  if (normalizedNames.some(name => name.length === 0)) {
    throw new Error('Bot identity names must not be empty')
  }
  if (new Set(normalizedNames.map(name => name.toLocaleLowerCase())).size !== normalizedNames.length) {
    throw new Error('Bot identity names must be unique')
  }

  const archetypeSequence = createShuffledArchetypeSequence(
    BOT_ARCHETYPE_IDS.map(getBotArchetype),
    normalizedNames.length,
    createSeededRandom(`${seed}:archetypes`),
  )
  const identities = normalizedNames.map((name, index) => {
    const identitySeed = `${seed}:identity:${index}`
    const random = createSeededRandom(identitySeed)
    const archetype = archetypeSequence[index]
    const archetypeId = getBotArchetypeId(archetype)
    const paddedIndex = String(index + 1).padStart(3, '0')
    const nameKey = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')

    const maniacRandom = createSeededRandom(`${identitySeed}:maniac`)
    const maniac = archetypeId === 'lag' && maniacRandom() < MANIAC_CHANCE

    const traits: BotIdentityTraits = {
      preflopLooseness: rollFromDistribution(archetype.preflopLooseness, random),
      aggression: rollFromDistribution(archetype.aggression, random),
      bluffFrequency: rollFromDistribution(archetype.bluffFrequency, random),
      riskTolerance: rollFromDistribution(archetype.riskTolerance, random),
      patience: rollFromDistribution(archetype.patience, random),
      observation: rollFromDistribution(archetype.observationSkill, random),
      tiltSensitivity: rollFromDistribution(archetype.tiltSensitivity, random),
      tiltRecovery: rollFromDistribution(archetype.tiltRecovery, random),
      emotionality: rollFromDistribution(archetype.emotionality, random),
    }

    if (maniac) {
      for (const [trait, boost] of Object.entries(MANIAC_TRAIT_BOOST)) {
        if (typeof boost === 'number') {
          traits[trait as keyof BotIdentityTraits] = clamp(
            traits[trait as keyof BotIdentityTraits] + boost,
          )
        }
      }
    }

    const habits = generateIdentityHabits(identitySeed, archetypeId)

    return {
      id: `bot-v1-${paddedIndex}-${nameKey}`,
      generatorVersion: BOT_IDENTITY_GENERATOR_VERSION,
      identitySeed,
      name,
      avatarKey: nameKey,
      archetypeId,
      skill: clampSkill(rollFromDistribution({ mean: 55, stddev: 18 }, random)),
      traits,
      maniac,
      habitIds: habits.map(h => h.definition.id),
    } satisfies BotIdentity
  })

  return {
    schemaVersion: BOT_ROSTER_SCHEMA_VERSION,
    generatorVersion: BOT_IDENTITY_GENERATOR_VERSION,
    seed,
    identities,
  }
}

export function selectSessionBotIdentities(
  roster: BotRoster,
  count: number,
  random: () => number = Math.random,
): BotIdentity[] {
  const requestedCount = Math.max(0, Math.floor(count))
  if (requestedCount > roster.identities.length) {
    throw new Error(`Cannot select ${requestedCount} unique bots from ${roster.identities.length} identities`)
  }

  const archetypes = createShuffledArchetypeSequence(
    BOT_ARCHETYPE_IDS.map(getBotArchetype),
    requestedCount,
    random,
  ).map(getBotArchetypeId)
  const pools = new Map<BotArchetypeId, BotIdentity[]>(
    BOT_ARCHETYPE_IDS.map(archetypeId => [
      archetypeId,
      shuffle(
        roster.identities.filter(identity => identity.archetypeId === archetypeId),
        random,
      ),
    ]),
  )

  return archetypes.map(archetypeId => {
    const identity = pools.get(archetypeId)?.pop()
    if (!identity) throw new Error(`Roster has no available identity for ${archetypeId}`)
    return identity
  })
}

export const DEFAULT_BOT_ROSTER = generateBotRoster()

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const shuffled = [...values]
  for (let index = shuffled.length - 1; index > 0; index--) {
    const target = Math.min(index, Math.floor(random() * (index + 1)))
    const current = shuffled[index]
    shuffled[index] = shuffled[target]
    shuffled[target] = current
  }
  return shuffled
}

function clampSkill(value: number): number {
  return Math.max(15, Math.min(90, value))
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value))
}
