import { describe, expect, it } from 'vitest'
import type { CalibrationRegressionEntry } from './calibration-regression'
import {
  assessCalibrationRelease,
  type CalibrationObservations,
} from './calibration-release-assessment'

function entry(): CalibrationRegressionEntry {
  return {
    variant: 'texas-holdem', archetype: 'tag', format: 'six-max', hands: 300,
    metrics: {
      vpip: 25, pfr: 18, threeBet: 10, cBet: 68, foldToCBet: 45,
      turnCBet: 50, wtsd: 30, aggressionFactor: 2.5,
    },
    invariants: { invalidActions: 0, deepOpenShoves: 0, uncommittedDeepShoves: 0, metricViolations: [] },
  }
}

function observations(): CalibrationObservations {
  return {
    vpip: { numerator: 25, denominator: 100 },
    pfr: { numerator: 18, denominator: 100 },
    threeBet: { numerator: 10, denominator: 100 },
    cBet: { numerator: 68, denominator: 100 },
    foldToCBet: { numerator: 45, denominator: 100 },
    turnCBet: { numerator: 50, denominator: 100 },
    wtsd: { numerator: 30, denominator: 100 },
    aggressionFactor: { numerator: 25, denominator: 10 },
  }
}

describe('assessCalibrationRelease', () => {
  it('reports an out-of-corridor value without a structural failure', () => {
    const result = assessCalibrationRelease(entry(), { vpip: [15, 20] }, observations())
    expect(result.structuralViolations).toEqual([])
    expect(result.targetFindings).toEqual([
      expect.objectContaining({ metric: 'vpip', status: 'outside', distance: 5 }),
    ])
  })

  it('accepts exact corridor boundaries', () => {
    const result = assessCalibrationRelease(entry(), { vpip: [25, 25] }, observations())
    expect(result.targetFindings[0]).toMatchObject({ status: 'within', distance: 0 })
  })

  it('marks zero-opportunity rates and AF as not evaluable, not zero-percent misses', () => {
    const sample = observations()
    sample.turnCBet = { numerator: 0, denominator: 0 }
    sample.aggressionFactor = { numerator: 3, denominator: 0 }
    const result = assessCalibrationRelease(entry(), {
      turnCBet: [40, 60], aggressionFactor: [2, 3],
    }, sample)
    expect(result.structuralViolations).toEqual([])
    expect(result.targetFindings.map(finding => [finding.metric, finding.status, finding.distance])).toEqual([
      ['turnCBet', 'not-evaluable', null],
      ['aggressionFactor', 'not-evaluable', null],
    ])
  })

  it('blocks structural violations even when all target values are within range', () => {
    const current = entry()
    current.invariants.invalidActions = 1
    current.invariants.metricViolations.push('invalid showdown denominator')
    const result = assessCalibrationRelease(current, { vpip: [20, 30] }, observations())
    expect(result.targetFindings[0]?.status).toBe('within')
    expect(result.structuralViolations).toEqual(expect.arrayContaining([
      'invalid actions: 1', 'invalid showdown denominator',
    ]))
  })

  it('blocks impossible observations and non-finite metrics', () => {
    const current = entry()
    current.metrics.pfr = Number.NaN
    const sample = observations()
    sample.vpip = { numerator: 101, denominator: 100 }
    const result = assessCalibrationRelease(current, { vpip: [20, 30] }, sample)
    expect(result.structuralViolations).toEqual(expect.arrayContaining([
      'pfr: non-finite value NaN', 'vpip: invalid numerator/denominator',
    ]))
  })

  it('blocks a rate that disagrees with its raw counters', () => {
    const current = entry()
    current.metrics.vpip = 26
    const result = assessCalibrationRelease(current, { vpip: [20, 30] }, observations())
    expect(result.structuralViolations).toContain('vpip: metric 26 disagrees with 25/100')
  })

  it('allows an aggression factor numerator larger than its call denominator', () => {
    const result = assessCalibrationRelease(entry(), { aggressionFactor: [2, 3] }, observations())
    expect(result.structuralViolations).toEqual([])
    expect(result.targetFindings[0]?.status).toBe('within')
  })
})
