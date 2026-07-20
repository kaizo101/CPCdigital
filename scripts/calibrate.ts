// Auto-calibrator: random search with progressive narrowing.
// Passes params via PARAMS_OVERRIDES env var, spawns simulation, parses output.
// Run: npx tsx scripts/calibrate.ts

import { execSync } from 'child_process'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.join(__dirname, '..')
const SIM_FILE = path.join(ROOT, 'packages', 'client', 'src', 'simulation.ts')

const PARAMS_TO_TUNE = [
  'archetypes.tag.preflopLooseness',
  'archetypes.tag.aggression',
  'archetypes.tag.bluffFrequency',
  'archetypes.nit.preflopLooseness',
  'archetypes.nit.aggression',
  'archetypes.nit.bluffFrequency',
  'archetypes.lag.preflopLooseness',
  'archetypes.lag.aggression',
  'archetypes.lag.bluffFrequency',
  'archetypes.calling-station.preflopLooseness',
  'archetypes.calling-station.aggression',
  'archetypes.calling-station.bluffFrequency',
]

const DEFAULT_VALUES: Record<string, number> = {
  'archetypes.tag.preflopLooseness': 50, 'archetypes.tag.aggression': 65, 'archetypes.tag.bluffFrequency': 25,
  'archetypes.nit.preflopLooseness': 12, 'archetypes.nit.aggression': 38, 'archetypes.nit.bluffFrequency': 8,
  'archetypes.lag.preflopLooseness': 76, 'archetypes.lag.aggression': 80, 'archetypes.lag.bluffFrequency': 48,
  'archetypes.calling-station.preflopLooseness': 82, 'archetypes.calling-station.aggression': 22, 'archetypes.calling-station.bluffFrequency': 8,
}

interface Metric { name: string; value: number; target: [number, number] }

function runSim(hands: number, overrides: Record<string, number>): { metrics: Metric[]; output: string } {
    const env = {
      ...process.env,
      PARAMS_OVERRIDES: JSON.stringify(overrides),
      CALIB_HANDS: String(hands),
      CALIB_NO_EXIT: '1',
    }
  try {
    const output = execSync(`npx tsx "${SIM_FILE}" 2>&1`, {
      encoding: 'utf-8',
      timeout: 600_000,
      cwd: ROOT,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return { metrics: parseOutput(output), output }
  } catch (err: any) {
    return { metrics: [], output: err.stdout ?? err.message ?? '' }
  }
}

function parseOutput(output: string): Metric[] {
  const metrics: Metric[] = []
  for (const line of output.split('\n')) {
    let m = /VPIP:\s*([\d.]+)%\s*\(target\s*([\d.]+)–([\d.]+)%/.exec(line)
    if (m) { metrics.push({ name: 'VPIP', value: +m[1], target: [+m[2], +m[3]] }); continue }
    m = /PFR:\s*([\d.]+)%\s*\(target\s*([\d.]+)–([\d.]+)%/.exec(line)
    if (m) { metrics.push({ name: 'PFR', value: +m[1], target: [+m[2], +m[3]] }); continue }
    m = /3-bet:\s*([\d.]+)%\s*\(target\s*([\d.]+)–([\d.]+)%/.exec(line)
    if (m) { metrics.push({ name: '3b', value: +m[1], target: [+m[2], +m[3]] }); continue }
  }
  return metrics
}

function metricLoss(value: number, target: [number, number]): number {
  if (value >= target[0] && value <= target[1]) return 0
  const mid = (target[0] + target[1]) / 2
  const range = target[1] - target[0]
  if (range === 0) return Math.abs(value - mid) * 10
  return (value - mid) ** 2 / (range ** 2)
}

function totalLoss(metrics: Metric[]): number {
  if (metrics.length === 0) return 999
  return metrics.reduce((sum, m) => sum + metricLoss(m.value, m.target), 0) / metrics.length
}

function randomSample(rng: () => number): Record<string, number> {
  const result: Record<string, number> = {}
  for (const key of PARAMS_TO_TUNE) {
    const current = DEFAULT_VALUES[key]
    const spread = Math.max(current * 0.3, 8)
    const lo = Math.max(2, Math.round(current - spread))
    const hi = Math.min(98, Math.round(current + spread))
    result[key] = Math.round(lo + rng() * (hi - lo))
  }
  return result
}

function seededRng(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = s + 1831565813 | 0
    const t = Math.imul(s ^ s >>> 15, 1 | s)
    const v = (t ^ t + Math.imul(t ^ t >>> 7, 61 | t) ^ t) >>> 0
    return (v >>> 0) / 4294967296
  }
}

const HANDS = 500
const ITERATIONS = 8
const ROUNDS = 2

async function main() {
  console.log(`Auto-Calibrator: ${ITERATIONS} iter × ${ROUNDS} rounds, ${HANDS} hands/eval\n`)

  // Baseline
  console.log('Baseline (default params)...')
  const baseline = runSim(HANDS, {})
  const bl = totalLoss(baseline.metrics)
  console.log(`  Loss: ${bl.toFixed(4)} (${baseline.metrics.length} metrics)`)

  let bestOverrides: Record<string, number> = {}
  let bestLoss = bl
  const rng = seededRng(42)

  for (let round = 0; round < ROUNDS; round++) {
    console.log(`\n=== Round ${round + 1}/${ROUNDS} ===`)
    for (let i = 0; i < ITERATIONS; i++) {
      const overrides = randomSample(rng)
      const result = runSim(HANDS, overrides)
      const loss = totalLoss(result.metrics)

      if (loss < bestLoss) {
        bestLoss = loss
        bestOverrides = { ...overrides }
        console.log(`  ${i + 1}: loss=${loss.toFixed(4)} (${result.metrics.length}m) *** BEST ***`)
      } else if ((i + 1) % 4 === 0 || i === 0) {
        console.log(`  ${i + 1}: loss=${loss.toFixed(4)} (best=${bestLoss.toFixed(4)})`)
      }
    }
  }

  console.log(`\n=== Best (loss=${bestLoss.toFixed(4)}) ===`)
  for (const key of PARAMS_TO_TUNE) {
    console.log(`  ${key}.mean = ${bestOverrides[key] ?? DEFAULT_VALUES[key]}`)
  }

  // Verify with 10000 hands
  console.log(`\nVerifying 10000 hands...`)
  const verify = runSim(10_000, bestOverrides)
  const bad = verify.metrics.filter(m => metricLoss(m.value, m.target) > 0)
  if (bad.length === 0) {
    console.log(`All ${verify.metrics.length} metrics in range!`)
    console.log(`\nOptimal overrides: ${JSON.stringify(bestOverrides)}`)
    console.log('Save to params-overrides.json for persistent use.')
  } else {
    console.log(`${bad.length}/${verify.metrics.length} out of range:`)
    for (const m of bad) console.log(`  ${m.name}: ${m.value.toFixed(1)}% (target ${m.target[0]}–${m.target[1]}%)`)
  }
}

main().catch(console.error)
