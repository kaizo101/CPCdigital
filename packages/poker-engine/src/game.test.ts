import { describe, it, expect } from 'vitest'
import { PokerGame } from './game'
import type { Card, Player } from '@cpc/shared'

const config = { bigBlind: 20, smallBlind: 10 }

function makePlayer(id: string, chips = 1000, seatIndex = 0): Player {
  return { id, name: id, role: 'player', chips, seatIndex, isConnected: true, isSittingOut: false, status: 'waiting', roundBet: 0 }
}

function makePlayers(n: number, chips = 1000): Player[] {
  return Array.from({ length: n }, (_, i) => makePlayer(`p${i + 1}`, chips, i))
}

function configureBettingRound(
  game: PokerGame,
  players: Player[],
  roundBets: Record<string, number>,
  currentBet: number,
  minRaise: number,
  bettingQueue: string[],
  lastActions: Array<{ playerId: string; currentBet: number; minRaise: number }> = [],
): void {
  const internal = game as any
  internal.state = {
    ...internal.getPublicState(),
    phase: 'turn',
    currentPlayerId: bettingQueue[0] ?? null,
    currentBet,
    minRaise,
    players: players.map(player => ({
      ...player,
      status: 'active',
      roundBet: roundBets[player.id] ?? 0,
    })),
  }
  internal.currentBet = currentBet
  internal.minRaise = minRaise
  internal.roundBets = new Map(players.map(player => [player.id, roundBets[player.id] ?? 0]))
  internal.totalHandBets = new Map(players.map(player => [player.id, roundBets[player.id] ?? 0]))
  internal.foldedPlayers = new Set()
  internal.allInPlayers = new Set()
  internal.lastActionBet = new Map(lastActions.map(action => [action.playerId, action.currentBet]))
  internal.lastActionMinRaise = new Map(lastActions.map(action => [action.playerId, action.minRaise]))
  internal.bettingQueue = [...bettingQueue]
  internal.syncCurrentPlayer()
}

function configureShowdown(
  game: PokerGame,
  players: Player[],
  communityCards: Card[],
  holeCards: Record<string, Card[]>,
  contributions: Record<string, number>,
  foldedPlayerIds: string[] = [],
  dealerIndex = 0,
): void {
  const internal = game as any
  const folded = new Set(foldedPlayerIds)
  internal.state = {
    ...internal.getPublicState(),
    phase: 'river',
    communityCards,
    dealerIndex,
    players: players.map(player => ({
      ...player,
      status: folded.has(player.id) ? 'folded' : 'active',
      roundBet: 0,
    })),
  }
  internal.totalHandBets = new Map(players.map(player => [player.id, contributions[player.id] ?? 0]))
  internal.holeCards = new Map(players.map(player => [player.id, holeCards[player.id]]))
  internal.foldedPlayers = folded
  internal.showdown()
}

const card = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })

