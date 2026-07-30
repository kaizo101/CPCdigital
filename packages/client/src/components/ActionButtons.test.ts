import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ActionButtons, getAggressiveActionForAmount } from './ActionButtons'

const compactProps = {
  isMyTurn: true,
  canCheck: false,
  canRaise: true,
  canFold: true,
  canAct: true,
  toCall: 20,
  currentBet: 20,
  minRaise: 40,
  maxRaise: 2_000,
  potRaiseTo: 80,
  stepSize: 10,
  bigBlind: 20,
  raiseAmount: 40,
  setRaiseAmount: vi.fn(),
  onAction: vi.fn(),
  currency: 'EUR' as const,
}

describe('ActionButtons aggressive action', () => {
  it('keeps a pot-limit maximum as a regular raise when a full raise is legal', () => {
    expect(getAggressiveActionForAmount(300, true)).toEqual({ type: 'raise', amount: 300 })
  })

  it('uses all-in only when the stack is too short for a full raise', () => {
    expect(getAggressiveActionForAmount(35, false)).toEqual({ type: 'all-in' })
  })

  it('renders the large slider controls in the Android action bar', () => {
    const markup = renderToStaticMarkup(createElement(ActionButtons, {
      ...compactProps,
      variant: 'androidCompact',
    }))

    expect(markup).toContain('data-testid="compact-action-bar"')
    expect(markup).toContain('data-variant="androidCompact"')
    expect(markup).toContain('aria-label="Freie Einsatzhöhe eingeben"')
    expect(markup).toContain('class="compact-preset-dock"')
    expect(markup).toContain('class="compact-slider-scale"')
    expect(markup).toContain('>3 BB</button>')
    expect(markup).toContain('>Pot</button>')
    expect(markup).toContain('>Max</button>')
    expect(markup).not.toContain('>Min</button>')
    expect(markup).toContain('repeat(3, minmax(82px, 1fr))')
    expect(markup).toContain('type="range"')
    expect(markup).toContain('aria-label="Einsatz verringern"')
    expect(markup).toContain('aria-label="Einsatz erhöhen"')
  })

  it('keeps the compact web fallback free of the persistent slider', () => {
    const markup = renderToStaticMarkup(createElement(ActionButtons, {
      ...compactProps,
      variant: 'webCompact',
    }))

    expect(markup).toContain('data-variant="webCompact"')
    expect(markup).toContain('aria-label="Einsatzhöhe"')
    expect(markup).not.toContain('aria-label="Freie Einsatzhöhe eingeben"')
    expect(markup).not.toContain('class="compact-preset-dock"')
    expect(markup).not.toContain('type="range"')
  })
})
