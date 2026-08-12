import { describe, expect, it } from 'vitest'
import type { HandEvent, HandResult } from '@cpc/shared'
import {
  buildReplayFromSession,
  createHandHistoryFilename,
  createSessionHandHistoryFilename,
  formatBotDecisionAppendix,
  formatHandHistory,
  formatSessionHandHistory,
  type BotDecisionInfo,
  type HandReplayMetadata,
} from './hand-replay'

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

function build(
  events: HandEvent[],
  results: HandResult[],
  botDecisions?: BotDecisionInfo[],
  metadata?: HandReplayMetadata,
) {
  return buildReplayFromSession(
    1,
    events.map(event => ({ event })),
    {},
    results,
    new Map([['hero', 'You'], ['villain', 'Villain']]),
    botDecisions,
    metadata,
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

  it('uses hand-start local time, session reference, and bot names in human exports', () => {
    const replay = build(
      [start(), { type: 'HandEnded', reason: 'uncontested', totalPot: 0, results: [] }],
      [],
      [{
        playerId: 'villain',
        playerName: 'David',
        sequence: 7,
        phase: 'flop',
        archetype: 'TAG',
        skill: 78.4,
        action: 'call',
        handCategory: 'weak',
        handProfile: 'weak, Q High',
        scores: [
          { action: 'fold', utility: 47 },
          { action: 'call', utility: 100 },
        ],
        topContributions: ['Pot odds: +7.179541137956944'],
      }],
      {
        sessionId: 'S20260812T124201511Z',
        startedAt: '2026-08-12T12:42:01.511Z',
        timeZone: 'Europe/Berlin',
        utcOffsetMinutes: 120,
      },
    )

    expect(formatHandHistory(replay)).toContain(
      'Hand #1 [S20260812T124201511Z/H0001]'
    )
    expect(formatHandHistory(replay)).toContain(
      '2026-08-12 14:42:01 Europe/Berlin (UTC+02:00)'
    )
    const appendix = formatBotDecisionAppendix(replay, 'full')
    expect(appendix).toContain('#7 FLOP · David [TAG · Skill 78] (weak, Q High): call')
    expect(appendix).toContain('Pot odds: +7.2')
    expect(appendix).not.toContain('villain (')
    expect(createHandHistoryFilename(replay))
      .toBe('cpcdigital-hand_S20260812T124201511Z-H0001.txt')
  })

  it('labels one session and a multi-session archive with distinct IDs', () => {
    const first = build(
      [start(), { type: 'HandEnded', reason: 'uncontested', totalPot: 0, results: [] }],
      [],
      undefined,
      { sessionId: 'S20260812T120000000Z', startedAt: '2026-08-12T12:00:00.000Z' },
    )
    const second = {
      ...first,
      handNumber: 1,
      sessionId: 'S20260812T130000000Z',
      date: '2026-08-12T13:00:00.000Z',
    }

    expect(formatSessionHandHistory([first])).toContain(
      'CPCdigital Session S20260812T120000000Z — 1 hands'
    )
    expect(createSessionHandHistoryFilename([first]))
      .toBe('cpcdigital-session_S20260812T120000000Z.txt')

    const archive = formatSessionHandHistory([first, second], {
      exportedAt: '2026-08-12T14:00:00.000Z',
    })
    expect(archive).toContain('CPCdigital Hand Archive A20260812T140000000Z')
    expect(archive).toContain('Sessions: 2 · Hands: 2')
    expect(createSessionHandHistoryFilename(
      [first, second],
      '2026-08-12T14:00:00.000Z',
    )).toBe('cpcdigital-hand-archive_A20260812T140000000Z.txt')
  })

  it('keeps legacy replays without a session ID readable as an archive', () => {
    const legacy = build(
      [start(), { type: 'HandEnded', reason: 'uncontested', totalPot: 0, results: [] }],
      [],
    )

    const history = formatSessionHandHistory([legacy], {
      exportedAt: '2026-08-12T14:00:00.000Z',
    })
    expect(history).toContain('CPCdigital Hand Archive A20260812T140000000Z')
    expect(history).toContain('=== Session Legacy-1 · 1 hands ===')
    expect(createSessionHandHistoryFilename(
      [legacy],
      '2026-08-12T14:00:00.000Z',
    )).toBe('cpcdigital-hand-archive_A20260812T140000000Z.txt')
  })
})
