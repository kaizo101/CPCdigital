import type { Card } from '@cpc/shared'
import type { OpponentLine, StreetAnalysis } from './bot-street-analysis'

export interface OpponentRangeContext {
  variantId: string
  board: readonly Card[]
  ownCards: readonly Card[]
  activeOpponents: number
}

export interface PerceivedOpponentRange {
  playerId: string
  strength: 'very-strong' | 'strong' | 'moderate' | 'weak' | 'very-weak' | 'unknown'
  summary: string
  score: number
  lineScore: number
  positionAdjustment: number
  roleAdjustment: number
  boardFitAdjustment: number
  pairedBoardRank?: number
  tripsRepresentation?: number
  baseTripsRepresentation?: number
  cardRemovalScale?: number
  multiwayScale?: number
}

export function estimateOpponentRanges(
  analysis: StreetAnalysis,
  context?: OpponentRangeContext,
): PerceivedOpponentRange[] {
  const ranges: PerceivedOpponentRange[] = []

  for (const line of analysis.opponentLines.values()) {
    ranges.push(estimateRangeFromLine(line, context))
  }

  return ranges
}

export function estimateRangeFromLine(
  line: OpponentLine,
  context?: OpponentRangeContext,
): PerceivedOpponentRange {
  if (line.preflop === 'folded') {
    return {
      playerId: line.playerId,
      strength: 'unknown',
      summary: 'folded preflop',
      score: 0,
      lineScore: 0,
      positionAdjustment: 0,
      roleAdjustment: 0,
      boardFitAdjustment: 0,
    }
  }

  let score = 50

  if (line.preflop === 'raised') score += 10
  else score -= 3

  const postflopActions = [line.flop, line.turn, line.river].filter(Boolean) as string[]

  for (const action of postflopActions) {
    switch (action) {
      case 'bet': score += 10; break
      case 'bet-call': score += 7; break
      case 'check-raise': score += 15; break
      case 'check-call': score -= 3; break
      case 'check-fold': score -= 15; break
      case 'bet-fold': score -= 10; break
    }
  }

  const lastAction = postflopActions[postflopActions.length - 1]
  if (lastAction === 'check-call') score -= 5
  if (lastAction === 'check') score -= 3

  const lineScore = score
  const positionAdjustment = positionRangeAdjustment(line)
  const roleAdjustment = preflopRoleAdjustment(line)
  const pairedBoard = context?.variantId === 'texas-holdem'
    ? pairedBoardEvidence(line, context)
    : null
  const boardFitAdjustment = pairedBoard?.adjustment ?? 0
  score += positionAdjustment + roleAdjustment + boardFitAdjustment

  return rangeFromScore({
    playerId: line.playerId,
    score,
    lineScore,
    positionAdjustment,
    roleAdjustment,
    boardFitAdjustment,
    pairedBoardRank: pairedBoard?.rank,
    tripsRepresentation: pairedBoard?.representation,
    baseTripsRepresentation: pairedBoard?.baseRepresentation,
    cardRemovalScale: pairedBoard?.cardRemovalScale,
    multiwayScale: pairedBoard?.multiwayScale,
  })
}

export function rangeFromScore(
  range: Omit<PerceivedOpponentRange, 'strength' | 'summary'>,
): PerceivedOpponentRange {
  const score = range.score
  let strength: PerceivedOpponentRange['strength']
  let summary: string

  if (score >= 75) {
    strength = 'very-strong'
    summary = 'consistently aggressive across streets'
  } else if (score >= 60) {
    strength = 'strong'
    summary = 'showing aggression'
  } else if (score >= 45) {
    strength = 'moderate'
    summary = 'mixed signals, likely drawing or medium strength'
  } else if (score >= 30) {
    strength = 'weak'
    summary = 'mostly passive, likely weak or drawing'
  } else {
    strength = 'very-weak'
    summary = 'very passive, likely air or missed draw'
  }

  return { ...range, strength, summary }
}

function positionRangeAdjustment(line: OpponentLine): number {
  if (line.preflopRole !== 'open-raiser') return 0
  if (line.position?.category === 'early') return 8
  if (line.position?.category === 'middle') return 3
  if (line.position?.category === 'late') return -5
  if (line.position?.category === 'blinds') return -2
  return 0
}

function preflopRoleAdjustment(line: OpponentLine): number {
  switch (line.preflopRole) {
    case 'three-bettor': return 10
    case 'four-bettor-plus': return 18
    case 'limper': return -5
    case 'blind-checker': return -6
    case 'caller': return -2
    default: return 0
  }
}

function pairedBoardEvidence(
  line: OpponentLine,
  context: OpponentRangeContext,
): {
  rank: number
  representation: number
  baseRepresentation: number
  cardRemovalScale: number
  multiwayScale: number
  adjustment: number
} | null {
  const counts = new Map<number, number>()
  for (const card of context.board) {
    const rank = rankValue(card.rank)
    counts.set(rank, (counts.get(rank) ?? 0) + 1)
  }
  const pairedRank = [...counts.entries()].find(([, count]) => count === 2)?.[0]
  if (!pairedRank) return null

  const broadway = pairedRank >= 10
  const category = line.position?.category
  let baseRepresentation: number
  switch (line.preflopRole) {
    case 'three-bettor': baseRepresentation = broadway ? 0.50 : 0.08; break
    case 'four-bettor-plus': baseRepresentation = broadway ? 0.45 : 0.03; break
    case 'limper': baseRepresentation = broadway ? 0.55 : 0.75; break
    case 'blind-checker': baseRepresentation = broadway ? 0.45 : 0.80; break
    case 'caller': baseRepresentation = broadway ? 0.60 : 0.55; break
    default:
      if (category === 'early') baseRepresentation = broadway ? 0.55 : 0.18
      else if (category === 'middle') baseRepresentation = broadway ? 0.65 : 0.35
      else if (category === 'late') baseRepresentation = broadway ? 0.75 : 0.65
      else baseRepresentation = broadway ? 0.65 : 0.50
  }

  const heldCopies = context.ownCards.filter(card => rankValue(card.rank) === pairedRank).length
  const cardRemovalScale = Math.max(0, 2 - heldCopies) / 2
  const multiwayScale = Math.min(1.25, 1 + Math.max(0, context.activeOpponents - 1) * 0.08)
  const representation = Math.max(0, Math.min(1, baseRepresentation * cardRemovalScale * multiwayScale))
  return {
    rank: pairedRank,
    representation,
    baseRepresentation,
    cardRemovalScale,
    multiwayScale,
    adjustment: (representation - 0.4) * 12,
  }
}

function rankValue(rank: Card['rank']): number {
  if (rank === 'A') return 14
  if (rank === 'K') return 13
  if (rank === 'Q') return 12
  if (rank === 'J') return 11
  if (rank === 'T') return 10
  return Number(rank)
}

export function rangeStrengthModifier(strength: PerceivedOpponentRange['strength']): { fold: number; call: number; raise: number } {
  switch (strength) {
    case 'very-strong':
      return { fold: 6, call: 3, raise: -10 }
    case 'strong':
      return { fold: 3, call: 1, raise: -5 }
    case 'moderate':
      return { fold: 0, call: 0, raise: 0 }
    case 'weak':
      return { fold: -5, call: 3, raise: 5 }
    case 'very-weak':
      return { fold: -8, call: 5, raise: 8 }
    default:
      return { fold: 0, call: 0, raise: 0 }
  }
}
