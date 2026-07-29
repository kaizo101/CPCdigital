import { describe, expect, it } from 'vitest'
import type { HandEvent, HandResult } from '@cpc/shared'
import { buildReplayFromSession, formatHandHistory } from './hand-replay'

const players = [
  { playerId: 'hero', seatIndex: 0, startingChips: 1000 },
  { playerId: 'villain', seatIndex: 1, startingChips: 1000 },
]

function start(): Extract<HandEvent, { type: 'HandStarted' }> {
  return {
    type: 'HandStarted',
    variantId: 'texas-holdem',
    dealerId: 'villain',
    smallBlind: 10,
    bigBlind: 20,
    players,
  }
}

function build(events: HandEvent[], results: HandResult[]) {
  return buildReplayFromSession(
    1,
    events.map(event => ({ event })),
    {},
    results,
    new Map([['hero', 'You'], ['villain', 'Villain']]),
  )!
}

describe('client hand replay', () => {
  it('uses the actual dealer and paid call amount in text history', () => {
    const results = [{ playerId: 'hero', amount: 120, handName: '' }]
    const replay = build([
      start(),
      { type: 'BlindPosted', phase: 'preflop', playerId: 'villain', amount: 10, totalBet: 10, blindType: 'small' },
      { type: 'BlindPosted', phase: 'preflop', playerId: 'hero', amount: 20, totalBet: 20, blindType: 'big' },
      {
        type: 'PlayerActed', phase: 'preflop', playerId: 'villain',
        action: { type: 'raise', amount: 60 }, amount: 50, totalBet: 60,
        toCall: 10, currentBetBefore: 20, potAfter: 80, source: 'player',
      },
      {
        type: 'PlayerActed', phase: 'preflop', playerId: 'hero',
        action: { type: 'call' }, amount: 40, totalBet: 60,
        toCall: 40, currentBetBefore: 60, potAfter: 120, source: 'player',
      },
      { type: 'PotAwarded', potIndex: 0, potType: 'main', playerId: 'hero', amount: 120, handName: '', isSplit: false },
      { type: 'HandEnded', reason: 'uncontested', totalPot: 120, results },
    ], results)

    const history = formatHandHistory(replay)
    const heroCall = replay.frames.find(frame => frame.actorId === 'hero' && frame.action === 'call')

    expect(history).toContain("Seat #2 is the button")
    expect(history).toContain('You: calls 40.00')
    expect(heroCall?.playerStacks).toMatchObject({ hero: 940, villain: 940 })
  })

  it('captures returned uncalled bets and restores the displayed stack', () => {
    const results = [{ playerId: 'hero', amount: 80, handName: '' }]
    const replay = build([
      start(),
      { type: 'BlindPosted', phase: 'preflop', playerId: 'villain', amount: 10, totalBet: 10, blindType: 'small' },
      { type: 'BlindPosted', phase: 'preflop', playerId: 'hero', amount: 20, totalBet: 20, blindType: 'big' },
      {
        type: 'PlayerActed', phase: 'preflop', playerId: 'hero',
        action: { type: 'raise', amount: 100 }, amount: 80, totalBet: 100,
        toCall: 0, currentBetBefore: 20, potAfter: 110, source: 'player',
      },
      { type: 'UncalledBetReturned', phase: 'preflop', playerId: 'hero', amount: 30 },
      { type: 'PotAwarded', potIndex: 0, potType: 'main', playerId: 'hero', amount: 80, handName: '', isSplit: false },
      { type: 'HandEnded', reason: 'uncontested', totalPot: 80, results },
    ], results)

    const returned = replay.frames.find(frame => frame.action === 'uncalled')

    expect(returned?.playerStacks.hero).toBe(930)
    expect(formatHandHistory(replay)).toContain('Uncalled bet (30.00) returned to You')
  })

  it('keeps split and side-pot awards for every winner', () => {
    const results = [
      { playerId: 'hero', amount: 60, handName: 'Straight' },
      { playerId: 'villain', amount: 60, handName: 'Straight' },
      { playerId: 'hero', amount: 20, handName: 'Straight' },
    ]
    const replay = build([
      start(),
      { type: 'PotAwarded', potIndex: 0, potType: 'main', playerId: 'hero', amount: 60, handName: 'Straight', isSplit: true },
      { type: 'PotAwarded', potIndex: 0, potType: 'main', playerId: 'villain', amount: 60, handName: 'Straight', isSplit: true },
      { type: 'PotAwarded', potIndex: 1, potType: 'side', playerId: 'hero', amount: 20, handName: 'Straight', isSplit: false },
      { type: 'HandEnded', reason: 'showdown', totalPot: 140, results },
    ], results)

    expect(replay.pots).toEqual([
      { potIndex: 0, potType: 'main', amount: 120 },
      { potIndex: 1, potType: 'side', amount: 20 },
    ])
    expect(formatHandHistory(replay)).toContain('You collected (80.00)')
    expect(formatHandHistory(replay)).toContain('Villain collected (60.00)')
  })
})
