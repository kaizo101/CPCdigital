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
  const withBets = contributions
    .filter(c => Number.isFinite(c.totalBet) && c.totalBet > 0)
    .map(c => ({ ...c, totalBetCents: Math.round(c.totalBet * 100) }))
    .filter(c => c.totalBetCents > 0)
  if (withBets.length === 0) return []

  const levels = [...new Set(withBets.map(c => c.totalBetCents))].sort((a, b) => a - b)
  const pots: SidePot[] = []
  let previousLevel = 0

  for (const level of levels) {
    const increment = level - previousLevel
    // Players who contributed at least up to this level
    const atLevel = withBets.filter(c => c.totalBetCents >= level)
    const potAmountCents = increment * atLevel.length

    if (potAmountCents > 0) {
      const eligible = atLevel.filter(c => c.inHand).map(c => c.playerId)
      const previousPot = pots[pots.length - 1]
      const sameEligibility = previousPot != null
        && previousPot.eligiblePlayerIds.length === eligible.length
        && previousPot.eligiblePlayerIds.every((playerId, index) => playerId === eligible[index])

      if (sameEligibility) {
        previousPot.amount = (Math.round(previousPot.amount * 100) + potAmountCents) / 100
      } else {
        pots.push({ amount: potAmountCents / 100, eligiblePlayerIds: eligible })
      }
    }

    previousLevel = level
  }

  return pots
}
