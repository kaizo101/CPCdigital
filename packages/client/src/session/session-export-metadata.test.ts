import { describe, expect, it } from 'vitest'
import {
  createArchiveId,
  createSessionId,
  formatLocalTimestamp,
  handReference,
  safeIdSegment,
} from './session-export-metadata'

describe('session export metadata', () => {
  it('creates stable filesystem-safe session and archive IDs', () => {
    expect(createSessionId('2026-08-12T12:42:01.511Z')).toBe('S20260812T124201511Z')
    expect(createArchiveId('2026-08-12T12:42:01.511Z')).toBe('A20260812T124201511Z')
    expect(safeIdSegment('S1/H0007')).toBe('S1-H0007')
  })

  it('formats the captured local offset explicitly instead of presenting UTC as local time', () => {
    expect(formatLocalTimestamp(
      '2026-08-12T12:42:01.511Z',
      'Europe/Berlin',
      120,
    )).toBe('2026-08-12 14:42:01 Europe/Berlin (UTC+02:00)')
  })

  it('keeps hand references unique within their session', () => {
    expect(handReference('S20260812T124201511Z', 7)).toBe('S20260812T124201511Z/H0007')
    expect(handReference(undefined, 7)).toBe('H0007')
  })
})
