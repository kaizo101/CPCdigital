// Omaha High hand evaluation — must use exactly 2 hole cards + 3 community cards.
import type { Card } from '@cpc/shared'
import type { VariantEvaluator, HandStrengthCategory, NutPotential, VariantHandAssessment, BoardTexture } from './bot-variant-evaluation'
import { getPloScores, type PloStreet } from './bot-category-scores'
import { createDeck, evaluateOmahaHand } from '@cpc/poker-engine'

export const omahaVariantEvaluator: VariantEvaluator = {
  variantId: 'omaha-high',
  evaluate(context) {
    const { ownCards, publicState, position } = context
    const communityCards = publicState.communityCards

    if (communityCards.length === 0) {
      return {
        variantId: this.variantId,
        handAssessment: preflopAssess(ownCards),
        boardTexture: 'neutral' as const,
        categoryScores: getPloScores(context.archetypeId, 'preflop', position.tableSize),
      }
    }

    const evalResult = evaluateOmahaHand(ownCards, communityCards)
    const rank = evalResult.rank

    const drawAnalysis = analyzeOmahaDraws(ownCards, communityCards)
    const drawQuality = calculateOmahaDrawQuality(drawAnalysis)
    const cleanOuts = calculateOmahaCleanOuts(drawAnalysis, rank, ownCards, communityCards)
    const nutPotential = assessOmahaNutPotential(evalResult, communityCards, cleanOuts)
    const vulnerability = calculateOmahaVulnerability(rank, cleanOuts, communityCards.length)
    const showdownValue = calculateOmahaShowdownValue(rank, drawQuality)
    const relativeStrength = calculateOmahaRelativeStrength(rank, cleanOuts)
    const isRiver = communityCards.length === 5
    const drawTypes = isRiver ? [] : identifyOmahaDrawTypes(drawAnalysis)
    const boardGotWorse = omahaBoardGotMoreDangerous(communityCards, rank)
    const strength = calculateOmahaStrength(rank, drawQuality, cleanOuts, communityCards.length)
    const category = categorizeOmaha(rank, drawQuality, cleanOuts, communityCards)
    const street: PloStreet = context.publicState.phase === 'river'
      ? 'river'
      : context.publicState.phase === 'turn'
        ? 'turn'
        : 'flop'

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
      categoryScores: getPloScores(context.archetypeId, street, position.tableSize),
    }
  },
}

const PLO_PREFLOP_THRESHOLDS = [
  { min: 75, category: 'premium' as HandStrengthCategory },
  { min: 55, category: 'strong' as HandStrengthCategory },
  { min: 36, category: 'good' as HandStrengthCategory },
  { min: 26, category: 'medium' as HandStrengthCategory },
  { min: 16, category: 'marginal' as HandStrengthCategory },
]

