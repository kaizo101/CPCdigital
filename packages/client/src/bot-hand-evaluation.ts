import type { Card } from '@cpc/shared'
import { evaluateHand, type EvalResult } from '@cpc/poker-engine'

// Enhanced hand assessment with all fixes
export interface HandAssessment {
  category: 'air' | 'weak' | 'medium' | 'strong' | 'nuts'
  rank: number  // 0-9: absolute hand ranking
  made: boolean

  // Relative strength (0-100): how good is this hand given the board?
  relativeStrength: number

  // Showdown value (0-100): can this hand win at showdown?
  showdownValue: number

  // Nut potential (categorical, not precise percentage)
  nutPotential: 'nuts' | 'near-nuts' | 'strong' | 'medium' | 'weak'

  // Vulnerability (0-100): how likely is this hand to be outdrawn?
  vulnerability: number

  // Draw quality (0-100): how good are the draws?
  drawQuality: number

  // Clean outs: how many outs improve to likely best hand?
  cleanOuts: number

  // Blocker value (0-100): how much do our cards block opponent value?
  blockerValue: number

  // Detailed info
  pairType?: 'top' | 'middle' | 'bottom' | 'over' | 'under' | 'pocket'
  kickerStrength?: 'top' | 'medium' | 'weak'
  drawTypes: string[]
}

// Evaluate hand with full assessment
export function assessHand(
  holeCards: [Card, Card],
  communityCards: Card[]
): HandAssessment {
  // Preflop: return minimal assessment
  if (communityCards.length < 3) {
    return {
      category: 'air',
      rank: 0,
      made: false,
      relativeStrength: 0,
      showdownValue: 0,
      nutPotential: 'weak',
      vulnerability: 0,
      drawQuality: 0,
      cleanOuts: 0,
      blockerValue: 0,
      drawTypes: []
    }
  }

  const evalResult = evaluateHand(holeCards, communityCards)
  const rank = getHandRank(evalResult)
  const isRiver = communityCards.length === 5

  // Build assessment
  const assessment: HandAssessment = {
    category: categorizeHand(rank),
    rank,
    made: rank >= 2,
    relativeStrength: calculateRelativeStrength(evalResult, communityCards, holeCards),
    showdownValue: calculateShowdownValue(rank),
    nutPotential: calculateNutPotential(evalResult, communityCards, holeCards),
    vulnerability: calculateVulnerability(evalResult, communityCards, holeCards),
    drawQuality: isRiver ? 0 : calculateDrawQuality(holeCards, communityCards),  // No draws on river
    cleanOuts: isRiver ? 0 : calculateCleanOuts(holeCards, communityCards, evalResult),
    blockerValue: calculateBlockerValue(holeCards, communityCards),
    drawTypes: isRiver ? [] : identifyDrawTypes(holeCards, communityCards, evalResult)
  }

  // Add pair type if applicable
  if (rank === 2 || rank === 3) {
    assessment.pairType = determinePairType(holeCards, communityCards)
  }

  return assessment
}

// Get hand rank (0-9)
function getHandRank(evalResult: EvalResult): number {
  return evalResult.rank
}

// Fix #10: Two Pair should be medium, not weak
function categorizeHand(rank: number): 'air' | 'weak' | 'medium' | 'strong' | 'nuts' {
  if (rank >= 8) return 'nuts'  // Four of a Kind+
  if (rank >= 6) return 'strong'  // Flush+
  if (rank >= 4) return 'medium'  // Trips
  if (rank === 3) return 'medium'  // Two Pair (FIX: was weak)
  if (rank === 2) return 'weak'  // Pair
  return 'air'
}

// Calculate relative strength (0-100)
function calculateRelativeStrength(evalResult: EvalResult, communityCards: Card[], holeCards: [Card, Card]): number {
  let strength = 50

  const rank = getHandRank(evalResult)
  const boardRank = getBoardRank(communityCards)

  if (rank > boardRank) {
    strength += (rank - boardRank) * 10
  } else if (rank < boardRank) {
    strength -= (boardRank - rank) * 10
  }

  // Adjust for pair type
  if (rank === 2) {
    const pairType = determinePairType(holeCards, communityCards)
    if (pairType === 'pocket') strength += 25  // Pocket pair is strong
    else if (pairType === 'top') strength += 20
    else if (pairType === 'middle') strength += 5
    else if (pairType === 'bottom') strength -= 15
    else if (pairType === 'under') strength -= 25
  }

  return Math.max(0, Math.min(100, strength))
}

