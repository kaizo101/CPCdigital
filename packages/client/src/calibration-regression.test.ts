import { describe, expect, it } from 'vitest'
import {
  compareCalibrationSnapshots,
  type CalibrationRegressionEntry,
  type CalibrationRegressionSnapshot,
} from './calibration-regression'

function entry(overrides: Partial<CalibrationRegressionEntry> = {}): CalibrationRegressionEntry {
  return {
    variant: 'texas-holdem',
    archetype: 'tag',
    format: 'six-max',
    hands: 300,
    metrics: {
      vpip: 25,
      pfr: 18,
      threeBet: 10,
      cBet: 68,
      foldToCBet: 45,
      turnCBet: 50,
      wtsd: 0,
      aggressionFactor: 2.5,
    },
    invariants: {
      invalidActions: 0,
      deepOpenShoves: 0,
      uncommittedDeepShoves: 0,
      metricViolations: [],
    },
    ...overrides,
  }
}

function snapshot(value: CalibrationRegressionEntry): CalibrationRegressionSnapshot {
  return { metricSchemaVersion: 2, handsPerFormat: 300, entries: [value] }
}

describe('compareCalibrationSnapshots', () => {
  it('accepts an identical deterministic run', () => {
    expect(compareCalibrationSnapshots(snapshot(entry()), snapshot(entry()))).toEqual({
      warnings: [],
      errors: [],
    })
  })

  it('warns above two percentage points and fails above five', () => {
    const baseline = snapshot(entry())
    const current = snapshot(entry({
      metrics: {
        ...entry().metrics,
        vpip: 27.01,
        pfr: 23.01,
      },
    }))

    const result = compareCalibrationSnapshots(baseline, current)
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ metric: 'vpip', severity: 'warning' }),
    ]))
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ metric: 'pfr', severity: 'error' }),
    ]))
  })

  it('uses ratio-specific thresholds for aggression factor', () => {
    const current = snapshot(entry({
      metrics: { ...entry().metrics, aggressionFactor: 3.01 },
    }))
    const result = compareCalibrationSnapshots(snapshot(entry()), current)

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ metric: 'aggressionFactor', delta: expect.closeTo(0.51) }),
    ]))
  })

  it('fails on structural violations and snapshot-shape drift', () => {
    const current = snapshot(entry({
      invariants: {
        ...entry().invariants,
        invalidActions: 1,
      },
    }))
    current.metricSchemaVersion = 3
    current.handsPerFormat = 301

    const result = compareCalibrationSnapshots(snapshot(entry()), current)
    expect(result.errors.map(value => value.metric)).toEqual(expect.arrayContaining([
      'metricSchemaVersion',
      'handsPerFormat',
      'invariants',
    ]))
  })

  it('fails when entries are missing or unexpected', () => {
    const currentEntry = entry({ archetype: 'lag' })
    const result = compareCalibrationSnapshots(snapshot(entry()), snapshot(currentEntry))

    expect(result.errors.filter(value => value.metric === 'entry')).toHaveLength(2)
  })
})
