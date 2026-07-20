import { describe, expect, it } from 'vitest'
import {
  getRunoutRevealStages,
  getRunoutStageDelay,
  POSTFLOP_RUNOUT_STAGE_DELAY_MS,
  PREFLOP_RUNOUT_STAGE_DELAY_MS,
} from './community-runout'

describe('community-card runout presentation', () => {
  it('reveals a preflop all-in as flop, turn, then river', () => {
    expect(getRunoutRevealStages(0, 5)).toEqual([3, 4, 5])
  })

  it('continues only with streets that were not visible yet', () => {
    expect(getRunoutRevealStages(3, 5)).toEqual([4, 5])
    expect(getRunoutRevealStages(4, 5)).toEqual([5])
    expect(getRunoutRevealStages(5, 5)).toEqual([])
  })

  it('gives a preflop all-in more time between streets', () => {
    expect(getRunoutStageDelay(0)).toBe(PREFLOP_RUNOUT_STAGE_DELAY_MS)
    expect(getRunoutStageDelay(3)).toBe(POSTFLOP_RUNOUT_STAGE_DELAY_MS)
    expect(PREFLOP_RUNOUT_STAGE_DELAY_MS).toBeGreaterThan(POSTFLOP_RUNOUT_STAGE_DELAY_MS)
    expect(PREFLOP_RUNOUT_STAGE_DELAY_MS).toBeGreaterThanOrEqual(1500)
  })
})
