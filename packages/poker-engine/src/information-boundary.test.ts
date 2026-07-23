import { describe, expect, it } from 'vitest'
import type { Card, Player } from '@cpc/shared'
import { PokerGame } from './game'

const config = { smallBlind: 10, bigBlind: 20, seed: 'information-boundary' }

function makePlayers(count = 3): Player[] {
  return Array.from({ length: count }, (_, seatIndex) => ({
    id: `p${seatIndex + 1}`,
    name: `Player ${seatIndex + 1}`,
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
  let decisions = 0
  while (game.getPublicState().phase !== 'waiting' && decisions < 30) {
    const context = game.getPublicState().bettingContext!
    game.applyAction(
      context.playerId,
      context.legalActions.callAmount != null ? { type: 'call' } : { type: 'check' },
    )
    decisions++
  }
  if (game.getPublicState().phase !== 'waiting') throw new Error('Test hand did not finish')
}

describe('public and private information boundaries', () => {
  it('keeps hidden cards, deck, and analysis records out of public state and history', () => {
    const game = new PokerGame(makePlayers(), config)
    game.startHand()
    const currentPlayerId = game.getPublicState().currentPlayerId!
    game.applyAction(currentPlayerId, { type: 'call' })

    const publicState = game.getPublicState() as unknown as Record<string, unknown>
    expect(publicState).not.toHaveProperty('deck')
    expect(publicState).not.toHaveProperty('holeCards')
    expect(publicState).not.toHaveProperty('decisionSnapshots')
    for (const player of publicState.players as Array<Record<string, unknown>>) {
      expect(player).not.toHaveProperty('holeCards')
      expect(player).not.toHaveProperty('ownCards')
    }

    const publicHistory = game.getPublicHandHistory()
    expect(publicHistory.some(event => event.type === 'CardsRevealed')).toBe(false)
    expect(publicHistory.some(event => (event as { type: string }).type === 'DecisionSnapshot')).toBe(false)
    expect(game.getRevealedCards()).toEqual({})
    expect(game.getPrivateDecisionSnapshots()).toHaveLength(1)
  })

  it('returns only the requested player’s cards in a player-bound view', () => {
    const game = new PokerGame(makePlayers(), config)
    game.startHand()

    const first = game.getPlayerView('p1')
    const second = game.getPlayerView('p2')
    expect(first.state).toEqual(second.state)
    expect(first.ownCards).toHaveLength(2)
    expect(second.ownCards).toHaveLength(2)
    expect(first.ownCards).not.toEqual(second.ownCards)
    expect(Object.keys(first).sort()).toEqual(['ownCards', 'state'])
    expect(() => game.getPlayerView('not-seated')).toThrow(/unknown player/i)
  })

  it('returns defensive copies across the public and player-private boundaries', () => {
    const game = new PokerGame(makePlayers(), config)
    game.startHand()
    const playerId = game.getPublicState().currentPlayerId!
    const originalCards = game.getPlayerView(playerId).ownCards!

    const publicState = game.getPublicState()
    publicState.players[0].chips = -999
    publicState.communityCards.push({ rank: 'A', suit: 'spades' })
    if (publicState.bettingContext) publicState.bettingContext.legalActions.fold = false

    const playerView = game.getPlayerView(playerId)
    playerView.ownCards![0] = { rank: '2', suit: 'clubs' }
    playerView.state.players[0].roundBet = 999

    const freshState = game.getPublicState()
    const freshView = game.getPlayerView(playerId)
    expect(freshState.players[0].chips).not.toBe(-999)
    expect(freshState.players[0].roundBet).not.toBe(999)
    expect(freshState.communityCards).toEqual([])
    expect(freshState.bettingContext?.legalActions.fold).toBe(true)
    expect(freshView.ownCards).toEqual(originalCards)
  })

  it('releases cards through the public showdown channel only after reveal events', () => {
    const game = new PokerGame(makePlayers(2), config)
    game.startHand()
    expect(game.getRevealedCards()).toEqual({})

    finishPassiveHand(game)

    const revealEvents = game.getPublicHandHistory().filter(event => event.type === 'CardsRevealed')
    const revealedCards = game.getRevealedCards()
    expect(revealEvents).toHaveLength(2)
    expect(Object.keys(revealedCards).sort()).toEqual(['p1', 'p2'])
    for (const event of revealEvents) {
      if (event.type !== 'CardsRevealed') continue
      expect(revealedCards[event.playerId]).toEqual(event.cards)
    }

    const originalFirstCard = { ...revealedCards.p1[0] }
    const replacement: Card = {
      rank: originalFirstCard.rank === 'A' ? '2' : 'A',
      suit: originalFirstCard.suit,
    }
    const mutableCopy = revealedCards as Record<string, Card[]>
    mutableCopy.p1[0] = replacement

    const mutableHistory = revealEvents as Array<Extract<(typeof revealEvents)[number], { type: 'CardsRevealed' }>>
    const p1Reveal = mutableHistory.find(event => event.playerId === 'p1')!
    p1Reveal.cards[0] = replacement

    expect(game.getRevealedCards().p1[0]).toEqual(originalFirstCard)
    expect(
      game.getPublicHandHistory().find(event => event.type === 'CardsRevealed' && event.playerId === 'p1'),
    ).toEqual(expect.objectContaining({ cards: expect.arrayContaining([originalFirstCard]) }))
  })
})
