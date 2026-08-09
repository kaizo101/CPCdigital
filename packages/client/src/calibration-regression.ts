export const CALIBRATION_SNAPSHOT_MARKER = 'CALIBRATION_SNAPSHOT_JSON:'

export const CALIBRATION_PERCENTAGE_METRICS = [
  'vpip',
  'pfr',
  'threeBet',
  'cBet',
  'foldToCBet',
  'turnCBet',
  'wtsd',
] as const

export type CalibrationPercentageMetric = typeof CALIBRATION_PERCENTAGE_METRICS[number]

export interface CalibrationRegressionMetrics
  extends Record<CalibrationPercentageMetric, number> {
  aggressionFactor: number
}

export interface CalibrationRegressionInvariants {
  invalidActions: number
  deepOpenShoves: number
  uncommittedDeepShoves: number
  metricViolations: string[]
}

export interface CalibrationRegressionEntry {
  variant: 'texas-holdem' | 'omaha-high'
  archetype: string
  format: 'full-ring' | 'six-max' | 'heads-up'
  hands: number
  metrics: CalibrationRegressionMetrics
  invariants: CalibrationRegressionInvariants
}

export interface CalibrationRegressionSnapshot {
  metricSchemaVersion: number
  handsPerFormat: number
  entries: CalibrationRegressionEntry[]
}

export interface CalibrationRegressionThresholds {
  percentageWarning: number
  percentageFailure: number
  aggressionFactorWarning: number
  aggressionFactorFailure: number
}

export interface CalibrationRegressionFinding {
  severity: 'warning' | 'error'
  entry: string
  metric: string
  baseline?: number
  current?: number
  delta?: number
  message: string
}

export interface CalibrationRegressionResult {
  warnings: CalibrationRegressionFinding[]
  errors: CalibrationRegressionFinding[]
}

export const DEFAULT_CALIBRATION_REGRESSION_THRESHOLDS: CalibrationRegressionThresholds = {
  percentageWarning: 2,
  percentageFailure: 5,
  aggressionFactorWarning: 0.2,
  aggressionFactorFailure: 0.5,
}

function entryKey(entry: CalibrationRegressionEntry): string {
  return `${entry.variant}/${entry.archetype}/${entry.format}`
}

function finding(
  severity: CalibrationRegressionFinding['severity'],
  entry: string,
  metric: string,
  message: string,
  values: Pick<CalibrationRegressionFinding, 'baseline' | 'current' | 'delta'> = {},
): CalibrationRegressionFinding {
  return { severity, entry, metric, message, ...values }
}

/** Compare a deterministic smoke run with its versioned reference snapshot. */
export function compareCalibrationSnapshots(
  baseline: CalibrationRegressionSnapshot,
  current: CalibrationRegressionSnapshot,
  thresholds: CalibrationRegressionThresholds = DEFAULT_CALIBRATION_REGRESSION_THRESHOLDS,
): CalibrationRegressionResult {
  const warnings: CalibrationRegressionFinding[] = []
  const errors: CalibrationRegressionFinding[] = []

  if (current.metricSchemaVersion !== baseline.metricSchemaVersion) {
    errors.push(finding(
      'error',
      'snapshot',
      'metricSchemaVersion',
      `metric schema changed from ${baseline.metricSchemaVersion} to ${current.metricSchemaVersion}`,
    ))
  }
  if (current.handsPerFormat !== baseline.handsPerFormat) {
    errors.push(finding(
      'error',
      'snapshot',
      'handsPerFormat',
      `hand count changed from ${baseline.handsPerFormat} to ${current.handsPerFormat}`,
    ))
  }

  const baselineEntries = new Map(baseline.entries.map(entry => [entryKey(entry), entry]))
  const currentEntries = new Map(current.entries.map(entry => [entryKey(entry), entry]))

  for (const key of baselineEntries.keys()) {
    if (!currentEntries.has(key)) {
      errors.push(finding('error', key, 'entry', 'baseline entry is missing from current run'))
    }
  }
  for (const key of currentEntries.keys()) {
    if (!baselineEntries.has(key)) {
      errors.push(finding('error', key, 'entry', 'current run contains an unexpected entry'))
    }
  }

  for (const [key, baselineEntry] of baselineEntries) {
    const currentEntry = currentEntries.get(key)
    if (!currentEntry) continue

    if (currentEntry.hands !== baselineEntry.hands) {
      errors.push(finding(
        'error', key, 'hands',
        `entry hand count changed from ${baselineEntry.hands} to ${currentEntry.hands}`,
      ))
    }

    const invariantTotal = currentEntry.invariants.invalidActions
      + currentEntry.invariants.deepOpenShoves
      + currentEntry.invariants.uncommittedDeepShoves
      + currentEntry.invariants.metricViolations.length
    if (invariantTotal > 0) {
      errors.push(finding(
        'error', key, 'invariants',
        `structural violations: ${JSON.stringify(currentEntry.invariants)}`,
      ))
    }

    for (const metric of CALIBRATION_PERCENTAGE_METRICS) {
      const baselineValue = baselineEntry.metrics[metric]
      const currentValue = currentEntry.metrics[metric]
      const delta = Math.abs(currentValue - baselineValue)
      const values = { baseline: baselineValue, current: currentValue, delta }
      if (delta > thresholds.percentageFailure) {
        errors.push(finding('error', key, metric, `changed by ${delta.toFixed(2)} percentage points`, values))
      } else if (delta > thresholds.percentageWarning) {
        warnings.push(finding('warning', key, metric, `changed by ${delta.toFixed(2)} percentage points`, values))
      }
    }

    const baselineAf = baselineEntry.metrics.aggressionFactor
    const currentAf = currentEntry.metrics.aggressionFactor
    const afDelta = Math.abs(currentAf - baselineAf)
    const afValues = { baseline: baselineAf, current: currentAf, delta: afDelta }
    if (afDelta > thresholds.aggressionFactorFailure) {
      errors.push(finding('error', key, 'aggressionFactor', `changed by ${afDelta.toFixed(2)}`, afValues))
    } else if (afDelta > thresholds.aggressionFactorWarning) {
      warnings.push(finding('warning', key, 'aggressionFactor', `changed by ${afDelta.toFixed(2)}`, afValues))
    }
  }

  return { warnings, errors }
}
