// Omaha High hand evaluation — must use exactly 2 hole cards + 3 community cards.
import type { Card } from '@cpc/shared'
import type { VariantEvaluator, HandStrengthCategory, NutPotential, VariantHandAssessment, BoardTexture } from './bot-variant-evaluation'
import { getPloScores, type PloStreet } from './bot-category-scores'
import { createDeck, evaluateOmahaHand } from '@cpc/poker-engine'
import { resolveTableFormat } from './bot-table-format'

export const omahaVariantEvaluator: VariantEvaluator = {
  variantId: 'omaha-high',
  evaluate(context) {
    const { ownCards, publicState, position } = context
    const communityCards = publicState.communityCards

    if (communityCards.length === 0) {
      return {
        variantId: this.variantId,
        handAssessment: preflopAssess(ownCards, position.tableSize, context.archetypeId),
        boardTexture: 'neutral' as const,
        categoryScores: getPloScores(context.archetypeId, 'preflop', position.tableSize),
      }
    }

    const evalResult = evaluateOmahaHand(ownCards, communityCards)
    const rank = evalResult.rank

    const drawAnalysis = analyzeOmahaDraws(ownCards, communityCards)
    const drawQuality = calculateOmahaDrawQuality(drawAnalysis)
    const cleanOuts = calculateOmahaCleanOuts(drawAnalysis, rank, ownCards, communityCards)
    const nutPotential = assessOmahaNutPotential(evalResult, communityCards, ownCards, cleanOuts)
    const vulnerability = calculateOmahaVulnerability(rank, cleanOuts, communityCards.length)
    const showdownValue = calculateOmahaShowdownValue(rank, drawQuality)
    const relativeStrength = calculateOmahaRelativeStrength(rank, cleanOuts)
    const isRiver = communityCards.length === 5
    const drawTypes = isRiver ? [] : identifyOmahaDrawTypes(drawAnalysis)
    const equityCollapse = calculateOmahaEquityCollapse(communityCards, rank, nutPotential)
    const boardGotWorse = equityCollapse > 0
    const blockerValue = calculateOmahaBlockerValue(ownCards, communityCards)
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
        blockerValue,
        drawTypes,
        equityCollapse,
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

function getHuThresholds(archetypeId?: string): typeof PLO_PREFLOP_THRESHOLDS {
  const base = (premium: number, strong: number, good: number, medium: number, marginal: number) => [
    { min: premium, category: 'premium' as HandStrengthCategory },
    { min: strong, category: 'strong' as HandStrengthCategory },
    { min: good, category: 'good' as HandStrengthCategory },
    { min: medium, category: 'medium' as HandStrengthCategory },
    { min: marginal, category: 'marginal' as HandStrengthCategory },
  ]
  switch (archetypeId) {
    case 'nit':     return base(72, 52, 36, 26, 16)
    case 'lag':     return base(72, 52, 36, 26, 16)
    case 'calling-station': return base(56, 40, 24, 16, 8)
    default:        return base(68, 48, 30, 20, 12) // TAG
  }
}

function preflopAssess(ownCards: Card[], tableSize: number = 9, archetypeId?: string): VariantHandAssessment {
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

  const thresholds = resolveTableFormat(tableSize) === 'heads-up'
    ? getHuThresholds(archetypeId)
    : PLO_PREFLOP_THRESHOLDS

  let category: HandStrengthCategory = 'weak'
  for (const t of thresholds) {
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
    equityCollapse: 0,
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
  else if (rank >= 7) base = 60 + (rank - 7) * 15
  else if (rank >= 6) base = 42 + (rank - 6) * 12
  else if (rank >= 4) base = 32 + (rank - 4) * 8

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
  ownCards: Card[],
  cleanOuts: number,
): NutPotential {
  const { rank, cards } = evalResult
  const handCards = parsePokerSolverCards(cards)
  const boardRankCounts = new Map<number, number>()
  for (const c of communityCards) {
    const r = rankValue(c)
    boardRankCounts.set(r, (boardRankCounts.get(r) ?? 0) + 1)
  }
  const ourRankCounts = new Map<number, number>()
  for (const c of ownCards) {
    const r = rankValue(c)
    ourRankCounts.set(r, (ourRankCounts.get(r) ?? 0) + 1)
  }

  if (rank >= 9) {
    const sfSuit = handCards[0].suit
    const boardSfRanks = communityCards
      .filter(c => cardSuitChar(c) === sfSuit)
      .map(rankValue)
    const nutTop = findStraightTop(boardSfRanks, 3)
    const myTop = findStraightTop(handCards.map(c => c.rank), 5)
    if (myTop >= nutTop) return 'nuts'
    if (nutTop - myTop === 1) return 'second-nuts'
    return 'near-nuts'
  }
  if (rank === 8) {
    let myQuadRank = 0
    const handRankCounts = new Map<number, number>()
    for (const c of handCards) handRankCounts.set(c.rank, (handRankCounts.get(c.rank) ?? 0) + 1)
    for (const [r, c] of handRankCounts) if (c >= 4) myQuadRank = r
    let higherQuadCount = 0
    for (let r = 14; r > myQuadRank; r--) {
      if ((ourRankCounts.get(r) ?? 0) === 0) higherQuadCount++
    }
    if (higherQuadCount === 0) return 'nuts'
    if (higherQuadCount === 1) return 'second-nuts'
    return 'near-nuts'
  }

  const opponentCanHaveTrips = (r: number) =>
    (boardRankCounts.get(r) ?? 0) + Math.min(2, 4 - (boardRankCounts.get(r) ?? 0) - (ourRankCounts.get(r) ?? 0)) >= 3

  const findHighestOpponentTripsRank = () => {
    for (let r = 14; r >= 2; r--) {
      if (opponentCanHaveTrips(r)) return r
    }
    return 0
  }

  if (rank === 7) {
    const rankCounts = new Map<number, number>()
    for (const c of handCards) rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1)
    let tripsRank = 0, pairRank = 0
    for (const [r, count] of rankCounts) {
      if (count >= 3) tripsRank = r
      else if (count >= 2) pairRank = r
    }
    const bestOppTrip = findHighestOpponentTripsRank()
    if (tripsRank >= bestOppTrip) return 'near-nuts'
    const gap = bestOppTrip - tripsRank
    if (gap === 1) return 'second-nuts'
    if (gap === 2) return 'strong'
    if (gap <= 4) return 'medium'
    return 'weak'
  }

  if (rank === 6) {
    const flushSuit = handCards[0].suit
    const boardFlushRanks = new Set(
      communityCards.filter(c => cardSuitChar(c) === flushSuit).map(rankValue),
    )
    let topUnseenRank = 14
    while (boardFlushRanks.has(topUnseenRank)) topUnseenRank--
    const ourFlushRanks = ownCards
      .filter(c => c.suit[0] === flushSuit)
      .map(c => rankValue(c))

    if (ourFlushRanks.includes(topUnseenRank)) return 'near-nuts'
    if (ourFlushRanks.includes(topUnseenRank - 1)) return 'second-nuts'
    if (topUnseenRank === 14) return ourFlushRanks.some(r => r >= 13) ? 'strong' : 'medium'
    if (ourFlushRanks.some(r => r >= topUnseenRank - 1)) return 'strong'
    return 'medium'
  }

  if (rank === 5) {
    const boardRanks = [...boardRankCounts.keys()]
    const nutTop = findStraightTop(boardRanks, 3)
    const myTop = findStraightTop(handCards.map(c => c.rank), 5)
    const gap = nutTop - myTop
    if (gap <= 0) return 'near-nuts'
    if (gap === 1) return 'second-nuts'
    if (gap === 2) return 'medium'
    return 'weak'
  }

  if (rank === 4) {
    const rankCounts = new Map<number, number>()
    for (const c of handCards) rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1)
    let setRank = 0
    for (const [r, count] of rankCounts) if (count >= 3) setRank = r
    const bestOppTrip = findHighestOpponentTripsRank()
    if (setRank >= bestOppTrip) return 'strong'
    if (setRank >= bestOppTrip - 2) return 'medium'
    return 'weak'
  }

  if (rank === 3) {
    const rankCounts = new Map<number, number>()
    for (const c of handCards) rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1)
    const pairRanks = [...rankCounts.entries()]
      .filter(([, c]) => c >= 2).map(([r]) => r).sort((a, b) => b - a)
    const bestOppTrip = findHighestOpponentTripsRank()
    if (bestOppTrip > 0) return pairRanks[0] >= bestOppTrip - 1 ? 'medium' : 'weak'
    if ((pairRanks[0] ?? 0) >= 12 && (pairRanks[1] ?? 0) >= 10) return 'medium'
    return 'weak'
  }

  if (rank === 2) {
    const bestOppTrip = findHighestOpponentTripsRank()
    if (bestOppTrip > 0) return 'weak'
    const handRankCounts = new Map<number, number>()
    for (const c of handCards) handRankCounts.set(c.rank, (handRankCounts.get(c.rank) ?? 0) + 1)
    let ourPairRank = 0
    for (const [r, c] of handRankCounts) if (c >= 2) ourPairRank = r
    if (ourPairRank >= 13) return 'medium'
    return 'weak'
  }
  return 'weak' // all ranks covered, fallback for type-narrowing
}  // end of assessOmahaNutPotential

