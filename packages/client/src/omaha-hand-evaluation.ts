// Omaha High hand evaluation — must use exactly 2 hole cards + 3 community cards.
import type { Card } from '@cpc/shared'
import type { Position } from './bot-types'
import type { VariantEvaluator, HandStrengthCategory, VariantHandAssessment, BoardTexture } from './bot-variant-evaluation'
import { getPloScores } from './bot-category-scores'
import { createDeck, evaluateOmahaHand } from '@cpc/poker-engine'

function positionStrengthAdjust(position: Position, tableSize: number): number {
  if (tableSize === 2) {
    return position === 'late' ? 3 : 0
  }
  const map: Record<Position, number> = {
    early: -8,
    middle: 0,
    late: 8,
    blinds: 3,
  }
  return map[position] ?? 0
}

export const omahaVariantEvaluator: VariantEvaluator = {
  variantId: 'omaha-high',
  evaluate(context) {
    const { ownCards, publicState, position } = context
    const communityCards = publicState.communityCards

    if (communityCards.length === 0) {
      const raiseCount = context.actionHistory.filter(
        e => e.type === 'PlayerActed' && e.action.type === 'raise'
      ).length
      const facingRaise = context.bettingContext.toCall > context.publicState.bigBlind
      return {
        variantId: this.variantId,
        handAssessment: preflopAssess(ownCards, facingRaise, raiseCount, position.category, position.tableSize),
        boardTexture: 'neutral' as const,
        categoryScores: getPloScores(context.archetypeId, false),
      }
    }

    const evalResult = evaluateOmahaHand(ownCards, communityCards)
    const rank = evalResult.rank

    const drawAnalysis = analyzeOmahaDraws(ownCards, communityCards)
    const drawQuality = calculateOmahaDrawQuality(drawAnalysis)
    const cleanOuts = calculateOmahaCleanOuts(drawAnalysis, rank)
    const nutPotential = assessOmahaNutPotential(rank, cleanOuts, communityCards.length)
    const vulnerability = calculateOmahaVulnerability(rank, cleanOuts, communityCards.length)
    const showdownValue = calculateOmahaShowdownValue(rank, drawQuality)
    const relativeStrength = calculateOmahaRelativeStrength(rank, cleanOuts)
    const isRiver = communityCards.length === 5
    const drawTypes = isRiver ? [] : identifyOmahaDrawTypes(drawAnalysis)
    const boardGotWorse = false
    const strength = calculateOmahaStrength(rank, drawQuality, cleanOuts, communityCards.length)
    const category = categorizeOmaha(rank, drawQuality, cleanOuts, communityCards)

    return {
      variantId: this.variantId,
      handAssessment: {
        category,
        rank,
        made: rank >= 2,
        relativeStrength,
        showdownValue,
        nutPotential,
        vulnerability,
        drawQuality,
        cleanOuts,
        blockerValue: 0,
        drawTypes,
        boardGotWorse,
        strength,
      },
      boardTexture: analyzeOmahaBoardTexture(communityCards),
      categoryScores: getPloScores(context.archetypeId, true),
    }
  },
}

const PLO_PREFLOP_THRESHOLDS = [
  { min: 75, category: 'premium' as HandStrengthCategory },
  { min: 55, category: 'strong' as HandStrengthCategory },
  { min: 25, category: 'good' as HandStrengthCategory },
  { min: 18, category: 'medium' as HandStrengthCategory },
  { min: 12, category: 'marginal' as HandStrengthCategory },
]

