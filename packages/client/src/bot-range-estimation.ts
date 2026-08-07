import type { OpponentLine, StreetAnalysis } from './bot-street-analysis'

export interface PerceivedOpponentRange {
  playerId: string
  strength: 'very-strong' | 'strong' | 'moderate' | 'weak' | 'very-weak' | 'unknown'
  summary: string
}

export function estimateOpponentRanges(
  analysis: StreetAnalysis,
): PerceivedOpponentRange[] {
  const ranges: PerceivedOpponentRange[] = []

  for (const line of analysis.opponentLines.values()) {
    ranges.push(estimateRangeFromLine(line))
  }

  return ranges
}

export function estimateRangeFromLine(line: OpponentLine): PerceivedOpponentRange {
  if (line.preflop === 'folded') {
    return { playerId: line.playerId, strength: 'unknown', summary: 'folded preflop' }
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

  return { playerId: line.playerId, strength, summary }
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