function cardSuitChar(card: Card): string {
  return card.suit[0]
}

const OMAHA_STRAIGHT_RUNS = [
  ...Array.from({ length: 9 }, (_, index) => {
    const top = 14 - index
    return { top, ranks: Array.from({ length: 5 }, (__, offset) => top - offset) }
  }),
  { top: 5, ranks: [14, 5, 4, 3, 2] },
]

export function findStraightTop(visibleRanks: number[], minRequired: number): number {
  const present = new Set(visibleRanks)
  for (const run of OMAHA_STRAIGHT_RUNS) {
    if (run.ranks.filter(rank => present.has(rank)).length >= minRequired) return run.top
  }
  return 0
}

/** Nut-combination blockers relevant to PLO river bluff-catching (0-100). */
export function calculateOmahaBlockerValue(ownCards: Card[], communityCards: Card[]): number {
  let value = 0

  for (const suit of ['hearts', 'diamonds', 'clubs', 'spades'] as const) {
    const boardOfSuit = communityCards.filter(card => card.suit === suit)
    if (boardOfSuit.length < 3) continue

    const unavailable = new Set(boardOfSuit.map(rankValue))
    const highestUnseen = Array.from({ length: 13 }, (_, index) => 14 - index)
      .filter(rank => !unavailable.has(rank))
    const suitedHoleRanks = ownCards.filter(card => card.suit === suit).map(rankValue)
    if (suitedHoleRanks.includes(highestUnseen[0])) value = Math.max(value, 30)
    else if (suitedHoleRanks.includes(highestUnseen[1])) value = Math.max(value, 15)
  }

  const boardRanks = new Set(communityCards.map(rankValue))
  const ownRanks = new Set(ownCards.map(rankValue))
  const nutRun = OMAHA_STRAIGHT_RUNS.find(run => (
    run.ranks.filter(rank => boardRanks.has(rank)).length >= 3
  ))
  if (nutRun) {
    const boardCandidates = nutRun.ranks.filter(rank => boardRanks.has(rank))
    const missingPairs: number[][] = []
    for (let first = 0; first < boardCandidates.length - 2; first++) {
      for (let second = first + 1; second < boardCandidates.length - 1; second++) {
        for (let third = second + 1; third < boardCandidates.length; third++) {
          const selectedBoard = new Set([
            boardCandidates[first],
            boardCandidates[second],
            boardCandidates[third],
          ])
          missingPairs.push(nutRun.ranks.filter(rank => !selectedBoard.has(rank)))
        }
      }
    }
    if (missingPairs.some(pair => pair.every(rank => ownRanks.has(rank)))) {
      value = Math.max(value, 30)
    } else if (missingPairs.some(pair => pair.some(rank => ownRanks.has(rank)))) {
      value = Math.max(value, 12)
    }
  }

  return value
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

  if (wrapCount >= 8) {
    if (draws.wrapQuality === 'nut') score += 3
    else if (draws.wrapQuality === 'second') score -= 2
    else if (draws.wrapQuality === 'bottom') score -= 4
  }

  return Math.max(0, score)
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

  const myBestTop = bestStraightTopForHoleCards(ownCards, newBoard, true)
  if (myBestTop <= 0) return false

  const boardRanks = newBoard.map(rankValue)
  const nutTop = findStraightTop(boardRanks, 3)
  return nutTop > myBestTop
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
        const top = fiveCardStraightTop([...pair, ...trio])
        if (top > best) best = top
      }
    }
  }
  return best
}

