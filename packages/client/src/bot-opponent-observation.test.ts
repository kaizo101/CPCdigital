import { describe, expect, it } from 'vitest'
import type { HandEvent } from '@cpc/shared'
import { createBotState } from './bot-state'
import { TAG_PERSONALITY } from './bot-tag'
import { observeOpponentHistory, type OpponentObservationCursor } from './bot-opponent-observation'

function acted(overrides: Partial<Extract<HandEvent, { type: 'PlayerActed' }>> = {}): Extract<HandEvent, { type: 'PlayerActed' }> {
  return {
    type: 'PlayerActed',
    phase: 'flop',
    playerId: 'villain',
    action: { type: 'call' },
    amount: 20,
    totalBet: 20,
    toCall: 20,
    currentBetBefore: 20,
    potAfter: 120,
    source: 'player',
    ...overrides,
  }
}

function setup() {
  return {
    botState: createBotState(TAG_PERSONALITY, 50, () => 0.5),
    cursor: { eventCount: 0, vpipPlayers: new Set<string>() } satisfies OpponentObservationCursor,
  }
}

describe('opponent history observation', () => {
  it('records VPIP only from preflop voluntary actions', () => {
    const { botState, cursor } = setup()
    observeOpponentHistory('hero', botState, [acted()], cursor, 'tag')

    expect(botState.reads.opponents.get('villain')?.handsSampled).toBe(0)
  })

  it('records a free preflop big-blind check as no VPIP', () => {
    const { botState, cursor } = setup()
    const bigBlindCheck = acted({ phase: 'preflop', action: { type: 'check' }, amount: 0 })

    observeOpponentHistory('hero', botState, [bigBlindCheck], cursor, 'tag')

    const read = botState.reads.opponents.get('villain')
    expect(read?.handsSampled).toBe(1)
    expect(cursor.vpipPlayers).toContain('villain')
  })

  it('ignores forced actions without losing the following voluntary action', () => {
    const { botState, cursor } = setup()
    const forcedFold = acted({ phase: 'preflop', action: { type: 'fold' }, source: 'forced' })
    const voluntaryCall = acted({ phase: 'preflop', playerId: 'other-villain' })

    observeOpponentHistory('hero', botState, [forcedFold], cursor, 'tag')
    expect(botState.reads.opponents.has('villain')).toBe(false)
    expect(cursor.eventCount).toBe(1)

    observeOpponentHistory('hero', botState, [forcedFold, voluntaryCall], cursor, 'tag')
    const read = botState.reads.opponents.get('other-villain')!
    expect(read.handsSampled).toBe(1)
    expect(read.vpipEstimate.successes).toBeGreaterThan(0)
    const failures = read.foldToBetEstimate.failures
    observeOpponentHistory('hero', botState, [forcedFold, voluntaryCall], cursor, 'tag')
    expect(read.foldToBetEstimate.failures).toBe(failures)
  })

  it('counts fold-to-bet only when the player faced a wager', () => {
    const { botState, cursor } = setup()
    const check = acted({ action: { type: 'check' }, amount: 0, toCall: 0 })
    const openBet = acted({ action: { type: 'raise', amount: 40 }, amount: 40, toCall: 0, currentBetBefore: 0 })
    const facingCall = acted({ toCall: 40 })
    const facingFold = acted({ action: { type: 'fold' }, amount: 0, toCall: 40 })

    observeOpponentHistory('hero', botState, [check], cursor, 'tag')
    const read = botState.reads.opponents.get('villain')!
    const before = { ...read.foldToBetEstimate }

    observeOpponentHistory('hero', botState, [check, openBet], cursor, 'tag')
    expect(read.foldToBetEstimate).toEqual(before)

    observeOpponentHistory('hero', botState, [check, openBet, facingCall], cursor, 'tag')
    expect(read.foldToBetEstimate.failures).toBeGreaterThan(before.failures)
    expect(read.foldToBetEstimate.successes).toBe(before.successes)

    observeOpponentHistory('hero', botState, [check, openBet, facingCall, facingFold], cursor, 'tag')
    expect(read.foldToBetEstimate.successes).toBeGreaterThan(before.successes)
  })

  it('records canonical aggressive postflop sizing once', () => {
    const { botState, cursor } = setup()
    const call = acted()
    observeOpponentHistory('hero', botState, [call], cursor, 'tag')
    const initialAverage = botState.reads.opponents.get('villain')!.sizing.average
    const raise = acted({
      action: { type: 'raise', amount: 75 },
      amount: 75,
      totalBet: 75,
      currentBetBefore: 0,
      potAfter: 175,
    })

    observeOpponentHistory('hero', botState, [call, raise], cursor, 'tag')
    observeOpponentHistory('hero', botState, [call, raise], cursor, 'tag')

    const sizing = botState.reads.opponents.get('villain')?.sizing
    expect(sizing?.count).toBe(1)
    expect(sizing?.average).toBeCloseTo(initialAverage * 0.75 + 0.75 * 0.25)
  })

  it('does not record a passive all-in call as aggression or sizing', () => {
    const { botState, cursor } = setup()
    const allInCall = acted({
      action: { type: 'all-in' },
      amount: 20,
      totalBet: 40,
      currentBetBefore: 80,
      potAfter: 120,
    })

    observeOpponentHistory('hero', botState, [allInCall], cursor, 'tag')

    const read = botState.reads.opponents.get('villain')
    expect(read?.sizing.count).toBe(0)
    expect(read?.aggressionEstimate.successes).toBeLessThan(read!.aggressionEstimate.failures)
  })
})
