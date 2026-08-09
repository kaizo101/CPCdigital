import { describe, expect, it } from 'vitest'
import {
  CalibrationHandAccumulator,
  calibrationPercentage,
  calibrationInvariantViolations,
  classifyAggressionAction,
  isContinuationBetOpportunity,
  isWithinCalibrationTarget,
  isThreeBetOpportunity,
  summarizeShowdown,
  updatePreflopAggressor,
} from './calibration-metrics'

describe('calibration metrics', () => {
  it('keeps empty-denominator percentages finite', () => {
    expect(calibrationPercentage(0, 0)).toBe(0)
    expect(Number.isFinite(calibrationPercentage(0, 0))).toBe(true)
  })

  it('treats both target boundaries as inclusive and rejects non-finite values', () => {
    expect(isWithinCalibrationTarget(30, [30, 40])).toBe(true)
    expect(isWithinCalibrationTarget(40, [30, 40])).toBe(true)
    expect(isWithinCalibrationTarget(29.99, [30, 40])).toBe(false)
    expect(isWithinCalibrationTarget(Number.NaN, [30, 40])).toBe(false)
  })

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

  it('reduces a golden raise-call-cbet-fold hand consistently', () => {
    const accumulator = new CalibrationHandAccumulator()

    accumulator.recordAction({
      phase: 'preflop', playerId: 'opener', action: { type: 'raise', amount: 60 }, currentBet: 20,
    })
    accumulator.recordAction({
      phase: 'preflop', playerId: 'caller', action: { type: 'call' }, currentBet: 60,
    })
    const cBet = accumulator.recordAction({
      phase: 'flop', playerId: 'opener', action: { type: 'raise', amount: 80 }, currentBet: 0,
    })
    const response = accumulator.recordAction({
      phase: 'flop', playerId: 'caller', action: { type: 'fold' }, currentBet: 80,
    })

    expect(accumulator.vpipPlayers).toEqual(new Set(['opener', 'caller']))
    expect(accumulator.pfrPlayers).toEqual(new Set(['opener']))
    expect(cBet).toMatchObject({ cBetOpportunity: true, cBet: true, aggressionRole: 'pfa' })
    expect(response).toMatchObject({ foldToCBetOpportunity: true, foldToCBet: true })
  })

  it('tracks one three-bet opportunity and the resulting three-bet', () => {
    const accumulator = new CalibrationHandAccumulator()
    accumulator.recordAction({
      phase: 'preflop', playerId: 'opener', action: { type: 'raise', amount: 60 }, currentBet: 20,
    })
    const threeBet = accumulator.recordAction({
      phase: 'preflop', playerId: 'three-bettor', action: { type: 'raise', amount: 180 }, currentBet: 60,
    })

    expect(threeBet).toMatchObject({ threeBetOpportunity: true, threeBet: true })
    expect(accumulator.threeBetOpportunityPlayers).toEqual(new Set(['three-bettor']))
    expect(accumulator.threeBetPlayers).toEqual(new Set(['three-bettor']))
  })

  it('classifies a passive all-in through the accumulator as a call', () => {
    const accumulator = new CalibrationHandAccumulator()
    const delta = accumulator.recordAction({
      phase: 'turn',
      playerId: 'short-stack',
      action: { type: 'all-in' },
      currentBet: 100,
      allInAmount: 60,
    })

    expect(delta.aggressionClass).toBe('call')
  })

  it('rejects impossible aggregate metric relationships', () => {
    expect(calibrationInvariantViolations({
      threeBets: 3,
      threeBetOpportunities: 2,
      cBets: 4,
      cBetOpportunities: 3,
      foldToCBets: 2,
      foldToCBetOpportunities: 1,
      handsSeenFlop: 4,
      handsSeenTurn: 5,
      handsSeenRiver: 6,
      wentToShowdown: 5,
      wonAtShowdown: 6,
    })).toHaveLength(7)
  })
})