function fiveCardStraightTop(cards: Card[]): number {
  const ranks = new Set(cards.map(rankValue))
  if ([14, 5, 4, 3, 2].every(rank => ranks.has(rank))) return 5
  return Math.max(0, ...ranks)
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

  if (wrapCount >= 8 && draws.wrapQuality !== 'none') {
    types.push(`${draws.wrapQuality}-wrap`)
  }

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
  return calculateOmahaEquityCollapse(communityCards, handRank, 'medium') > 0
}

/** Quantifies how strongly the newest board card devalues the current PLO hand. */
export function calculateOmahaEquityCollapse(
  communityCards: Card[],
  handRank: number,
  nutPotential: NutPotential,
): number {
  if (communityCards.length < 4 || handRank >= 7) return 0

  const previousBoard = communityCards.slice(0, -1)
  const newCard = communityCards[communityCards.length - 1]
  let collapse = 0

  const boardPaired = previousBoard.some(card => card.rank === newCard.rank)
  if (boardPaired) {
    if (handRank === 5 || handRank === 6) collapse = 0.85
    else if (handRank === 4) collapse = 0.55
    else collapse = 0.5
  }

  const previousSuitCount = previousBoard.filter(card => card.suit === newCard.suit).length
  const flushCompleted = previousSuitCount === 2
  if (flushCompleted && handRank < 6) collapse = Math.max(collapse, 0.8)

  const previousStraightWindows = omahaStraightWindowCount(previousBoard)
  const currentStraightWindows = omahaStraightWindowCount(communityCards)
  if (currentStraightWindows > previousStraightWindows) {
    if (handRank < 5) collapse = Math.max(collapse, 0.6)
    else if (handRank === 5) {
      const straightCollapse: Record<NutPotential, number> = {
        nuts: 0.08,
        'near-nuts': 0.12,
        'second-nuts': 0.2,
        strong: 0.28,
        medium: 0.4,
        weak: 0.5,
      }
      collapse = Math.max(collapse, straightCollapse[nutPotential])
    }
  }

  return Math.round(collapse * 100) / 100
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
  wrapQuality: 'none' | 'nut' | 'mixed' | 'second' | 'bottom'
  flushOutCards: Card[]
  flushDrawSuits: number
  nutFlushDraw: boolean
  secondFlushDraw: boolean
}

