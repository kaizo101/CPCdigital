import type { CalibrationRegressionEntry, CalibrationRegressionMetrics, CalibrationRegressionSnapshot } from './calibration-regression'

type MetricName = keyof CalibrationRegressionMetrics

export type CalibrationTargetRanges = Partial<Record<MetricName, readonly [number, number]>>

export interface CalibrationObservation {
  numerator: number
  denominator: number
}

export type CalibrationObservations = Record<MetricName, CalibrationObservation>

export interface CalibrationRunEntry extends CalibrationRegressionEntry {
  observations: CalibrationObservations
  targetRanges: CalibrationTargetRanges
}

export interface CalibrationRunSnapshot extends CalibrationRegressionSnapshot {
  seedSalt: string
  entries: CalibrationRunEntry[]
}

export interface CalibrationTargetFinding {
  metric: MetricName
  value: number
  target: readonly [number, number]
  observation: CalibrationObservation
  status: 'within' | 'outside' | 'not-evaluable'
  /** Distance to the nearest corridor edge, in percentage points or AF units. */
  distance: number | null
}

export interface CalibrationReleaseAssessment {
  targetFindings: CalibrationTargetFinding[]
  structuralViolations: string[]
}

/** Target corridors are diagnostic; only structural violations may fail a run. */
export function assessCalibrationRelease(
  entry: CalibrationRegressionEntry,
  targets: CalibrationTargetRanges,
  observations: CalibrationObservations,
): CalibrationReleaseAssessment {
  const structuralViolations = [...entry.invariants.metricViolations]
  for (const [name, count] of [
    ['invalid actions', entry.invariants.invalidActions],
    ['deep open shoves', entry.invariants.deepOpenShoves],
    ['uncommitted deep shoves', entry.invariants.uncommittedDeepShoves],
  ] as const) {
    if (!Number.isInteger(count) || count < 0) {
      structuralViolations.push(`${name}: invalid count ${count}`)
    } else if (count > 0) {
      structuralViolations.push(`${name}: ${count}`)
    }
  }

  const targetFindings: CalibrationTargetFinding[] = []
  for (const metric of Object.keys(entry.metrics) as MetricName[]) {
    const value = entry.metrics[metric]
    const observation = observations[metric]
    if (!Number.isFinite(value)) structuralViolations.push(`${metric}: non-finite value ${value}`)
    if (!observation
      || !Number.isInteger(observation.numerator)
      || !Number.isInteger(observation.denominator)
      || observation.numerator < 0
      || observation.denominator < 0
      || (metric !== 'aggressionFactor' && observation.numerator > observation.denominator)) {
      structuralViolations.push(`${metric}: invalid numerator/denominator`)
      continue
    }

    if (observation.denominator > 0) {
      const expected = metric === 'aggressionFactor'
        ? observation.numerator / observation.denominator
        : observation.numerator / observation.denominator * 100
      if (Number.isFinite(value) && Math.abs(value - expected) > 1e-6) {
        structuralViolations.push(`${metric}: metric ${value} disagrees with ${observation.numerator}/${observation.denominator}`)
      }
    }

    const target = targets[metric]
    if (!target) continue
    if (!Number.isFinite(target[0]) || !Number.isFinite(target[1]) || target[0] > target[1]) {
      structuralViolations.push(`${metric}: invalid target range`)
      continue
    }
    const evaluable = observation.denominator > 0 && Number.isFinite(value)
    const distance = evaluable
      ? value < target[0] ? target[0] - value : value > target[1] ? value - target[1] : 0
      : null
    targetFindings.push({
      metric,
      value,
      target,
      observation,
      status: !evaluable ? 'not-evaluable' : distance !== null && distance > 0 ? 'outside' : 'within',
      distance,
    })
  }

  return { targetFindings, structuralViolations }
}
