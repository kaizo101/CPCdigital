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
export const BOT_IDENTITY_GENERATOR_VERSION = 3
export const DEFAULT_BOT_ROSTER_SEED = 'cpcdigital-global-roster-v1'

const MANIAC_CHANCE = 0.2

interface BotSkillDistribution {
  mean: number
  stddev: number
  min: number
  max: number
}

/**
 * Skill describes decision quality, not playing style. Calling Stations are
 * nevertheless kept entirely in the low-skill tiers because a persistently
 * loose-passive leak would otherwise contradict a medium or high rating.
 */
export const BOT_SKILL_DISTRIBUTIONS = {
  tag: { mean: 55, stddev: 18, min: 15, max: 90 },
  nit: { mean: 55, stddev: 18, min: 15, max: 90 },
  lag: { mean: 55, stddev: 18, min: 15, max: 90 },
  'calling-station': { mean: 38, stddev: 6, min: 15, max: 49 },
} as const satisfies Record<BotArchetypeId, BotSkillDistribution>

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
  rebuyPolicy?: RebuyPolicy
}

export interface RebuyPolicy {
  /** Rebuy amount when busted (BB). null = never rebuy. */
  rebuyThresholdBb: number | null
  /** Maximum rebuys per session. 0 = never rebuy. */
  maxRebuys: number
  /** The bot leaves the table instead of rebuying when busted. */
  leaveOnBust: boolean
  /** If set and chips < this BB, rebuy even if not busted (counts as one rebuy). null = disabled. */
  rebuyWhenShortBb: number | null
}

export function rollRebuyPolicy(archetypeId: BotArchetypeId, maniac: boolean, random: () => number): RebuyPolicy {
  if (maniac) {
    return {
      rebuyThresholdBb: 50 + Math.round(random() * 40),
      maxRebuys: 2 + Math.round(random() * 4),
      leaveOnBust: false,
      rebuyWhenShortBb: 8 + Math.round(random() * 7),
    }
  }

  switch (archetypeId) {
    case 'tag':
      return {
        rebuyThresholdBb: 25 + Math.round(random() * 30),
        maxRebuys: 1 + Math.round(random() * 2),
        leaveOnBust: random() < 0.15,
        rebuyWhenShortBb: random() < 0.7 ? 10 + Math.round(random() * 10) : null,
      }
    case 'nit': {
      const wantsRebuy = random() < 0.3
      return {
        rebuyThresholdBb: wantsRebuy ? 10 + Math.round(random() * 15) : null,
        maxRebuys: wantsRebuy ? 1 : 0,
        leaveOnBust: random() < 0.6,
        rebuyWhenShortBb: random() < 0.5 ? 5 + Math.round(random() * 10) : null,
      }
    }
    case 'lag':
      return {
        rebuyThresholdBb: 50 + Math.round(random() * 40),
        maxRebuys: 2 + Math.round(random() * 4),
        leaveOnBust: false,
        rebuyWhenShortBb: random() < 0.8 ? 5 + Math.round(random() * 10) : null,
      }
    case 'calling-station':
      return {
        rebuyThresholdBb: 20 + Math.round(random() * 25),
        maxRebuys: 1 + Math.round(random() * 3),
        leaveOnBust: random() < 0.2,
        rebuyWhenShortBb: random() < 0.6 ? 5 + Math.round(random() * 7) : null,
      }
  }
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
      skill: rollIdentitySkill(archetypeId, random),
      traits,
      maniac,
      habitIds: habits.map(h => h.definition.id),
      rebuyPolicy: rollRebuyPolicy(archetypeId, maniac, createSeededRandom(`${identitySeed}:rebuy`)),
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

function rollIdentitySkill(archetypeId: BotArchetypeId, random: () => number): number {
  const distribution = BOT_SKILL_DISTRIBUTIONS[archetypeId]
  const value = rollFromDistribution(distribution, random)
  return Math.max(distribution.min, Math.min(distribution.max, value))
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value))
}