function analyzeOmahaDraws(ownCards: Card[], communityCards: Card[]): OmahaDrawAnalysis {
  const empty: OmahaDrawAnalysis = {
    straightOutCards: [],
    straightOutRanks: 0,
    wrapQuality: 'none',
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
  const wrapQuality = classifyOmahaWrap(ownCards, communityCards, straightOutCards)

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
    wrapQuality,
    flushOutCards,
    flushDrawSuits,
    nutFlushDraw,
    secondFlushDraw,
  }
}

function classifyOmahaWrap(
  ownCards: Card[],
  communityCards: Card[],
  straightOutCards: Card[],
): OmahaDrawAnalysis['wrapQuality'] {
  if (straightOutCards.length < 8) return 'none'

  let nutOuts = 0
  let secondOuts = 0
  let dominatedOuts = 0
  for (const out of straightOutCards) {
    const newBoard = [...communityCards, out]
    const myTop = bestStraightTopForHoleCards(ownCards, newBoard, true)
    const nutTop = findStraightTop(newBoard.map(rankValue), 3)
    const gap = nutTop - myTop
    if (gap <= 0) nutOuts++
    else if (gap === 1) secondOuts++
    else dominatedOuts++
  }

  if (nutOuts === straightOutCards.length) return 'nut'
  if (nutOuts > 0) return 'mixed'
  if (secondOuts > 0 && dominatedOuts === 0) return 'second'
  return 'bottom'
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
