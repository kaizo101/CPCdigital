import { describe, expect, it } from 'vitest'
import {
  calculateChipUnit,
  calculateStartingStack,
  calculateThreeXRaise,
  formatChipInput,
  formatChips,
  isMaximumChipAmount,
  parseChipInput,
  sanitizeChipInput,
  snapToChipUnit,
} from './format'

describe('chip formatting', () => {
  it('omits redundant decimals from whole chip values', () => {
    expect(formatChips(100)).toBe('100\u00a0€')
    expect(formatChipInput(100)).toBe('100')
  })

  it('keeps only decimals that are actually part of the amount', () => {
    expect(formatChips(0.1)).toBe('0,10\u00a0€')
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

  it('places the dollar sign before and the euro sign after the amount', () => {
    expect(formatChips(1234.5, 'USD')).toBe('$1.234,50')
    expect(formatChips(1234.5, 'EUR')).toBe('1.234,50\u00a0€')
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

describe('calculateStartingStack', () => {
  it('derives a 100 BB stack from whole and micro-stakes blinds', () => {
    expect(calculateStartingStack(20)).toBe(2000)
    expect(calculateStartingStack(0.05)).toBe(5)
  })
})

describe('calculateThreeXRaise', () => {
  it('uses three big blinds for an unopened pot', () => {
    expect(calculateThreeXRaise(5, 5)).toBe(15)
  })

  it('uses three times the previous raise-to amount for a reraise', () => {
    expect(calculateThreeXRaise(15, 5)).toBe(45)
  })

  it('keeps micro-stakes values cent-accurate', () => {
    expect(calculateThreeXRaise(0.15, 0.05)).toBe(0.45)
  })
})

describe('isMaximumChipAmount', () => {
  it('recognizes the rightmost slider value as the maximum', () => {
    expect(isMaximumChipAmount(1000, 1000)).toBe(true)
    expect(isMaximumChipAmount(999, 1000)).toBe(false)
  })

  it('compares micro-stakes values at cent precision', () => {
    expect(isMaximumChipAmount(0.30000000000000004, 0.30)).toBe(true)
  })
})