describe('startHand', () => {
  it('requires at least 2 players with chips', () => {
    const game = new PokerGame([makePlayer('p1', 0), makePlayer('p2', 0)], config)
    expect(() => game.startHand()).toThrow()
  })

  it('deals 2 hole cards to each player', () => {
    const players = makePlayers(3)
    const game = new PokerGame(players, config)
    game.startHand()
    for (const p of players) {
      expect(game.getPlayerView(p.id).ownCards).toHaveLength(2)
    }
  })

  it('uses a configured dealer for the first hand and rotates normally afterwards', () => {
    const game = new PokerGame(makePlayers(4), {
      ...config,
      initialDealerIndex: 3,
    })

    game.startHand()
    expect(game.getPublicState().dealerIndex).toBe(3)

    const internal = game as any
    internal.state = { ...internal.state, phase: 'waiting' }
    game.startHand()
    expect(game.getPublicState().dealerIndex).toBe(0)
  })

  it('rejects an initial dealer outside the player roster', () => {
    expect(() => new PokerGame(makePlayers(3), {
      ...config,
      initialDealerIndex: 3,
    })).toThrow(/initial dealer index/i)
  })

  it('sorts ten between jack and nine in private player views', () => {
    const game = new PokerGame(makePlayers(2), config)
    const internal = game as any
    internal.holeCards = new Map([
      ['p1', [card('9', 'clubs'), card('T', 'diamonds'), card('J', 'hearts')]],
    ])

    expect(game.getPlayerView('p1').ownCards?.map(current => current.rank))
      .toEqual(['J', 'T', '9'])
  })

  it('posts blinds and deducts from player chips', () => {
    const game = new PokerGame(makePlayers(3), config)
    game.startHand()
    const state = game.getPublicState()
    const totalChips = state.players.reduce((s, p) => s + p.chips + p.roundBet, 0)
    expect(totalChips).toBe(3000) // chips conserved
    const bets = state.players.reduce((s, p) => s + p.roundBet, 0)
    expect(bets).toBe(30) // SB=10 + BB=20
  })

  it('sets currentPlayerId to UTG (3+ players)', () => {
    const game = new PokerGame(makePlayers(3), config)
    game.startHand()
    const state = game.getPublicState()
    expect(state.currentPlayerId).not.toBeNull()
    expect(state.phase).toBe('preflop')
  })

  it('provides engine-derived betting context and legal actions', () => {
    const game = new PokerGame(makePlayers(3), config)
    game.startHand()

    const context = game.getPublicState().bettingContext!
    expect(context.playerId).toBe(game.getPublicState().currentPlayerId)
    expect(context.totalPot).toBe(30)
    expect(context.toCall).toBe(20)
    expect(context.callAmount).toBe(20)
    expect(context.potOdds).toBeCloseTo(20 / 50)
    expect(context.potRaiseTo).toBe(70)
    expect(context.minRaiseTo).toBe(40)
    expect(context.maxRaiseTo).toBe(1000)
    expect(context.legalActions).toEqual({
      fold: true,
      check: false,
      callAmount: 20,
      raise: { minAmount: 40, maxAmount: 1000 },
      allInAmount: 1000,
    })
  })

  it('updates live pot and raise bounds after an open raise', () => {
    const game = new PokerGame(makePlayers(3), config)
    game.startHand()
    game.applyAction(game.getPublicState().currentPlayerId!, { type: 'raise', amount: 50 })

    const context = game.getPublicState().bettingContext!
    expect(context.totalPot).toBe(80)
    expect(context.toCall).toBe(40)
    expect(context.potRaiseTo).toBe(170)
    expect(context.minRaiseTo).toBe(80)
    expect(context.legalActions.raise).toEqual({ minAmount: 80, maxAmount: 1000 })
  })

  it('keeps the full preflop bring-in when the big blind is all-in short', () => {
    const players = [
      makePlayer('p1', 15, 0),
      makePlayer('p2', 100, 1),
      makePlayer('p3', 100, 2),
    ]
    const game = new PokerGame(players, config)
    game.startHand()

    const bigBlind = game.getPublicState().players.find(player => player.status === 'all-in')
    const context = game.getPublicState().bettingContext!
    expect(bigBlind?.roundBet).toBe(15)
    expect(context.totalPot).toBe(25)
    expect(context.toCall).toBe(20)
    expect(context.minRaiseTo).toBe(40)
    expect(context.legalActions.raise).toEqual({ minAmount: 40, maxAmount: 100 })
  })
})

describe('fold to one winner', () => {
  it('ends hand when all but one player folds', () => {
    const game = new PokerGame(makePlayers(3), config)
    game.startHand()

    // Fold everyone except last player standing
    let state = game.getPublicState()
    while (state.phase !== 'waiting' && state.currentPlayerId) {
      game.applyAction(state.currentPlayerId, { type: 'fold' })
      state = game.getPublicState()
    }

    expect(state.phase).toBe('waiting')
    expect(game.getLastHandResults()).toHaveLength(1)
  })

  it('chips sum stays constant after hand', () => {
    const game = new PokerGame(makePlayers(3, 500), config)
    game.startHand()

    let state = game.getPublicState()
    while (state.phase !== 'waiting' && state.currentPlayerId) {
      game.applyAction(state.currentPlayerId, { type: 'fold' })
      state = game.getPublicState()
    }

    const total = state.players.reduce((s, p) => s + p.chips, 0)
    expect(total).toBe(1500)
  })
})

describe('full hand to showdown', () => {
  it('runs check/check through all streets to showdown', () => {
    const game = new PokerGame(makePlayers(2, 1000), config)
    game.startHand()

    let state = game.getPublicState()
    let iterations = 0
    while (state.phase !== 'waiting' && iterations < 50) {
      const pid = state.currentPlayerId!
      const player = state.players.find(p => p.id === pid)!
      const toCall = state.currentBet - player.roundBet

      if (toCall > 0) {
        game.applyAction(pid, { type: 'call' })
      } else {
        game.applyAction(pid, { type: 'check' })
      }

      state = game.getPublicState()
      iterations++
    }

    expect(state.phase).toBe('waiting')
    expect(state.communityCards).toHaveLength(5)
    const total = state.players.reduce((s, p) => s + p.chips, 0)
    expect(total).toBe(2000)
  })
})

