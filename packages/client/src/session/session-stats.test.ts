import { describe, expect, it } from 'vitest'
import type { HandEvent, PlayerAction } from '@cpc/shared'
import {
  createSessionStats,
  getPlayer3Bet,
  getPlayerPFR,
  getPlayerVPIP,
  recordHand,
} from './session-stats'

function handStarted(...playerIds: string[]): Extract<HandEvent, { type: 'HandStarted' }> {
  return {
    type: 'HandStarted',
    variantId: 'texas-holdem',
    dealerId: playerIds[0],
    smallBlind: 10,
    bigBlind: 20,
    players: playerIds.map((playerId, seatIndex) => ({
      playerId,
      seatIndex,
      startingChips: 2000,
    })),
  }
}

function acted(
  phase: string,
  playerId: string,
  action: PlayerAction,
  currentBetBefore = 20,
  totalBet = currentBetBefore,
): Extract<HandEvent, { type: 'PlayerActed' }> {
  return {
    type: 'PlayerActed',
    phase,
    playerId,
    action,
    amount: Math.max(0, totalBet),
    totalBet,
    toCall: currentBetBefore,
    currentBetBefore,
    potAfter: 100,
    source: 'player',
  }
}

describe('session stats', () => {
  it('counts one dealt hand per player and ignores postflop actions for VPIP/PFR', () => {
    const stats = createSessionStats('texas-holdem', 20)
    const events: HandEvent[] = [
      handStarted('hero', 'villain'),
      acted('preflop', 'hero', { type: 'call' }),
      acted('flop', 'hero', { type: 'check' }, 0, 0),
      acted('turn', 'hero', { type: 'raise', amount: 80 }, 40, 80),
      acted('river', 'hero', { type: 'check' }, 0, 0),
      acted('preflop', 'villain', { type: 'check' }, 20, 20),
    ]

    recordHand(stats, 'hero', 2020, events)

    expect(stats.players.hero).toMatchObject({ hands: 1, vpipHands: 1, pfrHands: 0 })
    expect(stats.players.villain).toMatchObject({ hands: 1, vpipHands: 0, pfrHands: 0 })
    expect(getPlayerVPIP(stats, 'hero')).toBe(100)
    expect(getPlayerPFR(stats, 'hero')).toBe(0)
  })

  it('counts only the reraiser as a three-bettor and only when facing one raise', () => {
    const stats = createSessionStats('texas-holdem', 20)
    const events: HandEvent[] = [
      handStarted('opener', 'three-bettor', 'caller', 'cold-four-bettor'),
      acted('preflop', 'opener', { type: 'raise', amount: 60 }, 20, 60),
      acted('preflop', 'three-bettor', { type: 'raise', amount: 180 }, 60, 180),
      acted('preflop', 'caller', { type: 'call' }, 180, 180),
      acted('preflop', 'cold-four-bettor', { type: 'raise', amount: 500 }, 180, 500),
    ]

    recordHand(stats, 'opener', 2000, events)

    expect(stats.players.opener.threeBets).toBe(0)
    expect(stats.players['three-bettor']).toMatchObject({
      threeBetOpportunities: 1,
      threeBets: 1,
    })
    expect(stats.players.caller.threeBetOpportunities).toBe(0)
    expect(stats.players['cold-four-bettor'].threeBetOpportunities).toBe(0)
    expect(getPlayer3Bet(stats, 'three-bettor')).toBe(100)
  })

  it('treats a calling all-in as VPIP but not as a preflop raise', () => {
    const stats = createSessionStats('texas-holdem', 20)
    const events: HandEvent[] = [
      handStarted('short', 'raiser'),
      acted('preflop', 'raiser', { type: 'raise', amount: 200 }, 20, 200),
      acted('preflop', 'short', { type: 'all-in' }, 200, 80),
    ]

    recordHand(stats, 'short', 0, events)

    expect(stats.players.short).toMatchObject({
      hands: 1,
      vpipHands: 1,
      pfrHands: 0,
      threeBetOpportunities: 1,
      threeBets: 0,
    })
  })
})