function preflopAssess(ownCards: Card[], facingRaise: boolean, raiseCount: number, position: Position, tableSize: number): VariantHandAssessment {
  const suitedCount = countSuitedGroups(ownCards)
  const connectedness = preflopConnectedness(ownCards)
  const highCardPoints = ownCards.reduce((sum, c) => sum + rankValue(c), 0)
  const aceCount = ownCards.filter(c => c.rank === 'A').length
  const hasPair = preflopHasAnyPair(ownCards)
  const doubleSuited = suitedCount >= 2
  const hasAce = aceCount > 0

  let strength = 7
  if (aceCount >= 2 && doubleSuited) strength += 30
  if (aceCount >= 1 && doubleSuited && connectedness >= 2) strength += 22
  else if (hasPair && highCardPoints >= 28 && doubleSuited) strength += 18
  else if (doubleSuited && connectedness >= 4 && highCardPoints >= 24) strength += 18
  else if (doubleSuited && hasAce) strength += 16
  else if (doubleSuited) strength += 12
  if (aceCount >= 2) strength += 12
  else if (hasAce && connectedness >= 3 && suitedCount >= 1) strength += 10
  else if (hasAce && highCardPoints >= 28) strength += 8
  else if (hasAce) strength += 4
  if (hasPair && highCardPoints >= 28) strength += 8
  if (connectedness >= 5 && highCardPoints >= 24) strength += 8
  else if (connectedness >= 4 && highCardPoints >= 24) strength += 6
  if (suitedCount >= 1 && connectedness >= 2 && highCardPoints >= 20) strength += 7
  else if (suitedCount >= 1 && hasAce && highCardPoints >= 22) strength += 4
  if (connectedness >= 4 && highCardPoints >= 22) strength += 4
  else if (connectedness >= 3 && highCardPoints >= 22) strength += 3
  strength = Math.min(95, strength)
  strength = Math.max(1, strength)

  if (facingRaise && raiseCount >= 1 && strength < 55) {
    strength = Math.max(1, strength - 16)
  }
  if (facingRaise && raiseCount >= 2 && strength < 55) {
    strength = Math.max(1, strength - 12)
  }

  const adjustedStrength = Math.max(1, Math.min(100, strength + positionStrengthAdjust(position, tableSize)))

  let category: HandStrengthCategory = 'weak'
  for (const t of PLO_PREFLOP_THRESHOLDS) {
    if (adjustedStrength >= t.min) { category = t.category; break }
  }

  return {
    category,
    rank: 0,
    made: false,
    relativeStrength: strength,
    showdownValue: 0,
    nutPotential: doubleSuited || (hasAce && connectedness >= 2) ? 'strong' : 'medium',
    vulnerability: 0,
    drawQuality: suitedCount + Math.min(connectedness, 3),
    cleanOuts: 0,
    blockerValue: aceCount > 0 ? aceCount * 3 : 0,
    drawTypes: [],
    boardGotWorse: false,
    strength,
  }
}

function categorizeOmaha(rank: number, drawQuality: number, cleanOuts: number, communityCards: Card[]): HandStrengthCategory {
  const strongDraw = drawQuality >= 6 || cleanOuts >= 12
  const boardPairRank = communityCards.length >= 3 ? findBoardPairRank(communityCards) : 0

  if (rank >= 9) return 'premium'
  if (rank >= 8) return 'premium'
  if (rank >= 7) return 'strong'
  if (rank >= 6) return strongDraw ? 'strong' : 'good'
  if (rank >= 5) return strongDraw ? 'good' : 'medium'
  if (rank >= 4) return 'good'
  if (rank >= 3) {
    if (boardPairRank > 0) return strongDraw ? 'medium' : (drawQuality >= 3 ? 'marginal' : 'weak')
    return strongDraw ? 'good' : (drawQuality >= 3 ? 'medium' : 'marginal')
  }
  if (rank >= 2) {
    if (strongDraw) return 'marginal'
    if (drawQuality >= 3 && boardPairRank === 0) return 'marginal'
    return 'weak'
  }
  return 'air'
}

function findBoardPairRank(communityCards: Card[]): number {
  const rankCounts = new Map<Card['rank'], number>()
  for (const c of communityCards) {
    rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1)
  }
  for (const [rank, count] of rankCounts) {
    if (count >= 2) return rankValue({ rank, suit: 'clubs' })
  }
  return 0
}

function calculateOmahaStrength(rank: number, drawQuality: number, cleanOuts: number, communityCount: number): number {
  let base = rank * 7
  if (rank >= 8) base = 78 + (rank - 8) * 10
  if (rank >= 7) base = 60 + (rank - 7) * 15
  if (rank >= 6) base = 42 + (rank - 6) * 12
  if (rank >= 4) base = 32 + (rank - 4) * 8

  const drawBonus = Math.min(20, drawQuality * 4 + cleanOuts * 1.5)
  return Math.min(100, Math.max(5, base + drawBonus))
}

function calculateOmahaRelativeStrength(rank: number, cleanOuts: number): number {
  if (rank >= 8) return 85 + (rank - 8) * 10
  if (rank >= 7) return 70 + (rank - 7) * 15
  if (rank >= 5) return 45 + (rank - 5) * 12
  if (rank >= 4) return 30 + (rank - 4) * 15
  return 15 + cleanOuts * 2
}

