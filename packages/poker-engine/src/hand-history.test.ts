import { describe, expect, it } from 'vitest'
import type { Player } from '@cpc/shared'
import { PokerGame } from './game'

const config = { smallBlind: 10, bigBlind: 20 }

function makePlayers(count: number, chips = 1000): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Player ${index + 1}`,
    role: 'player',
    chips,
    seatIndex: index,
    isConnected: true,
    isSittingOut: false,
    status: 'waiting',
    roundBet: 0,
  }))
}

describe('hand history events', () => {
  it('starts every history with the hand snapshot followed by both blinds', () => {
    const game = new PokerGame(makePlayers(3), config)
    game.startHand()

    const history = game.getPublicHandHistory()
    expect(history.map(event => event.type)).toEqual(['HandStarted', 'BlindPosted', 'BlindPosted'])
    expect(history[0]).toEqual(expect.objectContaining({
      type: 'HandStarted',
      smallBlind: 10,
      bigBlind: 20,
      players: expect.arrayContaining([
        { playerId: 'p1', seatIndex: 0, startingChips: 1000 },
        { playerId: 'p2', seatIndex: 1, startingChips: 1000 },
        { playerId: 'p3', seatIndex: 2, startingChips: 1000 },
      ]),
    }))
    expect(history[1]).toEqual(expect.objectContaining({
      type: 'BlindPosted',
      phase: 'preflop',
      amount: 10,
      totalBet: 10,
      blindType: 'small',
    }))
    expect(history[2]).toEqual(expect.objectContaining({
      type: 'BlindPosted',
      phase: 'preflop',
      amount: 20,
      totalBet: 20,
      blindType: 'big',
    }))
  })

  it('records the full monetary context of raises and calls', () => {
    const game = new PokerGame(makePlayers(3), config)
    game.startHand()
    const raiserId = game.getPublicState().currentPlayerId!

    game.applyAction(raiserId, { type: 'raise', amount: 50 })
    const callerId = game.getPublicState().currentPlayerId!
    game.applyAction(callerId, { type: 'call' })

    const actions = game.getPublicHandHistory().filter(event => event.type === 'PlayerActed')
    expect(actions[0]).toEqual({
      type: 'PlayerActed',
      phase: 'preflop',
      playerId: raiserId,
      action: { type: 'raise', amount: 50 },
      amount: 50,
      totalBet: 50,
      toCall: 20,
      currentBetBefore: 20,
      potAfter: 80,
      source: 'player',
    })
    expect(actions[1]).toEqual(expect.objectContaining({
      type: 'PlayerActed',
      phase: 'preflop',
      playerId: callerId,
      action: { type: 'call' },
      amount: 40,
      totalBet: 50,
      toCall: 40,
      currentBetBefore: 50,
      potAfter: 120,
      source: 'player',
    }))
  })

  it('marks community cards and subsequent actions with the correct street', () => {
    const game = new PokerGame(makePlayers(2), config)
    game.startHand()
    game.applyAction(game.getPublicState().currentPlayerId!, { type: 'call' })
    game.applyAction(game.getPublicState().currentPlayerId!, { type: 'check' })

    const flop = game.getPublicHandHistory().find(event => event.type === 'CommunityCardDealt')
    expect(flop).toEqual(expect.objectContaining({ type: 'CommunityCardDealt', phase: 'flop' }))
    if (flop?.type === 'CommunityCardDealt') expect(flop.cards).toHaveLength(3)

    game.applyAction(game.getPublicState().currentPlayerId!, { type: 'check' })
    expect(game.getPublicHandHistory().at(-1)).toEqual(expect.objectContaining({
      type: 'PlayerActed',
      phase: 'flop',
      action: { type: 'check' },
    }))
  })

  it('distinguishes forced folds from player actions', () => {
    const game = new PokerGame(makePlayers(3), config)
    game.startHand()
    const playerId = game.getPublicState().currentPlayerId!

    game.forceFold(playerId)

    expect(game.getPublicHandHistory().find(event =>
      event.type === 'PlayerActed' && event.playerId === playerId
    )).toEqual(expect.objectContaining({
      type: 'PlayerActed',
      phase: 'preflop',
      action: { type: 'fold' },
      source: 'forced',
    }))
  })

  it('records an uncontested award and explicit hand end without revealing cards', () => {
    const game = new PokerGame(makePlayers(3), config)
    game.startHand()
    game.applyAction(game.getPublicState().currentPlayerId!, { type: 'fold' })
    game.applyAction(game.getPublicState().currentPlayerId!, { type: 'fold' })

    const history = game.getPublicHandHistory()
    expect(history.some(event => event.type === 'CardsRevealed')).toBe(false)
    expect(history.at(-2)).toEqual(expect.objectContaining({
      type: 'PotAwarded',
      potIndex: 0,
      potType: 'main',
      isSplit: false,
    }))
    expect(history.at(-1)).toEqual(expect.objectContaining({
      type: 'HandEnded',
      reason: 'uncontested',
    }))
  })

  it('reveals live hands only at showdown and ends after all pot awards', () => {
    const game = new PokerGame(makePlayers(2), config)
    game.startHand()
    expect(game.getPublicHandHistory().some(event => event.type === 'CardsRevealed')).toBe(false)

    let iterations = 0
    while (game.getPublicState().phase !== 'waiting' && iterations < 20) {
      const context = game.getPublicState().bettingContext!
      game.applyAction(context.playerId, context.legalActions.callAmount != null ? { type: 'call' } : { type: 'check' })
      iterations++
    }

    const history = game.getPublicHandHistory()
    const revealIndices = history
      .map((event, index) => event.type === 'CardsRevealed' ? index : -1)
      .filter(index => index >= 0)
    const firstAwardIndex = history.findIndex(event => event.type === 'PotAwarded')
    expect(revealIndices).toHaveLength(2)
    expect(Math.max(...revealIndices)).toBeLessThan(firstAwardIndex)
    expect(history.at(-1)).toEqual(expect.objectContaining({
      type: 'HandEnded',
      reason: 'showdown',
      results: game.getLastHandResults(),
    }))
  })
})
