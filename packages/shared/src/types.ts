export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades'
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A'

export interface Card {
  suit: Suit
  rank: Rank
}

export type PlayerId = string

export type UserRole = 'admin' | 'player'

export type PlayerStatus = 'waiting' | 'active' | 'folded' | 'all-in'

export interface Player {
  id: PlayerId
  name: string
  role: UserRole
  chips: number
  seatIndex: number
  isConnected: boolean
  status: PlayerStatus
  /** Chips bet in the current betting round (for UI display) */
  roundBet: number
}

export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'

export type PlayerAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'raise'; amount: number }  // amount = total bet this round
  | { type: 'all-in' }

export interface SidePot {
  amount: number
  eligiblePlayerIds: PlayerId[]
}

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
  sidePots: SidePot[]
  currentPlayerId: PlayerId | null
  dealerIndex: number        // index into players array
  bigBlind: number
  smallBlind: number
  currentBet: number         // amount to call
  minRaise: number           // minimum raise size
}

export interface HandResult {
  playerId: PlayerId
  amount: number
  handName: string           // e.g. 'Full House', '' if uncontested
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