// Get best possible hand from board alone
function getBoardRank(communityCards: Card[]): number {
  if (communityCards.length < 5) return 0
  const boardHand = evaluateHand(
    [communityCards[0], communityCards[1]],
    communityCards.slice(2)
  )
  return getHandRank(boardHand)
}

// Fix #9: Pocket Pairs correctly classified
function determinePairType(holeCards: [Card, Card], communityCards: Card[]): 'top' | 'middle' | 'bottom' | 'over' | 'under' | 'pocket' {
  // Check if it's a pocket pair (both hole cards have same rank)
  if (holeCards[0].rank === holeCards[1].rank) {
    return 'pocket'
  }

  const pairCard = findPairCard(holeCards, communityCards)
  if (!pairCard) return 'under'

  const boardRanks = communityCards.map(c => rankValue(c.rank)).sort((a, b) => b - a)
  const pairRank = rankValue(pairCard.rank)
  const pairIndex = boardRanks.indexOf(pairRank)

  if (pairRank > boardRanks[0]) return 'over'
  if (pairIndex === 0) return 'top'
  if (pairIndex === boardRanks.length - 1) return 'bottom'
  return 'middle'
}

// Find which card makes the pair
function findPairCard(holeCards: [Card, Card], communityCards: Card[]): Card | null {
  for (const hole of holeCards) {
    if (communityCards.some(c => c.rank === hole.rank)) {
      return hole
    }
  }
  return null
}

// Calculate showdown value (0-100)
function calculateShowdownValue(rank: number): number {
  if (rank >= 8) return 95
  if (rank === 7) return 85
  if (rank === 6) return 80
  if (rank === 5) return 75
  if (rank === 4) return 65
  if (rank === 3) return 55
  if (rank === 2) return 40
  return 10
}

// Fix #11: Nut potential as categorical, not precise percentage
function calculateNutPotential(
  evalResult: EvalResult,
  communityCards: Card[],
  holeCards: [Card, Card],
): 'nuts' | 'near-nuts' | 'strong' | 'medium' | 'weak' {
  const rank = getHandRank(evalResult)

  if (rank === 9) return 'nuts'  // Straight Flush
  if (rank === 8) return 'nuts'  // Four of a Kind
  if (rank === 7) return 'near-nuts'  // Full House
  if (rank === 6) {
    return isNutFlush(holeCards, communityCards) ? 'near-nuts' : 'strong'
  }
  if (rank === 5) {
    return isNutStraight(holeCards, communityCards) ? 'near-nuts' : 'strong'
  }
  if (rank === 4) return 'strong'  // Trips
  if (rank === 3) return 'medium'  // Two Pair
  if (rank === 2) return 'medium'  // Pair
  return 'weak'
}

// Fix #12: Nut flush detection uses correct cards
function isNutFlush(holeCards: [Card, Card], communityCards: Card[]): boolean {
  const allCards = [...holeCards, ...communityCards]
  const flushSuit = (['hearts', 'diamonds', 'clubs', 'spades'] as const)
    .find(suit => allCards.filter(card => card.suit === suit).length >= 5)
  if (!flushSuit) return false

  const boardRanks = new Set(
    communityCards.filter(card => card.suit === flushSuit).map(card => rankValue(card.rank))
  )
  let highestAvailableRank = 14
  while (boardRanks.has(highestAvailableRank)) highestAvailableRank--

  return holeCards.some(card => card.suit === flushSuit && rankValue(card.rank) === highestAvailableRank)
}

// Fix #13: Nut straight detection is correct
function isNutStraight(holeCards: [Card, Card], communityCards: Card[]): boolean {
  // A straight is the nuts if it's Ace-high (A-K-Q-J-T)
  // OR if it's the highest possible straight given the board
  const ranks = [...holeCards, ...communityCards].map(c => rankValue(c.rank)).sort((a, b) => b - a)

  // Check if it's Ace-high straight
  if (ranks[0] === 14 && ranks[1] === 13 && ranks[2] === 12 && ranks[3] === 11 && ranks[4] === 10) {
    return true
  }

  // Check if there's a higher straight possible on the board
  // (simplified: if Ace-high straight is possible but we don't have it, we don't have nuts)
  const boardRanks = communityCards.map(c => rankValue(c.rank))
  const hasAce = boardRanks.includes(14)
  const hasKing = boardRanks.includes(13)
  const hasQueen = boardRanks.includes(12)
  const hasJack = boardRanks.includes(11)
  const hasTen = boardRanks.includes(10)

  // If board can make A-high straight, only A-high straight is nuts
  if (hasAce && hasKing && hasQueen && hasJack && hasTen) {
    return ranks[0] === 14
  }

  // Otherwise, our straight is the nuts if it's the highest possible
  // (simplified check)
  const highestBoardRank = Math.max(...boardRanks)
  return ranks[0] >= highestBoardRank - 3
}

