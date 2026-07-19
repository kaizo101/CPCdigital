import { describe, expect, it } from 'vitest'
import { getRunoutRevealStages } from './community-runout'

describe('community-card runout presentation', () => {
  it('reveals a preflop all-in as flop, turn, then river', () => {
    expect(getRunoutRevealStages(0, 5)).toEqual([3, 4, 5])
  })

  it('continues only with streets that were not visible yet', () => {
    expect(getRunoutRevealStages(3, 5)).toEqual([4, 5])
    expect(getRunoutRevealStages(4, 5)).toEqual([5])
    expect(getRunoutRevealStages(5, 5)).toEqual([])
  })
})
