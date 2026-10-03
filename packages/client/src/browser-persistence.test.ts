import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  disableBrowserPersistence,
  enableBrowserPersistence,
  readBrowserPersistenceChoice,
} from './browser-persistence'

afterEach(() => vi.unstubAllGlobals())

describe('browser persistence choice', () => {
  it('starts off, remembers an explicit opt-in, and deletes only history on opt-out', () => {
    const values = new Map<string, string>([
      ['cpcdigital:debug-mode', '1'],
      ['cpcdigital:bot-roster', 'old roster'],
      ['cpcdigital:session-log', 'old log'],
      ['cpcdigital-hand-history', 'old hands'],
      ['replay-session', 'temporary replay'],
      ['replay-start-index', '0'],
      ['replay-debug', '1'],
      ['replay-42', 'legacy replay'],
    ])
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
      removeItem: (key: string) => { values.delete(key) },
      get length() { return values.size },
      key: (index: number) => [...values.keys()][index] ?? null,
    })

    expect(readBrowserPersistenceChoice()).toBe(false)
    expect(enableBrowserPersistence()).toBe(true)
    expect(readBrowserPersistenceChoice()).toBe(true)
    expect(disableBrowserPersistence()).toBe(true)
    expect(readBrowserPersistenceChoice()).toBe(false)
    expect(values.has('cpcdigital:bot-roster')).toBe(false)
    expect(values.has('cpcdigital:session-log')).toBe(false)
    expect(values.has('cpcdigital-hand-history')).toBe(false)
    expect(values.has('replay-session')).toBe(false)
    expect(values.has('replay-start-index')).toBe(false)
    expect(values.has('replay-debug')).toBe(false)
    expect(values.has('replay-42')).toBe(false)
    expect(values.get('cpcdigital:debug-mode')).toBe('1')
  })

  it('does not claim to enable persistence when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
      removeItem: () => { throw new Error('blocked') },
    })

    expect(readBrowserPersistenceChoice()).toBe(false)
    expect(enableBrowserPersistence()).toBe(false)
    expect(disableBrowserPersistence()).toBe(false)
  })
})
