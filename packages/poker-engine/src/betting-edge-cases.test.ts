import { describe, expect, it } from 'vitest'
import type { Player, PlayerAction } from '@cpc/shared'
import { PokerGame } from './game'
import type { GameVariant } from './game-variant'
import { TEXAS_HOLDEM } from './variants/texas-holdem'

const config = { smallBlind: 10, bigBlind: 20 }

function makePlayers(stacks: number[]): Player[] {
  return stacks.map((chips, seatIndex) => ({
    id: `p${seatIndex + 1}`,
    name: `Player ${seatIndex + 1}`,
    role: 'player',
    chips,
    seatIndex,
    isConnected: true,
    isSittingOut: false,
    status: 'waiting',
    roundBet: 0,
  }))
}

function passiveAction(game: PokerGame): PlayerAction {
  const legalActions = game.getPublicState().bettingContext?.legalActions
  if (!legalActions) throw new Error('Expected an active betting context')
  return legalActions.callAmount != null ? { type: 'call' } : { type: 'check' }
}

function finishPassively(game: PokerGame): void {
  let actionCount = 0
  while (game.getPublicState().phase !== 'waiting' && actionCount < 40) {
    const currentPlayerId = game.getPublicState().currentPlayerId
    if (!currentPlayerId) throw new Error('Expected a current player')
    game.applyAction(currentPlayerId, passiveAction(game))
    actionCount++
  }
  if (game.getPublicState().phase !== 'waiting') throw new Error('Hand did not finish')
}