function calculateOmahaShowdownValue(rank: number, drawQuality: number): number {
  return rank * 8 + Math.min(20, drawQuality * 3)
}

function calculateOmahaVulnerability(rank: number, cleanOuts: number, communityCount: number): number {
  if (communityCount >= 4) return Math.min(80, rank * 12 + 20)
  return Math.min(90, rank * 10 + 30 - cleanOuts)
}

function assessOmahaNutPotential(rank: number, cleanOuts: number, communityCount: number): VariantHandAssessment['nutPotential'] {
  if (rank >= 9) return 'nuts'
  if (rank >= 8 && cleanOuts < 6) return 'near-nuts'
  if (rank >= 7 || cleanOuts >= 8) return 'strong'
  if (rank >= 5 || cleanOuts >= 4) return 'medium'
  return 'weak'
}

function calculateOmahaDrawQuality(draws: OmahaDrawAnalysis): number {
  const wrapCount = draws.straightOutCards.length

  let score = 0
  if (draws.nutFlushDraw) score += 6
  else if (draws.flushDrawSuits > 0) score += 3
  if (draws.secondFlushDraw) score += 2

  if (wrapCount >= 13) score += 8
  else if (wrapCount >= 8) score += 5
  else if (draws.straightOutRanks >= 2) score += 3
  else if (draws.straightOutRanks === 1) score += 1

  if (draws.flushOutCards.length > 0 && draws.straightOutCards.length > 0) score += 3

  return score
}

function calculateOmahaCleanOuts(draws: OmahaDrawAnalysis, rank: number): number {
  if (rank >= 9) return 0

  const uniqueOuts = new Set(
    [...draws.flushOutCards, ...draws.straightOutCards].map(cardKey),
  )
  return Math.min(25, uniqueOuts.size)
}

function identifyOmahaDrawTypes(draws: OmahaDrawAnalysis): string[] {
  const types: string[] = []

  if (draws.nutFlushDraw) types.push('nut-flush-draw')
  else if (draws.flushDrawSuits > 0) types.push('flush-draw')
  if (draws.secondFlushDraw) types.push('second-flush-draw')

  const wrapCount = draws.straightOutCards.length
  if (wrapCount >= 13) types.push('wrap-13+')
  else if (wrapCount >= 8) types.push('wrap-8+')
  else if (draws.straightOutRanks >= 2) types.push('oesd')
  else if (draws.straightOutRanks === 1) types.push('gutshot')

  if (draws.flushOutCards.length > 0 && draws.straightOutCards.length > 0) {
    types.push('combo-draw')
  }

  return types
}

function analyzeOmahaBoardTexture(communityCards: Card[]): BoardTexture {
  if (communityCards.length < 3) return 'neutral'
  const suits = new Set(communityCards.map(c => c.suit))
  const ranks = communityCards.map(c => rankValue(c)).sort((a, b) => a - b)
  let gaps = 0
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] - ranks[i - 1] <= 2) gaps++
  }
  if (suits.size <= 1) return 'wet'
  if (suits.size === 2 && gaps >= 2) return 'wet'
  if (suits.size === 3 && gaps >= 2) return 'wet'
  if (gaps >= 2) return 'dry'
  return 'neutral'
}

interface OmahaDrawAnalysis {
  straightOutCards: Card[]
  straightOutRanks: number
  flushOutCards: Card[]
  flushDrawSuits: number
  nutFlushDraw: boolean
  secondFlushDraw: boolean
}

