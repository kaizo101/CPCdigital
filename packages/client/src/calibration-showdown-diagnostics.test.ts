import { describe, expect, it } from 'vitest'
import {
  CalibrationShowdownDiagnostics,
  CalibrationShowdownHandTracker,
  opponentBucket,
  priceBand,
} from './calibration-showdown-diagnostics'

describe('showdown diagnostics', () => {
  it('uses stable opponent and price boundaries', () => {
    expect(opponentBucket(1)).toBe('heads-up')
    expect(opponentBucket(2)).toBe('three-way')
    expect(opponentBucket(3)).toBe('multiway')
    expect(priceBand(0.1)).toBe('cheap-0-10')
    expect(priceBand(0.100001)).toBe('normal-10-25')
    expect(priceBand(0.25)).toBe('normal-10-25')
    expect(priceBand(0.250001)).toBe('expensive-25-40')
    expect(priceBand(0.4)).toBe('expensive-25-40')
    expect(priceBand(0.400001)).toBe('very-expensive-40+')
  })

  it('classifies every showdown into exactly one path with deterministic priority', () => {
    const tracker = new CalibrationShowdownHandTracker()
    for (const playerId of ['all-in', 'caller', 'aggressor', 'checker']) {
      tracker.recordFlopSeen(playerId, playerId === 'aggressor' ? 'pfa' : 'non-pfa', 3)
    }
    tracker.recordAction({ playerId: 'all-in', phase: 'turn', action: { type: 'all-in' }, role: 'non-pfa', category: 'strong', potOdds: 0.3, activeOpponents: 3 })
    tracker.recordAction({ playerId: 'all-in', phase: 'flop', action: { type: 'call' }, role: 'non-pfa', category: 'medium', potOdds: 0.2, activeOpponents: 3 })
    tracker.recordAction({ playerId: 'caller', phase: 'river', action: { type: 'call' }, role: 'non-pfa', category: 'marginal', potOdds: 0.25, activeOpponents: 1 })
    tracker.recordAction({ playerId: 'caller', phase: 'flop', action: { type: 'raise', amount: 60 }, role: 'non-pfa', category: 'good', potOdds: 0, activeOpponents: 3 })
    tracker.recordAction({ playerId: 'aggressor', phase: 'flop', action: { type: 'raise', amount: 60 }, role: 'pfa', category: 'good', potOdds: 0, activeOpponents: 3 })

    const summary = tracker.summarize(['all-in', 'caller', 'aggressor', 'checker'], 'aggressor')
    expect(summary.showdowns.map(result => result.path)).toEqual([
      'all-in',
      'call-down',
      'aggressor-to-showdown',
      'check-down',
    ])
    expect(new Set(summary.showdowns.map(result => result.playerId)).size).toBe(4)
  })

  it('adds preflop all-in reveals to the flop denominator', () => {
    const tracker = new CalibrationShowdownHandTracker()
    tracker.recordAction({ playerId: 'a', phase: 'preflop', action: { type: 'all-in' }, role: 'pfa', category: 'premium', potOdds: 0.5, activeOpponents: 1 })
    const summary = tracker.summarize(['a', 'b'], 'a')

    expect(summary.flopSeen).toHaveLength(2)
    expect(summary.showdowns).toEqual(expect.arrayContaining([
      expect.objectContaining({ playerId: 'a', role: 'pfa', path: 'all-in' }),
      expect.objectContaining({ playerId: 'b', role: 'non-pfa', path: 'check-down' }),
    ]))
  })

  it('aggregates conserved paths, role segments, opponent segments, and fold exits', () => {
    const tracker = new CalibrationShowdownHandTracker()
    tracker.recordFlopSeen('a', 'pfa', 1)
    tracker.recordFlopSeen('b', 'non-pfa', 1)
    tracker.recordAction({ playerId: 'b', phase: 'turn', action: { type: 'fold' }, role: 'non-pfa', category: 'weak', potOdds: 0.3, activeOpponents: 1 })
    const diagnostics = new CalibrationShowdownDiagnostics()
    diagnostics.recordHand(tracker.summarize(['a'], 'a'))

    expect(Object.values(diagnostics.paths).reduce((sum, count) => sum + count, 0)).toBe(1)
    expect(diagnostics.byRole.pfa).toEqual({ flopSeen: 1, showdowns: 1 })
    expect(diagnostics.byRole['non-pfa']).toEqual({ flopSeen: 1, showdowns: 0 })
    expect(diagnostics.byOpponents['heads-up']).toEqual({ flopSeen: 2, showdowns: 1 })
    expect(diagnostics.foldExits()).toEqual([
      { key: 'turn|non-pfa|weak|expensive-25-40|heads-up', count: 1 },
    ])
    expect(diagnostics.violations(2, 1)).toEqual([])
    expect(diagnostics.violations(3, 1)).toContain('role segments do not conserve flop participants')
  })
})
