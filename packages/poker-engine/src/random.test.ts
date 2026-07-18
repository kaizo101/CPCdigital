import { describe, expect, it } from 'vitest'
import { createSeededRandom } from './random'

describe('createSeededRandom', () => {
  it('returns a reproducible sequence in the unit interval', () => {
    const first = createSeededRandom('test-seed')
    const second = createSeededRandom('test-seed')
    const firstSequence = Array.from({ length: 100 }, () => first())
    const secondSequence = Array.from({ length: 100 }, () => second())

    expect(firstSequence).toEqual(secondSequence)
    expect(firstSequence.every(value => value >= 0 && value < 1)).toBe(true)
  })

  it('uses independent namespaces for string and numeric seeds', () => {
    const fromString = createSeededRandom('42')
    const fromNumber = createSeededRandom(42)
    expect(fromString()).not.toBe(fromNumber())
  })

  it('keeps the seeded sequence stable across releases', () => {
    const random = createSeededRandom('stable-seed')

    expect(Array.from({ length: 5 }, () => random())).toEqual([
      0.06688717403449118,
      0.9820948909036815,
      0.9649052808526903,
      0.34296073531731963,
      0.7216258156113327,
    ])
  })

  it('rejects non-finite numeric seeds', () => {
    expect(() => createSeededRandom(Number.NaN)).toThrow(/finite/i)
    expect(() => createSeededRandom(Number.POSITIVE_INFINITY)).toThrow(/finite/i)
  })
})
