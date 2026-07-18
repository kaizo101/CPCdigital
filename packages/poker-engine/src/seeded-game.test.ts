import { describe, expect, it } from 'vitest'
import type { Player } from '@cpc/shared'
import { PokerGame } from './game'

function makePlayers(): Player[] {
  return ['p1', 'p2', 'p3'].map((id, seatIndex) => ({
    id,
    name: id,
    role: 'player',
    chips: 1000,
    seatIndex,
    isConnected: true,
    isSittingOut: false,
    status: 'waiting',
    roundBet: 0,
  }))
}

function finishPassiveHand(game: PokerGame): void {
  let iterations = 0
  while (game.getPublicState().phase !== 'waiting' && iterations < 30) {
    const context = game.getPublicState().bettingContext!
    game.applyAction(
      context.playerId,
      context.legalActions.callAmount != null ? { type: 'call' } : { type: 'check' },
    )
    iterations++
  }
  if (game.getPublicState().phase !== 'waiting') throw new Error('Seeded test hand did not finish')
}

function dealtCards(game: PokerGame): Record<string, unknown> {
  return Object.fromEntries(game.getPublicState().players.map(player => [player.id, game.getPlayerView(player.id).ownCards]))
}

describe('PokerGame seeded randomness', () => {
  it('deals identical cards and produces identical histories for the same seed and actions', () => {
    const first = new PokerGame(makePlayers(), { smallBlind: 10, bigBlind: 20, seed: 'session-17' })
    const second = new PokerGame(makePlayers(), { smallBlind: 10, bigBlind: 20, seed: 'session-17' })

    first.startHand()
    second.startHand()
    expect(dealtCards(first)).toEqual(dealtCards(second))

    finishPassiveHand(first)
    finishPassiveHand(second)
    expect(first.getPublicHandHistory()).toEqual(second.getPublicHandHistory())
    expect(first.getPublicState()).toEqual(second.getPublicState())
  })

  it('keeps the multi-hand deck sequence reproducible without repeating the first deck', () => {
    const first = new PokerGame(makePlayers(), { smallBlind: 10, bigBlind: 20, seed: 1234 })
    const second = new PokerGame(makePlayers(), { smallBlind: 10, bigBlind: 20, seed: 1234 })

    first.startHand()
    second.startHand()
    const firstHandCards = dealtCards(first)
    finishPassiveHand(first)
    finishPassiveHand(second)

    first.startHand()
    second.startHand()
    expect(dealtCards(first)).toEqual(dealtCards(second))
    expect(dealtCards(first)).not.toEqual(firstHandCards)
  })

  it('deals a different sequence for a different seed', () => {
    const first = new PokerGame(makePlayers(), { smallBlind: 10, bigBlind: 20, seed: 'seed-a' })
    const second = new PokerGame(makePlayers(), { smallBlind: 10, bigBlind: 20, seed: 'seed-b' })
    first.startHand()
    second.startHand()

    expect(dealtCards(first)).not.toEqual(dealtCards(second))
  })

  it('rejects ambiguous random configuration', () => {
    expect(() => new PokerGame(makePlayers(), {
      smallBlind: 10,
      bigBlind: 20,
      seed: 'seed',
      random: () => 0.5,
    })).toThrow(/both seed and random/i)
  })
})