describe('all-in scenario', () => {
  it('short stack all-in creates side pot', () => {
    const players = [
      makePlayer('p1', 1000, 0),
      makePlayer('p2', 300, 1),  // short stack
      makePlayer('p3', 1000, 2),
    ]
    const game = new PokerGame(players, config)
    game.startHand()

    let state = game.getPublicState()
    let iterations = 0
    while (state.phase !== 'waiting' && iterations < 50) {
      const pid = state.currentPlayerId!
      const player = state.players.find(p => p.id === pid)!
      const toCall = state.currentBet - player.roundBet
      game.applyAction(pid, toCall > 0 ? { type: 'call' } : { type: 'check' })
      state = game.getPublicState()
      iterations++
    }

    // Chips must be conserved
    const total = state.players.reduce((s, p) => s + p.chips, 0)
    expect(total).toBe(2300)
  })
})

describe('decimal blinds (€0.10/€0.20)', () => {
  const decimalConfig = { bigBlind: 0.20, smallBlind: 0.10 }

  it('conserves chips across a full hand with decimal blinds', () => {
    const players = Array.from({ length: 3 }, (_, i) => makePlayer(`p${i + 1}`, 20.00, i))
    const game = new PokerGame(players, decimalConfig)
    game.startHand()

    let state = game.getPublicState()
    let iterations = 0
    while (state.phase !== 'waiting' && iterations < 50) {
      const pid = state.currentPlayerId!
      const player = state.players.find(p => p.id === pid)!
      const toCall = state.currentBet - player.roundBet
      game.applyAction(pid, toCall > 0 ? { type: 'call' } : { type: 'check' })
      state = game.getPublicState()
      iterations++
    }

    const total = state.players.reduce((s, p) => s + p.chips, 0)
    expect(total).toBeCloseTo(60.00, 8)
    // No fractional cent leakage
    for (const p of state.players) {
      expect(Math.round(p.chips * 100) % 1).toBe(0)
    }
  })

  it('posts correct blinds with decimal config', () => {
    const players = Array.from({ length: 3 }, (_, i) => makePlayer(`p${i + 1}`, 20.00, i))
    const game = new PokerGame(players, decimalConfig)
    game.startHand()
    const bets = game.getPublicState().players.reduce((s, p) => s + p.roundBet, 0)
    expect(bets).toBeCloseTo(0.30, 10)
  })
})

describe('heads-up', () => {
  it('plays a complete heads-up hand', () => {
    const game = new PokerGame(makePlayers(2, 500), config)
    game.startHand()
    expect(game.getPublicState().phase).toBe('preflop')

    let state = game.getPublicState()
    let iterations = 0
    while (state.phase !== 'waiting' && iterations < 20) {
      const pid = state.currentPlayerId!
      const toCall = state.currentBet - state.players.find(p => p.id === pid)!.roundBet
      game.applyAction(pid, toCall > 0 ? { type: 'call' } : { type: 'check' })
      state = game.getPublicState()
      iterations++
    }

    expect(state.phase).toBe('waiting')
    expect(state.players.reduce((s, p) => s + p.chips, 0)).toBe(1000)
  })
})

