import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  CALIBRATION_SNAPSHOT_MARKER,
  compareCalibrationSnapshots,
  type CalibrationRegressionFinding,
  type CalibrationRegressionSnapshot,
} from '../packages/client/src/calibration-regression'

const HANDS_PER_FORMAT = 300
const BASELINE_PATH = join(
  process.cwd(),
  'calibration',
  'v0.8.1-300-hand.json',
)
const UPDATE_BASELINE = process.argv.includes('--update')

function runVariant(variant: 'texas-holdem' | 'omaha-high'): CalibrationRegressionSnapshot {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npmCommand, ['run', 'calibrate:bots'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    env: {
      ...process.env,
      CALIB_VARIANT: variant,
      CALIB_HANDS: String(HANDS_PER_FORMAT),
      CALIB_NO_EXIT: '1',
      CALIB_JSON: '1',
      CALIB_DETAIL: '0',
      CALIB_TRACE: '0',
    },
  })

  if (result.status !== 0) {
    process.stdout.write(result.stdout)
    process.stderr.write(result.stderr)
    throw new Error(`${variant} calibration process exited with status ${result.status}`)
  }

  const snapshotLine = result.stdout
    .split(/\r?\n/)
    .find(line => line.startsWith(CALIBRATION_SNAPSHOT_MARKER))
  if (!snapshotLine) {
    throw new Error(`${variant} calibration did not emit a JSON snapshot`)
  }
  return JSON.parse(snapshotLine.slice(CALIBRATION_SNAPSHOT_MARKER.length)) as CalibrationRegressionSnapshot
}

function validateCurrentSnapshot(snapshot: CalibrationRegressionSnapshot): void {
  if (snapshot.handsPerFormat !== HANDS_PER_FORMAT) {
    throw new Error(`expected ${HANDS_PER_FORMAT} hands per format, got ${snapshot.handsPerFormat}`)
  }
  if (snapshot.entries.length !== 24) {
    throw new Error(`expected 24 archetype/format combinations, got ${snapshot.entries.length}`)
  }
  for (const entry of snapshot.entries) {
    const structuralCount = entry.invariants.invalidActions
      + entry.invariants.deepOpenShoves
      + entry.invariants.uncommittedDeepShoves
      + entry.invariants.metricViolations.length
    if (structuralCount > 0) {
      throw new Error(`${entry.variant}/${entry.archetype}/${entry.format} has structural violations`)
    }
    for (const [metric, value] of Object.entries(entry.metrics)) {
      if (!Number.isFinite(value)) {
        throw new Error(`${entry.variant}/${entry.archetype}/${entry.format} has non-finite ${metric}`)
      }
    }
  }
}

function printFinding(finding: CalibrationRegressionFinding): void {
  const prefix = finding.severity === 'error' ? 'ERROR' : 'WARN '
  const values = finding.delta === undefined
    ? ''
    : ` (${finding.baseline?.toFixed(2)} -> ${finding.current?.toFixed(2)})`
  console.log(`${prefix} ${finding.entry} ${finding.metric}: ${finding.message}${values}`)
}

console.log(`Running deterministic ${HANDS_PER_FORMAT}-hand calibration regression...`)
const nlhe = runVariant('texas-holdem')
console.log('  NLHE: 12 combinations completed')
const plo = runVariant('omaha-high')
console.log('  PLO:  12 combinations completed')

const current: CalibrationRegressionSnapshot = {
  metricSchemaVersion: nlhe.metricSchemaVersion,
  handsPerFormat: HANDS_PER_FORMAT,
  entries: [...nlhe.entries, ...plo.entries],
}
validateCurrentSnapshot(current)

if (UPDATE_BASELINE) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`)
  console.log(`Updated calibration baseline: ${BASELINE_PATH}`)
  process.exit(0)
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as CalibrationRegressionSnapshot
const result = compareCalibrationSnapshots(baseline, current)
for (const warning of result.warnings) printFinding(warning)
for (const error of result.errors) printFinding(error)

console.log(
  `Calibration regression completed: ${current.entries.length} combinations, `
  + `${result.warnings.length} warnings, ${result.errors.length} errors.`,
)
if (result.errors.length > 0) process.exitCode = 1
