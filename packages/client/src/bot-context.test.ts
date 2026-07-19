import { describe, expect, it } from 'vitest'
import { PokerGame } from '@cpc/poker-engine'
import type { Player } from '@cpc/shared'
import { createBotContext, getPositionCategory } from './bot-context'

function makePlayers(count: number): Player[] {
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

function currentContext(game: PokerGame) {
  const playerId = game.getPublicState().currentPlayerId
  if (!playerId) throw new Error('Expected a current player')
  return createBotContext(playerId, game.getPlayerView(playerId), game.getPublicHandHistory())
}

describe('BotContext fair-information boundary', () => {
  it('contains the actor cards, public state, legal actions, stacks, and public action history', () => {
    const game = new PokerGame(makePlayers(6), { smallBlind: 10, bigBlind: 20, seed: 'bot-context' })
    game.startHand()

    const context = currentContext(game)
    expect(context.playerId).toBe(game.getPublicState().currentPlayerId)
    expect(context.ownCards).toEqual(game.getPlayerView(context.playerId).ownCards)
    expect(context.bettingContext).toEqual(game.getPublicState().bettingContext)
    expect(context.bettingContext).toEqual(expect.objectContaining({
      totalPot: 30,
      toCall: 20,
      playerStack: 1000,
      effectiveStack: 1000,
      spr: 1000 / 30,
    }))
    expect(context.position).toEqual(expect.objectContaining({
      tableSize: 6,
      positionsFromDealer: 3,
      category: 'early',
    }))
    expect(context.actionHistory.map(event => event.type)).toEqual(['BlindPosted', 'BlindPosted'])
  })

  it('never exposes a deck, RNG state, or opponent cards', () => {
    const game = new PokerGame(makePlayers(3), { smallBlind: 10, bigBlind: 20, seed: 'private-boundary' })
    game.startHand()
    const context = currentContext(game)
    const serialized = JSON.stringify(context)

    expect(serialized).not.toMatch(/"deck"|"seed"|"random"|"holeCards"/i)
    for (const player of context.publicState.players.filter(player => player.id !== context.playerId)) {
      expect(Object.keys(player)).not.toContain('cards')
      expect(Object.keys(player)).not.toContain('ownCards')
    }
  })

  it('defensively clones the player view and action events', () => {
    const game = new PokerGame(makePlayers(3), { smallBlind: 10, bigBlind: 20, seed: 'context-clone' })
    game.startHand()
    const playerId = game.getPublicState().currentPlayerId!
    const view = game.getPlayerView(playerId)
    const history = game.getPublicHandHistory()
    const context = createBotContext(playerId, view, history)
    const chipsBefore = context.publicState.players[0].chips
    const rankBefore = context.ownCards[0].rank

    view.state.players[0].chips = 123
    if (view.ownCards) view.ownCards[0].rank = view.ownCards[0].rank === 'A' ? '2' : 'A'
    const firstBlind = history.find(event => event.type === 'BlindPosted')
    if (firstBlind?.type === 'BlindPosted') firstBlind.amount = 999

    expect(context.publicState.players[0].chips).toBe(chipsBefore)
    expect(context.ownCards[0].rank).toBe(rankBefore)
    expect(context.actionHistory[0]).not.toEqual(expect.objectContaining({ amount: 999 }))
  })

  it('adds prior public player actions to the next actor context', () => {
    const game = new PokerGame(makePlayers(3), { smallBlind: 10, bigBlind: 20, seed: 'context-history' })
    game.startHand()
    const first = currentContext(game)
    game.applyAction(first.playerId, { type: 'raise', amount: 50 })

    const next = currentContext(game)
    expect(next.actionHistory.at(-1)).toEqual(expect.objectContaining({
      type: 'PlayerActed',
      playerId: first.playerId,
      action: { type: 'raise', amount: 50 },
      totalBet: 50,
    }))
    expect(next.bettingContext.toCall).toBeGreaterThan(0)
  })

  it('rejects contexts for a player who is not currently acting', () => {
    const game = new PokerGame(makePlayers(3), { smallBlind: 10, bigBlind: 20 })
    game.startHand()
    const currentPlayerId = game.getPublicState().currentPlayerId!
    const otherPlayerId = game.getPublicState().players.find(player => player.id !== currentPlayerId)!.id

    expect(() => createBotContext(otherPlayerId, game.getPlayerView(otherPlayerId), game.getPublicHandHistory()))
      .toThrow(/not .*turn/i)
  })
})

describe('BotContext position categories', () => {
  it('reacts consistently to heads-up, short-handed, and full-ring positions', () => {
    expect(getPositionCategory(0, 2)).toBe('late')
    expect(getPositionCategory(1, 2)).toBe('blinds')

    expect([0, 1, 2, 3, 4, 5].map(position => getPositionCategory(position, 6)))
      .toEqual(['late', 'blinds', 'blinds', 'early', 'middle', 'late'])

    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map(position => getPositionCategory(position, 9)))
      .toEqual(['late', 'blinds', 'blinds', 'early', 'early', 'middle', 'middle', 'late', 'late'])
  })
})