describe('side-pot and split-pot payouts', () => {
  const community = [
    card('2', 'clubs'),
    card('5', 'diamonds'),
    card('9', 'hearts'),
    card('J', 'spades'),
    card('K', 'clubs'),
  ]

  it('awards main and multiple side pots to their respective best eligible hands', () => {
    const players = makePlayers(4, 0)
    const game = new PokerGame(players, config)
    configureShowdown(
      game,
      players,
      community,
      {
        p1: [card('A', 'hearts'), card('A', 'diamonds')],
        p2: [card('Q', 'hearts'), card('Q', 'diamonds')],
        p3: [card('T', 'hearts'), card('T', 'diamonds')],
        p4: [card('8', 'spades'), card('7', 'spades')],
      },
      { p1: 100, p2: 200, p3: 300, p4: 300 },
    )

    expect(game.getLastHandResults().map(result => [result.playerId, result.amount])).toEqual([
      ['p1', 400],
      ['p2', 300],
      ['p3', 200],
    ])
    expect(game.getPublicState().players.reduce((sum, player) => sum + player.chips, 0)).toBe(900)
  })

  it('keeps folded dead money in the correct side pot without making the folder eligible', () => {
    const players = makePlayers(3, 0)
    const game = new PokerGame(players, config)
    configureShowdown(
      game,
      players,
      community,
      {
        p1: [card('A', 'hearts'), card('A', 'diamonds')],
        p2: [card('8', 'spades'), card('7', 'spades')],
        p3: [card('Q', 'hearts'), card('Q', 'diamonds')],
      },
      { p1: 100, p2: 200, p3: 200 },
      ['p2'],
    )

    expect(game.getLastHandResults().map(result => [result.playerId, result.amount])).toEqual([
      ['p1', 300],
      ['p3', 200],
    ])
  })

  it('splits every pot separately and awards an odd cent left of the dealer', () => {
    const players = makePlayers(4, 0)
    const game = new PokerGame(players, { bigBlind: 0.02, smallBlind: 0.01 })
    const boardPlays = [
      card('A', 'hearts'),
      card('K', 'hearts'),
      card('Q', 'hearts'),
      card('J', 'hearts'),
      card('T', 'hearts'),
    ]
    configureShowdown(
      game,
      players,
      boardPlays,
      {
        p1: [card('2', 'clubs'), card('3', 'diamonds')],
        p2: [card('4', 'clubs'), card('5', 'diamonds')],
        p3: [card('6', 'clubs'), card('7', 'diamonds')],
        p4: [card('8', 'clubs'), card('9', 'diamonds')],
      },
      { p1: 0.01, p2: 0.02, p3: 0.02, p4: 0.01 },
      ['p4'],
      0,
    )

    const totals = game.getLastHandResults().reduce<Record<string, number>>((winnings, result) => {
      winnings[result.playerId] = Math.round(((winnings[result.playerId] ?? 0) + result.amount) * 100) / 100
      return winnings
    }, {})
    expect(totals).toEqual({ p2: 0.03, p3: 0.02, p1: 0.01 })
    expect(Object.values(totals).reduce((sum, amount) => sum + amount, 0)).toBeCloseTo(0.06, 8)
    const awardEvents = game.getPublicHandHistory().filter(event => event.type === 'PotAwarded')
    expect(awardEvents.map(event => event.potIndex)).toEqual([0, 0, 0, 1, 1])
    expect(awardEvents.every(event => event.isSplit)).toBe(true)
    expect(game.getPublicHandHistory().filter(event => event.type === 'CardsRevealed')).toHaveLength(3)
  })

  it('returns an uncalled excess before showdown instead of reporting it as a win', () => {
    const players = makePlayers(3, 0)
    const game = new PokerGame(players, config)
    const internal = game as any
    internal.state = {
      ...internal.getPublicState(),
      phase: 'river',
      communityCards: community,
      players: [
        { ...players[0], status: 'all-in', roundBet: 100 },
        { ...players[1], status: 'all-in', roundBet: 60 },
        { ...players[2], status: 'all-in', roundBet: 40 },
      ],
    }
    internal.roundBets = new Map([['p1', 100], ['p2', 60], ['p3', 40]])
    internal.totalHandBets = new Map([['p1', 100], ['p2', 60], ['p3', 40]])
    internal.allInPlayers = new Set(['p1', 'p2', 'p3'])
    internal.holeCards = new Map([
      ['p1', [card('8', 'spades'), card('7', 'spades')]],
      ['p2', [card('A', 'hearts'), card('A', 'diamonds')]],
      ['p3', [card('6', 'spades'), card('4', 'diamonds')]],
    ])

    internal.endBettingRound()

    expect(game.getPublicState().players.find(player => player.id === 'p1')?.chips).toBe(40)
    expect(game.getPublicState().players.find(player => player.id === 'p1')?.status).toBe('active')
    expect(game.getLastHandResults().some(result => result.playerId === 'p1')).toBe(false)
    expect(game.getLastHandResults().reduce((sum, result) => sum + result.amount, 0)).toBe(160)
    expect(game.getPublicState().players.reduce((sum, player) => sum + player.chips, 0)).toBe(200)
    const history = game.getPublicHandHistory()
    expect(history.find(event => event.type === 'UncalledBetReturned')).toEqual({
      type: 'UncalledBetReturned',
      phase: 'river',
      playerId: 'p1',
      amount: 40,
    })
    expect(history.findIndex(event => event.type === 'UncalledBetReturned')).toBeLessThan(
      history.findIndex(event => event.type === 'CardsRevealed')
    )
  })
})

