import { spawnSync } from 'node:child_process'
import {
  CALIBRATION_SNAPSHOT_MARKER,
  type CalibrationRegressionEntry,
  type CalibrationRegressionSnapshot,
} from '../packages/client/src/calibration-regression'

const HANDS = 100
const STAKES = [
  { name: 'micro', smallBlind: 0.01, bigBlind: 0.02 },
  { name: 'reference', smallBlind: 10, bigBlind: 20 },
] as const

function run(
  variant: 'texas-holdem' | 'omaha-high',
  stake: typeof STAKES[number],
): CalibrationRegressionEntry {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npmCommand, ['run', 'calibrate:bots'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      CALIB_VARIANT: variant,
      CALIB_PROFILE: 'tag',
      CALIB_FORMAT: '6-max',
      CALIB_HANDS: String(HANDS),
      CALIB_BIG_BLIND: String(stake.bigBlind),
      CALIB_SMALL_BLIND: String(stake.smallBlind),
      CALIB_STARTING_CHIPS: String(stake.bigBlind * 100),
      CALIB_NO_EXIT: '1',
      CALIB_JSON: '1',
      CALIB_DETAIL: '0',
      CALIB_TRACE: '0',
    },
  })

  if (result.status !== 0) {
    process.stdout.write(result.stdout)
    process.stderr.write(result.stderr)
    throw new Error(`${variant}/${stake.name} simulation exited with status ${result.status}`)
  }

  const snapshotLine = result.stdout
    .split(/\r?\n/)
    .find(line => line.startsWith(CALIBRATION_SNAPSHOT_MARKER))
  if (!snapshotLine) throw new Error(`${variant}/${stake.name} did not emit a calibration snapshot`)
  const snapshot = JSON.parse(
    snapshotLine.slice(CALIBRATION_SNAPSHOT_MARKER.length),
  ) as CalibrationRegressionSnapshot
  if (snapshot.entries.length !== 1) {
    throw new Error(`${variant}/${stake.name} expected one result, received ${snapshot.entries.length}`)
  }
  return snapshot.entries[0]
}

function assertEquivalent(
  variant: 'texas-holdem' | 'omaha-high',
  baseline: CalibrationRegressionEntry,
  comparison: CalibrationRegressionEntry,
): void {
  for (const [metric, baselineValue] of Object.entries(baseline.metrics)) {
    const comparisonValue = comparison.metrics[metric as keyof typeof comparison.metrics]
    if (Math.abs(baselineValue - comparisonValue) > 1e-9) {
      throw new Error(
        `${variant} ${metric} differs by stake: ${baselineValue} vs ${comparisonValue}`,
      )
    }
  }
  if (JSON.stringify(baseline.invariants) !== JSON.stringify(comparison.invariants)) {
    throw new Error(`${variant} structural invariants differ by stake`)
  }
}

console.log(`Running ${HANDS}-hand stake-invariance smoke...`)
for (const variant of ['texas-holdem', 'omaha-high'] as const) {
  const entries = STAKES.map(stake => run(variant, stake))
  assertEquivalent(variant, entries[0], entries[1])
  console.log(`  ${variant}: ${STAKES.map(stake => `${stake.smallBlind}/${stake.bigBlind}`).join(' = ')}`)
}
console.log('Stake invariance passed for NLHE and PLO.')
