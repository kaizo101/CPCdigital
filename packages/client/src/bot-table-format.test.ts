import { describe, expect, it } from 'vitest'
import { resolveTableFormat } from './bot-table-format'

describe('resolveTableFormat', () => {
  it('uses seated table size rather than players still active in a pot', () => {
    expect(resolveTableFormat(9)).toBe('full-ring')
    expect(resolveTableFormat(6)).toBe('six-max')
    expect(resolveTableFormat(2)).toBe('heads-up')
  })

  it('keeps intermediate supported table sizes in their structural family', () => {
    expect(resolveTableFormat(8)).toBe('full-ring')
    expect(resolveTableFormat(5)).toBe('six-max')
    expect(resolveTableFormat(3)).toBe('six-max')
  })

  it('rejects invalid seated table sizes', () => {
    expect(() => resolveTableFormat(1)).toThrow('Invalid table size')
    expect(() => resolveTableFormat(Number.NaN)).toThrow('Invalid table size')
  })
})