function analyzeOmahaDraws(ownCards: Card[], communityCards: Card[]): OmahaDrawAnalysis {
  const empty: OmahaDrawAnalysis = {
    straightOutCards: [],
    straightOutRanks: 0,
    flushOutCards: [],
    flushDrawSuits: 0,
    nutFlushDraw: false,
    secondFlushDraw: false,
  }
  if (communityCards.length < 3 || communityCards.length >= 5) return empty

  const knownCards = new Set([...ownCards, ...communityCards].map(cardKey))
  const unseenCards = createDeck().filter(card => !knownCards.has(cardKey(card)))
  const hasMadeStraight = hasOmahaStraight(ownCards, communityCards)
  const hasMadeFlush = hasOmahaFlush(ownCards, communityCards)

  const straightOutCards = hasMadeStraight
    ? []
    : unseenCards.filter(card => hasOmahaStraight(ownCards, [...communityCards, card]))

  const flushOutCards: Card[] = []
  let flushDrawSuits = 0
  let nutFlushDraw = false
  let secondFlushDraw = false

  if (!hasMadeFlush) {
    for (const suit of ['clubs', 'diamonds', 'hearts', 'spades'] as const) {
      const suitedHoleCards = ownCards.filter(card => card.suit === suit)
      const suitedBoardCards = communityCards.filter(card => card.suit === suit)
      if (suitedHoleCards.length < 2 || suitedBoardCards.length !== 2) continue

      const suitedOuts = unseenCards.filter(card => card.suit === suit)
      if (suitedOuts.length === 0) continue
      flushOutCards.push(...suitedOuts)
      flushDrawSuits++

      const boardRanks = new Set(suitedBoardCards.map(rankValue))
      const availableRanks = Array.from({ length: 13 }, (_, index) => 14 - index)
        .filter(rank => !boardRanks.has(rank))
      const bestHoleRank = Math.max(...suitedHoleCards.map(rankValue))
      if (bestHoleRank === availableRanks[0]) {
        nutFlushDraw = true
      } else if (bestHoleRank === availableRanks[1]) {
        secondFlushDraw = true
      }
    }
  }

  return {
    straightOutCards,
    straightOutRanks: new Set(straightOutCards.map(card => card.rank)).size,
    flushOutCards,
    flushDrawSuits,
    nutFlushDraw,
    secondFlushDraw,
  }
}

function hasOmahaStraight(ownCards: Card[], communityCards: Card[]): boolean {
  if (ownCards.length < 2 || communityCards.length < 3) return false
  for (const holePair of combinations(ownCards, 2)) {
    for (const boardTrio of combinations(communityCards, 3)) {
      if (isFiveCardStraight([...holePair, ...boardTrio])) return true
    }
  }
  return false
}

function hasOmahaFlush(ownCards: Card[], communityCards: Card[]): boolean {
  if (ownCards.length < 2 || communityCards.length < 3) return false
  for (const holePair of combinations(ownCards, 2)) {
    if (holePair[0].suit !== holePair[1].suit) continue
    for (const boardTrio of combinations(communityCards, 3)) {
      if (boardTrio.every(card => card.suit === holePair[0].suit)) return true
    }
  }
  return false
}

function isFiveCardStraight(cards: Card[]): boolean {
  const ranks = new Set(cards.map(rankValue))
  if (ranks.has(14)) ranks.add(1)
  const sorted = [...ranks].sort((left, right) => left - right)
  for (let index = 0; index <= sorted.length - 5; index++) {
    if (sorted[index + 4] - sorted[index] === 4) return true
  }
  return false
}

function combinations<T>(values: readonly T[], count: number): T[][] {
  if (count === 0) return [[]]
  const result: T[][] = []
  for (let index = 0; index <= values.length - count; index++) {
    for (const rest of combinations(values.slice(index + 1), count - 1)) {
      result.push([values[index], ...rest])
    }
  }
  return result
}

function cardKey(card: Card): string {
  return `${card.rank}:${card.suit}`
}

function countSuitedGroups(cards: Card[]): number {
  const suitCounts = new Map<string, number>()
  for (const c of cards) {
    suitCounts.set(c.suit, (suitCounts.get(c.suit) ?? 0) + 1)
  }
  let groups = 0
  for (const count of suitCounts.values()) {
    if (count >= 2) groups++
    if (count >= 3) groups++
  }
  return groups
}

function preflopConnectedness(cards: Card[]): number {
  const values = cards.map(c => rankValue(c)).sort((a, b) => a - b)
  let connected = 0
  for (let i = 1; i < values.length; i++) {
    const gap = values[i] - values[i - 1]
    if (gap <= 1) connected += 2
    else if (gap <= 2) connected += 1
  }
  return connected
}

function preflopHasAnyPair(cards: Card[]): boolean {
  const seen = new Set<number>()
  for (const c of cards) {
    const v = rankValue(c)
    if (seen.has(v)) return true
    seen.add(v)
  }
  return false
}

function rankValue(card: Card): number {
  const map: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  }
  return map[card.rank] ?? 0
}
