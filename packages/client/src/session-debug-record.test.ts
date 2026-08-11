import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalGameRunner } from './session/LocalGameRunner'
import {
  createSessionDebugFilename,
  serializeSessionDebugRecord,
  SESSION_DEBUG_SCHEMA,
} from './session/session-debug-record'

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

    const record = runner.createSessionDebugRecord('0.6.0', 'EUR')
    const parsed = JSON.parse(serializeSessionDebugRecord(record))

    expect(record.schema).toBe(SESSION_DEBUG_SCHEMA)
    expect(record.schemaVersion).toBe(3)
    expect(record.app).toEqual({ name: 'CPCdigital', version: '0.6.0' })
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

  it('keeps the beginning of a long current session instead of truncating to five hands', () => {
    const runner = new LocalGameRunner()
    runner.setupTable({
      smallBlind: 10,
      bigBlind: 20,
      startingChips: 2000,
      maxPlayers: 2,
      seed: 'full-session-debug-record',
    }, 1)
    runner.startHand()

    ;(runner as unknown as { currentHandNumber: number }).currentHandNumber = 7
    const record = runner.createSessionDebugRecord('test', 'EUR')

    expect(record.session.currentHandNumber).toBe(7)
    expect(record.history.some(entry => entry.handNumber === 1)).toBe(true)
    runner.cleanup()
  })

  it('exports all four Omaha hole cards in compact bot decisions', () => {
    vi.useFakeTimers()
    const runner = new LocalGameRunner()
    runner.setupTable({
      smallBlind: 10,
      bigBlind: 20,
      startingChips: 2000,
      maxPlayers: 2,
      seed: 'omaha-debug-record',
    }, 1, true, 'omaha-high')
    runner.startHand()

    for (let step = 0; step < 20 && runner.getBotDebugDecisions().length === 0; step++) {
      const gameState = runner.state.gameState
      if (!gameState) throw new Error('Expected an active game')

      if (runner.state.isMyTurn) {
        const legal = gameState.bettingContext?.legalActions
        if (!legal) throw new Error('Expected legal actions for hero')
        runner.playerAction(legal.check ? { type: 'check' } : { type: 'call' })
      } else {
        vi.advanceTimersByTime(6000)
      }
    }

    const record = runner.createSessionDebugRecord('test', 'EUR')
    expect(record.botDecisions).not.toHaveLength(0)
    expect(record.botDecisions[0].snapshot.hand.split(' ')).toHaveLength(4)
    expect(record.botDecisions[0].snapshot.potCommitment).toBeGreaterThanOrEqual(0)
    expect(record.botDecisions[0].snapshot.forcedAllInRatio).toBeGreaterThanOrEqual(0)
    expect(record.botDecisions[0].chosenCandidateId).toBeTruthy()
    expect(record.botDecisions[0].candidates).not.toHaveLength(0)
    expect(record.botDecisions[0].candidates.some(candidate => (
      candidate.candidateId === record.botDecisions[0].chosenCandidateId
    ))).toBe(true)
    expect(record.botDecisions[0].selectionDiagnostics.plausibleCandidateCount).toBeGreaterThanOrEqual(1)
    expect(record.botDecisions[0].analysis.objectiveHandAssessment).toBeTruthy()
    expect(record.botDecisions[0].analysis.perceivedHandAssessment).toBeTruthy()
    runner.cleanup()
  })
})
