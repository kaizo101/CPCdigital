import db from './db.js'
import type { HandRecord, HandReplayEvent, HandSummary, SessionStats } from '@cpc/shared'
import type { HandEvent, GameConfig } from '@cpc/poker-engine'
import type { HandResult, Player } from '@cpc/shared'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS hand_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    hand_number   INTEGER NOT NULL,
    pot           INTEGER NOT NULL,
    timestamp     INTEGER NOT NULL,
    players_json  TEXT NOT NULL,
    events_json   TEXT NOT NULL,
    results_json  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS session_stats (
    player_id     TEXT PRIMARY KEY,
    player_name   TEXT NOT NULL,
    hands_played  INTEGER NOT NULL DEFAULT 0,
    vpip_hands    INTEGER NOT NULL DEFAULT 0,
    chips_start   INTEGER NOT NULL DEFAULT 0,
    chips_end     INTEGER NOT NULL DEFAULT 0
  );
`)

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

let handCounter = 0

export function saveHand(
  players: Player[],
  events: readonly HandEvent[],
  results: HandResult[],
): void {
  handCounter++
  const pot = results.reduce((s, r) => s + r.amount, 0)
  const timestamp = Date.now()

  const initialPlayers = players.map(p => ({ id: p.id, name: p.name, chips: p.chips }))

  // Enrich events: replace playerId with playerName for display
  const nameMap = new Map(players.map(p => [p.id, p.name]))
  const enriched: HandReplayEvent[] = events.map(e => {
    switch (e.type) {
      case 'HandStarted':
        return {
          type: 'HandStarted',
          variantId: e.variantId,
          dealerName: nameMap.get(e.dealerId) ?? e.dealerId,
          smallBlind: e.smallBlind,
          bigBlind: e.bigBlind,
          players: e.players.map(player => ({
            playerName: nameMap.get(player.playerId) ?? player.playerId,
            seatIndex: player.seatIndex,
            startingChips: player.startingChips,
          })),
        }
      case 'BlindPosted':
        return {
          type: 'BlindPosted',
          phase: e.phase,
          playerName: nameMap.get(e.playerId) ?? e.playerId,
          amount: e.amount,
          totalBet: e.totalBet,
          blindType: e.blindType,
        }
      case 'PlayerActed': {
        return {
          type: 'PlayerActed',
          phase: e.phase,
          playerName: nameMap.get(e.playerId) ?? e.playerId,
          action: e.action.type,
          amount: e.amount,
          totalBet: e.totalBet,
          toCall: e.toCall,
          currentBetBefore: e.currentBetBefore,
          potAfter: e.potAfter,
          source: e.source,
        }
      }
      case 'CommunityCardDealt':
        return { ...e }
      case 'UncalledBetReturned':
        return {
          type: 'UncalledBetReturned',
          phase: e.phase,
          playerName: nameMap.get(e.playerId) ?? e.playerId,
          amount: e.amount,
        }
      case 'CardsRevealed':
        return { type: 'CardsRevealed', playerName: nameMap.get(e.playerId) ?? e.playerId, cards: e.cards }
      case 'PotAwarded':
        return {
          type: 'PotAwarded',
          potIndex: e.potIndex,
          potType: e.potType,
          playerName: nameMap.get(e.playerId) ?? e.playerId,
          amount: e.amount,
          handName: e.handName,
          isSplit: e.isSplit,
        }
      case 'HandEnded':
        return {
          type: 'HandEnded',
          reason: e.reason,
          totalPot: e.totalPot,
          results: e.results.map(result => ({
            playerName: nameMap.get(result.playerId) ?? result.playerId,
            amount: result.amount,
            handName: result.handName,
          })),
        }
    }
  })

  const enrichedResults = results.map(r => ({
    playerName: nameMap.get(r.playerId) ?? r.playerId,
    amount: r.amount,
    handName: r.handName,
  }))

  db.prepare(`
    INSERT INTO hand_history (hand_number, pot, timestamp, players_json, events_json, results_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    handCounter,
    pot,
    timestamp,
    JSON.stringify(initialPlayers),
    JSON.stringify(enriched),
    JSON.stringify(enrichedResults),
  )

  // Update session stats
  updateStats(players, events, results)
}