describe('central betting edge cases', () => {
  it('uses heads-up blind and action order before and after the flop, then rotates the dealer', () => {
    const game = new PokerGame(makePlayers([1000, 1000]), { ...config, seed: 'heads-up-order' })
    game.startHand()

    const firstHistory = game.getPublicHandHistory()
    const firstStart = firstHistory.find(event => event.type === 'HandStarted')
    const firstSmallBlind = firstHistory.find(event => event.type === 'BlindPosted' && event.blindType === 'small')
    const firstBigBlind = firstHistory.find(event => event.type === 'BlindPosted' && event.blindType === 'big')
    if (firstStart?.type !== 'HandStarted' || firstSmallBlind?.type !== 'BlindPosted' || firstBigBlind?.type !== 'BlindPosted') {
      throw new Error('Expected hand and blind events')
    }

    expect(firstSmallBlind.playerId).toBe(firstStart.dealerId)
    expect(game.getPublicState().currentPlayerId).toBe(firstStart.dealerId)
    game.applyAction(firstStart.dealerId, { type: 'call' })
    expect(game.getPublicState().currentPlayerId).toBe(firstBigBlind.playerId)
    game.applyAction(firstBigBlind.playerId, { type: 'check' })

    expect(game.getPublicState()).toEqual(expect.objectContaining({
      phase: 'flop',
      currentPlayerId: firstBigBlind.playerId,
    }))

    finishPassively(game)
    game.startHand()

    const secondStart = game.getPublicHandHistory().find(event => event.type === 'HandStarted')
    const secondSmallBlind = game.getPublicHandHistory()
      .find(event => event.type === 'BlindPosted' && event.blindType === 'small')
    if (secondStart?.type !== 'HandStarted' || secondSmallBlind?.type !== 'BlindPosted') {
      throw new Error('Expected second hand and small blind events')
    }
    expect(secondStart.dealerId).not.toBe(firstStart.dealerId)
    expect(secondSmallBlind.playerId).toBe(secondStart.dealerId)
    expect(game.getPublicState().currentPlayerId).toBe(secondStart.dealerId)
  })

  it('handles a short all-in small blind and returns the unmatched big-blind excess', () => {
    const game = new PokerGame(makePlayers([100, 100, 5]), { ...config, seed: 'short-small-blind' })
    game.startHand()

    const shortBlind = game.getPublicHandHistory()
      .find(event => event.type === 'BlindPosted' && event.blindType === 'small')
    if (shortBlind?.type !== 'BlindPosted') throw new Error('Expected a small blind event')
    expect(shortBlind).toEqual(expect.objectContaining({ playerId: 'p3', amount: 5, totalBet: 5 }))

    game.applyAction('p2', { type: 'fold' })
    expect(game.getPublicState().bettingContext?.legalActions.check).toBe(true)
    game.applyAction('p1', { type: 'check' })

    const history = game.getPublicHandHistory()
    expect(history).toContainEqual(expect.objectContaining({
      type: 'UncalledBetReturned',
      phase: 'preflop',
      playerId: 'p1',
      amount: 15,
    }))
    expect(game.getPublicState()).toEqual(expect.objectContaining({ phase: 'waiting' }))
    expect(game.getPublicState().communityCards).toHaveLength(5)
    expect(game.getLastHandResults().reduce((sum, result) => sum + result.amount, 0)).toBe(10)
    expect(game.getPublicState().players.reduce((sum, player) => sum + player.chips, 0)).toBe(205)
  })

  it('caps a call at the remaining stack and records it as an all-in call', () => {
    const game = new PokerGame(makePlayers([100, 15, 100]), { ...config, seed: 'short-call' })
    game.startHand()

    const context = game.getPublicState().bettingContext
    expect(context).toEqual(expect.objectContaining({
      playerId: 'p2',
      toCall: 20,
      callAmount: 15,
    }))
    expect(context?.legalActions).toEqual(expect.objectContaining({
      callAmount: 15,
      raise: null,
      allInAmount: 15,
    }))

    game.applyAction('p2', { type: 'call' })

    expect(game.getPublicState().players.find(player => player.id === 'p2')).toEqual(expect.objectContaining({
      chips: 0,
      roundBet: 15,
      status: 'all-in',
    }))
    expect(game.getPublicHandHistory()).toContainEqual(expect.objectContaining({
      type: 'PlayerActed',
      playerId: 'p2',
      action: { type: 'call' },
      amount: 15,
      totalBet: 15,
      toCall: 20,
    }))
  })

  it('resets the minimum raise to the street bet unit after a large preflop raise', () => {
    const game = new PokerGame(makePlayers([1000, 1000, 1000]), { ...config, seed: 'street-min-raise' })
    game.startHand()

    game.applyAction('p2', { type: 'raise', amount: 100 })
    expect(game.getPublicState().minRaise).toBe(80)
    while (game.getPublicState().phase === 'preflop') {
      const currentPlayerId = game.getPublicState().currentPlayerId
      if (!currentPlayerId) throw new Error('Expected a preflop actor')
      game.applyAction(currentPlayerId, passiveAction(game))
    }

    expect(game.getPublicState()).toEqual(expect.objectContaining({
      phase: 'flop',
      currentBet: 0,
      minRaise: 20,
      pot: 300,
    }))
    expect(game.getPublicState().bettingContext).toEqual(expect.objectContaining({
      toCall: 0,
      minRaiseTo: 20,
      maxRaiseTo: 900,
    }))
    expect(game.getPublicState().bettingContext?.legalActions.raise).toEqual({ minAmount: 20, maxAmount: 900 })
  })

  it('keeps state, history, and decision records unchanged when an action is rejected', () => {
    const game = new PokerGame(makePlayers([1000, 1000, 1000]), { ...config, seed: 'atomic-rejections' })
    game.startHand()

    const stateBefore = game.getPublicState()
    const historyBefore = game.getPublicHandHistory()
    const snapshotsBefore = game.getPrivateDecisionSnapshots()

    expect(() => game.applyAction('p2', { type: 'raise', amount: 30 })).toThrow(/minimum raise to 40/i)
    expect(() => game.applyAction('p2', { type: 'raise', amount: 1100 })).toThrow(/maximum raise to 1000/i)
    expect(() => game.applyAction('p2', { type: 'check' })).toThrow(/bet to call/i)

    expect(game.getPublicState()).toEqual(stateBefore)
    expect(game.getPublicHandHistory()).toEqual(historyBefore)
    expect(game.getPrivateDecisionSnapshots()).toEqual(snapshotsBefore)
  })

  it('settles a multiway hand with a short all-in, dead money, side pot, and uncalled bet', () => {
    const game = new PokerGame(makePlayers([100, 150, 30, 150]), { ...config, seed: 'multiway-settlement' })
    game.startHand()

    game.applyAction('p1', { type: 'all-in' })
    game.applyAction('p2', { type: 'call' })
    game.applyAction('p3', { type: 'all-in' })
    game.applyAction('p4', { type: 'call' })
    expect(game.getPublicState()).toEqual(expect.objectContaining({ phase: 'flop', currentPlayerId: 'p4', pot: 330 }))

    game.applyAction('p4', { type: 'all-in' })
    game.applyAction('p2', { type: 'fold' })

    const history = game.getPublicHandHistory()
    const awards = history.filter(event => event.type === 'PotAwarded')
    const awardedAmount = awards.reduce((sum, event) => sum + event.amount, 0)
    expect(history).toContainEqual(expect.objectContaining({
      type: 'UncalledBetReturned',
      phase: 'flop',
      playerId: 'p4',
      amount: 50,
    }))
    expect(new Set(awards.map(event => event.potIndex))).toEqual(new Set([0, 1]))
    expect(awardedAmount).toBe(330)
    expect(game.getLastHandResults().reduce((sum, result) => sum + result.amount, 0)).toBe(330)
    expect(game.getPublicState().players.reduce((sum, player) => sum + player.chips, 0)).toBe(430)
    expect(game.getPrivateDecisionSnapshots()).toHaveLength(6)
    expect(game.getPublicState()).toEqual(expect.objectContaining({ phase: 'waiting' }))
    expect(game.getPublicState().communityCards).toHaveLength(5)
  })

  it('enforces the pot-limit cap again from the live pot after the street changes', () => {
    const potLimitVariant: GameVariant = {
      ...TEXAS_HOLDEM,
      id: 'pot-limit-street-test',
      bettingStructure: { type: 'pot-limit' },
    }
    const game = new PokerGame(makePlayers([1000, 1000]), {
      ...config,
      seed: 'pot-limit-postflop',
      variant: potLimitVariant,
    })
    game.startHand()
    game.applyAction('p2', { type: 'call' })
    game.applyAction('p1', { type: 'check' })

    const context = game.getPublicState().bettingContext
    expect(context).toEqual(expect.objectContaining({
      playerId: 'p1',
      totalPot: 40,
      toCall: 0,
      minRaiseTo: 20,
      maxRaiseTo: 40,
    }))
    expect(context?.legalActions.raise).toEqual({ minAmount: 20, maxAmount: 40 })

    const stateBefore = game.getPublicState()
    expect(() => game.applyAction('p1', { type: 'raise', amount: 50 })).toThrow(/maximum raise to 40/i)
    expect(game.getPublicState()).toEqual(stateBefore)
    expect(() => game.applyAction('p1', { type: 'raise', amount: 40 })).not.toThrow()
  })
})
