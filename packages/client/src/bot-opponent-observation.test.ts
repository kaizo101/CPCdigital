import { describe, expect, it } from 'vitest'
import type { HandEvent } from '@cpc/shared'
import { createBotState } from './bot-state'
import { TAG_PERSONALITY } from './bot-tag'
import { observeOpponentHistory, type OpponentObservationCursor } from './bot-opponent-observation'
import { currentStealSpot } from './bot-preflop-steal'

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

function started(): Extract<HandEvent, { type: 'HandStarted' }> {
  return {
    type: 'HandStarted',
    variantId: 'texas-holdem',
    dealerId: 'button',
    smallBlind: 1,
    bigBlind: 2,
    players: ['small', 'big', 'under-gun', 'cutoff', 'button'].map((playerId, seatIndex) => ({
      playerId, seatIndex, startingChips: 200,
    })),
  }
}

describe('opponent history observation', () => {
  it('counts unopened cutoff and button attempts separately and only once', () => {
    const { botState, cursor } = setup()
    const history: HandEvent[] = [
      started(),
      acted({ phase: 'preflop', playerId: 'under-gun', action: { type: 'fold' } }),
      acted({ phase: 'preflop', playerId: 'cutoff', action: { type: 'fold' } }),
      acted({ phase: 'preflop', playerId: 'button', action: { type: 'raise', amount: 6 }, toCall: 2, currentBetBefore: 2 }),
    ]
    observeOpponentHistory('big', botState, history.slice(0, 3), cursor, 'tag')
    observeOpponentHistory('big', botState, history, cursor, 'tag')
    observeOpponentHistory('big', botState, history, cursor, 'tag')

    expect(botState.reads.opponents.get('cutoff')?.steals?.cutoff).toEqual({ opportunities: 1, attempts: 0 })
    expect(botState.reads.opponents.get('button')?.steals?.button).toEqual({ opportunities: 1, attempts: 1 })
  })

  it('does not mistake a raise behind a limper or a reraise for a steal', () => {
    const { botState, cursor } = setup()
    const history: HandEvent[] = [
      started(),
      acted({ phase: 'preflop', playerId: 'under-gun', action: { type: 'call' }, toCall: 2 }),
      acted({ phase: 'preflop', playerId: 'cutoff', action: { type: 'raise', amount: 6 }, currentBetBefore: 2 }),
      acted({ phase: 'preflop', playerId: 'button', action: { type: 'raise', amount: 18 }, currentBetBefore: 6 }),
    ]
    observeOpponentHistory('big', botState, history, cursor, 'tag')

    expect(botState.reads.opponents.get('cutoff')?.steals?.cutoff.opportunities).toBe(0)
    expect(botState.reads.opponents.get('button')?.steals?.button.opportunities).toBe(0)
  })

  it('ignores forced actions and heads-up positions for steal samples', () => {
    const { botState, cursor } = setup()
    const history: HandEvent[] = [
      started(),
      acted({ phase: 'preflop', playerId: 'cutoff', action: { type: 'fold' }, source: 'forced' }),
      acted({ phase: 'preflop', playerId: 'button', action: { type: 'raise', amount: 6 }, currentBetBefore: 2 }),
    ]
    observeOpponentHistory('big', botState, history, cursor, 'tag')
    expect(botState.reads.opponents.get('button')?.steals?.button.attempts).toBe(1)

    const hu = setup()
    const huHistory: HandEvent[] = [
      { ...started(), players: started().players.slice(0, 2), dealerId: 'small' },
      acted({ phase: 'preflop', playerId: 'small', action: { type: 'raise', amount: 6 }, currentBetBefore: 2 }),
    ]
    observeOpponentHistory('big', hu.botState, huHistory, hu.cursor, 'tag')
    expect(hu.botState.reads.opponents.get('small')?.steals?.button.opportunities).toBe(0)
  })

  it('offers anti-steal defense only to blinds facing one unopened late raise', () => {
    const positions = new Map([
      ['button', { positionsFromDealer: 0 }],
      ['small', { positionsFromDealer: 1 }],
      ['big', { positionsFromDealer: 2 }],
      ['under-gun', { positionsFromDealer: 3 }],
      ['cutoff', { positionsFromDealer: 4 }],
    ])
    const fold = acted({ phase: 'preflop', playerId: 'under-gun', action: { type: 'fold' } })
    const cutoffFold = acted({ phase: 'preflop', playerId: 'cutoff', action: { type: 'fold' } })
    const buttonRaise = acted({ phase: 'preflop', playerId: 'button', action: { type: 'raise', amount: 6 }, currentBetBefore: 2 })
    expect(currentStealSpot('big', 2, positions, 5, [fold, cutoffFold, buttonRaise]))
      .toEqual({ openerId: 'button', position: 'button' })
    expect(currentStealSpot('small', 1, positions, 5, [fold, cutoffFold, buttonRaise]))
      .toEqual({ openerId: 'button', position: 'button' })
    expect(currentStealSpot('cutoff', 4, positions, 5, [fold, cutoffFold, buttonRaise])).toBeNull()
    expect(currentStealSpot('big', 2, positions, 5, [fold, cutoffFold, buttonRaise, acted({ phase: 'preflop', playerId: 'small' })])).toBeNull()
    expect(currentStealSpot('big', 2, positions, 5, [fold, cutoffFold, buttonRaise, acted({ phase: 'preflop', playerId: 'small', action: { type: 'raise', amount: 18 } })])).toBeNull()
    expect(currentStealSpot('big', 2, positions, 5, [acted({ phase: 'preflop', playerId: 'under-gun' }), buttonRaise])).toBeNull()
    expect(currentStealSpot('big', 2, positions, 5, [fold, cutoffFold, acted({ ...buttonRaise, action: { type: 'all-in' } })])).toBeNull()
  })
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
