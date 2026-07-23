import type { BotIdentity, BotRoster } from './bot-identities'
import {
  BOT_ROSTER_SCHEMA_VERSION,
  DEFAULT_BOT_ROSTER,
  generateBotRoster,
  rollRebuyPolicy,
} from './bot-identities'
import type { BotArchetypeId } from './bot-archetypes'
import { BOT_ARCHETYPE_IDS } from './bot-archetypes'

const STORAGE_KEY_ROSTER = 'cpcdigital:bot-roster'
const STORAGE_KEY_SESSION_LOG = 'cpcdigital:session-log'

export interface SessionLogEntry {
  sessionStartedAt: string
  identityIds: string[]
}

export interface PersistentRosterState {
  roster: BotRoster
  sessionLog: SessionLogEntry[]
}

export function loadPersistentRoster(): PersistentRosterState {
  try {
    const storedRoster = localStorage.getItem(STORAGE_KEY_ROSTER)
    const storedLog = localStorage.getItem(STORAGE_KEY_SESSION_LOG)

    const roster: BotRoster = storedRoster
      ? JSON.parse(storedRoster) as BotRoster
      : DEFAULT_BOT_ROSTER

    // Migration: add rebuyPolicy to identities that don't have it (pre-v0.6)
    let needsSave = false
    for (const identity of roster.identities) {
      if (!identity.rebuyPolicy) {
        identity.rebuyPolicy = rollRebuyPolicy(identity.archetypeId, identity.maniac, () => Math.random())
        needsSave = true
      }
    }
    if (needsSave) saveRoster(roster)

    const sessionLog: SessionLogEntry[] = storedLog
      ? JSON.parse(storedLog) as SessionLogEntry[]
      : []

    if (!storedRoster && !needsSave) {
      saveRoster(roster)
    }

    return { roster, sessionLog }
  } catch {
    const roster = DEFAULT_BOT_ROSTER
    saveRoster(roster)
    return { roster, sessionLog: [] }
  }
}

export function saveRoster(roster: BotRoster): void {
  try {
    localStorage.setItem(STORAGE_KEY_ROSTER, JSON.stringify(roster))
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function recordSession(identityIds: string[]): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SESSION_LOG)
    const log: SessionLogEntry[] = stored
      ? JSON.parse(stored) as SessionLogEntry[]
      : []

    log.push({
      sessionStartedAt: new Date().toISOString(),
      identityIds,
    })

    const trimmed = log.length > 50 ? log.slice(log.length - 50) : log
    localStorage.setItem(STORAGE_KEY_SESSION_LOG, JSON.stringify(trimmed))
  } catch {
    // silently ignore
  }
}

export function getIdentityAppearanceCounts(
  identityIds: string[],
  sessionLog: SessionLogEntry[],
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const id of identityIds) counts.set(id, 0)
  for (const entry of sessionLog) {
    for (const id of entry.identityIds) {
      const current = counts.get(id)
      if (current !== undefined) {
        counts.set(id, current + 1)
      }
    }
  }
  return counts
}

export function selectReturningSessionIdentities(
  roster: BotRoster,
  count: number,
  sessionLog: SessionLogEntry[],
  random: () => number,
): BotIdentity[] {
  if (count === 0) return []
  if (count > roster.identities.length) {
    throw new Error(`Cannot select ${count} bots from ${roster.identities.length} identities`)
  }

  const recentIds = new Set<string>()
  if (sessionLog.length > 0) {
    const lastSessions = sessionLog.slice(Math.max(0, sessionLog.length - 5))
    for (const entry of lastSessions) {
      for (const id of entry.identityIds) recentIds.add(id)
    }
  }

  const identityMap = new Map(roster.identities.map(i => [i.id, i]))
  const returning = roster.identities.filter(i => recentIds.has(i.id))
  const fresh = roster.identities.filter(i => !recentIds.has(i.id))

  shuffleInline(returning, random)
  shuffleInline(fresh, random)

  const archetypesWanted = randomArchetypeSpread(count, random)
  const selected: BotIdentity[] = []
  const freshQueue = [...fresh]

  for (const archetypeId of archetypesWanted) {
    const returningCandidate = returning.find(i => i.archetypeId === archetypeId)
    if (returningCandidate) {
      returning.splice(returning.indexOf(returningCandidate), 1)
      selected.push(returningCandidate)
    } else {
      const freshCandidate = freshQueue.find(i => i.archetypeId === archetypeId)
      if (freshCandidate) {
        freshQueue.splice(freshQueue.indexOf(freshCandidate), 1)
        selected.push(freshCandidate)
      }
    }
  }

  for (let i = 0; i < selected.length && i < count; i++) {
    if (!selected[i]) {
      const fallback = freshQueue.shift() ?? returning.shift()
      if (fallback) selected[i] = fallback
    }
  }

  return selected.slice(0, count)
}

function randomArchetypeSpread(count: number, random: () => number): BotArchetypeId[] {
  const ids = [...BOT_ARCHETYPE_IDS] as BotArchetypeId[]
  const spread: BotArchetypeId[] = []

  const weights: Record<BotArchetypeId, number> = {
    tag: 3, nit: 2, lag: 3, 'calling-station': 2,
  }
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0)

  for (let i = 0; i < count; i++) {
    let roll = random() * totalWeight
    for (const id of ids) {
      roll -= weights[id]
      if (roll <= 0) {
        spread.push(id)
        break
      }
    }
    if (spread.length <= i) spread.push(ids[ids.length - 1])
  }

  return spread
}

function shuffleInline<T>(values: T[], random: () => number): void {
  for (let i = values.length - 1; i > 0; i--) {
    const target = Math.min(i, Math.floor(random() * (i + 1)))
    const tmp = values[i]
    values[i] = values[target]
    values[target] = tmp
  }
}
