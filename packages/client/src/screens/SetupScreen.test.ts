import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { SetupScreen } from './SetupScreen'

describe('SetupScreen', () => {
  const props = {
      options: {
        smallBlind: 10,
        bigBlind: 20,
        startingChips: 2_000,
        maxPlayers: 6,
      },
      setOptions: vi.fn(),
      botCount: 5,
      setBotCount: vi.fn(),
      onStart: vi.fn(),
      currency: 'EUR' as const,
      setCurrency: vi.fn(),
      rebuyEnabled: true,
      setRebuyEnabled: vi.fn(),
      variantId: 'texas-holdem',
      setVariantId: vi.fn(),
  }

  it('declares a readable dark color scheme for native web blind options', () => {
    const markup = renderToStaticMarkup(createElement(SetupScreen, {
      ...props,
      runtime: 'web',
    }))

    expect(markup).toContain('class="setup-blind-preset"')
    expect(markup).toContain('color-scheme:dark')
    expect(markup).toContain('.setup-blind-preset option')
    expect(markup).toContain('background: #16191e')
    expect(markup).toContain('color: #f3f4f6')
  })

  it('uses an app-controlled blind picker instead of the unreadable native Android select', () => {
    const markup = renderToStaticMarkup(createElement(SetupScreen, {
      ...props,
      runtime: 'android',
    }))

    expect(markup).toContain('class="setup-blind-picker"')
    expect(markup).toContain('aria-haspopup="listbox"')
    expect(markup).not.toContain('<select')
  })
})
