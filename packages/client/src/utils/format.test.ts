import { describe, expect, it } from 'vitest'
import { calculateChipUnit, snapToChipUnit } from './format'

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
