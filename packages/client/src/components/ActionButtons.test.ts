import { describe, expect, it } from 'vitest'
import { getAggressiveActionForAmount } from './ActionButtons'

describe('ActionButtons aggressive action', () => {
  it('keeps a pot-limit maximum as a regular raise when a full raise is legal', () => {
    expect(getAggressiveActionForAmount(300, true)).toEqual({ type: 'raise', amount: 300 })
  })

  it('uses all-in only when the stack is too short for a full raise', () => {
    expect(getAggressiveActionForAmount(35, false)).toEqual({ type: 'all-in' })
  })
})
