import { describe, expect, it } from 'vitest'
import { getPloPreflopAction, getPloScores } from './bot-category-scores'

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

  it('six-max: Nit opens by raising good hands (avoids limp cascade) and folds medium/marginal', () => {
    expect(getPloPreflopAction('nit', 'unopened', 'good', 6)).toBe('raise')
    expect(getPloPreflopAction('nit', 'unopened', 'medium', 6)).toBe('fold')
    expect(getPloPreflopAction('nit', 'unopened', 'marginal', 6)).toBe('fold')
    expect(getPloPreflopAction('nit', 'unopened', 'strong', 6)).toBe('raise')
    expect(getPloPreflopAction('nit', 'unopened', 'premium', 6)).toBe('raise')
  })

  it('six-max: Nit mixes calls and 3-bets with good hands facing an open', () => {
    expect(getPloPreflopAction('nit', 'facing-open', 'good', 6)).toBe('raise-or-call')
    expect(getPloPreflopAction('nit', 'facing-open', 'medium', 6)).toBe('call-or-fold')
    expect(getPloPreflopAction('nit', 'facing-open', 'good', 9)).toBe('call')
    expect(getPloPreflopAction('nit', 'facing-open', 'medium', 9)).toBe('fold')
  })

  it('six-max: Nit reraises strong facing a 3-bet (boosts 3-bet vs full ring)', () => {
    expect(getPloPreflopAction('nit', 'facing-3bet', 'strong', 6)).toBe('raise')
    expect(getPloPreflopAction('nit', 'facing-3bet', 'strong', 9)).toBe('call')
    expect(getPloPreflopAction('nit', 'facing-3bet', 'premium', 6)).toBe('raise')
  })

  it('six-max: full-ring Nit table unchanged for non-Nit archetypes', () => {
    expect(getPloPreflopAction('tag', 'unopened', 'good', 6)).toBe('raise')
    expect(getPloPreflopAction('tag', 'facing-3bet', 'strong', 6)).toBe('call')
  })

  it('six-max: Calling Station re-raises strong facing an open but keeps unopened/facing-3bet from full ring', () => {
    expect(getPloPreflopAction('calling-station', 'facing-open', 'strong', 6)).toBe('raise')
    expect(getPloPreflopAction('calling-station', 'facing-open', 'strong', 9)).toBe('call')
    expect(getPloPreflopAction('calling-station', 'facing-open', 'premium', 6)).toBe('raise')
    expect(getPloPreflopAction('calling-station', 'facing-open', 'good', 6)).toBe('call')
    expect(getPloPreflopAction('calling-station', 'unopened', 'good', 6)).toBe('call')
    expect(getPloPreflopAction('calling-station', 'facing-3bet', 'premium', 6)).toBe('call')
  })
})

describe('getPloScores (six-max postflop)', () => {
  it('full ring (default and tableSize 9) returns the full-ring table', () => {
    expect(getPloScores('lag', 'turn-river')).toBe(getPloScores('lag', 'turn-river', 9))
    expect(getPloScores('tag', 'turn-river', 9)).toBe(getPloScores('tag', 'turn-river'))
  })

  it('six-max: LAG turn/river folds marginal/medium less and calls marginal more than full ring', () => {
    const fr = getPloScores('lag', 'turn-river', 9)
    const six = getPloScores('lag', 'turn-river', 6)
    expect(six.fold.marginal).toBeLessThan(fr.fold.marginal)
    expect(six.fold.medium).toBeLessThan(fr.fold.medium)
    expect(six.call.marginal).toBeGreaterThan(fr.call.marginal)
  })

  it('six-max: archetypes without overrides fall back to their full-ring table', () => {
    expect(getPloScores('nit', 'turn-river', 6)).toBe(getPloScores('nit', 'turn-river', 9))
    expect(getPloScores('tag', 'flop', 6)).toBe(getPloScores('tag', 'flop', 9))
  })

  it('preflop score resolution ignores tableSize', () => {
    expect(getPloScores('lag', 'preflop', 6)).toBe(getPloScores('lag', 'preflop', 9))
  })

  it('six-max: Nit uses separate good-hand call and raise scores preflop', () => {
    const fullRing = getPloScores('nit', 'preflop', 9)
    const sixMax = getPloScores('nit', 'preflop', 6)

    expect(fullRing.raise.good).toBe(4)
    expect(fullRing.call.good).toBe(-12)
    expect(sixMax.raise.good).toBe(-12)
    expect(sixMax.call.good).toBe(-8)
  })
})
