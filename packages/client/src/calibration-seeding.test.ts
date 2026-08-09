import { describe, expect, it } from 'vitest'
import { PokerGame } from '@cpc/poker-engine'
import type { Player } from '@cpc/shared'
import { calibrationDealerIndex, calibrationHandSeeds } from './calibration-seeding'

function players(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    name: `Player ${index}`,
    role: 'player',
    chips: 2_000,
    seatIndex: index,
    isConnected: true,
    isSittingOut: false,
    status: 'waiting',
    roundBet: 0,
  }))
}

describe('calibration hand isolation', () => {
  it('creates stable, hand-specific deck and decision seeds', () => {
    expect(calibrationHandSeeds('tag:six-max', 12)).toEqual(
      calibrationHandSeeds('tag:six-max', 12),
    )
    expect(calibrationHandSeeds('tag:six-max', 12)).not.toEqual(
      calibrationHandSeeds('tag:six-max', 13),
    )
  })

  it('rotates the explicit dealer through every seat', () => {
    expect(Array.from({ length: 8 }, (_, hand) => calibrationDealerIndex(hand, 6)))
      .toEqual([1, 2, 3, 4, 5, 0, 1, 2])
  })

  it('deals identical private cards for the same isolated hand seed', () => {
    const roster = players(6)
    const seeds = calibrationHandSeeds('tag:six-max', 42)
    const config = {
      bigBlind: 20,
      smallBlind: 10,
      seed: seeds.deck,
      initialDealerIndex: calibrationDealerIndex(42, roster.length),
    }
    const first = new PokerGame(roster, config)
    const second = new PokerGame(roster, config)
    first.startHand()
    second.startHand()

    for (const player of roster) {
      expect(first.getPlayerView(player.id).ownCards).toEqual(
        second.getPlayerView(player.id).ownCards,
      )
    }
    expect(first.getPublicState().dealerIndex).toBe(second.getPublicState().dealerIndex)
  })

  it('rejects invalid hand and table coordinates', () => {
    expect(() => calibrationHandSeeds('tag', -1)).toThrow(/hand number/i)
    expect(() => calibrationDealerIndex(0, 1)).toThrow(/player count/i)
  })
})
