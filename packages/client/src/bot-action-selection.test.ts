import { describe, expect, it } from 'vitest'
import { selectionDiagnostics, weightedChoice } from './bot-action-selection'
import type { ScoredAction } from './bot-decision-types'

function candidate(candidateId: string, utility: number): ScoredAction {
  return {
    candidateId,
    action: candidateId === 'fold' ? { type: 'fold' } : { type: 'call' },
    intent: candidateId === 'fold' ? 'fold' : 'bluff-catch',
    utility,
    contributions: [],
  }
}

describe('weighted action selection diagnostics', () => {
  it('keeps the exact 85-percent boundary stable and observable', () => {
    const actions = [
      candidate('fold', 100),
      candidate('call-at-boundary', 85),
      candidate('call-below-boundary', 84.999),
    ]

    expect(selectionDiagnostics(actions)).toEqual({
      bestUtility: 100,
      runnerUpUtility: 85,
      utilityGap: 15,
      plausibilityThreshold: 85,
      plausibleCandidateCount: 2,
    })
    expect(weightedChoice(actions, { random: () => 0.99 })).toEqual({ type: 'call' })

    const belowOnly = [candidate('fold', 100), candidate('call-below-boundary', 84.999)]
    expect(selectionDiagnostics(belowOnly).plausibleCandidateCount).toBe(1)
    expect(weightedChoice(belowOnly, { random: () => 0.99 })).toEqual({ type: 'fold' })
  })
})
