import { describe, expect, it } from 'vitest'
import type { GameState, Player } from '@cpc/shared'
import { getTableButtonAssignments, getTableButtonPosition } from './positions'

const player = (id: string, seatIndex: number, status: Player['status'] = 'active'): Player => ({
  id,
  name: id,
  role: 'player',
  chips: 100,
  seatIndex,
  isConnected: true,
  isSittingOut: false,
  status,
  roundBet: 0,
})

const state = (players: Player[], dealerIndex: number): GameState => ({
  variantId: 'texas-holdem',
  phase: 'preflop',
  players,
  communityCards: [],
  pot: 0,
  sidePots: [],
  currentPlayerId: null,
  dealerIndex,
  bigBlind: 20,
  smallBlind: 10,
  currentBet: 20,
  minRaise: 20,
  canRaise: false,
  bettingContext: null,
  turnDeadline: null,
})

describe('table button assignments', () => {
  it('positions table buttons between the bet stack and the player seat', () => {
    expect(getTableButtonPosition(0, 6)).toEqual({ left: '50%', top: '86.95%' })
  })

  it('shows only the dealer button', () => {
    const players = Array.from({ length: 6 }, (_, index) => player(`p${index}`, index))
    expect(getTableButtonAssignments(state(players, 2))).toEqual({
      p2: ['D'],
    })
  })

  it('keeps the dealer button heads-up and skips waiting seats', () => {
    const players = [player('dealer', 0), player('empty', 1, 'waiting'), player('opponent', 2)]
    expect(getTableButtonAssignments(state(players, 0))).toEqual({
      dealer: ['D'],
    })
  })
})
