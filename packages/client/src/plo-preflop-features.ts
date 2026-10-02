import type { Card } from '@cpc/shared'

/** PLO4-only structure, not a hand ranking or an estimate of nut probability. */
export interface PloPreflopProfile {
  highestPairRank: number
  distinctRanks: number
  suitShape: 'rainbow' | 'single-suited' | 'double-suited' | 'triple-suited' | 'monotone'
  /** One entry per suit with at least two hole cards; at most two usable suits. */
  usableSuitHighRanks: number[]
  nutSuitCount: number
  /** Four distinct ranks in one five-rank straight window (including the wheel). */
  coordinatedRundown: number
}

const RANKS = '23456789TJQKA'
const STRAIGHT_WINDOWS = [
  [14, 2, 3, 4, 5],
  ...Array.from({ length: 9 }, (_, start) =>
    Array.from({ length: 5 }, (_, offset) => start + offset + 2)),
]

export function analyzePloPreflopFeatures(cards: readonly Card[]): PloPreflopProfile {
  if (cards.length !== 4) throw new Error('PLO4 preflop features require exactly four hole cards')

  const ranks = cards.map(card => RANKS.indexOf(card.rank) + 2)
  const rankCounts = new Map<number, number>()
  const suitGroups = new Map<Card['suit'], number[]>()
  for (let index = 0; index < cards.length; index++) {
    const rank = ranks[index]
    rankCounts.set(rank, (rankCounts.get(rank) ?? 0) + 1)
    const group = suitGroups.get(cards[index].suit) ?? []
    group.push(rank)
    suitGroups.set(cards[index].suit, group)
  }

  const suitCounts = [...suitGroups.values()].map(group => group.length).sort((a, b) => b - a)
  const suitShape: PloPreflopProfile['suitShape'] = suitCounts[0] === 4 ? 'monotone'
    : suitCounts[0] === 3 ? 'triple-suited'
      : suitCounts[0] === 2 && suitCounts[1] === 2 ? 'double-suited'
        : suitCounts[0] === 2 ? 'single-suited' : 'rainbow'
  const usableSuitHighRanks = [...suitGroups.values()]
    .filter(group => group.length >= 2)
    .map(group => Math.max(...group))
    .sort((a, b) => b - a)
  const coordinatedRundown = rankCounts.size === 4
    && STRAIGHT_WINDOWS.some(window => window.filter(rank => rankCounts.has(rank)).length === 4)
    ? 1 : 0

  return {
    highestPairRank: Math.max(0, ...[...rankCounts].filter(([, count]) => count >= 2).map(([rank]) => rank)),
    distinctRanks: rankCounts.size,
    suitShape,
    usableSuitHighRanks,
    nutSuitCount: usableSuitHighRanks.filter(rank => rank === 14).length,
    coordinatedRundown,
  }
}
