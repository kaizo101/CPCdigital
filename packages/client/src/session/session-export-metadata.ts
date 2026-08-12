export interface CapturedTimestamp {
  iso: string
  timeZone: string
  utcOffsetMinutes: number
}

export function captureTimestamp(now = new Date()): CapturedTimestamp {
  return {
    iso: now.toISOString(),
    timeZone: resolvedTimeZone(),
    utcOffsetMinutes: -now.getTimezoneOffset(),
  }
}

export function createSessionId(startedAt: string): string {
  const date = new Date(startedAt)
  if (!Number.isFinite(date.getTime())) throw new Error('Cannot create a session ID from an invalid timestamp')
  return `S${date.toISOString().replace(/[-:.]/g, '')}`
}

export function createArchiveId(exportedAt: string): string {
  return `A${createSessionId(exportedAt).slice(1)}`
}

export function formatLocalTimestamp(
  iso: string,
  timeZone?: string,
  utcOffsetMinutes?: number,
): string {
  const instant = new Date(iso)
  if (!Number.isFinite(instant.getTime())) return iso
  if (utcOffsetMinutes == null || !Number.isFinite(utcOffsetMinutes)) return instant.toISOString()

  const local = new Date(instant.getTime() + utcOffsetMinutes * 60_000)
  const date = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`
  const time = `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`
  const offset = formatUtcOffset(utcOffsetMinutes)
  return timeZone ? `${date} ${time} ${timeZone} (${offset})` : `${date} ${time} ${offset}`
}

export function handReference(sessionId: string | undefined, handNumber: number): string {
  const hand = `H${String(handNumber).padStart(4, '0')}`
  return sessionId ? `${sessionId}/${hand}` : hand
}

export function safeIdSegment(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, '-')
}

function resolvedTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

function formatUtcOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-'
  const absolute = Math.abs(Math.trunc(minutes))
  return `UTC${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
