import { describe, expect, it } from 'vitest'
import { getPloPreflopAction } from './bot-category-scores'

describe('getPloPreflopAction', () => {
  it('TAG: raises premium when facing an open', () => {
    expect(getPloPreflopAction('tag', 'facing-open', 'premium')).toBe('raise')
  })

  it('TAG: only premium/strong raise when facing an open (good+ call, no marginal 3-bet)', () => {
    expect(getPloPreflopAction('tag', 'facing-open', 'premium')).toBe('raise')
    expect(getPloPreflopAction('tag', 'facing-open', 'strong')).toBe('raise')
    expect(getPloPreflopAction('tag', 'facing-open', 'good')).toBe('call')
    expect(getPloPreflopAction('tag', 'facing-open', 'medium')).toBe('call')
    expect(getPloPreflopAction('tag', 'facing-open', 'marginal')).toBe('fold')
  })

  it('TAG: reraises only premium facing a 3-bet', () => {
    expect(getPloPreflopAction('tag', 'facing-3bet', 'premium')).toBe('raise')
    expect(getPloPreflopAction('tag', 'facing-3bet', 'strong')).toBe('call')
    expect(getPloPreflopAction('tag', 'facing-3bet', 'good')).toBe('call')
    expect(getPloPreflopAction('tag', 'facing-3bet', 'medium')).toBe('fold')
  })

  it('LAG: calls medium when facing an open (good+ call, no 3-bet)', () => {
    expect(getPloPreflopAction('lag', 'facing-open', 'medium')).toBe('call')
    expect(getPloPreflopAction('lag', 'facing-open', 'marginal')).toBe('call')
  })

  it('LAG: reraises only strong+ facing a 3-bet', () => {
    expect(getPloPreflopAction('lag', 'facing-3bet', 'strong')).toBe('raise')
    expect(getPloPreflopAction('lag', 'facing-3bet', 'good')).toBe('fold')
  })

  it('Nit: only premium/strong raise facing an open', () => {
    expect(getPloPreflopAction('nit', 'facing-open', 'premium')).toBe('raise')
    expect(getPloPreflopAction('nit', 'facing-open', 'strong')).toBe('raise')
    expect(getPloPreflopAction('nit', 'facing-open', 'good')).toBe('call')
    expect(getPloPreflopAction('nit', 'facing-open', 'medium')).toBe('fold')
  })

  it('Calling Station: opens with premium/strong (good calls), never raises facing a 3-bet', () => {
    expect(getPloPreflopAction('calling-station', 'unopened', 'premium')).toBe('raise')
    expect(getPloPreflopAction('calling-station', 'unopened', 'strong')).toBe('raise')
    expect(getPloPreflopAction('calling-station', 'unopened', 'good')).toBe('call')
    expect(getPloPreflopAction('calling-station', 'unopened', 'medium')).toBe('fold')
  })

  it('Calling Station: never raises facing a 3-bet, only calls premium', () => {
    expect(getPloPreflopAction('calling-station', 'facing-3bet', 'premium')).toBe('call')
    expect(getPloPreflopAction('calling-station', 'facing-3bet', 'strong')).toBe('fold')
    expect(getPloPreflopAction('calling-station', 'facing-3bet', 'good')).toBe('fold')
  })

  it('defaults to fold for missing entries', () => {
    expect(getPloPreflopAction('tag', 'facing-open', 'weak')).toBe('fold')
    expect(getPloPreflopAction('tag', 'facing-open', 'air')).toBe('fold')
  })

  it('defaults to TAG when archetypeId is undefined', () => {
    expect(getPloPreflopAction(undefined, 'facing-open', 'premium')).toBe('raise')
    expect(getPloPreflopAction(undefined, 'facing-open', 'medium')).toBe('call')
    expect(getPloPreflopAction(undefined, 'facing-open', 'good')).toBe('call')
  })
})