function preflopAssess(ownCards: Card[]): VariantHandAssessment {
  const suitProfile = analyzePreflopSuits(ownCards)
  const rankProfile = analyzePreflopRanks(ownCards)
  const aceCount = ownCards.filter(c => c.rank === 'A').length
  const pairScore = calculatePreflopPairScore(rankProfile.rankCounts)
  const highCardScore = ownCards.reduce(
    (sum, card) => sum + Math.max(0, rankValue(card) - 8),
    0,
  )

  let strength = 5
  strength += pairScore
  strength += preflopSuitScore(suitProfile)
  strength += highCardScore
  strength += preflopConnectionScore(rankProfile)
  strength -= rankProfile.danglers * 4
  strength = Math.max(1, Math.min(95, strength))

  let category: HandStrengthCategory = 'weak'
  for (const t of PLO_PREFLOP_THRESHOLDS) {
    if (strength >= t.min) { category = t.category; break }
  }

  return {
    category,
    rank: 0,
    made: false,
    relativeStrength: strength,
    showdownValue: 0,
    nutPotential: aceCount >= 2 || suitProfile.nutSuitCount > 0 || rankProfile.maxStraightWindowOverlap === 4
      ? 'strong'
      : 'medium',
    vulnerability: 0,
    drawQuality: suitProfile.usableSuitCount + Math.min(rankProfile.adjacentConnections, 3),
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

interface PokerSolverCard {
  rank: number
  suit: string
}

function parsePokerSolverCards(cards: string[]): PokerSolverCard[] {
  const rankMap: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  }
  return cards.map(c => ({
    rank: rankMap[c[0]] ?? 0,
    suit: c[1],
  }))
}

function assessOmahaNutPotential(
  evalResult: { rank: number; cards: string[] },
  communityCards: Card[],
  cleanOuts: number,
): NutPotential {
  const { rank, cards } = evalResult
  if (rank >= 9) return 'nuts'
  if (rank === 8) return cleanOuts < 6 ? 'near-nuts' : 'strong'

  const handCards = parsePokerSolverCards(cards)
  const boardRanks = new Set(communityCards.map(rankValue))

  if (rank === 7) {
    const rankCounts = new Map<number, number>()
    for (const c of handCards) rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1)
    let tripsRank = 0, pairRank = 0
    for (const [r, count] of rankCounts) {
      if (count >= 3) tripsRank = r
      else if (count >= 2) pairRank = r
    }
    const maxBoardRank = Math.max(0, ...boardRanks)
    if (tripsRank >= maxBoardRank && pairRank >= 10) return 'near-nuts'
    if (tripsRank >= 12) return 'strong'
    if (tripsRank <= 7) return 'weak'
    return 'medium'
  }

  if (rank === 6) {
    const flushSuit = handCards[0].suit
    const boardFlushCards = communityCards.filter(c => cardSuitChar(c) === flushSuit)
    const highestBoardRank = boardFlushCards.reduce((max, c) => Math.max(max, rankValue(c)), 0)
    const handFlushRanks = handCards.filter(c => c.suit === flushSuit).map(c => c.rank)
    const maxHandRank = Math.max(...handFlushRanks)

    if (maxHandRank === 14) return 'near-nuts'
    if (highestBoardRank === 14) return maxHandRank >= 13 ? 'strong' : 'medium'
    if (maxHandRank >= 13) return 'strong'
    return 'medium'
  }

  if (rank === 5) {
    const ranks = handCards.map(c => c.rank).sort((a, b) => b - a)
    const nutTop = findNutStraightTop([...boardRanks])
    const myTop = ranks[0]
    if (myTop >= nutTop) return nutTop >= 13 ? 'strong' : 'medium'
    if (myTop >= nutTop - 2) return 'medium'
    return 'weak'
  }

  if (rank === 4) {
    const rankCounts = new Map<number, number>()
    for (const c of handCards) rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1)
    let setRank = 0
    for (const [r, count] of rankCounts) if (count >= 3) setRank = r
    const maxBoardRank = Math.max(0, ...boardRanks)
    if (setRank >= 13) return 'strong'
    if (setRank >= maxBoardRank - 1) return 'medium'
    return 'weak'
  }

  if (rank === 3) {
    const rankCounts = new Map<number, number>()
    for (const c of handCards) rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1)
    const pairRanks = [...rankCounts.entries()]
      .filter(([, c]) => c >= 2).map(([r]) => r).sort((a, b) => b - a)
    if (pairRanks[0] >= 12 && pairRanks[1] >= 10) return 'medium'
    return 'weak'
  }

  if (cleanOuts >= 8) return 'strong'
  if (cleanOuts >= 4) return 'medium'
  return 'weak'
}

function cardSuitChar(card: Card): string {
  return card.suit[0]
}

