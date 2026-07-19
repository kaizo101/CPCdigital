import { describe, expect, it } from 'vitest'
import {
  calculateChipUnit,
  formatChipInput,
  formatChips,
  parseChipInput,
  sanitizeChipInput,
  snapToChipUnit,
} from './format'

describe('chip formatting', () => {
  it('omits redundant decimals from whole chip values', () => {
    expect(formatChips(100)).toBe('€100')
    expect(formatChipInput(100)).toBe('100')
  })

  it('keeps only decimals that are actually part of the amount', () => {
    expect(formatChips(0.1)).toBe('€0,10')
    expect(formatChipInput(0.1)).toBe('0,1')
    expect(formatChipInput(0.15)).toBe('0,15')
  })

  it('accepts editable amounts with a decimal comma or point', () => {
    expect(sanitizeChipInput('370')).toBe('370')
    expect(sanitizeChipInput('0,157')).toBe('0,15')
    expect(sanitizeChipInput('0.1.2')).toBe('0.12')
    expect(parseChipInput('0,15')).toBe(0.15)
    expect(parseChipInput('0.15')).toBe(0.15)
    expect(parseChipInput('')).toBeNull()
  })
})

describe('calculateChipUnit', () => {
  it('supports asymmetric micro-stakes blinds without rounding 3 BB up', () => {
    const chipUnit = calculateChipUnit(0.02, 0.05)

    expect(chipUnit).toBe(0.01)
    expect(snapToChipUnit(0.05 * 3, 0.10, chipUnit, 'up')).toBe(0.15)
  })

  it('keeps natural whole-chip steps for larger blinds', () => {
    expect(calculateChipUnit(10, 20)).toBe(10)
    expect(calculateChipUnit(0.05, 0.10)).toBe(0.05)
  })
})