function updateStats(players: Player[], events: readonly HandEvent[], results: HandResult[]): void {
  const nameMap = new Map(players.map(p => [p.id, p.name]))

  // Compute VPIP: players who called/raised/all-in preflop
  const vpipSet = new Set<string>()
  for (const e of events) {
    if (e.type === 'PlayerActed' && e.phase === 'preflop') {
      const t = e.action.type
      if (t === 'call' || t === 'raise' || t === 'all-in') {
        vpipSet.add(e.playerId)
      }
    }
  }

  // Net chip delta per player (positive = won chips)
  const deltaMap = new Map<string, number>()
  for (const r of results) deltaMap.set(r.playerId, (deltaMap.get(r.playerId) ?? 0) + r.amount)

  // Subtract what they put in (from hand start chips vs current)
  // Simplification: track total pots won vs starting chips per hand
  // We use results (pots won) and totalHandBets is not exposed, so approximate:
  // chipsDelta for session is updated in aggregate across all hands

  const upsert = db.prepare(`
    INSERT INTO session_stats (player_id, player_name, hands_played, vpip_hands, chips_start, chips_end)
    VALUES (@id, @name, 1, @vpip, @chips, @chips)
    ON CONFLICT(player_id) DO UPDATE SET
      player_name  = @name,
      hands_played = hands_played + 1,
      vpip_hands   = vpip_hands + @vpip,
      chips_end    = @chips
  `)

  for (const p of players) {
    if (p.status === 'waiting') continue  // wasn't in this hand
    upsert.run({
      id: p.id,
      name: p.name,
      vpip: vpipSet.has(p.id) ? 1 : 0,
      chips: p.chips,
    })
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function getHandSummaries(): HandSummary[] {
  const rows = db.prepare(`
    SELECT id, hand_number, pot, timestamp, results_json
    FROM hand_history
    ORDER BY id DESC
    LIMIT 50
  `).all() as { id: number; hand_number: number; pot: number; timestamp: number; results_json: string }[]

  return rows.map(r => ({
    id: r.id,
    handNumber: r.hand_number,
    pot: r.pot,
    timestamp: r.timestamp,
    results: JSON.parse(r.results_json),
  }))
}

export function getHandRecord(id: number): HandRecord | null {
  const row = db.prepare(`
    SELECT id, hand_number, pot, timestamp, players_json, events_json, results_json
    FROM hand_history WHERE id = ?
  `).get(id) as { id: number; hand_number: number; pot: number; timestamp: number; players_json: string; events_json: string; results_json: string } | undefined

  if (!row) return null

  return {
    id: row.id,
    handNumber: row.hand_number,
    pot: row.pot,
    timestamp: row.timestamp,
    initialPlayers: JSON.parse(row.players_json),
    events: JSON.parse(row.events_json),
    results: JSON.parse(row.results_json),
  }
}

export function getSessionStats(): SessionStats[] {
  const rows = db.prepare(`
    SELECT player_id, player_name, hands_played, vpip_hands, chips_start, chips_end
    FROM session_stats
    ORDER BY (chips_end - chips_start) DESC
  `).all() as { player_id: string; player_name: string; hands_played: number; vpip_hands: number; chips_start: number; chips_end: number }[]

  return rows.map(r => ({
    playerId: r.player_id,
    playerName: r.player_name,
    handsPlayed: r.hands_played,
    vpipHands: r.vpip_hands,
    vpip: r.hands_played > 0 ? Math.round((r.vpip_hands / r.hands_played) * 100) : 0,
    chipsDelta: r.chips_end - r.chips_start,
  }))
}
