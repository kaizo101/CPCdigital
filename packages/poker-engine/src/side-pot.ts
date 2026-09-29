import type { PlayerId, SidePot } from '@cpc/shared'

interface Contribution {
  playerId: PlayerId
  totalBet: number  // total chips put in this hand
  inHand: boolean   // false = folded (can't contest a live pot)
  /** Order of a fold, used only when a pot layer became uncontested before showdown. */
  foldOrder?: number
}

/**
 * Calculates side pots from player contributions.
 *
 * Algorithm: for each unique bet level (lowest to highest), compute the sub-pot
 * for that increment and determine who is eligible to win it.
 * Folded players contribute chips but cannot contest a live pot. If everyone
 * who contributed to a layer has since folded, the last folder had already
 * won that layer uncontested while their hand was still live.
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
      const liveEligible = atLevel.filter(c => c.inHand).map(c => c.playerId)
      const lastLiveContributor = liveEligible.length === 0
        ? atLevel.reduce<(typeof atLevel)[number] | null>((latest, contributor) =>
          contributor.foldOrder != null
          && (latest?.foldOrder == null || contributor.foldOrder > latest.foldOrder)
            ? contributor
            : latest,
        null)
        : null
      const eligible = liveEligible.length > 0
        ? liveEligible
        : lastLiveContributor ? [lastLiveContributor.playerId] : []
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
