import type { Card, PublicGameState } from '@cpc/shared'
import type { Position } from './bot-types'
import { params } from './bot-params'

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

interface RangeCoverage {
  raise: number
  vpip: number
}

type CoverageProfile = Record<PreflopSituation, Record<Position, RangeCoverage>>

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
  cards: readonly Card[],
  position: Position,
  situation: PreflopSituation,
  tableSize: number = 6,
  rangeFactor: number = 1,
  raiseRangeFactor: number = rangeFactor,
): 'raise' | 'call' | 'fold' {
  const hand = cardsToHandPattern(cards as [Card, Card])
  const range = TAG_PREFLOP_RANGES[situation][position]
  const baseCoverage = getTableAdjustedCoverage(position, situation, tableSize)
  const pressureExponent = params.preflop.pressureExponent[situation]
  const situationalRangeFactor = Math.pow(Math.max(0, rangeFactor), pressureExponent)
  const situationalRaiseRangeFactor = Math.pow(Math.max(0, raiseRangeFactor), pressureExponent)
  const coverage = {
    raise: Math.min(100, baseCoverage.raise * situationalRaiseRangeFactor),
    vpip: Math.min(100, baseCoverage.vpip * situationalRangeFactor),
  }
  const percentile = getStartingHandPercentile(cards as [Card, Card])

  // Keep the curated core intact, then widen it smoothly as the table gets shorter.
  const keepCuratedRaiseCore = situationalRaiseRangeFactor >= 1
  const keepCuratedCallCore = situationalRangeFactor >= 1
  if (keepCuratedRaiseCore && range.raise.some(pattern => handMatchesPattern(hand, pattern))) return 'raise'
  if (percentile <= coverage.raise) return 'raise'

  if (keepCuratedCallCore && range.call.some(pattern => handMatchesPattern(hand, pattern))) return 'call'
  if (percentile <= coverage.vpip) return 'call'

  return 'fold'
}

const FULL_RING_COVERAGE: CoverageProfile = params.coverage.fullRing as CoverageProfile

const SIX_MAX_COVERAGE: CoverageProfile = params.coverage.sixMax as CoverageProfile

const HEADS_UP_COVERAGE: CoverageProfile = params.coverage.headsUp as CoverageProfile

export function getTableAdjustedCoverage(
  position: Position,
  situation: PreflopSituation,
  tableSize: number,
): RangeCoverage {
  const clampedSize = Math.max(2, Math.min(9, Math.round(tableSize)))
  if (clampedSize === 6) return { ...SIX_MAX_COVERAGE[situation][position] }

  if (clampedSize < 6) {
    const shortHandedWeight = (6 - clampedSize) / 4
    return interpolateCoverage(
      SIX_MAX_COVERAGE[situation][position],
      HEADS_UP_COVERAGE[situation][position],
      shortHandedWeight,
    )
  }

  const fullRingWeight = (clampedSize - 6) / 3
  return interpolateCoverage(
    SIX_MAX_COVERAGE[situation][position],
    FULL_RING_COVERAGE[situation][position],
    fullRingWeight,
  )
}

function interpolateCoverage(from: RangeCoverage, to: RangeCoverage, weight: number): RangeCoverage {
  return {
    raise: from.raise + (to.raise - from.raise) * weight,
    vpip: from.vpip + (to.vpip - from.vpip) * weight,
  }
}

interface RankedStartingHand {
  score: number
  combinations: number
}

const RANKED_STARTING_HANDS: RankedStartingHand[] = buildRankedStartingHands()
const STARTING_HAND_COMBINATIONS = RANKED_STARTING_HANDS
  .reduce((sum, hand) => sum + hand.combinations, 0)

/** Approximate percentage of random starting-card combinations at least this strong. */
export function getStartingHandPercentile(cards: [Card, Card]): number {
  const score = scoreStartingHand(cards)
  const strongerCombinations = RANKED_STARTING_HANDS
    .filter(hand => hand.score >= score)
    .reduce((sum, hand) => sum + hand.combinations, 0)
  return (strongerCombinations / STARTING_HAND_COMBINATIONS) * 100
}

function buildRankedStartingHands(): RankedStartingHand[] {
  const hands: RankedStartingHand[] = []
  for (let high = 14; high >= 2; high--) {
    for (let low = high; low >= 2; low--) {
      if (high === low) {
        hands.push({ score: scoreRanks(high, low, false), combinations: 6 })
      } else {
        hands.push({ score: scoreRanks(high, low, true), combinations: 4 })
        hands.push({ score: scoreRanks(high, low, false), combinations: 12 })
      }
    }
  }
  return hands
}

function scoreStartingHand(cards: [Card, Card]): number {
  const first = cardToNumber(cards[0].rank)
  const second = cardToNumber(cards[1].rank)
  return scoreRanks(
    Math.max(first, second),
    Math.min(first, second),
    cards[0].suit === cards[1].suit,
  )
}

function scoreRanks(high: number, low: number, suited: boolean): number {
  if (high === low) return 42 + high * 3.5

  const gap = high - low - 1
  const connectedBonus = gap <= 0 ? 5 : gap === 1 ? 3 : gap === 2 ? 1 : 0
  const gapPenalty = Math.max(0, gap - 2) * 2
  const broadwayBonus = high >= 10 && low >= 10 ? 5 : 0
  const aceBonus = high === 14 ? 3 : 0
  return high * 4 + low * 1.7 + (suited ? 4 : 0)
    + connectedBonus + broadwayBonus + aceBonus - gapPenalty
}

// Determine preflop situation
export function getPreflopSituation(
  state: Pick<PublicGameState, 'currentBet' | 'bigBlind'>,
  position: Position,
  preflopRaiseCount?: number,
): PreflopSituation {
  if (preflopRaiseCount != null) {
    if (preflopRaiseCount <= 0) return 'unopened'
    if (preflopRaiseCount === 1) return 'facing-open'
    return 'facing-3bet'
  }

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