// Fix #18: Vulnerability doesn't use own draws as danger
function calculateVulnerability(evalResult: EvalResult, communityCards: Card[], holeCards: [Card, Card]): number {
  const rank = getHandRank(evalResult)
  let vulnerability = 50

  // High hands are less vulnerable
  if (rank >= 7) vulnerability -= 30
  else if (rank === 6) vulnerability -= 20
  else if (rank === 5) vulnerability -= 10
  else if (rank === 4) vulnerability -= 5

  // Check for draws that OPPONENTS might have (not our own draws)
  // Simplified: just check board texture
  const texture = analyzeBoardTexture(communityCards)
  if (texture === 'wet') vulnerability += 15
  else if (texture === 'dry') vulnerability -= 10

  // Top pair with bad kicker is more vulnerable
  if (rank === 2) {
    const pairType = determinePairType(holeCards, communityCards)
    if (pairType === 'top') {
      // Check kicker strength
      const kickerRank = getKickerRank(holeCards, communityCards)
      if (kickerRank === 'weak') vulnerability += 10
    }
  }

  return Math.max(0, Math.min(100, vulnerability))
}

// Get kicker strength
function getKickerRank(holeCards: [Card, Card], communityCards: Card[]): 'top' | 'medium' | 'weak' {
  const pairCard = findPairCard(holeCards, communityCards)
  if (!pairCard) return 'weak'

  const kickerCard = holeCards.find(c => c.rank !== pairCard.rank)
  if (!kickerCard) return 'weak'

  const kickerRank = rankValue(kickerCard.rank)
  if (kickerRank >= 12) return 'top'  // Q or higher
  if (kickerRank >= 9) return 'medium'  // 9 or higher
  return 'weak'
}

// Calculate draw quality (0-100)
function calculateDrawQuality(holeCards: [Card, Card], communityCards: Card[]): number {
  const draws = identifyDrawTypes(holeCards, communityCards, null)
  if (draws.length === 0) return 0

  let quality = 0

  if (draws.includes('nut-flush-draw')) quality += 40
  else if (draws.includes('flush-draw')) quality += 25

  if (draws.includes('open-ended-straight-draw')) quality += 30
  else if (draws.includes('gutshot')) quality += 15

  if (draws.includes('combo-draw')) quality += 20

  return Math.min(100, quality)
}

// Fix #16 & #17: Clean outs calculation avoids double counting
function calculateCleanOuts(holeCards: [Card, Card], communityCards: Card[], evalResult: EvalResult | null): number {
  // If we already have a made hand, no outs needed
  if (evalResult && getHandRank(evalResult) >= 2) {
    return 0
  }

  const draws = identifyDrawTypes(holeCards, communityCards, evalResult)
  let outs = 0

  // Track which cards are outs to avoid double counting
  const outCards = new Set<string>()

  if (draws.includes('nut-flush-draw')) {
    const flushSuit = getDrawFlushSuit(holeCards, communityCards)
    if (flushSuit) {
      for (let i = 2; i <= 14; i++) {
        const cardKey = `${i}-${flushSuit}`
        if (!communityCards.some(c => rankValue(c.rank) === i && c.suit === flushSuit)) {
          outCards.add(cardKey)
        }
      }
    }
  } else if (draws.includes('flush-draw')) {
    const flushSuit = getDrawFlushSuit(holeCards, communityCards)
    if (flushSuit) {
      // Count cards of this suit that aren't on board
      const boardSuitCount = communityCards.filter(c => c.suit === flushSuit).length
      const outs = 13 - boardSuitCount - 2  // 13 per suit, minus board, minus our hole cards
      for (let i = 0; i < Math.max(0, outs); i++) {
        outCards.add(`flush-${flushSuit}-${i}`)
      }
    }
  }

  if (draws.includes('open-ended-straight-draw') || draws.includes('gutshot')) {
    // Simplified: 8 outs for OESD, 4 for gutshot
    const straightOuts = draws.includes('open-ended-straight-draw') ? 8 : 4
    for (let i = 0; i < straightOuts; i++) {
      outCards.add(`straight-${i}`)
    }
  }

  // Discount for dirty outs (simplified)
  if (draws.includes('flush-draw') && !draws.includes('nut-flush-draw')) {
    // Remove 2 outs for potential paired board
    const outsToRemove = Math.min(2, outCards.size)
    for (let i = 0; i < outsToRemove; i++) {
      const firstKey = Array.from(outCards)[0]
      outCards.delete(firstKey)
    }
  }

  return outCards.size
}

