import { describe, expect, it } from 'vitest'
import type { CalibrationRunEntry } from './calibration-release-assessment'
import {
  calibrationEntryKey,
  planCalibrationConfirmations,
  validateCalibrationReleaseReport,
  type CalibrationReleaseReport,
} from './calibration-release-report'

function entry(variant: CalibrationRunEntry['variant'], archetype: string, format: CalibrationRunEntry['format']): CalibrationRunEntry {
  return {
    variant, archetype, format, hands: 100,
    metrics: { vpip: 50, pfr: 50, threeBet: 50, cBet: 50, foldToCBet: 50, turnCBet: 50, wtsd: 50, aggressionFactor: 2 },
    observations: {
      vpip: { numerator: 50, denominator: 100 },
      pfr: { numerator: 50, denominator: 100 },
      threeBet: { numerator: 50, denominator: 100 },
      cBet: { numerator: 50, denominator: 100 },
      foldToCBet: { numerator: 50, denominator: 100 },
      turnCBet: { numerator: 50, denominator: 100 },
      wtsd: { numerator: 50, denominator: 100 },
      aggressionFactor: { numerator: 200, denominator: 100 },
    },
    targetRanges: {
      vpip: [0, 100], pfr: [0, 100], threeBet: [0, 100], cBet: [0, 100],
      foldToCBet: [0, 100], turnCBet: [0, 100], wtsd: [0, 100], aggressionFactor: [0, 10],
    },
    invariants: { invalidActions: 0, deepOpenShoves: 0, uncommittedDeepShoves: 0, metricViolations: [] },
  }
}

function report(): CalibrationReleaseReport {
  const entries = (['texas-holdem', 'omaha-high'] as const).flatMap(variant =>
    ['tag', 'nit', 'lag', 'calling-station'].flatMap(archetype =>
      (['full-ring', 'six-max', 'heads-up'] as const).map(format => entry(variant, archetype, format))))
  return {
    reportSchemaVersion: 1,
    appVersion: '0.8.2-dev',
    commit: 'a'.repeat(40),
    workingTreeDirty: false,
    generatedAt: '2026-10-01T12:00:00.000Z',
    metricSchemaVersion: 2,
    handsPerFormat: 100,
    primarySeedSalt: '',
    confirmationSeedSalt: 'release-confirmation-v1',
    minConfirmationOpportunities: 50,
    entries,
    confirmations: [],
  }
}

describe('calibration release report', () => {
  it('accepts a complete 24-cell report with metadata and raw counters', () => {
    expect(validateCalibrationReleaseReport(report())).toEqual([])
  })

  it('rejects missing or duplicate cells and missing metadata', () => {
    const value = report()
    value.entries.pop()
    value.entries.push(value.entries[0])
    value.commit = ''
    expect(validateCalibrationReleaseReport(value)).toEqual(expect.arrayContaining([
      'missing or invalid commit SHA',
      expect.stringContaining('duplicate primary entry'),
      expect.stringContaining('missing primary entry'),
    ]))
  })

  it('rejects missing raw denominators, wrong hand counts and structural errors', () => {
    const value = report()
    delete (value.entries[0].observations as Partial<typeof value.entries[0]['observations']>).threeBet
    value.entries[1].hands = 99
    value.entries[2].invariants.invalidActions = 1
    const errors = validateCalibrationReleaseReport(value)
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('missing threeBet numerator/denominator'),
      expect.stringContaining('expected 100 hands'),
      expect.stringContaining('invalid actions: 1'),
    ]))
  })

  it('selects outliers and sparse opportunities for an independent-seed confirmation', () => {
    const value = report()
    value.entries[0].targetRanges.vpip = [10, 20]
    value.entries[0].observations.cBet = { numerator: 1, denominator: 2 }
    const plan = planCalibrationConfirmations(value.entries)
    expect(plan).toEqual([{ key: calibrationEntryKey(value.entries[0]), metrics: ['vpip', 'cBet'] }])
    expect(validateCalibrationReleaseReport(value)).toContain(`missing confirmation ${plan[0].key}`)

    value.confirmations.push({ ...plan[0], seedSalt: value.confirmationSeedSalt, entry: structuredClone(value.entries[0]) })
    expect(validateCalibrationReleaseReport(value)).toEqual([])
    value.confirmations[0].seedSalt = value.primarySeedSalt
    expect(validateCalibrationReleaseReport(value)).toContain(`${plan[0].key}: confirmation seed salt mismatch`)
  })

  it('rejects a confirmation on the same seed as the primary run', () => {
    const value = report()
    value.confirmationSeedSalt = value.primarySeedSalt
    expect(validateCalibrationReleaseReport(value)).toContain('confirmation seed salt must differ from primary seed salt')
  })

  it('treats exactly 50 opportunities as sufficiently sampled, but 49 and zero as sparse', () => {
    const value = report()
    value.entries[0].observations.cBet = { numerator: 25, denominator: 50 }
    expect(planCalibrationConfirmations(value.entries)).toEqual([])
    value.entries[0].observations.cBet = { numerator: 0, denominator: 49 }
    expect(planCalibrationConfirmations(value.entries)[0].metrics).toContain('cBet')
    value.entries[0].observations.cBet = { numerator: 0, denominator: 0 }
    expect(planCalibrationConfirmations(value.entries)[0].metrics).toContain('cBet')
  })

  it('does not allow the sparse-opportunity threshold to be lowered in a report', () => {
    const value = report()
    value.minConfirmationOpportunities = 1
    expect(validateCalibrationReleaseReport(value)).toContain('minimum opportunity count must be 50')
  })
})
