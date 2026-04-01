export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A'

export interface Card {
  suit: Suit
  rank: Rank
}

export type PlayerId = string

export interface Player {
  id: PlayerId
  name: string
  chips: number
  seatIndex: number
  isConnected: boolean
}

export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'

export type PlayerAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'raise'; amount: number }
  | { type: 'all-in' }

export interface GameState {
  phase: GamePhase
  players: Player[]
  communityCards: Card[]
  pot: number
  currentPlayerId: PlayerId | null
  dealerIndex: number
  bigBlind: number
  smallBlind: number
}

export interface LobbyInfo {
  id: string
  name: string
  playerCount: number
  maxPlayers: number
  bigBlind: number
  smallBlind: number
}
