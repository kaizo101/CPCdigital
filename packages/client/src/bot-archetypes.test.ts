import { describe, expect, it } from 'vitest'
import { createSeededRandom } from '@cpc/poker-engine'
import {
  createShuffledArchetypeSequence,
  INITIAL_BOT_ARCHETYPES,
} from './bot-archetypes'

const archetypeNames = INITIAL_BOT_ARCHETYPES.map(archetype => archetype.name).sort()

describe('session archetype distribution', () => {
  it('uses every archetype once before starting another shuffled bag', () => {
    const sequence = createShuffledArchetypeSequence(
      INITIAL_BOT_ARCHETYPES,
      8,
      createSeededRandom('mixed-table'),
    )

    expect(sequence.slice(0, 4).map(archetype => archetype.name).sort()).toEqual(archetypeNames)
    expect(sequence.slice(4, 8).map(archetype => archetype.name).sort()).toEqual(archetypeNames)
  })

  it('reproduces the same distribution from the same seed', () => {
    const namesForSeed = (seed: string) => createShuffledArchetypeSequence(
      INITIAL_BOT_ARCHETYPES,
      8,
      createSeededRandom(seed),
    ).map(archetype => archetype.name)

    expect(namesForSeed('session-a')).toEqual(namesForSeed('session-a'))
    expect(namesForSeed('session-a')).not.toEqual(namesForSeed('session-b'))
  })

  it('can assign any single archetype without mutating the shared pool', () => {
    const original = [...INITIAL_BOT_ARCHETYPES]
    const selected = new Set(
      Array.from({ length: 20 }, (_, index) => createShuffledArchetypeSequence(
        INITIAL_BOT_ARCHETYPES,
        1,
        createSeededRandom(`single-${index}`),
      )[0].name),
    )

    expect(selected.size).toBeGreaterThan(1)
    expect(INITIAL_BOT_ARCHETYPES).toEqual(original)
  })
})
