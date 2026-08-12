import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BotDebugDecision } from './bot-debug'
import {
  BOT_DEBUG_DECISION_LIMIT,
  LocalGameRunner,
  retainRecentBotDebugDecision,
} from './session/LocalGameRunner'
import {
  createSessionDebugJsonlFilename,
  parseSessionDebugJsonl,
  serializeSessionDebugJsonlParts,
  SESSION_DEBUG_JSONL_BATCH_BYTES,
  SESSION_DEBUG_SCHEMA,
  SESSION_DEBUG_SCHEMA_VERSION_V4,
} from './session/session-debug-record'

describe('session debug JSONL export', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('exports a versioned session header, complete hand, private cards, and footer', () => {
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

    const debugExport = runner.createSessionDebugRecord('0.8.2-dev', 'EUR')
    const text = [...serializeSessionDebugJsonlParts(debugExport)].join('')
    const parsed = parseSessionDebugJsonl(text)

    expect(parsed.header.schema).toBe(SESSION_DEBUG_SCHEMA)
    expect(parsed.header.schemaVersion).toBe(SESSION_DEBUG_SCHEMA_VERSION_V4)
    expect(parsed.header.app).toEqual({ name: 'CPCdigital', version: '0.8.2-dev' })
    expect(parsed.header.session.config).toEqual(expect.objectContaining({ maxPlayers: 5, seed: 'debug-record' }))
    expect(parsed.header.session.players).toHaveLength(5)
    expect(parsed.hands).toHaveLength(1)
    expect(parsed.hands[0].events.map(event => event.type)).toEqual([
      'HandStarted',
      'BlindPosted',
      'BlindPosted',
    ])
    expect(Object.values(parsed.hands[0].privateCards)).toHaveLength(5)
    expect(new Set(parsed.header.botProfiles.map(entry => entry.profile.archetype)).size)
      .toBeGreaterThanOrEqual(2)
    expect(parsed.header.botIdentities).toHaveLength(4)
    expect(new Set(parsed.header.botIdentities.map(entry => entry.identity.id)).size).toBe(4)
    expect(parsed.end).toEqual({ recordType: 'end', handCount: 1, decisionCount: 0 })
    expect(text.trimEnd().split('\n')).toHaveLength(3)
    const internalHands = (runner as unknown as { debugHands: Array<{ events: unknown[] }> }).debugHands
    internalHands[0].events.length = 0
    expect(debugExport.hands[0].events).toHaveLength(3)
    expect('decisionSnapshots' in runner.state).toBe(false)
    expect('botProfiles' in runner.state).toBe(false)
    runner.cleanup()
  })

  it('creates a filesystem-safe JSONL filename', () => {
    expect(createSessionDebugJsonlFilename('2026-07-19T20:15:30.123Z'))
      .toBe('cpcdigital-session-debug_2026-07-19_20-15-30-123.jsonl')
  })

  it('keeps the beginning of a long current session instead of truncating hands', () => {
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
    const debugExport = runner.createSessionDebugRecord('test', 'EUR')

    expect(debugExport.header.session.currentHandNumber).toBe(7)
    expect(debugExport.hands.some(hand => hand.handNumber === 1)).toBe(true)
    runner.cleanup()
  })

  it('exports all Omaha cards plus complete candidate diagnostics without duplicate score strings', () => {
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

    const debugExport = runner.createSessionDebugRecord('test', 'EUR')
    const decision = debugExport.hands[0].botDecisions[0]
    expect(decision).toBeDefined()
    expect(decision.snapshot.hand.split(' ')).toHaveLength(4)
    expect(decision.snapshot.potCommitment).toBeGreaterThanOrEqual(0)
    expect(decision.snapshot.forcedAllInRatio).toBeGreaterThanOrEqual(0)
    expect(decision.candidates).not.toHaveLength(0)
    expect(decision.candidates.some(candidate => candidate[0] === decision.chosenCandidateId)).toBe(true)
    expect(decision.selection[4]).toBeGreaterThanOrEqual(1)
    expect(decision.objectiveHand).toBeTruthy()
    expect('scores' in decision).toBe(false)
    runner.cleanup()
  })

  it('detects an interrupted stream with no final footer', () => {
    const runner = new LocalGameRunner()
    runner.setupTable({ smallBlind: 10, bigBlind: 20, startingChips: 2000, maxPlayers: 2 }, 1)
    runner.startHand()
    const debugExport = runner.createSessionDebugRecord('test', 'EUR')
    const lines = [...serializeSessionDebugJsonlParts(debugExport)].join('').trimEnd().split('\n')
    expect(() => parseSessionDebugJsonl(`${lines.slice(0, -1).join('\n')}\n`))
      .toThrow('end record is missing')
    runner.cleanup()
  })

  it('retains only the latest 50 rich decisions for the live inspector', () => {
    const decisions = Array.from({ length: 75 }, (_, sequence) => ({ sequence }))
    const retained: BotDebugDecision[] = []
    for (const decision of decisions) {
      retainRecentBotDebugDecision(retained, decision as unknown as BotDebugDecision)
    }
    expect(retained).toHaveLength(BOT_DEBUG_DECISION_LIMIT)
    expect(retained[0].sequence).toBe(25)
    expect(retained.at(-1)?.sequence).toBe(74)
  })

  it('keeps a representative 100-hand export below 4 MB and 102 JSONL records', () => {
    vi.useFakeTimers()
    const runner = new LocalGameRunner()
    runner.setupTable({ smallBlind: 10, bigBlind: 20, startingChips: 2000, maxPlayers: 2, seed: 'size' }, 1)
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
    const base = runner.createSessionDebugRecord('test', 'EUR')
    const hand = base.hands[0]
    expect(hand.botDecisions).not.toHaveLength(0)
    const hands = Array.from({ length: 100 }, (_, index) => ({
      ...hand,
      handNumber: index + 1,
      botDecisions: Array.from({ length: 10 }, () => hand.botDecisions[0]).filter(Boolean),
    }))
    const stress = {
      ...base,
      hands,
      end: {
        recordType: 'end' as const,
        handCount: 100,
        decisionCount: hands.reduce((sum, entry) => sum + entry.botDecisions.length, 0),
      },
    }
    const parts = [...serializeSessionDebugJsonlParts(stress)]
    const text = parts.join('')
    expect(parts.every(part => new Blob([part]).size <= SESSION_DEBUG_JSONL_BATCH_BYTES)).toBe(true)
    expect(text.trimEnd().split('\n')).toHaveLength(102)
    expect(new Blob([text]).size).toBeLessThan(4 * 1024 * 1024)
    expect(parseSessionDebugJsonl(text).end.handCount).toBe(100)
    runner.cleanup()
  })
})
