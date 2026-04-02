import type { PlayerId, SidePot } from '@cpc/shared'

interface Contribution {
  playerId: PlayerId
  totalBet: number  // total chips put in this hand
  inHand: boolean   // false = folded (can't win)
}

/**
 * Calculates side pots from player contributions.
 *
 * Algorithm: for each unique bet level (lowest to highest), compute the sub-pot
 * for that increment and determine who is eligible to win it.
 * Folded players contribute chips but can't win any pot.
 */
export function calculateSidePots(contributions: Contribution[]): SidePot[] {
  const withBets = contributions.filter(c => c.totalBet > 0)
  if (withBets.length === 0) return []

  const levels = [...new Set(withBets.map(c => c.totalBet))].sort((a, b) => a - b)
  const pots: SidePot[] = []
  let previousLevel = 0

  for (const level of levels) {
    const increment = level - previousLevel
    // Players who contributed at least up to this level
    const atLevel = withBets.filter(c => c.totalBet >= level)
    const potAmount = increment * atLevel.length

    if (potAmount > 0) {
      const eligible = atLevel.filter(c => c.inHand).map(c => c.playerId)
      pots.push({ amount: potAmount, eligiblePlayerIds: eligible })
    }

    previousLevel = level
  }

  return pots
}
