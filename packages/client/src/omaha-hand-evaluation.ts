// Omaha High hand evaluation — must use exactly 2 hole cards + 3 community cards.
import type { Card } from '@cpc/shared'
import type { Position } from './bot-types'
import type { VariantEvaluator, HandStrengthCategory, VariantHandAssessment, BoardTexture } from './bot-variant-evaluation'
import { getPloScores } from './bot-category-scores'
import { evaluateOmahaHand } from '@cpc/poker-engine'

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

    const drawQuality = calculateOmahaDrawQuality(ownCards, communityCards)
    const cleanOuts = calculateOmahaCleanOuts(ownCards, communityCards, rank)
    const nutPotential = assessOmahaNutPotential(rank, cleanOuts, communityCards.length)
    const vulnerability = calculateOmahaVulnerability(rank, cleanOuts, communityCards.length)
    const showdownValue = calculateOmahaShowdownValue(rank, drawQuality)
    const relativeStrength = calculateOmahaRelativeStrength(rank, cleanOuts)
    const drawTypes = identifyOmahaDrawTypes(ownCards, communityCards, rank)
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

function calculateOmahaDrawQuality(ownCards: Card[], communityCards: Card[]): number {
  if (communityCards.length < 3) return 0

  const flushSuits = countFlushDraws(ownCards, communityCards)
  const wrapCount = countWrapDraws(ownCards, communityCards)
  const straightDraws = identifyStraightDraws(ownCards, communityCards)

  let score = 0
  if (flushSuits.nutFlushDraw) score += 6
  else if (flushSuits.flushDraw > 0) score += 3
  if (flushSuits.secondFlushDraw) score += 2

  if (wrapCount >= 13) score += 8
  else if (wrapCount >= 8) score += 5
  else if (straightDraws.oeSd > 0) score += 3
  else if (straightDraws.gutshot > 0) score += 1

  if (flushSuits.flushDraw > 0 && (wrapCount >= 8 || straightDraws.oeSd > 0)) score += 3

  return score
}

function calculateOmahaCleanOuts(ownCards: Card[], communityCards: Card[], rank: number): number {
  if (communityCards.length < 3) return 0
  if (rank >= 9) return 0

  const flushSuits = countFlushDraws(ownCards, communityCards)
  const wrapCount = countWrapDraws(ownCards, communityCards)

  let outs = 0
  if (flushSuits.nutFlushDraw) outs += 9
  else outs += flushSuits.flushDraw * 4

  outs += Math.min(13, wrapCount)

  return Math.min(25, outs)
}

function identifyOmahaDrawTypes(ownCards: Card[], communityCards: Card[], rank: number): string[] {
  const types: string[] = []
  const flushSuits = countFlushDraws(ownCards, communityCards)

  if (flushSuits.nutFlushDraw) types.push('nut-flush-draw')
  else if (flushSuits.flushDraw > 0) types.push('flush-draw')
  if (flushSuits.secondFlushDraw) types.push('second-flush-draw')

  const wrapCount = countWrapDraws(ownCards, communityCards)
  if (wrapCount >= 13) types.push('wrap-13+')
  else if (wrapCount >= 8) types.push('wrap-8+')
  else {
    const straight = identifyStraightDraws(ownCards, communityCards)
    if (straight.oeSd > 0) types.push('oesd')
    if (straight.gutshot > 0) types.push('gutshot')
  }

  if (flushSuits.flushDraw > 0 && (wrapCount >= 8 || types.includes('oesd'))) types.push('combo-draw')

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

function countFlushDraws(ownCards: Card[], communityCards: Card[]) {
  const suitCounts = new Map<string, { count: number; hasAce: boolean }>()
  for (const c of [...communityCards, ...ownCards]) {
    const entry = suitCounts.get(c.suit) ?? { count: 0, hasAce: false }
    entry.count++
    if (c.rank === 'A') entry.hasAce = true
    suitCounts.set(c.suit, entry)
  }

  let nutFlushDraw = false
  let flushDraw = 0
  let secondFlushDraw = false

  for (const [, info] of suitCounts) {
    if (info.count >= 4) {
      if (info.hasAce) nutFlushDraw = true
      else flushDraw++
    } else if (info.count === 3 && info.hasAce) {
      secondFlushDraw = true
    }
  }

  return { nutFlushDraw, flushDraw, secondFlushDraw }
}

function countWrapDraws(ownCards: Card[], communityCards: Card[]): number {
  const allValues = [...ownCards, ...communityCards].map(c => rankValue(c))
  const unique = [...new Set(allValues)].sort((a, b) => a - b)
  let wrapOuts = 0

  const generateCards: number[] = []
  for (let i = 1; i <= 14; i++) {
    if (!allValues.includes(i) || i === 14) generateCards.push(i)
  }

  for (const card of generateCards) {
    const testValues = [...unique, card].sort((a, b) => a - b)
    if (hasStraight(testValues, 5)) wrapOuts++
  }

  return Math.min(20, wrapOuts)
}

function identifyStraightDraws(ownCards: Card[], communityCards: Card[]) {
  const allValues = [...ownCards, ...communityCards].map(c => rankValue(c))
  const unique = [...new Set(allValues)].sort((a, b) => a - b)

  let oeSd = 0
  let gutshot = 0

  for (let i = 1; i <= 14; i++) {
    const testValues = [...unique, i].sort((a, b) => a - b)
    if (hasStraight(testValues, 5)) {
      const needed = i
      const hasBothSides = unique.includes(needed - 1) && unique.includes(needed + 1)
      if (hasBothSides) oeSd++
      else gutshot++
    }
  }

  return { oeSd: Math.min(2, oeSd), gutshot: Math.min(4, gutshot) }
}

function hasStraight(sortedValues: number[], length: number): boolean {
  let consecutive = 1
  for (let i = 1; i < sortedValues.length; i++) {
    if (sortedValues[i] === sortedValues[i - 1] + 1) {
      consecutive++
      if (consecutive >= length) return true
    } else if (sortedValues[i] !== sortedValues[i - 1]) {
      consecutive = 1
    }
  }
  return false
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
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  }
  return map[card.rank] ?? 0
}
