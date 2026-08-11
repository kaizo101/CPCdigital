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
  isSittingOut: boolean
  status: PlayerStatus
  /** Chips bet in the current betting round (for UI display) */
  roundBet: number
}

export type GameLifecyclePhase = 'waiting' | 'showdown'
export type ActiveGamePhase = string
export type GamePhase = GameLifecyclePhase | ActiveGamePhase

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

export interface RaiseBounds {
  minAmount: number
  maxAmount: number
}

export interface LegalActions {
  fold: boolean
  check: boolean
  /** Actual chips paid by a call; capped by the player's remaining stack. */
  callAmount: number | null
  /** Full-raise bounds expressed as total chips bet on the current street. */
  raise: RaiseBounds | null
  /** Total street bet after moving all remaining chips in, when legal. */
  allInAmount: number | null
}

export interface BettingContext {
  playerId: PlayerId
  /** Pot including all chips currently in front of players. */
  totalPot: number
  /** Chips required to fully match the current bet. */
  toCall: number
  /** Actual payable call amount, capped by the remaining stack. */
  callAmount: number
  potOdds: number
  toCallPotRatio: number
  /** Total street bet for a pot-sized raise, before stack/limit clamping. */
  potRaiseTo: number
  minRaiseTo: number
  maxRaiseTo: number
  playerStack: number
  /** Player stack at the beginning of the hand, before blinds or voluntary action. */
  playerStartingStack?: number
  /** Calls, bets and raises already paid this hand; forced blinds are excluded. */
  voluntaryHandContribution?: number
  /** Remaining stack effective against the deepest live opponent. */
  effectiveStack: number
  spr: number
  legalActions: LegalActions
}

export interface TableOptions {
  bigBlind: number
  smallBlind: number
  maxPlayers: number
  startingChips: number
  turnTimeoutMs?: number   // default 30 000
  /** Optional deterministic session seed for tests and reproducible simulations. */
  seed?: string | number
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

/** Public table state. It must never contain the deck, unrevealed cards, or private analysis data. */
export interface PublicGameState {
  variantId: string
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
  /** Whether the current player still has the right and chips to increase the bet. */
  canRaise: boolean
  /** Engine-derived decision data and legal actions for currentPlayerId. */
  bettingContext: BettingContext | null
  /** Unix timestamp (ms) when the current player's turn expires. Null when no active turn. */
  turnDeadline: number | null
}

/** Backwards-compatible name for consumers that already treat GameState as public. */
export type GameState = PublicGameState

/** Private view delivered to exactly one authenticated/local player. */
export interface PlayerGameView {
  state: PublicGameState
  ownCards: Card[] | null
}

export interface HandResult {
  playerId: PlayerId
  amount: number
  handName: string           // e.g. 'Full House', '' if uncontested
}

export interface HandPlayerSnapshot {
  playerId: PlayerId
  seatIndex: number
  startingChips: number
}

/** Public table information visible to the acting player at decision time. */
export interface DecisionPlayerState {
  playerId: PlayerId
  seatIndex: number
  chips: number
  roundBet: number
  status: PlayerStatus
  isDealer: boolean
}

export interface DecisionVisibleState {
  variantId: string
  phase: ActiveGamePhase
  communityCards: Card[]
  players: DecisionPlayerState[]
  sidePots: SidePot[]
  dealerId: PlayerId
  pot: number
  currentBet: number
  smallBlind: number
  bigBlind: number
}

export interface DecisionPosition {
  seatIndex: number
  dealerSeatIndex: number
  /** Zero is the dealer/button; increases clockwise across players dealt into the hand. */
  positionsFromDealer: number
  tableSize: number
}

export type DecisionActionHistoryEvent =
  | Extract<HandEvent, { type: 'BlindPosted' }>
  | Extract<HandEvent, { type: 'PlayerActed' }>

/**
 * Private analysis record. It contains only the acting player's hole cards and
 * must never be included in public hand-history or game-state broadcasts.
 */
export interface DecisionSnapshot {
  decisionIndex: number
  playerId: PlayerId
  visibleState: DecisionVisibleState
  ownCards: Card[]
  bettingContext: BettingContext
  position: DecisionPosition
  actionHistory: DecisionActionHistoryEvent[]
  chosenAction: PlayerAction
  source: 'player' | 'forced'
}

export type HandEvent =
  | {
      type: 'HandStarted'
      variantId: string
      dealerId: PlayerId
      smallBlind: number
      bigBlind: number
      players: HandPlayerSnapshot[]
    }
  | {
      type: 'BlindPosted'
      phase: ActiveGamePhase
      playerId: PlayerId
      amount: number
      totalBet: number
      blindType: 'small' | 'big'
    }
  | {
      type: 'PlayerActed'
      phase: ActiveGamePhase
      playerId: PlayerId
      action: PlayerAction
      /** Chips actually committed by this action. */
      amount: number
      /** Player's total contribution on this street after the action. */
      totalBet: number
      /** Full amount faced before the action; may exceed a short stack's actual call. */
      toCall: number
      currentBetBefore: number
      /** Pot including chips still in front of players after the action. */
      potAfter: number
      source: 'player' | 'forced'
    }
  | {
      type: 'CommunityCardDealt'
      phase: ActiveGamePhase
      cards: Card[]
    }
  | {
      type: 'UncalledBetReturned'
      phase: ActiveGamePhase
      playerId: PlayerId
      amount: number
    }
  | { type: 'CardsRevealed'; playerId: PlayerId; cards: Card[] }
  | {
      type: 'PotAwarded'
      potIndex: number
      potType: 'main' | 'side'
      playerId: PlayerId
      amount: number
      handName: string
      isSplit: boolean
    }
  | {
      type: 'HandEnded'
      reason: 'showdown' | 'uncontested'
      totalPot: number
      results: HandResult[]
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

// ---------------------------------------------------------------------------
// Hand history & session stats
// ---------------------------------------------------------------------------

export type HandReplayEvent =
  | { type: 'HandStarted'; variantId: string; dealerName: string; smallBlind: number; bigBlind: number; players: { playerName: string; seatIndex: number; startingChips: number }[] }
  | { type: 'BlindPosted'; phase: ActiveGamePhase; playerName: string; amount: number; totalBet: number; blindType: 'small' | 'big' }
  | { type: 'PlayerActed'; phase: ActiveGamePhase; playerName: string; action: string; amount: number; totalBet: number; toCall: number; currentBetBefore: number; potAfter: number; source: 'player' | 'forced' }
  | { type: 'CommunityCardDealt'; phase: ActiveGamePhase; cards: Card[] }
  | { type: 'UncalledBetReturned'; phase: ActiveGamePhase; playerName: string; amount: number }
  | { type: 'CardsRevealed'; playerName: string; cards: Card[] }
  | { type: 'PotAwarded'; potIndex: number; potType: 'main' | 'side'; playerName: string; amount: number; handName: string; isSplit: boolean }
  | { type: 'HandEnded'; reason: 'showdown' | 'uncontested'; totalPot: number; results: { playerName: string; amount: number; handName: string }[] }

export interface HandSummary {
  id: number
  handNumber: number
  pot: number
  timestamp: number
  results: { playerName: string; amount: number; handName: string }[]
}

export interface HandRecord extends HandSummary {
  initialPlayers: { id: string; name: string; chips: number }[]
  events: HandReplayEvent[]
}

export interface SessionStats {
  playerId: string
  playerName: string
  handsPlayed: number
  vpipHands: number   // voluntarily put chips in preflop
  vpip: number        // vpipHands / handsPlayed × 100 (percentage)
  chipsDelta: number  // net gain/loss this session
}
