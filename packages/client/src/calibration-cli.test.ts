import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SIMULATION = fileURLToPath(new URL('./simulation.ts', import.meta.url))

function runCalibration(injectStructural: boolean) {
  return spawnSync(process.execPath, ['--import', 'tsx', SIMULATION], {
    encoding: 'utf8',
    timeout: 20_000,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      CALIB_VARIANT: 'texas-holdem',
      CALIB_PROFILE: 'tag',
      CALIB_FORMAT: '6-max',
      CALIB_HANDS: '1',
      CALIB_SEED_SALT: '',
      CALIB_TEST_INJECT_STRUCTURAL: injectStructural ? '1' : '',
    },
  })
}

describe('calibration CLI exit behavior', () => {
  it('exits successfully despite target-corridor misses', () => {
    const result = runCalibration(false)
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/Target corridor diagnostics: [1-9]\d* outside/)
  })

  it('exits nonzero and names a deliberately injected structural violation', () => {
    const result = runCalibration(true)
    expect(result.error).toBeUndefined()
    expect(result.status).not.toBe(0)
    expect(result.stdout).toContain('Structural violations (blocking): invalid actions: 1')
    expect(result.stderr).toContain('Bot calibration has structural violations')
  })
})
