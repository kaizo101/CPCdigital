import { describe, expect, it } from 'vitest'
import { readServerHost, readServerPort, requireJwtSecret } from './config.js'

describe('requireJwtSecret', () => {
  it('rejects a missing or empty secret', () => {
    expect(() => requireJwtSecret(undefined)).toThrow('JWT_SECRET is required')
    expect(() => requireJwtSecret('   ')).toThrow('JWT_SECRET is required')
  })

  it('rejects secrets shorter than 32 bytes', () => {
    expect(() => requireJwtSecret('a'.repeat(31))).toThrow('at least 32 bytes')
  })

  it('accepts a secret with at least 32 bytes', () => {
    const secret = 'a'.repeat(32)
    expect(requireJwtSecret(secret)).toBe(secret)
  })

  it('measures UTF-8 bytes and trims surrounding whitespace', () => {
    const secret = '🔐'.repeat(8)
    expect(requireJwtSecret(` ${secret} `)).toBe(secret)
  })
})

describe('server network configuration', () => {
  it('binds to localhost and port 3001 by default', () => {
    expect(readServerHost(undefined)).toBe('127.0.0.1')
    expect(readServerPort(undefined)).toBe(3001)
  })

  it('accepts explicit host and port values', () => {
    expect(readServerHost(' 0.0.0.0 ')).toBe('0.0.0.0')
    expect(readServerPort('8080')).toBe(8080)
  })

  it('rejects invalid ports', () => {
    for (const port of ['0', '65536', '3.5', 'not-a-port']) {
      expect(() => readServerPort(port)).toThrow('PORT must be an integer')
    }
  })
})
