import { describe, expect, it } from 'vitest'
import type { HandEvent } from '@cpc/shared'
import { detectMentalEventFromHand } from './LocalGameRunner'

describe('mental events from hand results', () => {
  it('does not tilt a bot for the size of a pot it barely invested in', () => {
    const history: HandEvent[] = [
      { type: 'BlindPosted', phase: 'preflop', playerId: 'bot', amount: 20, totalBet: 20, blindType: 'big' },
      {
        type: 'PlayerActed', phase: 'preflop', playerId: 'bot',
        action: { type: 'fold' }, amount: 0, totalBet: 20,
        toCall: 180, currentBetBefore: 200, potAfter: 220, source: 'player',
      },
    ]

    expect(detectMentalEventFromHand(
      'bot',
      [{ playerId: 'hero', amount: 1000, handName: '' }],
      20,
      history,
    )).toEqual({ type: 'lost-small-pot', potBb: 1, opponentId: 'hero' })
  })

  it('uses the bot net result and accounts for returned uncalled chips', () => {
    const history: HandEvent[] = [
      {
        type: 'PlayerActed', phase: 'river', playerId: 'bot',
        action: { type: 'raise', amount: 500 }, amount: 500, totalBet: 500,
        toCall: 0, currentBetBefore: 0, potAfter: 700, source: 'player',
      },
      { type: 'UncalledBetReturned', phase: 'river', playerId: 'bot', amount: 100 },
    ]

    expect(detectMentalEventFromHand(
      'bot',
      [{ playerId: 'bot', amount: 800, handName: 'Flush' }],
      20,
      history,
    )).toEqual({ type: 'won-small-pot', potBb: 20 })
  })
})
