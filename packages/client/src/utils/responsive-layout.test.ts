import { describe, expect, it } from 'vitest'
import { resolveResponsiveLayout } from './responsive-layout'

describe('resolveResponsiveLayout', () => {
  it('uses the portrait guard only for narrow portrait viewports', () => {
    expect(resolveResponsiveLayout(true, false)).toBe('phonePortrait')
  })

  it('uses the compact table for short landscape viewports', () => {
    expect(resolveResponsiveLayout(false, true)).toBe('compactLandscape')
  })

  it('keeps tablets and desktops on the regular layout', () => {
    expect(resolveResponsiveLayout(false, false)).toBe('desktop')
  })
})
