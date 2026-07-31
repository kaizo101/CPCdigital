import { describe, expect, it } from 'vitest'
import {
  isContinuationBetOpportunity,
  updatePreflopAggressor,
} from './calibration-metrics'

describe('calibration metrics', () => {
  it('tracks the last preflop aggressor through reraises', () => {
    let aggressor: string | null = null

    aggressor = updatePreflopAggressor(aggressor, 'preflop', 'opener', true)
    aggressor = updatePreflopAggressor(aggressor, 'preflop', 'caller', false)
    aggressor = updatePreflopAggressor(aggressor, 'preflop', 'three-bettor', true)

    expect(aggressor).toBe('three-bettor')
  })

  it('counts an unopened flop action by the preflop aggressor as an opportunity', () => {
    expect(isContinuationBetOpportunity({
      phase: 'flop',
      actingPlayerId: 'pfa',
      preflopAggressorId: 'pfa',
      currentBet: 0,
    })).toBe(true)
  })

  it('does not count facing a donk bet as a continuation-bet opportunity', () => {
    expect(isContinuationBetOpportunity({
      phase: 'flop',
      actingPlayerId: 'pfa',
      preflopAggressorId: 'pfa',
      currentBet: 40,
    })).toBe(false)
  })

  it('does not count another player or another street as an opportunity', () => {
    expect(isContinuationBetOpportunity({
      phase: 'flop',
      actingPlayerId: 'caller',
      preflopAggressorId: 'pfa',
      currentBet: 0,
    })).toBe(false)
    expect(isContinuationBetOpportunity({
      phase: 'turn',
      actingPlayerId: 'pfa',
      preflopAggressorId: 'pfa',
      currentBet: 0,
    })).toBe(false)
  })
})
