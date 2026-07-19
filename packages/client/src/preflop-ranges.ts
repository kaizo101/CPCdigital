import type { Card, PublicGameState } from '@cpc/shared'
import type { Position } from './bot-types'

// Preflop situation types
export type PreflopSituation = 'unopened' | 'facing-open' | 'facing-3bet'

// Hand categories for ranges
export type StartingHand = {
  rank1: number  // 2-14 (2=A, 14=A)
  rank2: number
  suited: boolean
}

// Range tables: which hands to raise/call/fold in each situation and position
// Values: 'raise' | 'call' | 'fold'
export interface PreflopRange {
  raise: string[]  // Hand patterns like 'AA', 'AKs', 'QQ+'
  call: string[]
  fold: string[]
}

// TAG Preflop Ranges (6-max) - Raise-heavy, ~27% VPIP, ~22% PFR
export const TAG_PREFLOP_RANGES: Record<PreflopSituation, Record<Position, PreflopRange>> = {
  unopened: {
    early: {
      raise: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', 'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'AJo', 'ATs', 'ATo', 'KQs', 'KQo', 'KJs', 'KJo', 'KTs', 'QJs', 'QJo', 'QTs', 'JTs'],
      call: ['66', '55', 'A9s', 'A8s', 'K9s', 'K8s', 'QJs', 'Q9s', 'J9s', 'T9s', '98s'],
      fold: []
    },
    middle: {
      raise: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', 'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'AJo', 'ATs', 'ATo', 'A9s', 'KQs', 'KQo', 'KJs', 'KJo', 'KTs', 'QJs', 'QJo', 'QTs', 'JTs', 'T9s', '98s'],
      call: ['44', '33', '22', 'A8s', 'A7s', 'A6s', 'A5s', 'K9s', 'K8s', 'Q9s', 'Q8s', 'J9s', 'J8s', 'T8s', '97s', '87s', '76s', '65s'],
      fold: []
    },
    late: {
      raise: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', 'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'AJo', 'ATs', 'ATo', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'KQs', 'KQo', 'KJs', 'KJo', 'KTs', 'KTo', 'K9s', 'QJs', 'QJo', 'QTs', 'Q9s', 'JTs', 'J9s', 'T9s', 'T8s', '98s', '97s', '87s', '76s', '65s'],
      call: ['22', 'A4s', 'A3s', 'A2s', 'K8s', 'K7s', 'Q8s', 'J8s', 'T7s', '96s', '86s', '75s', '64s', '54s'],
      fold: []
    },
    blinds: {
      raise: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', 'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'AJo', 'ATs', 'ATo', 'KQs', 'KQo', 'KJs', 'KJo', 'KTs', 'QJs', 'QJo', 'QTs', 'JTs', 'T9s', '98s'],
      call: ['33', '22', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'K9s', 'K8s', 'Q9s', 'Q8s', 'J9s', 'J8s', 'T8s', '97s', '87s', '76s', '65s', '54s'],
      fold: []
    }
  },

  'facing-open': {
    early: {
      raise: ['AA', 'KK', 'QQ', 'AKs', 'AKo'],
      call: ['JJ', 'TT', '99', '88', 'AQs', 'AQo', 'AJs', 'KQs'],
      fold: []
    },
    middle: {
      raise: ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo'],
      call: ['TT', '99', '88', '77', 'AQs', 'AQo', 'AJs', 'AJo', 'ATs', 'KQs', 'KJs', 'QJs'],
      fold: []
    },
    late: {
      raise: ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs'],
      call: ['99', '88', '77', '66', '55', 'AQo', 'AJs', 'AJo', 'ATs', 'KQs', 'KJs', 'QJs', 'JTs'],
      fold: []
    },
    blinds: {
      raise: ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs'],
      call: ['99', '88', '77', '66', '55', '44', '33', '22', 'AQo', 'AJs', 'AJo', 'ATs', 'ATo', 'A9s', 'A8s', 'KQs', 'KJs', 'KTs', 'QJs', 'QTs', 'JTs', 'T9s', '98s', '87s'],
      fold: []
    }
  },

  'facing-3bet': {
    early: {
      raise: ['AA', 'KK'],
      call: ['QQ', 'JJ', 'AKs'],
      fold: []
    },
    middle: {
      raise: ['AA', 'KK', 'QQ'],
      call: ['JJ', 'TT', 'AKs', 'AQs'],
      fold: []
    },
    late: {
      raise: ['AA', 'KK', 'QQ', 'AKs'],
      call: ['JJ', 'TT', '99', 'AQs', 'AJs', 'KQs'],
      fold: []
    },
    blinds: {
      raise: ['AA', 'KK', 'QQ'],
      call: ['JJ', 'TT', '99', '88', 'AKs', 'AQs', 'AJs', 'KQs'],
      fold: []
    }
  }
}

