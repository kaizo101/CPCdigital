import { describe, expect, it } from 'vitest'
import { resolveAppRuntime } from './native-runtime'

describe('resolveAppRuntime', () => {
  it('recognises the native Android shell', () => {
    expect(resolveAppRuntime('android', true)).toBe('android')
  })

  it('keeps browser and Electron rendering on the web path', () => {
    expect(resolveAppRuntime('web', false)).toBe('web')
    expect(resolveAppRuntime('android', false)).toBe('web')
    expect(resolveAppRuntime('ios', true)).toBe('web')
  })
})