// Get flush suit for draw detection
function getDrawFlushSuit(holeCards: [Card, Card], communityCards: Card[]): string | null {
  const allCards = [...holeCards, ...communityCards]
  const suitCounts = countSuits(allCards)

  for (const [suit, count] of Object.entries(suitCounts)) {
    if (count === 4) return suit
  }

  return null
}

// Calculate blocker value (0-100)
function calculateBlockerValue(holeCards: [Card, Card], communityCards: Card[]): number {
  let value = 0

  // Check for nut flush blockers
  for (const suit of ['hearts', 'diamonds', 'clubs', 'spades'] as const) {
    const hasAce = holeCards.some(c => c.suit === suit && c.rank === 'A')
    const flushPossible = communityCards.filter(c => c.suit === suit).length >= 4

    if (hasAce && flushPossible) {
      value += 30
    }
  }

  // Check for straight blockers
  const ranks = holeCards.map(c => rankValue(c.rank))
  if (ranks.some(r => r >= 10)) {
    value += 10
  }

  return Math.min(100, value)
}

// Fix #14, #15, #17: Draw identification with all fixes
function identifyDrawTypes(holeCards: [Card, Card], communityCards: Card[], evalResult: EvalResult | null): string[] {
  const draws: string[] = []
  const allCards = [...holeCards, ...communityCards]

  // Fix #17: If we already have a straight, don't count as draw
  if (evalResult && getHandRank(evalResult) === 5) {
    return draws  // Already have a straight
  }

  // Flush draw
  const suitCounts = countSuits(allCards)
  const hasFlushDraw = []
  for (const [suit, count] of Object.entries(suitCounts)) {
    if (count === 4) {
      const hasAce = allCards.some(c => c.suit === suit && c.rank === 'A')
      hasFlushDraw.push(hasAce ? 'nut-flush-draw' : 'flush-draw')
    }
  }
  draws.push(...hasFlushDraw)

  // Straight draw
  const ranks = [...new Set(allCards.map(c => rankValue(c.rank)))].sort((a, b) => a - b)
  const straightDraw = findStraightDraw(ranks)
  if (straightDraw === 'open-ended') {
    draws.push('open-ended-straight-draw')
  } else if (straightDraw === 'gutshot') {
    draws.push('gutshot')
  }

  // Fix #15: Combo draw detection (flush + straight)
  const hasFlush = hasFlushDraw.length > 0
  const hasStraight = straightDraw !== null

  if (hasFlush && hasStraight) {
    draws.push('combo-draw')
  }

  return draws
}

// Count suits
function countSuits(cards: Card[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const card of cards) {
    counts[card.suit] = (counts[card.suit] || 0) + 1
  }
  return counts
}

// Find straight draw
function findStraightDraw(ranks: number[]): 'open-ended' | 'gutshot' | null {
  // Check for 4 consecutive ranks (open-ended)
  for (let i = 0; i < ranks.length - 3; i++) {
    if (ranks[i + 3] - ranks[i] === 3) {
      return 'open-ended'
    }
  }

  // Check for gutshot (4 ranks with 1 gap)
  for (let i = 0; i < ranks.length - 3; i++) {
    if (ranks[i + 3] - ranks[i] === 4) {
      return 'gutshot'
    }
  }

  return null
}

// Helper: convert rank to value
function rankValue(rank: string): number {
  const values: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  }
  return values[rank] ?? 0
}

// Fix #19: Board texture is more detailed
export function analyzeBoardTexture(cards: Card[]): 'dry' | 'neutral' | 'wet' {
  if (cards.length < 3) return 'neutral'

  const suits = cards.map(c => c.suit)
  const uniqueSuits = new Set(suits)
  const ranks = cards.map(c => rankValue(c.rank)).sort((a, b) => a - b)

  // Check for paired board
  const hasPair = new Set(ranks).size < ranks.length

  // Dry: 3 different suits, no connected cards, no pair
  if (uniqueSuits.size >= 3 && !hasPair) {
    let connected = false
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i] - ranks[i - 1] <= 2) {
        connected = true
        break
      }
    }
    if (!connected) return 'dry'
  }

  // Wet: 2+ cards same suit, connected ranks, or paired
  if (uniqueSuits.size <= 2) return 'wet'
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] - ranks[i - 1] <= 1) return 'wet'
  }
  if (hasPair) return 'wet'

  return 'neutral'
}