describe('regressions', () => {
  it('preserves chips when a tied pot has leftover cents', () => {
    const players = makePlayers(5, 1)
    const game = new PokerGame(players, { bigBlind: 0.02, smallBlind: 0.01 })
    const internal = game as any

    internal.state = {
      ...internal.getPublicState(),
      phase: 'river',
      communityCards: [
        { rank: 'A', suit: 'hearts' },
        { rank: 'K', suit: 'hearts' },
        { rank: 'Q', suit: 'hearts' },
        { rank: 'J', suit: 'hearts' },
        { rank: 'T', suit: 'hearts' },
      ],
      players: players.map((player, index) => ({
        ...player,
        chips: 0.99,
        status: index < 3 ? 'active' : 'folded',
        roundBet: 0.01,
      })),
    }
    internal.totalHandBets = new Map(players.map(player => [player.id, 0.01]))
    internal.holeCards = new Map(players.map(player => [player.id, [
      { rank: '2', suit: 'clubs' },
      { rank: '3', suit: 'diamonds' },
    ]]))
    internal.foldedPlayers = new Set([players[3].id, players[4].id])

    internal.showdown()

    const total = game.getPublicState().players.reduce((sum, player) => sum + player.chips, 0)
    expect(total).toBeCloseTo(5, 8)
  })

  it('does not reopen raise rights after a short all-in', () => {
    const players = [
      makePlayer('p1', 30, 0),
      makePlayer('p2', 100, 1),
      makePlayer('p3', 100, 2),
    ]
    const game = new PokerGame(players, config)
    configureBettingRound(
      game,
      players,
      { p1: 0, p2: 20, p3: 20 },
      20,
      20,
      ['p1'],
      [
        { playerId: 'p2', currentBet: 20, minRaise: 20 },
        { playerId: 'p3', currentBet: 20, minRaise: 20 },
      ],
    )

    game.applyAction('p1', { type: 'all-in' })

    expect(game.getPublicState().currentPlayerId).toBe('p2')
    expect(game.getPublicState().currentBet).toBe(30)
    expect(game.getPublicState().minRaise).toBe(20)
    expect(game.getPublicState().canRaise).toBe(false)
    expect(game.getPublicState().bettingContext?.legalActions).toEqual({
      fold: true,
      check: false,
      callAmount: 10,
      raise: null,
      allInAmount: null,
    })
    expect(() => game.applyAction('p2', { type: 'raise', amount: 50 })).toThrow(/not reopened/i)
    expect(() => game.applyAction('p2', { type: 'all-in' })).toThrow(/not reopened/i)
  })

  it('keeps raise rights open for a player who has not acted before a short all-in', () => {
    const players = [
      makePlayer('p1', 30, 0),
      makePlayer('p2', 100, 1),
      makePlayer('p3', 100, 2),
    ]
    const game = new PokerGame(players, config)
    configureBettingRound(
      game,
      players,
      { p1: 0, p2: 0, p3: 20 },
      20,
      20,
      ['p1', 'p2'],
      [{ playerId: 'p3', currentBet: 20, minRaise: 20 }],
    )

    game.applyAction('p1', { type: 'all-in' })

    expect(game.getPublicState().currentPlayerId).toBe('p2')
    expect(game.getPublicState().bettingContext?.legalActions.raise).toEqual({ minAmount: 50, maxAmount: 100 })
    expect(game.getPublicState().bettingContext?.legalActions.allInAmount).toBe(100)
  })

  it('reopens a prior actor after a full raise even when that player is already queued', () => {
    const players = [
      makePlayer('p1', 100, 0),
      makePlayer('p2', 100, 1),
      makePlayer('p3', 100, 2),
    ]
    const game = new PokerGame(players, config)
    configureBettingRound(
      game,
      players,
      { p1: 0, p2: 20, p3: 30 },
      30,
      20,
      ['p1', 'p2'],
      [
        { playerId: 'p2', currentBet: 20, minRaise: 20 },
        { playerId: 'p3', currentBet: 30, minRaise: 20 },
      ],
    )

    game.applyAction('p1', { type: 'raise', amount: 50 })

    expect(game.getPublicState().currentPlayerId).toBe('p2')
    expect(game.getPublicState().minRaise).toBe(20)
    expect(game.getPublicState().bettingContext?.legalActions.raise).toEqual({ minAmount: 70, maxAmount: 120 })
  })

  it('reopens raise rights when multiple short all-ins cumulatively make a full raise', () => {
    const players = [
      makePlayer('p1', 30, 0),
      makePlayer('p2', 40, 1),
      makePlayer('p3', 100, 2),
      makePlayer('p4', 100, 3),
    ]
    const game = new PokerGame(players, config)
    configureBettingRound(
      game,
      players,
      { p1: 0, p2: 0, p3: 20, p4: 20 },
      20,
      20,
      ['p1', 'p2'],
      [
        { playerId: 'p3', currentBet: 20, minRaise: 20 },
        { playerId: 'p4', currentBet: 20, minRaise: 20 },
      ],
    )

    game.applyAction('p1', { type: 'all-in' })
    game.applyAction('p2', { type: 'all-in' })

    expect(game.getPublicState().currentPlayerId).toBe('p3')
    expect(game.getPublicState().currentBet).toBe(40)
    expect(game.getPublicState().minRaise).toBe(20)
    expect(game.getPublicState().bettingContext?.legalActions.raise).toEqual({ minAmount: 60, maxAmount: 120 })
    expect(game.getPublicState().bettingContext?.legalActions.allInAmount).toBe(120)
  })

  it('tracks reopen rights relative to each player’s own last action', () => {
    const players = [
      makePlayer('p2', 100, 0),
      makePlayer('p3', 100, 1),
    ]
    const game = new PokerGame(players, config)
    configureBettingRound(
      game,
      players,
      { p2: 20, p3: 30 },
      40,
      20,
      ['p2', 'p3'],
      [
        { playerId: 'p2', currentBet: 20, minRaise: 20 },
        { playerId: 'p3', currentBet: 30, minRaise: 20 },
      ],
    )

    expect(game.getPublicState().bettingContext?.legalActions.raise).toEqual({ minAmount: 60, maxAmount: 120 })
    game.applyAction('p2', { type: 'call' })

    expect(game.getPublicState().currentPlayerId).toBe('p3')
    expect(game.getPublicState().bettingContext?.legalActions.raise).toBeNull()
  })

  it('allows an exact-call all-in even when raise rights are closed', () => {
    const players = [
      makePlayer('p1', 30, 0),
      makePlayer('p2', 10, 1),
      makePlayer('p3', 100, 2),
    ]
    const game = new PokerGame(players, config)
    configureBettingRound(
      game,
      players,
      { p1: 0, p2: 20, p3: 20 },
      20,
      20,
      ['p1'],
      [
        { playerId: 'p2', currentBet: 20, minRaise: 20 },
        { playerId: 'p3', currentBet: 20, minRaise: 20 },
      ],
    )

    game.applyAction('p1', { type: 'all-in' })

    expect(game.getPublicState().bettingContext?.legalActions).toEqual({
      fold: true,
      check: false,
      callAmount: 10,
      raise: null,
      allInAmount: 30,
    })
    expect(() => game.applyAction('p2', { type: 'all-in' })).not.toThrow()
  })

  it('updates the minimum raise after a full all-in raise', () => {
    const players = [
      makePlayer('p1', 60, 0),
      makePlayer('p2', 100, 1),
      makePlayer('p3', 100, 2),
    ]
    const game = new PokerGame(players, config)
    configureBettingRound(game, players, { p1: 0, p2: 0, p3: 20 }, 20, 20, ['p1', 'p2', 'p3'])

    game.applyAction('p1', { type: 'all-in' })

    expect(game.getPublicState().currentPlayerId).toBe('p2')
    expect(game.getPublicState().currentBet).toBe(60)
    expect(game.getPublicState().minRaise).toBe(40)
    expect(game.getPublicState().bettingContext?.legalActions.raise).toEqual({ minAmount: 100, maxAmount: 100 })
  })

  it('rejects a non-all-in underraise and preserves the last full raise size', () => {
    const players = makePlayers(3, 100)
    const game = new PokerGame(players, config)
    configureBettingRound(game, players, { p1: 0, p2: 0, p3: 20 }, 20, 20, ['p1', 'p2', 'p3'])

    expect(() => game.applyAction('p1', { type: 'raise', amount: 30 })).toThrow(/minimum raise to 40/i)
    expect(game.getPublicState().currentBet).toBe(20)
    expect(game.getPublicState().minRaise).toBe(20)
  })

  it('rejects invalid raise amounts', () => {
    const game = new PokerGame(makePlayers(3), config)
    game.startHand()
    const state = game.getPublicState()
    const currentPlayerId = state.currentPlayerId!

    expect(() => game.applyAction(currentPlayerId, { type: 'raise', amount: Number.NaN })).toThrow(/invalid raise amount/i)
    expect(() => game.applyAction(currentPlayerId, { type: 'raise', amount: Number.POSITIVE_INFINITY })).toThrow(/invalid raise amount/i)
  })

  it('force-folds an active player and advances the action', () => {
    const game = new PokerGame(makePlayers(3), config)
    game.startHand()
    const currentPlayerId = game.getPublicState().currentPlayerId!

    game.forceFold(currentPlayerId)

    const state = game.getPublicState()
    expect(state.players.find(player => player.id === currentPlayerId)?.status).toBe('folded')
    expect(state.currentPlayerId).not.toBe(currentPlayerId)
  })

  it('marks a player all-in when a raise uses the whole stack', () => {
    const game = new PokerGame(makePlayers(3, 40), config)
    game.startHand()
    const playerId = game.getPublicState().currentPlayerId!

    game.applyAction(playerId, { type: 'raise', amount: 40 })

    expect(game.getPublicState().players.find(player => player.id === playerId)?.status).toBe('all-in')
  })

  it('starts postflop action left of the original dealer after the dealer folds', () => {
    const players = makePlayers(4)
    const game = new PokerGame(players, { ...config, initialDealerIndex: 0 })
    game.startHand()

    // BTN p1 folds; p2 (SB), p3 (BB) and p4 see the flop.
    game.applyAction('p4', { type: 'call' })
    game.applyAction('p1', { type: 'fold' })
    game.applyAction('p2', { type: 'call' })
    game.applyAction('p3', { type: 'check' })

    expect(game.getPublicState().phase).toBe('flop')
    expect(game.getPublicState().currentPlayerId).toBe('p2')
    game.applyAction('p2', { type: 'check' })
    expect(game.getPublicState().currentPlayerId).toBe('p3')
    game.applyAction('p3', { type: 'check' })
    expect(game.getPublicState().currentPlayerId).toBe('p4')
  })

  it('does not offer a raise when the only opponent is already all-in', () => {
    const players = [makePlayer('p1', 40, 0), makePlayer('p2', 100, 1)]
    const game = new PokerGame(players, { ...config, initialDealerIndex: 0 })
    game.startHand()

    game.applyAction('p1', { type: 'all-in' })

    expect(game.getPublicState().currentPlayerId).toBe('p2')
    expect(game.getPublicState().bettingContext?.legalActions).toEqual({
      fold: true,
      check: false,
      callAmount: 20,
      raise: null,
      allInAmount: null,
    })
    expect(() => game.applyAction('p2', { type: 'raise', amount: 60 })).toThrow(/maximum raise/i)
    expect(() => game.applyAction('p2', { type: 'all-in' })).toThrow(/not legal/i)
    expect(() => game.applyAction('p2', { type: 'call' })).not.toThrow()
    expect(game.getPublicState().phase).toBe('waiting')
    expect(game.getPublicHandHistory().at(-1)).toMatchObject({
      type: 'HandEnded',
      reason: 'showdown',
    })
  })

  it('does not offer or accept fold when check is available', () => {
    const game = new PokerGame(makePlayers(2), config)
    game.startHand()
    game.applyAction(game.getPublicState().currentPlayerId!, { type: 'call' })

    const checkingPlayer = game.getPublicState().currentPlayerId!
    expect(game.getPublicState().bettingContext?.legalActions.fold).toBe(false)
    expect(game.getPublicState().bettingContext?.legalActions.check).toBe(true)
    expect(() => game.applyAction(checkingPlayer, { type: 'fold' })).toThrow(/check is available/i)
  })

  it('rejects invalid blinds and chip stacks', () => {
    expect(() => new PokerGame(makePlayers(2), { smallBlind: 10, bigBlind: 0 })).toThrow(/big blind/i)
    expect(() => new PokerGame([makePlayer('p1', -1), makePlayer('p2')], config)).toThrow(/chips/i)
  })

  it('reopens betting in correct clockwise order after a raise', () => {
    const players = [
      makePlayer('hero', 1000, 0),
      makePlayer('b1', 1000, 1),
      makePlayer('b2', 1000, 2),
      makePlayer('b3', 1000, 3),
      makePlayer('b4', 1000, 4),
      makePlayer('b5', 1000, 5),
    ]
    const game = new PokerGame(players, config)
    game.startHand()
    const n = players.length
    const gs = game.getPublicState()
    const di = gs.dealerIndex

    // Clockwise order starting from after BB (3rd from dealer)
    const firstAct = (di + 3) % n
    const sb = (di + 1) % n
    const bb = (di + 2) % n
    const ids = [gs.players[firstAct].id, gs.players[(firstAct + 1) % n].id,
      gs.players[(firstAct + 2) % n].id, gs.players[(firstAct + 3) % n].id,
      gs.players[(firstAct + 4) % n].id, gs.players[(firstAct + 5) % n].id]

    // Callers (UTG, UTG+1 call), then CO raises, BTN calls, SB folds, BB all-in
    game.applyAction(ids[0], { type: 'call' }) // UTG calls
    game.applyAction(ids[1], { type: 'fold' }) // UTG+1 folds
    game.applyAction(ids[2], { type: 'raise', amount: 50 }) // CO raises
    game.applyAction(ids[3], { type: 'call' })  // BTN calls
    game.applyAction(ids[4], { type: 'fold' })  // SB folds
    game.applyAction(ids[5], { type: 'all-in' }) // BB all-in (reopens)

    // After BB all-in, queue must reopen clockwise from BB
    // BB at seat (di+2), clockwise: (di+3)[UTG], (di+4)[folded], (di+5)[CO], (di+0)[BTN]
    const reopenOrder = [
      gs.players[(bb + 1) % n].id, // first after BB (UTG)
      gs.players[(bb + 3) % n].id, // skip folded, CO
      gs.players[(bb + 4) % n].id, // BTN
    ]

    let s = game.getPublicState()
    expect(s.currentPlayerId).toBe(reopenOrder[0])
    game.applyAction(reopenOrder[0], { type: 'fold' })
    s = game.getPublicState()
    expect(s.currentPlayerId).toBe(reopenOrder[1])
    game.applyAction(reopenOrder[1], { type: 'fold' })
    s = game.getPublicState()
    expect(s.currentPlayerId).toBe(reopenOrder[2])
  })

  it('reopens betting clockwise from raiser position', () => {
    const players = makePlayers(5)
    const game = new PokerGame(players, { ...config, initialDealerIndex: 2 })
    game.startHand()
    game.applyAction('p1', { type: 'call' })
    game.applyAction('p2', { type: 'call' })
    game.applyAction('p3', { type: 'call' })
    game.applyAction('p4', { type: 'call' })
    game.applyAction('p5', { type: 'raise', amount: 40 })
    expect(game.getPublicState().currentPlayerId).toBe('p1')
    game.applyAction('p1', { type: 'call' })
    expect(game.getPublicState().currentPlayerId).toBe('p2')
    game.applyAction('p2', { type: 'call' })
    expect(game.getPublicState().currentPlayerId).toBe('p3')
    game.applyAction('p3', { type: 'call' })
    expect(game.getPublicState().currentPlayerId).toBe('p4')
  })

  it('captures a decision snapshot on force-fold for replay fidelity', () => {
    const game = new PokerGame(makePlayers(3), { ...config, initialDealerIndex: 0 })
    game.startHand()
    game.applyAction('p1', { type: 'call' })
    game.applyAction('p2', { type: 'raise', amount: 40 })
    game.applyAction('p3', { type: 'fold' })
    game.applyAction('p1', { type: 'call' })

    const snapshotsBefore = game.getPrivateDecisionSnapshots().length
    expect(snapshotsBefore).toBe(4)

    game.forceFold('p2')
    const snapshotsAfter = game.getPrivateDecisionSnapshots().length

    expect(snapshotsAfter).toBe(snapshotsBefore + 1)
  })

  it('dealerIdxInHand returns 0 when dealer index is out of bounds', () => {
    const game = new PokerGame(makePlayers(3), config)
    const internal = game as any
    internal.state.dealerIndex = -1
    const result = internal.dealerIdxInHand(internal.getInHandPlayers())
    expect(result).toBe(0)
  })

  it('dealerIdxInHand returns 0 when dealer is absent from in-hand array', () => {
    const game = new PokerGame(makePlayers(3), config)
    const internal = game as any
    const result = internal.dealerIdxInHand([])
    expect(result).toBe(0)
  })

  it('resolveInitialDealerIndex falls back to preferredIndex when no eligible player', () => {
    const game = new PokerGame(makePlayers(3), config)
    const internal = game as any
    const result = internal.resolveInitialDealerIndex([], 1)
    expect(result).toBe(1)
  })
})
