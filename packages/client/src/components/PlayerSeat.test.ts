import { describe, expect, it } from 'vitest'
import { canPeekFoldedHeroCards } from './PlayerSeat'

describe('folded Hero card peek', () => {
  it('allows an explicit peek only for the folded Hero with retained cards', () => {
    expect(canPeekFoldedHeroCards(true, true, true)).toBe(true)
    expect(canPeekFoldedHeroCards(true, false, true)).toBe(false)
    expect(canPeekFoldedHeroCards(false, true, true)).toBe(false)
    expect(canPeekFoldedHeroCards(true, true, false)).toBe(false)
  })
})
