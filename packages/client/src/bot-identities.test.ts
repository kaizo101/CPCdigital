import { describe, expect, it } from 'vitest'
import { createSeededRandom } from '@cpc/poker-engine'
import { getBotArchetype } from './bot-archetypes'
import {
  BOT_IDENTITY_GENERATOR_VERSION,
  BOT_ROSTER_SCHEMA_VERSION,
  BOT_SKILL_DISTRIBUTIONS,
  generateBotRoster,
  INITIAL_BOT_IDENTITY_NAMES,
  selectSessionBotIdentities,
} from './bot-identities'
import { createBotStateFromIdentity } from './bot-state'

describe('generated bot identities', () => {
  it('materializes a balanced, versioned, JSON-safe test roster', () => {
    const roster = generateBotRoster()
    const ids = roster.identities.map(identity => identity.id)
    const names = roster.identities.map(identity => identity.name)

    expect(roster.schemaVersion).toBe(BOT_ROSTER_SCHEMA_VERSION)
    expect(roster.generatorVersion).toBe(BOT_IDENTITY_GENERATOR_VERSION)
    expect(roster.identities).toHaveLength(INITIAL_BOT_IDENTITY_NAMES.length)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(names).size).toBe(names.length)
    expect(countArchetypes(roster.identities)).toEqual([11, 11, 11, 11])
    expect(JSON.parse(JSON.stringify(roster))).toEqual(roster)

    for (const identity of roster.identities) {
      expect(identity.avatarKey).toMatch(/^[a-z0-9-]+$/)
      expect(identity.skill).toBeGreaterThanOrEqual(15)
      expect(identity.skill).toBeLessThanOrEqual(90)
      for (const value of Object.values(identity.traits)) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(100)
      }
    }
  })

  it('is reproducible and preserves existing identities when the roster expands', () => {
    const original = generateBotRoster(INITIAL_BOT_IDENTITY_NAMES, 'stable-roster')
    const repeated = generateBotRoster(INITIAL_BOT_IDENTITY_NAMES, 'stable-roster')
    const expanded = generateBotRoster(
      [...INITIAL_BOT_IDENTITY_NAMES, 'Xenia'],
      'stable-roster',
    )

    expect(repeated).toEqual(original)
    expect(expanded.identities.slice(0, original.identities.length)).toEqual(original.identities)
    expect(generateBotRoster(INITIAL_BOT_IDENTITY_NAMES, 'different-roster')).not.toEqual(original)
  })

  it('selects unique identities with balanced hidden archetypes per table', () => {
    const roster = generateBotRoster()
    const select = () => selectSessionBotIdentities(
      roster,
      8,
      createSeededRandom('table-selection'),
    )
    const first = select()

    expect(select()).toEqual(first)
    expect(new Set(first.map(identity => identity.id)).size).toBe(8)
    expect(countArchetypes(first)).toEqual([2, 2, 2, 2])
  })

  it('keeps skill stable while session traits vary reproducibly', () => {
    const identity = generateBotRoster().identities[0]
    const archetype = getBotArchetype(identity.archetypeId)
    const createSession = (seed: string) => createBotStateFromIdentity(
      identity,
      archetype,
      createSeededRandom(seed),
    )

    const first = createSession('session-a')
    expect(createSession('session-a')).toEqual(first)
    expect(createSession('session-b').personality).not.toEqual(first.personality)
    expect(first.skill).toEqual({
      level: identity.skill,
      observation: identity.traits.observation,
    })
  })

  it('keeps Calling Station skill varied and entirely in the low-skill tiers', () => {
    const callingStations = generateBotRoster().identities.filter(
      identity => identity.archetypeId === 'calling-station',
    )
    const profile = BOT_SKILL_DISTRIBUTIONS['calling-station']

    expect(new Set(callingStations.map(identity => identity.skill.toFixed(2))).size).toBeGreaterThan(5)
    for (const identity of callingStations) {
      expect(identity.skill).toBeGreaterThanOrEqual(profile.min)
      expect(identity.skill).toBeLessThanOrEqual(profile.max)
      expect(identity.skill).toBeLessThan(50)
    }
  })

  it('creates manic variants only for LAG archetype', () => {
    const roster = generateBotRoster()
    const maniacs = roster.identities.filter(i => i.maniac)
    const lags = roster.identities.filter(i => i.archetypeId === 'lag')

    expect(maniacs.length).toBeGreaterThan(0)
    expect(maniacs.length).toBeLessThan(lags.length)
    for (const m of maniacs) {
      expect(m.archetypeId).toBe('lag')
    }
  })

  it('boosts maniac traits above typical LAG range', () => {
    const roster = generateBotRoster()
    const normalLags = roster.identities.filter(i => i.archetypeId === 'lag' && !i.maniac)
    const maniacs = roster.identities.filter(i => i.maniac)

    const avgAggression = (ids: typeof normalLags) =>
      ids.reduce((s, i) => s + i.traits.aggression, 0) / ids.length

    expect(avgAggression(maniacs)).toBeGreaterThan(avgAggression(normalLags) + 5)
    for (const m of maniacs) {
      expect(m.traits.bluffFrequency).toBeGreaterThan(50)
      expect(m.traits.preflopLooseness).toBeGreaterThan(80)
      expect(m.traits.riskTolerance).toBeGreaterThan(65)
    }
  })

  it('keeps maniac distribution deterministic', () => {
    const first = generateBotRoster()
    const second = generateBotRoster()
    expect(first.identities.map(i => i.maniac)).toEqual(second.identities.map(i => i.maniac))
  })
})

function countArchetypes(
  identities: Array<{ archetypeId: string }>,
): number[] {
  const counts = new Map<string, number>()
  for (const identity of identities) {
    counts.set(identity.archetypeId, (counts.get(identity.archetypeId) ?? 0) + 1)
  }
  return [...counts.values()].sort((left, right) => left - right)
}
