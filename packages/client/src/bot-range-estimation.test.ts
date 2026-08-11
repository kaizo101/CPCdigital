import { describe, expect, it } from 'vitest'
import { estimateRangeFromLine, rangeStrengthModifier } from './bot-range-estimation'
import type { OpponentLine } from './bot-street-analysis'

const card = (rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A', suit: 'clubs' | 'diamonds' | 'hearts' | 'spades') => ({ rank, suit })

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

  it('keeps low paired cards less represented in an early open than a button open or limp', () => {
    const context = {
      variantId: 'texas-holdem',
      board: [card('K', 'diamonds'), card('6', 'clubs'), card('6', 'diamonds')],
      ownCards: [card('A', 'hearts'), card('A', 'clubs')],
      activeOpponents: 1,
    }
    const early = estimateRangeFromLine(line({
      preflop: 'raised',
      preflopRole: 'open-raiser',
      position: { positionsFromDealer: 3, category: 'early' },
    }), context)
    const button = estimateRangeFromLine(line({
      preflop: 'raised',
      preflopRole: 'open-raiser',
      position: { positionsFromDealer: 0, category: 'late' },
    }), context)
    const limper = estimateRangeFromLine(line({
      preflop: 'called',
      preflopRole: 'limper',
      position: { positionsFromDealer: 4, category: 'middle' },
    }), context)

    expect(early.pairedBoardRank).toBe(6)
    expect(early.tripsRepresentation).toBeLessThan(button.tripsRepresentation!)
    expect(button.tripsRepresentation).toBeLessThan(limper.tripsRepresentation!)
    expect(early.positionAdjustment).toBeGreaterThan(button.positionAdjustment)
  })

  it('uses public card removal and multiway context without private opponent data', () => {
    const opponent = line({
      preflop: 'called',
      preflopRole: 'blind-checker',
      position: { positionsFromDealer: 2, category: 'blinds' },
    })
    const base = {
      variantId: 'texas-holdem',
      board: [card('K', 'diamonds'), card('6', 'clubs'), card('6', 'diamonds')],
      ownCards: [card('A', 'hearts'), card('A', 'clubs')],
      activeOpponents: 1,
    }
    const blocked = estimateRangeFromLine(opponent, {
      ...base,
      ownCards: [card('6', 'hearts'), card('A', 'clubs')],
    })
    const multiway = estimateRangeFromLine(opponent, { ...base, activeOpponents: 3 })
    const headsUp = estimateRangeFromLine(opponent, base)

    expect(blocked.tripsRepresentation).toBeLessThan(headsUp.tripsRepresentation!)
    expect(multiway.tripsRepresentation).toBeGreaterThan(headsUp.tripsRepresentation!)
  })
})
