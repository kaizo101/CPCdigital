import type { HandReplay } from './hand-replay'
import { formatHandHistory } from './hand-replay'

export interface PlayerSessionStats {
  hands: number
  vpipHands: number
  pfrHands: number
  threeBetOpportunities: number
  threeBets: number
}

export interface SessionStatsData {
  players: Record<string, PlayerSessionStats>
  heroBBWon: number
  totalHands: number
  variantId: string
  bigBlind: number
}

export function createSessionStats(variantId: string, bigBlind: number): SessionStatsData {
  return {
    players: {},
    heroBBWon: 0,
    totalHands: 0,
    variantId,
    bigBlind,
  }
}

export function recordHand(
  stats: SessionStatsData,
  playerIds: string[],
  heroId: string,
  handNumber: number,
  results: { playerId: string; amount: number }[],
  events: readonly { type: string; playerId?: string; action?: { type: string } }[],
): void {
  stats.totalHands = handNumber

  const preflopEvents = events.filter(e => e.type === 'PlayerActed')
  const preflopRaises = preflopEvents.filter(e => e.action?.type === 'raise').length
  const threeBetSenders = new Set<string>()

  for (const event of preflopEvents) {
    if (!event.playerId) continue
    const ps = ensurePlayer(stats, event.playerId)
    ps.hands++

    if (event.action?.type === 'call' || event.action?.type === 'raise' || event.action?.type === 'all-in') {
      ps.vpipHands++
    }
    if (event.action?.type === 'raise' || event.action?.type === 'all-in') {
      if (preflopRaises > 1) threeBetSenders.add(event.playerId)
      ps.pfrHands++
    }
  }

  for (const playerId of playerIds) {
    const ps = ensurePlayer(stats, playerId)
    if (threeBetSenders.has(playerId)) ps.threeBets++
    if (preflopRaises > 0) ps.threeBetOpportunities++
  }

  const heroResult = results.find(r => r.playerId === heroId)
  if (heroResult) {
    stats.heroBBWon += heroResult.amount / stats.bigBlind
  }
}

export function getPlayerVPIP(stats: SessionStatsData, playerId: string): number {
  const ps = stats.players[playerId]
  if (!ps || ps.hands === 0) return 0
  return (ps.vpipHands / ps.hands) * 100
}

export function getPlayerPFR(stats: SessionStatsData, playerId: string): number {
  const ps = stats.players[playerId]
  if (!ps || ps.hands === 0) return 0
  return (ps.pfrHands / ps.hands) * 100
}

export function getPlayer3Bet(stats: SessionStatsData, playerId: string): number {
  const ps = stats.players[playerId]
  if (!ps || ps.threeBetOpportunities === 0) return 0
  return (ps.threeBets / ps.threeBetOpportunities) * 100
}

export function getBBPer100(stats: SessionStatsData): number {
  if (stats.totalHands === 0) return 0
  return (stats.heroBBWon / stats.totalHands) * 100
}

export function exportSessionLog(stats: SessionStatsData, replays: HandReplay[]): string {
  const lines: string[] = []
  lines.push(`CPCdigital Session — ${replays.length} hands`)
  lines.push(`Variant: ${stats.variantId === 'omaha-high' ? 'Omaha Pot Limit' : 'Hold\'em No Limit'}`)
  lines.push(`Result: ${stats.heroBBWon >= 0 ? '+' : ''}${stats.heroBBWon.toFixed(2)} BB · ${getBBPer100(stats).toFixed(1)} BB/100`)
  lines.push('='.repeat(50))
  lines.push('')

  for (const replay of replays) {
    lines.push(formatHandHistory(replay))
    lines.push('')
  }

  return lines.join('\n')
}

function ensurePlayer(stats: SessionStatsData, playerId: string): PlayerSessionStats {
  if (!stats.players[playerId]) {
    stats.players[playerId] = {
      hands: 0,
      vpipHands: 0,
      pfrHands: 0,
      threeBetOpportunities: 0,
      threeBets: 0,
    }
  }
  return stats.players[playerId]
}
