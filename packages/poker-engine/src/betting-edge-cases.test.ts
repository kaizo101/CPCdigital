import { describe, expect, it } from 'vitest'
import type { Player, PlayerAction } from '@cpc/shared'
import { PokerGame } from './game'
import type { GameVariant } from './game-variant'
import { TEXAS_HOLDEM } from './variants/texas-holdem'
import { OMAHA_HIGH } from './variants/omaha-high'

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
  it('rejects an unknown action without consuming the turn', () => {
    const game = new PokerGame(makePlayers([2, 2]), { ...config, seed: 'invalid-action' })
    game.startHand()
    const beforeState = game.getPublicState()
    const beforeHistory = game.getPublicHandHistory()
    expect(() => game.applyAction(beforeState.currentPlayerId!, { type: 'unknown' } as unknown as PlayerAction))
      .toThrow(/invalid action type/i)
    expect(game.getPublicState()).toEqual(beforeState)
    expect(game.getPublicHandHistory()).toEqual(beforeHistory)
  })

  it('rejects fractional-cent stacks and blinds at every game ingress', () => {
    expect(() => new PokerGame(makePlayers([1.005, 2]), {
      smallBlind: 0.01, bigBlind: 0.02,
    })).toThrow(/whole cents/i)
    expect(() => new PokerGame(makePlayers([2, 2]), {
      smallBlind: 0.005, bigBlind: 0.02,
    })).toThrow(/whole cents/i)

    const game = new PokerGame(makePlayers([2, 2]), { smallBlind: 0.01, bigBlind: 0.02 })
    expect(() => game.setPlayerChips('p1', 1.005)).toThrow(/whole cents/i)
    expect(() => game.upsertPlayer({ ...makePlayers([2])[0], chips: 1.005 }))
      .toThrow(/whole cents/i)
  })

  it('does not let a caller mutate the blinds after constructing the game', () => {
    const settings = { smallBlind: 0.01, bigBlind: 0.02, initialDealerIndex: 0 }
    const game = new PokerGame(makePlayers([2, 2]), settings)
    settings.smallBlind = 0.10
    settings.bigBlind = 0.20
    game.startHand()
    const blinds = game.getPublicHandHistory().filter(event => event.type === 'BlindPosted')
    expect(blinds.map(event => event.amount)).toEqual([0.01, 0.02])
    expect(game.getPublicState().bigBlind).toBe(0.02)
  })

  it('rejects a PLO table that cannot be dealt a complete board', () => {
    const game = new PokerGame(makePlayers(Array(12).fill(2)), {
      smallBlind: 0.01,
      bigBlind: 0.02,
      variant: OMAHA_HIGH,
    })
    expect(() => game.startHand()).toThrow(/deck.*cards/i)
    expect(game.getPublicState().phase).toBe('waiting')
    expect(game.getPublicHandHistory()).toHaveLength(0)
  })

  it('uses physical seat order even if input players are unsorted', () => {
    const [p1, p2, p3] = makePlayers([2, 2, 2])
    const game = new PokerGame([p1, p3, p2], {
      smallBlind: 0.01,
      bigBlind: 0.02,
      initialDealerIndex: 0,
    })
    game.startHand()
    const blinds = game.getPublicHandHistory().filter(event => event.type === 'BlindPosted')
    expect(blinds.map(event => event.playerId)).toEqual(['p2', 'p3'])
    expect(game.getPublicState().players.map(player => player.seatIndex)).toEqual([0, 1, 2])
  })

  it('keeps the dealer anchor when a lower seat is removed between hands', () => {
    const game = new PokerGame(makePlayers([2, 2, 2, 2]), {
      smallBlind: 0.01,
      bigBlind: 0.02,
      initialDealerIndex: 2,
    })
    game.startHand()
    while (game.getPublicState().phase !== 'waiting') {
      game.forceFold(game.getPublicState().currentPlayerId!)
    }
    game.removePlayer('p2')
    game.startHand()
    const start = game.getPublicHandHistory().find(event => event.type === 'HandStarted')
    expect(start).toEqual(expect.objectContaining({ dealerId: 'p4' }))
  })

  it('remaps the preferred first dealer when another seat is removed before the first hand', () => {
    const game = new PokerGame(makePlayers([2, 2, 2, 2]), {
      smallBlind: 0.01,
      bigBlind: 0.02,
      initialDealerIndex: 2,
    })
    game.removePlayer('p2')
    game.startHand()
    expect(game.getPublicHandHistory().find(event => event.type === 'HandStarted'))
      .toEqual(expect.objectContaining({ dealerId: 'p3' }))
  })

  it('advances to the physical successor when the dealer leaves between hands', () => {
    const game = new PokerGame(makePlayers([2, 2, 2, 2]), {
      smallBlind: 0.01,
      bigBlind: 0.02,
      initialDealerIndex: 2,
    })
    game.startHand()
    while (game.getPublicState().phase !== 'waiting') {
      game.forceFold(game.getPublicState().currentPlayerId!)
    }
    game.removePlayer('p3')
    game.startHand()
    expect(game.getPublicHandHistory().find(event => event.type === 'HandStarted'))
      .toEqual(expect.objectContaining({ dealerId: 'p4' }))
  })

  it('remaps the dealer anchor when a player is moved to another free seat', () => {
    const game = new PokerGame(makePlayers([2, 2, 2]), {
      smallBlind: 0.01,
      bigBlind: 0.02,
      initialDealerIndex: 1,
    })
    game.upsertPlayer({ ...makePlayers([2, 2, 2])[0], seatIndex: 3 })
    game.startHand()
    expect(game.getPublicHandHistory().find(event => event.type === 'HandStarted'))
      .toEqual(expect.objectContaining({ dealerId: 'p2' }))
    expect(game.getPublicState().players.map(player => player.id)).toEqual(['p2', 'p3', 'p1'])
  })

  it('returns an uncalled raise before awarding an uncontested pot', () => {
    const game = new PokerGame(makePlayers([2, 2]), {
      smallBlind: 0.01,
      bigBlind: 0.02,
      initialDealerIndex: 0,
      seed: 'uncontested-raise-refund',
    })
    game.startHand()
    game.applyAction('p1', { type: 'raise', amount: 0.10 })
    game.applyAction('p2', { type: 'fold' })

    expect(game.getPublicHandHistory()).toContainEqual(expect.objectContaining({
      type: 'UncalledBetReturned',
      playerId: 'p1',
      amount: 0.08,
    }))
    expect(game.getLastHandResults()).toEqual([{ playerId: 'p1', amount: 0.04, handName: '' }])
    expect(game.getPublicState().players.map(player => player.chips)).toEqual([2.02, 1.98])
  })

  it('keeps a short all-in out of a side pot after both side-pot players force-fold', () => {
    const game = new PokerGame(makePlayers([0.50, 1.50, 1.50]), {
      smallBlind: 0.01,
      bigBlind: 0.02,
      initialDealerIndex: 0,
      seed: 'orphan-side-pot-uncontested',
    })
    game.startHand()
    game.applyAction('p1', { type: 'all-in' })
    game.applyAction('p2', { type: 'raise', amount: 1.00 })
    game.applyAction('p3', { type: 'call' })
    game.forceFold('p2')
    game.forceFold('p3')

    expect(game.getPublicState().phase).toBe('waiting')
    expect(game.getLastHandResults()).toEqual([
      { playerId: 'p1', amount: 1.50, handName: '' },
      { playerId: 'p3', amount: 1.00, handName: '' },
    ])
    expect(game.getPublicState().players.map(player => player.chips)).toEqual([1.50, 0.50, 1.50])
  })

  it('settles an orphaned upper side pot without stalling the showdown', () => {
    const game = new PokerGame(makePlayers([0.50, 0.70, 1.50, 1.50]), {
      smallBlind: 0.01,
      bigBlind: 0.02,
      initialDealerIndex: 0,
      seed: 'orphan-side-pot-showdown',
    })
    game.startHand()
    game.applyAction('p4', { type: 'raise', amount: 1.00 })
    game.applyAction('p1', { type: 'call' })
    game.applyAction('p2', { type: 'call' })
    game.applyAction('p3', { type: 'call' })
    game.forceFold('p3')
    game.forceFold('p4')

    const awards = game.getPublicHandHistory().filter(event => event.type === 'PotAwarded')
    expect(game.getPublicState().phase).toBe('waiting')
    expect(awards).toContainEqual(expect.objectContaining({
      potIndex: 1,
      playerId: 'p2',
      amount: 0.60,
    }))
    expect(awards).toContainEqual(expect.objectContaining({
      potIndex: 2,
      playerId: 'p4',
      amount: 0.60,
    }))
    expect(awards.reduce((sum, event) => sum + event.amount, 0)).toBeCloseTo(3.20, 8)
    expect(game.getPublicState().players.reduce((sum, player) => sum + player.chips, 0)).toBeCloseTo(4.20, 8)
  })

  it('prices a short call from the pot the caller can actually win', () => {
    for (const variant of [TEXAS_HOLDEM, OMAHA_HIGH]) {
      const players = makePlayers([200, 40])
      const game = new PokerGame(players, { ...config, variant, seed: `eligible-pot-overbet-${variant.id}` })
      const internal = game as any

      internal.state = {
        ...internal.getPublicState(),
        phase: 'river',
        pot: 100,
        currentPlayerId: 'p2',
        players: [
          { ...players[0], chips: 100, roundBet: 100, status: 'active' },
          { ...players[1], chips: 40, roundBet: 0, status: 'active' },
        ],
      }
      internal.currentBet = 100
      internal.minRaise = 100
      internal.roundBets = new Map([['p1', 100], ['p2', 0]])
      internal.totalHandBets = new Map([['p1', 150], ['p2', 50]])
      internal.bettingQueue = ['p2']
      internal.syncCurrentPlayer()

      const context = game.getPublicState().bettingContext
      expect(context).toEqual(expect.objectContaining({
        playerId: 'p2',
        totalPot: 200,
        eligiblePot: 140,
        callAmount: 40,
        toCall: 100,
      }))
      expect(context?.potOdds).toBeCloseTo(40 / 180)
      expect(context?.toCallPotRatio).toBeCloseTo(40 / 140)
      expect(context?.spr).toBeCloseTo(40 / 140)
    }
  })

  it('does not expose a deep first-action shove at a 100 BB PLO table', () => {
    const game = new PokerGame(makePlayers(Array(6).fill(2000)), {
      ...config, variant: OMAHA_HIGH, seed: 'plo-first-action-pot-cap',
    })
    game.startHand()

    const context = game.getPublicState().bettingContext
    expect(context?.totalPot).toBe(30)
    expect(context?.legalActions.raise).toEqual({ minAmount: 40, maxAmount: 70 })
    expect(context?.legalActions.allInAmount).toBeNull()
    expect(() => game.applyAction(context!.playerId, { type: 'all-in' })).toThrow()
  })

  it('requires substantial prior investment before a deep PLO preflop call', () => {
    const game = new PokerGame(makePlayers([2000, 2000]), {
      ...config, variant: OMAHA_HIGH, seed: 'plo-deep-preflop-price',
    })
    game.startHand()

    for (const expectedMaxRaiseTo of [60, 180, 540, 1620]) {
      const context = game.getPublicState().bettingContext!
      expect(context.legalActions.raise?.maxAmount).toBe(expectedMaxRaiseTo)
      game.applyAction(context.playerId, { type: 'raise', amount: expectedMaxRaiseTo })
    }

    const facingRaise = game.getPublicState().bettingContext!
    expect(facingRaise.toCall).toBe(1080)
    expect(facingRaise.callAmount).toBe(1080)
    expect(facingRaise.playerStartingStack).toBe(2000)
    expect(facingRaise.voluntaryHandContribution).toBe(530)
    expect(facingRaise.potOdds).toBeCloseTo(1080 / (2160 + 1080))
  })

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
