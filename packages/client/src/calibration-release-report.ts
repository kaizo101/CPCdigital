import type { CalibrationRegressionMetrics } from './calibration-regression'
import {
  assessCalibrationRelease,
  type CalibrationRunEntry,
} from './calibration-release-assessment'

type Metric = keyof CalibrationRegressionMetrics
type Variant = CalibrationRunEntry['variant']
type Format = CalibrationRunEntry['format']

const VARIANTS: Variant[] = ['texas-holdem', 'omaha-high']
const ARCHETYPES = ['tag', 'nit', 'lag', 'calling-station']
const FORMATS: Format[] = ['full-ring', 'six-max', 'heads-up']
const METRICS: Metric[] = ['vpip', 'pfr', 'threeBet', 'cBet', 'foldToCBet', 'turnCBet', 'wtsd', 'aggressionFactor']

export const MIN_CONFIRMATION_OPPORTUNITIES = 50

export interface CalibrationConfirmationPlan {
  key: string
  metrics: Metric[]
}

export interface CalibrationReleaseReport {
  reportSchemaVersion: 1
  appVersion: string
  commit: string
  workingTreeDirty: boolean
  generatedAt: string
  metricSchemaVersion: number
  handsPerFormat: number
  primarySeedSalt: string
  confirmationSeedSalt: string
  minConfirmationOpportunities: number
  entries: CalibrationRunEntry[]
  confirmations: Array<CalibrationConfirmationPlan & { seedSalt: string; entry: CalibrationRunEntry }>
}

export function calibrationEntryKey(entry: Pick<CalibrationRunEntry, 'variant' | 'archetype' | 'format'>): string {
  return `${entry.variant}/${entry.archetype}/${entry.format}`
}

/** Confirm out-of-range metrics and metrics with sparse opportunities on an independent seed. */
export function planCalibrationConfirmations(
  entries: CalibrationRunEntry[],
  minOpportunities = MIN_CONFIRMATION_OPPORTUNITIES,
): CalibrationConfirmationPlan[] {
  return entries.flatMap(entry => {
    const outside = new Set(assessCalibrationRelease(entry, entry.targetRanges, entry.observations)
      .targetFindings.filter(finding => finding.status === 'outside').map(finding => finding.metric))
    const metrics = METRICS.filter(metric => outside.has(metric)
      || (entry.observations[metric]?.denominator ?? 0) < minOpportunities)
    return metrics.length > 0 ? [{ key: calibrationEntryKey(entry), metrics }] : []
  })
}

function validateEntry(entry: CalibrationRunEntry, hands: number, label: string): string[] {
  const errors: string[] = []
  if (entry.hands !== hands) errors.push(`${label}: expected ${hands} hands, got ${entry.hands}`)
  if (!entry.metrics || !entry.observations || !entry.targetRanges) {
    errors.push(`${label}: missing metrics, raw observations or target ranges`)
    return errors
  }
  for (const metric of METRICS) {
    if (!(metric in entry.metrics)) errors.push(`${label}: missing ${metric} metric`)
    if (!(metric in entry.observations)) errors.push(`${label}: missing ${metric} numerator/denominator`)
    if (metric !== 'wtsd' || entry.variant === 'omaha-high') {
      if (!entry.targetRanges[metric]) errors.push(`${label}: missing ${metric} target range`)
    }
  }
  if (errors.length > 0) return errors
  for (const violation of assessCalibrationRelease(entry, entry.targetRanges, entry.observations).structuralViolations) {
    errors.push(`${label}: ${violation}`)
  }
  return errors
}

/** Validate metadata, exactly 24 primary cells, raw denominators and all required confirmations. */
export function validateCalibrationReleaseReport(report: CalibrationReleaseReport): string[] {
  const errors: string[] = []
  if (report.reportSchemaVersion !== 1) errors.push('invalid report schema version')
  if (!report.appVersion) errors.push('missing app version')
  if (!/^[0-9a-f]{40}$/.test(report.commit)) errors.push('missing or invalid commit SHA')
  if (typeof report.workingTreeDirty !== 'boolean') errors.push('missing working-tree status')
  if (!Number.isFinite(Date.parse(report.generatedAt))) errors.push('invalid generation timestamp')
  if (!Number.isInteger(report.metricSchemaVersion) || report.metricSchemaVersion < 1) errors.push('invalid metric schema version')
  if (!Number.isInteger(report.handsPerFormat) || report.handsPerFormat < 1) errors.push('invalid hand count')
  if (!report.confirmationSeedSalt || report.primarySeedSalt === report.confirmationSeedSalt) {
    errors.push('confirmation seed salt must differ from primary seed salt')
  }
  if (report.minConfirmationOpportunities !== MIN_CONFIRMATION_OPPORTUNITIES) {
    errors.push(`minimum opportunity count must be ${MIN_CONFIRMATION_OPPORTUNITIES}`)
  }
  if (!Array.isArray(report.entries) || !Array.isArray(report.confirmations)) {
    errors.push('missing entries or confirmations')
    return errors
  }

  const expected = new Set(VARIANTS.flatMap(variant => ARCHETYPES.flatMap(archetype =>
    FORMATS.map(format => `${variant}/${archetype}/${format}`))))
  const seen = new Set<string>()
  for (const entry of report.entries) {
    const key = calibrationEntryKey(entry)
    if (!expected.has(key)) errors.push(`unexpected primary entry ${key}`)
    if (seen.has(key)) errors.push(`duplicate primary entry ${key}`)
    seen.add(key)
    errors.push(...validateEntry(entry, report.handsPerFormat, key))
  }
  for (const key of expected) if (!seen.has(key)) errors.push(`missing primary entry ${key}`)

  if (errors.length > 0) return errors
  const plan = new Map(planCalibrationConfirmations(report.entries, report.minConfirmationOpportunities)
    .map(request => [request.key, request.metrics]))
  const primaryByKey = new Map(report.entries.map(entry => [calibrationEntryKey(entry), entry]))
  const confirmed = new Set<string>()
  for (const confirmation of report.confirmations) {
    const expectedMetrics = plan.get(confirmation.key)
    if (!expectedMetrics) errors.push(`unexpected confirmation ${confirmation.key}`)
    if (confirmed.has(confirmation.key)) errors.push(`duplicate confirmation ${confirmation.key}`)
    confirmed.add(confirmation.key)
    if (confirmation.seedSalt !== report.confirmationSeedSalt) {
      errors.push(`${confirmation.key}: confirmation seed salt mismatch`)
    }
    if (JSON.stringify(confirmation.metrics) !== JSON.stringify(expectedMetrics)) {
      errors.push(`${confirmation.key}: incomplete confirmation metric list`)
    }
    if (calibrationEntryKey(confirmation.entry) !== confirmation.key) {
      errors.push(`${confirmation.key}: confirmation entry key mismatch`)
    }
    if (JSON.stringify(confirmation.entry.targetRanges) !== JSON.stringify(primaryByKey.get(confirmation.key)?.targetRanges)) {
      errors.push(`${confirmation.key}: target ranges changed between primary and confirmation`)
    }
    errors.push(...validateEntry(confirmation.entry, report.handsPerFormat, `${confirmation.key} confirmation`))
  }
  for (const key of plan.keys()) if (!confirmed.has(key)) errors.push(`missing confirmation ${key}`)
  return errors
}
