import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalGameRunner } from './LocalGameRunner'
import {
  createSessionDebugFilename,
  serializeSessionDebugRecord,
  SESSION_DEBUG_SCHEMA,
} from './session-debug-record'

describe('session debug record', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('exports a versioned local snapshot with setup, events, and bot profiles', () => {
    vi.useFakeTimers()
    const runner = new LocalGameRunner()
    runner.setupTable({
      smallBlind: 10,
      bigBlind: 20,
      startingChips: 2000,
      maxPlayers: 5,
      seed: 'debug-record',
    }, 4)
    runner.startHand()

    const record = runner.createSessionDebugRecord('0.4.0-dev', 'EUR')
    const parsed = JSON.parse(serializeSessionDebugRecord(record))

    expect(record.schema).toBe(SESSION_DEBUG_SCHEMA)
    expect(record.schemaVersion).toBe(2)
    expect(record.app).toEqual({ name: 'CPCdigital', version: '0.4.0-dev' })
    expect(record.session.config).toEqual(expect.objectContaining({ maxPlayers: 5, seed: 'debug-record' }))
    expect(record.session.players).toHaveLength(5)
    expect(record.history.map(entry => entry.event.type)).toEqual([
      'HandStarted',
      'BlindPosted',
      'BlindPosted',
    ])
    expect(new Set(record.botProfiles.map(entry => entry.profile.archetype)).size)
      .toBeGreaterThanOrEqual(2)
    expect(record.botIdentities).toHaveLength(4)
    expect(new Set(record.botIdentities.map(entry => entry.identity.id)).size).toBe(4)
    expect(new Set(record.botIdentities.map(entry => entry.identity.archetypeId)).size)
      .toBeGreaterThanOrEqual(2)
    expect(record.session.players.slice(1).map(player => player.name).sort())
      .toEqual(record.botIdentities.map(entry => entry.identity.name).sort())
    expect(record.session.players.slice(1).every(player => !/^Bot \d+$/.test(player.name))).toBe(true)
    for (const { playerId, identity } of record.botIdentities) {
      expect(record.botProfiles.find(entry => entry.playerId === playerId)?.profile.skill.level)
        .toBe(identity.skill)
    }
    expect(parsed).toEqual(record)
    expect('decisionSnapshots' in runner.state).toBe(false)
    expect('botProfiles' in runner.state).toBe(false)
    runner.cleanup()
  })

  it('creates a filesystem-safe JSON filename', () => {
    expect(createSessionDebugFilename('2026-07-19T20:15:30.123Z'))
      .toBe('cpcdigital-session-debug_2026-07-19_20-15-30-123.json')
  })
})
