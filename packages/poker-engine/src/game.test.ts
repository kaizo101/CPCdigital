import { describe, it, expect } from 'vitest'
import { PokerGame } from './game.js'
import type { Player } from '@cpc/shared'

const config = { bigBlind: 20, smallBlind: 10 }

function makePlayer(id: string, chips = 1000, seatIndex = 0): Player {
  return { id, name: id, role: 'player', chips, seatIndex, isConnected: true, status: 'waiting', roundBet: 0 }
}

function makePlayers(n: number, chips = 1000): Player[] {
  return Array.from({ length: n }, (_, i) => makePlayer(`p${i + 1}`, chips, i))
}

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
      expect(game.getHoleCards(p.id)).toHaveLength(2)
    }
  })

  it('posts blinds and deducts from player chips', () => {
    const game = new PokerGame(makePlayers(3), config)
    game.startHand()
    const state = game.getState()
    const totalChips = state.players.reduce((s, p) => s + p.chips + p.roundBet, 0)
    expect(totalChips).toBe(3000) // chips conserved
    const bets = state.players.reduce((s, p) => s + p.roundBet, 0)
    expect(bets).toBe(30) // SB=10 + BB=20
  })

  it('sets currentPlayerId to UTG (3+ players)', () => {
    const game = new PokerGame(makePlayers(3), config)
    game.startHand()
    const state = game.getState()
    expect(state.currentPlayerId).not.toBeNull()
    expect(state.phase).toBe('preflop')
  })
})

describe('fold to one winner', () => {
  it('ends hand when all but one player folds', () => {
    const game = new PokerGame(makePlayers(3), config)
    game.startHand()

    // Fold everyone except last player standing
    let state = game.getState()
    while (state.phase !== 'waiting' && state.currentPlayerId) {
      game.applyAction(state.currentPlayerId, { type: 'fold' })
      state = game.getState()
    }

    expect(state.phase).toBe('waiting')
    expect(game.getLastHandResults()).toHaveLength(1)
  })

  it('chips sum stays constant after hand', () => {
    const game = new PokerGame(makePlayers(3, 500), config)
    game.startHand()

    let state = game.getState()
    while (state.phase !== 'waiting' && state.currentPlayerId) {
      game.applyAction(state.currentPlayerId, { type: 'fold' })
      state = game.getState()
    }

    const total = state.players.reduce((s, p) => s + p.chips, 0)
    expect(total).toBe(1500)
  })
})

describe('full hand to showdown', () => {
  it('runs check/check through all streets to showdown', () => {
    const game = new PokerGame(makePlayers(2, 1000), config)
    game.startHand()

    let state = game.getState()
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

      state = game.getState()
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

    let state = game.getState()
    let iterations = 0
    while (state.phase !== 'waiting' && iterations < 50) {
      const pid = state.currentPlayerId!
      const player = state.players.find(p => p.id === pid)!
      const toCall = state.currentBet - player.roundBet
      game.applyAction(pid, toCall > 0 ? { type: 'call' } : { type: 'check' })
      state = game.getState()
      iterations++
    }

    // Chips must be conserved
    const total = state.players.reduce((s, p) => s + p.chips, 0)
    expect(total).toBe(2300)
  })
})

describe('heads-up', () => {
  it('plays a complete heads-up hand', () => {
    const game = new PokerGame(makePlayers(2, 500), config)
    game.startHand()
    expect(game.getState().phase).toBe('preflop')

    let state = game.getState()
    let iterations = 0
    while (state.phase !== 'waiting' && iterations < 20) {
      const pid = state.currentPlayerId!
      const toCall = state.currentBet - state.players.find(p => p.id === pid)!.roundBet
      game.applyAction(pid, toCall > 0 ? { type: 'call' } : { type: 'check' })
      state = game.getState()
      iterations++
    }

    expect(state.phase).toBe('waiting')
    expect(state.players.reduce((s, p) => s + p.chips, 0)).toBe(1000)
  })
})