// Convert cards to hand pattern string
export function cardsToHandPattern(cards: [Card, Card]): string {
  const rank1 = cardToNumber(cards[0].rank)
  const rank2 = cardToNumber(cards[1].rank)
  const suited = cards[0].suit === cards[1].suit

  const high = Math.max(rank1, rank2)
  const low = Math.min(rank1, rank2)

  const highStr = numberToCard(high)
  const lowStr = numberToCard(low)

  if (high === low) {
    return highStr + lowStr  // Pair: 'AA', 'KK', etc.
  }

  return highStr + lowStr + (suited ? 's' : 'o')
}

function cardToNumber(rank: string): number {
  const ranks: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  }
  return ranks[rank] ?? 0
}

function numberToCard(num: number): string {
  const cards: Record<number, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
    10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
  }
  return cards[num] ?? '?'
}

// Check if a hand pattern matches a range pattern
function handMatchesPattern(hand: string, pattern: string): boolean {
  // Exact match
  if (hand === pattern) return true

  // Pair range with + (e.g., '99+' matches 99, TT, JJ, QQ, KK, AA)
  if (pattern.endsWith('+') && pattern.length === 3 && pattern[0] === pattern[1]) {
    const minRank = cardToNumber(pattern[0])
    const handRank = cardToNumber(hand[0])
    return hand[0] === hand[1] && handRank >= minRank
  }

  // Suited connector range (e.g., '87s+' matches 87s, 98s, T9s, JTs, QJs, KQs, AKs)
  if (pattern.endsWith('s+') && pattern.length === 4) {
    const high = cardToNumber(pattern[0])
    const low = cardToNumber(pattern[1])
    if (high - low !== 1) return false

    const handHigh = cardToNumber(hand[0])
    const handLow = cardToNumber(hand[1])
    const handSuited = hand.endsWith('s')

    return handSuited && handHigh - handLow === 1 && handHigh >= high
  }

  return false
}

// Determine action from range tables
export function getPreflopAction(
  cards: [Card, Card],
  position: Position,
  situation: PreflopSituation
): 'raise' | 'call' | 'fold' {
  const hand = cardsToHandPattern(cards)
  const range = TAG_PREFLOP_RANGES[situation][position]

  // Check raise range
  for (const pattern of range.raise) {
    if (handMatchesPattern(hand, pattern)) {
      return 'raise'
    }
  }

  // Check call range
  for (const pattern of range.call) {
    if (handMatchesPattern(hand, pattern)) {
      return 'call'
    }
  }

  // Default: fold
  return 'fold'
}

// Determine preflop situation
export function getPreflopSituation(
  state: Pick<PublicGameState, 'currentBet' | 'bigBlind'>,
  position: Position,
): PreflopSituation {
  const currentBet = state.currentBet
  const bigBlind = state.bigBlind

  // No raise yet
  if (currentBet <= bigBlind) {
    return 'unopened'
  }

  // Facing a raise (2-4x BB)
  if (currentBet <= bigBlind * 4) {
    return 'facing-open'
  }

  // Facing a 3-bet (5x+ BB)
  return 'facing-3bet'
}
