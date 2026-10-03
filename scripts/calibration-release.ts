import { execFileSync, spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CALIBRATION_SNAPSHOT_MARKER } from '../packages/client/src/calibration-regression'
import type { CalibrationRunEntry, CalibrationRunSnapshot } from '../packages/client/src/calibration-release-assessment'
import {
  MIN_CONFIRMATION_OPPORTUNITIES,
  planCalibrationConfirmations,
  validateCalibrationReleaseReport,
  type CalibrationReleaseReport,
} from '../packages/client/src/calibration-release-report'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const SIMULATION = fileURLToPath(new URL('../packages/client/src/simulation.ts', import.meta.url))
const CONFIRMATION_SALT = 'release-confirmation-v1'

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}

async function run(
  variant: CalibrationRunEntry['variant'],
  hands: number,
  seedSalt: string,
  label: string,
  archetype?: string,
  format?: CalibrationRunEntry['format'],
): Promise<CalibrationRunSnapshot> {
  const formatFilter = format === 'full-ring' ? 'full ring' : format === 'six-max' ? '6-max' : format
  const startedAt = Date.now()
  console.log(`[calibration] Starting ${label} (${variant}/${archetype ?? 'all'}/${format ?? 'all'}).`)
  const child = spawn(process.execPath, ['--import', 'tsx', SIMULATION], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      CALIB_VARIANT: variant,
      CALIB_HANDS: String(hands),
      CALIB_SEED_SALT: seedSalt,
      CALIB_PROFILE: archetype ?? '',
      CALIB_FORMAT: formatFilter ?? '',
      CALIB_JSON: '1',
      CALIB_PROGRESS: '1',
      CALIB_DETAIL: '0',
      CALIB_TRACE: '0',
      CALIB_TEST_INJECT_STRUCTURAL: '',
    },
  })
  const stdoutChunks: Buffer[] = []
  let stdoutBytes = 0
  let stderrTail = ''
  let outputTooLarge = false
  child.stdout.on('data', (chunk: Buffer) => {
    stdoutBytes += chunk.length
    if (stdoutBytes > 20 * 1024 * 1024) {
      outputTooLarge = true
      child.kill()
    } else {
      stdoutChunks.push(chunk)
    }
  })
  child.stderr.on('data', (chunk: Buffer) => {
    const message = chunk.toString('utf8')
    process.stderr.write(message)
    stderrTail = (stderrTail + message).slice(-20_000)
  })
  const heartbeat = setInterval(() => {
    console.log(`[calibration] Still running ${label} (${Math.round((Date.now() - startedAt) / 1000)}s elapsed).`)
  }, 30_000)
  let status: number | null
  try {
    status = await new Promise<number | null>((resolve, reject) => {
      child.once('error', reject)
      child.once('close', resolve)
    })
  } finally {
    clearInterval(heartbeat)
  }
  const stdout = Buffer.concat(stdoutChunks).toString('utf8')
  if (outputTooLarge) throw new Error(`${label}: simulation output exceeded 20 MB`)
  if (status !== 0) {
    throw new Error(`${variant}/${archetype ?? 'all'}/${format ?? 'all'} failed (${status}):\n${stdout.slice(-20_000)}\n${stderrTail}`)
  }
  const line = stdout.split(/\r?\n/).find(value => value.startsWith(CALIBRATION_SNAPSHOT_MARKER))
  if (!line) throw new Error(`${variant}: missing calibration JSON snapshot`)
  const snapshot = JSON.parse(line.slice(CALIBRATION_SNAPSHOT_MARKER.length)) as CalibrationRunSnapshot
  if (snapshot.seedSalt !== seedSalt || snapshot.handsPerFormat !== hands) {
    throw new Error(`${variant}: unexpected seed salt or hand count in snapshot`)
  }
  console.log(`[calibration] Finished ${label} in ${Math.round((Date.now() - startedAt) / 1000)}s.`)
  return snapshot
}

async function main(): Promise<void> {
  const validatePath = argument('--validate')
  if (validatePath) {
    const report = JSON.parse(readFileSync(resolve(validatePath), 'utf8')) as CalibrationReleaseReport
    const errors = validateCalibrationReleaseReport(report)
    if (errors.length > 0) throw new Error(errors.join('\n'))
    console.log(`Release report valid: ${report.entries.length} primary combinations, ${report.confirmations.length} confirmations.`)
    return
  }

  const output = argument('--output')
  if (!output) throw new Error('Usage: npm run calibrate:release -- --output calibration/evidence/<unique-name>.json [--hands 10000]')
  const hands = Number(argument('--hands') ?? 10_000)
  if (!Number.isInteger(hands) || hands < 1) throw new Error('--hands must be a positive integer')
  const appVersion = (JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as { version: string }).version
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim()
  const workingTreeDirty = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim().length > 0
  const primary = ['texas-holdem', 'omaha-high'] as const
  const snapshots: CalibrationRunSnapshot[] = []
  for (const [index, variant] of primary.entries()) {
    snapshots.push(await run(variant, hands, '', `primary ${index + 1}/${primary.length}`))
  }
  if (snapshots[0].metricSchemaVersion !== snapshots[1].metricSchemaVersion) {
    throw new Error('NLHE and PLO metric schema versions differ')
  }
  const entries = snapshots.flatMap(snapshot => snapshot.entries)
  const confirmationPlan = planCalibrationConfirmations(entries, MIN_CONFIRMATION_OPPORTUNITIES)
  console.log(`Primary complete: ${entries.length} combinations; confirming ${confirmationPlan.length} on independent seeds.`)
  const confirmations: CalibrationReleaseReport['confirmations'] = []
  for (const [index, request] of confirmationPlan.entries()) {
    const [variant, archetype, format] = request.key.split('/') as [CalibrationRunEntry['variant'], string, CalibrationRunEntry['format']]
    const snapshot = await run(variant, hands, CONFIRMATION_SALT, `confirmation ${index + 1}/${confirmationPlan.length}`, archetype, format)
    if (snapshot.entries.length !== 1) throw new Error(`${request.key}: expected one confirmation entry`)
    confirmations.push({ ...request, seedSalt: snapshot.seedSalt, entry: snapshot.entries[0] })
  }
  const report: CalibrationReleaseReport = {
    reportSchemaVersion: 1,
    appVersion,
    commit,
    workingTreeDirty,
    generatedAt: new Date().toISOString(),
    metricSchemaVersion: snapshots[0].metricSchemaVersion,
    handsPerFormat: hands,
    primarySeedSalt: '',
    confirmationSeedSalt: CONFIRMATION_SALT,
    minConfirmationOpportunities: MIN_CONFIRMATION_OPPORTUNITIES,
    entries,
    confirmations,
  }
  const errors = validateCalibrationReleaseReport(report)
  if (errors.length > 0) throw new Error(`Release report incomplete:\n${errors.join('\n')}`)
  writeFileSync(resolve(output), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' })
  console.log(`Release report written: ${output}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
