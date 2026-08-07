import { describe, expect, it } from 'vitest'
import { estimateRangeFromLine, rangeStrengthModifier } from './bot-range-estimation'
import type { OpponentLine } from './bot-street-analysis'

function line(overrides: Partial<OpponentLine> = {}): OpponentLine {
  return {
    playerId: 'test',
    preflop: null,
    flop: null,
    turn: null,
    river: null,
    aggressivePotFractions: { preflop: null, flop: null, turn: null, river: null },
    ...overrides,
  }
}

describe('range estimation', () => {
  it('classifies preflop raiser with bet-bet line as very-strong', () => {
    const l = line({ preflop: 'raised', flop: 'bet', turn: 'bet' })
    expect(estimateRangeFromLine(l).strength).toBe('very-strong')
  })

  it('classifies single bet postflop as strong', () => {
    const l = line({ preflop: 'raised', flop: 'bet' })
    expect(estimateRangeFromLine(l).strength).toBe('strong')
  })

  it('classifies check-calling as weak', () => {
    const l = line({ preflop: 'called', flop: 'check-call', turn: 'check-call' })
    const result = estimateRangeFromLine(l)
    expect(['weak', 'very-weak']).toContain(result.strength)
  })

  it('classifies check-fold as weak', () => {
    const l = line({ preflop: 'called', flop: 'check-fold' })
    const result = estimateRangeFromLine(l)
    expect(['weak', 'very-weak']).toContain(result.strength)
  })

  it('classifies check-raise as strong', () => {
    const l = line({ preflop: 'called', flop: 'check-raise' })
    const result = estimateRangeFromLine(l)
    expect(['strong', 'very-strong']).toContain(result.strength)
  })

  it('classifies moderate line correctly', () => {
    const l = line({ preflop: 'called', flop: 'check-call', turn: 'bet' })
    const result = estimateRangeFromLine(l)
    expect(['moderate', 'strong']).toContain(result.strength)
  })

  it('strong opponents discourage raising and encourage folding', () => {
    const mods = rangeStrengthModifier('strong')
    expect(mods.raise).toBeLessThan(0)
    expect(mods.fold).toBeGreaterThanOrEqual(0)
  })

  it('weak opponents encourage raising and discourage folding', () => {
    const mods = rangeStrengthModifier('weak')
    expect(mods.raise).toBeGreaterThan(0)
    expect(mods.fold).toBeLessThan(0)
  })
})
