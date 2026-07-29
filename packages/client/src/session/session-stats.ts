import type { HandReplay } from './hand-replay'
import { formatHandHistory } from './hand-replay'
import type { HandEvent, PlayerAction } from '@cpc/shared'

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
  heroPrevChips: number | null
}

export function createSessionStats(variantId: string, bigBlind: number): SessionStatsData {
  return {
    players: {},
    heroBBWon: 0,
    totalHands: 0,
    variantId,
    bigBlind,
    heroPrevChips: null,
  }
}

export function recordHand(
  stats: SessionStatsData,
  heroId: string,
  heroChips: number,
  events: readonly HandEvent[],
): void {
  stats.totalHands++

  const heroResult = stats.heroPrevChips != null ? (heroChips - stats.heroPrevChips) : 0
  stats.heroBBWon += heroResult / stats.bigBlind
  stats.heroPrevChips = heroChips

  const handStart = events.find((event): event is Extract<HandEvent, { type: 'HandStarted' }> =>
    event.type === 'HandStarted'
  )
  const playerIds = handStart?.players.map(player => player.playerId) ?? []
  for (const playerId of playerIds) {
    ensurePlayer(stats, playerId).hands++
  }

  const preflopEvents = events.filter(
    (event): event is Extract<HandEvent, { type: 'PlayerActed' }> =>
      event.type === 'PlayerActed' && event.phase === 'preflop',
  )
  const vpipPlayers = new Set<string>()
  const pfrPlayers = new Set<string>()
  const actedPlayers = new Set<string>()
  const threeBetOpportunityPlayers = new Set<string>()
  const threeBetSenders = new Set<string>()
  let raiseCount = 0

  for (const event of preflopEvents) {
    const firstAction = !actedPlayers.has(event.playerId)
    if (firstAction && raiseCount === 1) {
      threeBetOpportunityPlayers.add(event.playerId)
    }
    actedPlayers.add(event.playerId)

    if (isVoluntaryPreflopAction(event.action)) {
      vpipPlayers.add(event.playerId)
    }
    if (isAggressivePreflopAction(event)) {
      pfrPlayers.add(event.playerId)
      if (raiseCount === 1) threeBetSenders.add(event.playerId)
      raiseCount++
    }
  }

  for (const playerId of vpipPlayers) ensurePlayer(stats, playerId).vpipHands++
  for (const playerId of pfrPlayers) ensurePlayer(stats, playerId).pfrHands++
  for (const playerId of threeBetOpportunityPlayers) {
    const ps = ensurePlayer(stats, playerId)
    if (threeBetSenders.has(playerId)) ps.threeBets++
    ps.threeBetOpportunities++
  }
}

function isVoluntaryPreflopAction(action: PlayerAction): boolean {
  return action.type === 'call' || action.type === 'raise' || action.type === 'all-in'
}

function isAggressivePreflopAction(
  event: Extract<HandEvent, { type: 'PlayerActed' }>,
): boolean {
  if (event.action.type === 'raise') return true
  return event.action.type === 'all-in' && event.totalBet > event.currentBetBefore
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
