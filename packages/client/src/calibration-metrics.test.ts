import { describe, expect, it } from 'vitest'
import {
  classifyAggressionAction,
  isContinuationBetOpportunity,
  isThreeBetOpportunity,
  summarizeShowdown,
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

  it('counts only genuinely aggressive all-ins in AF', () => {
    expect(classifyAggressionAction({ type: 'raise', amount: 80 }, 40, null)).toBe('aggressive')
    expect(classifyAggressionAction({ type: 'call' }, 40, null)).toBe('call')
    expect(classifyAggressionAction({ type: 'all-in' }, 40, 25)).toBe('call')
    expect(classifyAggressionAction({ type: 'all-in' }, 40, 120)).toBe('aggressive')
    expect(classifyAggressionAction({ type: 'check' }, 0, null)).toBe('neutral')
  })

  it('records a later backraise opportunity even after the player acted once', () => {
    expect(isThreeBetOpportunity(0, false)).toBe(false)
    expect(isThreeBetOpportunity(1, false)).toBe(true)
    expect(isThreeBetOpportunity(1, true)).toBe(false)
    expect(isThreeBetOpportunity(2, false)).toBe(false)
  })

  it('keeps flop folders in the WTSD denominator', () => {
    expect(summarizeShowdown(['folder', 'caller', 'winner'], ['caller', 'winner'])).toEqual({
      handsSeenFlop: 3,
      wentToShowdown: 2,
    })
  })

  it('counts revealed preflop all-ins as having seen the flop', () => {
    expect(summarizeShowdown([], ['all-in-1', 'all-in-2'])).toEqual({
      handsSeenFlop: 2,
      wentToShowdown: 2,
    })
  })
})
