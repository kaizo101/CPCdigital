import { describe, expect, it } from 'vitest'
import {
  BOT_IDENTITY_GENERATOR_VERSION,
  BOT_SKILL_DISTRIBUTIONS,
  generateBotRoster,
  type BotRoster,
} from './bot-identities'
import { migrateGeneratedBotRoster } from './bot-roster-store'

describe('generated bot roster migration', () => {
  it('deterministically lowers legacy Calling Station skills without replacing identities', () => {
    const current = generateBotRoster()
    const legacy = JSON.parse(JSON.stringify(current)) as BotRoster
    ;(legacy as { generatorVersion: number }).generatorVersion = 2

    const preservedTag = legacy.identities.find(identity => identity.archetypeId === 'tag')!
    preservedTag.skill = 17
    for (const identity of legacy.identities) {
      ;(identity as { generatorVersion: number }).generatorVersion = 2
      if (identity.archetypeId === 'calling-station') identity.skill = 90
    }

    const first = migrateGeneratedBotRoster(legacy)
    const second = migrateGeneratedBotRoster(legacy)
    const callingStations = first.identities.filter(
      identity => identity.archetypeId === 'calling-station',
    )

    expect(first).toEqual(second)
    expect(first.generatorVersion).toBe(BOT_IDENTITY_GENERATOR_VERSION)
    expect(first.identities.map(identity => identity.id)).toEqual(
      legacy.identities.map(identity => identity.id),
    )
    expect(first.identities.find(identity => identity.id === preservedTag.id)?.skill).toBe(17)
    for (const identity of callingStations) {
      expect(identity.generatorVersion).toBe(BOT_IDENTITY_GENERATOR_VERSION)
      expect(identity.skill).toBeLessThanOrEqual(BOT_SKILL_DISTRIBUTIONS['calling-station'].max)
    }
  })

  it('returns an up-to-date roster unchanged', () => {
    const roster = generateBotRoster()
    expect(migrateGeneratedBotRoster(roster)).toBe(roster)
  })
})
