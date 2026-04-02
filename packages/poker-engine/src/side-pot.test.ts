import { describe, it, expect } from 'vitest'
import { calculateSidePots } from './side-pot.js'

describe('calculateSidePots', () => {
  it('single pot when no all-ins', () => {
    const pots = calculateSidePots([
      { playerId: 'A', totalBet: 100, inHand: true },
      { playerId: 'B', totalBet: 100, inHand: true },
      { playerId: 'C', totalBet: 100, inHand: true },
    ])
    expect(pots).toHaveLength(1)
    expect(pots[0].amount).toBe(300)
    expect(pots[0].eligiblePlayerIds).toEqual(expect.arrayContaining(['A', 'B', 'C']))
  })

  it('creates side pot when one player is all-in for less', () => {
    // A: 1000, B (all-in): 500, C: 1000
    const pots = calculateSidePots([
      { playerId: 'A', totalBet: 1000, inHand: true },
      { playerId: 'B', totalBet: 500,  inHand: true },
      { playerId: 'C', totalBet: 1000, inHand: true },
    ])
    expect(pots).toHaveLength(2)
    // Main pot: 500 × 3 = 1500, eligible: A, B, C
    expect(pots[0].amount).toBe(1500)
    expect(pots[0].eligiblePlayerIds).toEqual(expect.arrayContaining(['A', 'B', 'C']))
    // Side pot: 500 × 2 = 1000, eligible: A, C (B capped)
    expect(pots[1].amount).toBe(1000)
    expect(pots[1].eligiblePlayerIds).toEqual(expect.arrayContaining(['A', 'C']))
    expect(pots[1].eligiblePlayerIds).not.toContain('B')
  })

  it('folded player contributes chips but cannot win', () => {
    // C folded after putting in 1000
    const pots = calculateSidePots([
      { playerId: 'A', totalBet: 1000, inHand: true },
      { playerId: 'B', totalBet: 1000, inHand: true },
      { playerId: 'C', totalBet: 1000, inHand: false }, // folded
    ])
    expect(pots).toHaveLength(1)
    expect(pots[0].amount).toBe(3000)
    expect(pots[0].eligiblePlayerIds).toEqual(expect.arrayContaining(['A', 'B']))
    expect(pots[0].eligiblePlayerIds).not.toContain('C')
  })

  it('three-way all-in creates multiple side pots', () => {
    const pots = calculateSidePots([
      { playerId: 'A', totalBet: 300, inHand: true },
      { playerId: 'B', totalBet: 200, inHand: true },
      { playerId: 'C', totalBet: 100, inHand: true },
    ])
    expect(pots).toHaveLength(3)
    expect(pots[0].amount).toBe(300)  // 100 × 3
    expect(pots[1].amount).toBe(200)  // 100 × 2
    expect(pots[2].amount).toBe(100)  // 100 × 1
    expect(pots[0].eligiblePlayerIds).toHaveLength(3)
    expect(pots[1].eligiblePlayerIds).toHaveLength(2)
    expect(pots[2].eligiblePlayerIds).toHaveLength(1)
  })

  it('total chips are preserved across all pots', () => {
    const contributions = [
      { playerId: 'A', totalBet: 750, inHand: true },
      { playerId: 'B', totalBet: 500, inHand: true },
      { playerId: 'C', totalBet: 1000, inHand: false },
    ]
    const total = contributions.reduce((s, c) => s + c.totalBet, 0)
    const pots = calculateSidePots(contributions)
    const potTotal = pots.reduce((s, p) => s + p.amount, 0)
    expect(potTotal).toBe(total)
  })
})
