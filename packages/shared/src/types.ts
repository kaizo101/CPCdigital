export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A'

export interface Card {
  suit: Suit
  rank: Rank
}

export type PlayerId = string

export type UserRole = 'admin' | 'player'

export interface Player {
  id: PlayerId
  name: string
  role: UserRole
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

export interface TableOptions {
  bigBlind: number
  smallBlind: number
  maxPlayers: number
  startingChips: number
}

export interface TableInfo {
  id: string
  inviteCode: string
  playerCount: number
  maxPlayers: number
  bigBlind: number
  smallBlind: number
  phase: GamePhase
}

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

export interface JwtPayload {
  userId: number
  username: string
  role: UserRole
}

export interface ChatMessage {
  playerId: PlayerId
  playerName: string
  text: string
  timestamp: number
}