function findNutStraightTop(boardRanks: number[]): number {
  const ranks = Array.from({ length: 13 }, (_, i) => i + 2)
  const available = new Set(ranks)
  let best = 0
  for (let i = 13; i >= 4; i--) {
    if (
      available.has(i) && available.has(i - 1) && available.has(i - 2)
      && available.has(i - 3) && available.has(i - 4)
    ) {
      best = i
      break
    }
  }
  if (available.has(14) && available.has(5) && available.has(4) && available.has(3) && available.has(2)) {
    best = Math.max(best, 5)
  }
  return best
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

function calculateOmahaCleanOuts(
  draws: OmahaDrawAnalysis,
  rank: number,
  ownCards: Card[],
  communityCards: Card[],
): number {
  if (rank >= 9) return 0

  const knownCards = new Set([...ownCards, ...communityCards].map(cardKey))
  const unseenCards = createDeck().filter(card => !knownCards.has(cardKey(card)))
  const boardRanks = communityCards.map(rankValue)
  const boardHasPair = new Set(boardRanks).size < boardRanks.length

  const filteredFlushOuts = draws.flushOutCards.filter(out => {
    if (boardRanks.includes(rankValue(out))) return false

    if (!draws.nutFlushDraw) {
      const suit = out.suit
      const bestHoleRank = Math.max(0, ...ownCards.filter(c => c.suit === suit).map(rankValue))
      const bestBoardRank = Math.max(0, ...communityCards.filter(c => c.suit === suit).map(rankValue))

      if (bestBoardRank > bestHoleRank) return false

      const unseenHigher = unseenCards.filter(c => c.suit === suit && rankValue(c) > bestHoleRank).length
      if (unseenHigher >= 3) return false
    }
    return true
  })

  const filteredStraightOuts = draws.straightOutCards.filter(out => {
    if (boardHasPair && boardRanks.includes(rankValue(out))) return false
    return !isDominatedStraightOut(ownCards, communityCards, out)
  })

  const uniqueOuts = new Set(
    [...filteredFlushOuts, ...filteredStraightOuts].map(cardKey),
  )
  return Math.min(25, uniqueOuts.size)
}

function isDominatedStraightOut(
  ownCards: Card[],
  communityCards: Card[],
  out: Card,
): boolean {
  const newBoard = [...communityCards, out]
  if (newBoard.length < 3) return false

  const occupied = new Set([...ownCards.map(cardKey), ...newBoard.map(cardKey)])
  const full = createDeck().filter(c => !occupied.has(cardKey(c)))

  const myBestTop = bestStraightTopForHoleCards(ownCards, newBoard, true)
  if (myBestTop <= 0) return false

  for (const unseen of full) {
    const trialHole = [out, unseen] as Card[]
    const oppBestTop = bestStraightTopForHoleCards(trialHole, newBoard, false)
    if (oppBestTop > myBestTop) return true
  }
  return false
}

function bestStraightTopForHoleCards(
  holeCards: Card[],
  board: Card[],
  allowAnyHole: boolean,
): number {
  let best = 0
  for (const pair of combinations(holeCards, 2)) {
    for (const trio of combinations(board, 3)) {
      if (!allowAnyHole && pair.some(c => board.some(b => cardKey(c) === cardKey(b)))) continue
      if (isFiveCardStraight([...pair, ...trio])) {
        const top = Math.max(...[...pair, ...trio].map(rankValue))
        if (top > best) best = top
      }
    }
  }
  return best
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

/**
 * Detects a material increase in opponent nut-combination density, adjusted
 * for the bot's actual made-hand rank. A board pair helps sets and two-pair;
 * a flush-completing card doesn't hurt a made flush; etc.
 */
export function omahaBoardGotMoreDangerous(
  communityCards: Card[],
  handRank: number,
): boolean {
  if (communityCards.length < 4) return false

  const previousBoard = communityCards.slice(0, -1)
  const newCard = communityCards[communityCards.length - 1]

  if (handRank >= 8) return false

  if (handRank === 7) {
    if (previousBoard.some(c => c.rank === newCard.rank)) return false
    return omahaBoardDangerScore(communityCards) > omahaBoardDangerScore(previousBoard)
  }

  if (handRank === 6) {
    if (previousBoard.some(c => c.rank === newCard.rank)) return true
    return false
  }

  if (handRank === 5) {
    if (previousBoard.some(c => c.rank === newCard.rank)) return true
    const prevSuitCounts = new Map<string, number>()
    for (const c of previousBoard) prevSuitCounts.set(c.suit, (prevSuitCounts.get(c.suit) ?? 0) + 1)
    if ((prevSuitCounts.get(newCard.suit) ?? 0) >= 2) return true
    return omahaBoardDangerScore(communityCards) > omahaBoardDangerScore(previousBoard)
  }

  if (handRank === 4) {
    if (previousBoard.some(c => c.rank === newCard.rank)) return false
    return omahaBoardDangerScore(communityCards) > omahaBoardDangerScore(previousBoard)
  }

  if (handRank === 3) {
    if (previousBoard.some(c => c.rank === newCard.rank)) return false
    return omahaBoardDangerScore(communityCards) > omahaBoardDangerScore(previousBoard)
  }

  return omahaBoardDangerScore(communityCards) > omahaBoardDangerScore(previousBoard)
}

function omahaBoardDangerScore(communityCards: Card[]): number {
  const suitCounts = new Map<Card['suit'], number>()
  const rankCounts = new Map<Card['rank'], number>()
  for (const card of communityCards) {
    suitCounts.set(card.suit, (suitCounts.get(card.suit) ?? 0) + 1)
    rankCounts.set(card.rank, (rankCounts.get(card.rank) ?? 0) + 1)
  }

  let score = 0
  const maxSuitCount = Math.max(0, ...suitCounts.values())
  if (maxSuitCount >= 3) score += 6 + (maxSuitCount - 3) * 2

  const rankPattern = [...rankCounts.values()].sort((left, right) => right - left)
  if ((rankPattern[0] ?? 0) >= 3) score += 8
  else if ((rankPattern[0] ?? 0) === 2) score += 5
  if (rankPattern.filter(count => count >= 2).length >= 2) score += 4

  score += omahaStraightWindowCount(communityCards) * 2
  return score
}

function omahaStraightWindowCount(communityCards: Card[]): number {
  const ranks = new Set(communityCards.map(rankValue))
  const windows = [
    [14, 2, 3, 4, 5],
    ...Array.from({ length: 9 }, (_, index) =>
      Array.from({ length: 5 }, (__, offset) => index + offset + 2)),
  ]

  return windows.filter(window => window.filter(rank => ranks.has(rank)).length >= 3).length
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

interface PreflopSuitProfile {
  shape: 'double-suited' | 'single-suited' | 'triple-suited' | 'monotone' | 'rainbow'
  usableSuitCount: number
  nutSuitCount: number
  kingHighSuitCount: number
}

function analyzePreflopSuits(cards: Card[]): PreflopSuitProfile {
  const cardsBySuit = new Map<Card['suit'], Card[]>()
  for (const c of cards) {
    const suitedCards = cardsBySuit.get(c.suit) ?? []
    suitedCards.push(c)
    cardsBySuit.set(c.suit, suitedCards)
  }

  const counts = [...cardsBySuit.values()].map(group => group.length).sort((a, b) => b - a)
  const shape: PreflopSuitProfile['shape'] = counts[0] === 4
    ? 'monotone'
    : counts[0] === 3
      ? 'triple-suited'
      : counts[0] === 2 && counts[1] === 2
        ? 'double-suited'
        : counts[0] === 2
          ? 'single-suited'
          : 'rainbow'

  let nutSuitCount = 0
  let kingHighSuitCount = 0
  for (const suitedCards of cardsBySuit.values()) {
    if (suitedCards.length < 2) continue
    if (suitedCards.some(card => card.rank === 'A')) nutSuitCount++
    else if (suitedCards.some(card => card.rank === 'K')) kingHighSuitCount++
  }

  return {
    shape,
    usableSuitCount: [...cardsBySuit.values()].filter(group => group.length >= 2).length,
    nutSuitCount,
    kingHighSuitCount,
  }
}

function preflopSuitScore(profile: PreflopSuitProfile): number {
  const shapeScore: Record<PreflopSuitProfile['shape'], number> = {
    'double-suited': 16,
    'single-suited': 8,
    'triple-suited': 2,
    monotone: -2,
    rainbow: 0,
  }
  return shapeScore[profile.shape] + profile.nutSuitCount * 4 + profile.kingHighSuitCount
}

interface PreflopRankProfile {
  rankCounts: Map<number, number>
  maxStraightWindowOverlap: number
  adjacentConnections: number
  danglers: number
}

const PLO_STRAIGHT_WINDOWS = [
  [14, 2, 3, 4, 5],
  ...Array.from({ length: 9 }, (_, index) =>
    Array.from({ length: 5 }, (__, offset) => index + offset + 2)),
]

function analyzePreflopRanks(cards: Card[]): PreflopRankProfile {
  const rankCounts = new Map<number, number>()
  for (const card of cards) {
    const rank = rankValue(card)
    rankCounts.set(rank, (rankCounts.get(rank) ?? 0) + 1)
  }

  const uniqueRanks = [...rankCounts.keys()]
  const maxStraightWindowOverlap = Math.max(
    0,
    ...PLO_STRAIGHT_WINDOWS.map(window => window.filter(rank => rankCounts.has(rank)).length),
  )

  let adjacentConnections = 0
  let danglers = 0
  for (let left = 0; left < uniqueRanks.length; left++) {
    let closestGap = Number.POSITIVE_INFINITY
    for (let right = 0; right < uniqueRanks.length; right++) {
      if (left === right) continue
      const gap = preflopRankGap(uniqueRanks[left], uniqueRanks[right])
      closestGap = Math.min(closestGap, gap)
      if (right > left && gap === 1) adjacentConnections++
    }
    if ((rankCounts.get(uniqueRanks[left]) ?? 0) === 1 && closestGap > 3) danglers++
  }

  return { rankCounts, maxStraightWindowOverlap, adjacentConnections, danglers }
}

function preflopRankGap(left: number, right: number): number {
  const regularGap = Math.abs(left - right)
  const aceLowGap = left === 14
    ? Math.abs(1 - right)
    : right === 14
      ? Math.abs(left - 1)
      : Number.POSITIVE_INFINITY
  return Math.min(regularGap, aceLowGap)
}

function preflopConnectionScore(profile: PreflopRankProfile): number {
  const windowScore = profile.maxStraightWindowOverlap >= 4
    ? 18
    : profile.maxStraightWindowOverlap === 3
      ? 9
      : profile.maxStraightWindowOverlap === 2
        ? 2
        : 0
  const fourCardRundownBonus = profile.maxStraightWindowOverlap === 4 && profile.rankCounts.size === 4 ? 4 : 0
  return windowScore + Math.min(6, profile.adjacentConnections * 2) + fourCardRundownBonus
}

function calculatePreflopPairScore(rankCounts: Map<number, number>): number {
  const pairValues: Record<number, number> = {
    14: 30,
    13: 22,
    12: 16,
    11: 12,
    10: 9,
    9: 7,
    8: 5,
    7: 4,
    6: 3,
    5: 3,
    4: 2,
    3: 2,
    2: 2,
  }

  const pairedRanks = [...rankCounts.entries()].filter(([, count]) => count >= 2)
  let score = pairedRanks.reduce((sum, [rank, count]) => {
    const duplicatePenalty = count === 3 ? 16 : count >= 4 ? 25 : 0
    return sum + Math.max(0, (pairValues[rank] ?? 0) - duplicatePenalty)
  }, 0)
  if (pairedRanks.length >= 2) score += 8
  return score
}

function rankValue(card: Card): number {
  const map: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  }
  return map[card.rank] ?? 0
}
