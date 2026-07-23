import { describe, expect, it } from 'vitest'
import { planBotDecisionTiming, sampleTargetReactionMs } from './bot-timing'

describe('bot reaction timing', () => {
  it('samples the artificial target independently from computation', () => {
    expect(sampleTargetReactionMs(() => 0)).toBe(1800)
    expect(sampleTargetReactionMs(() => 0.5)).toBe(3150)
    expect(sampleTargetReactionMs(() => 1)).toBe(4500)
  })

  it('adds substantial thinking time for a difficult all-in decision', () => {
    const normal = sampleTargetReactionMs(() => 0.5, { score: 10, difficultAllIn: false })
    const difficultAllIn = sampleTargetReactionMs(() => 0.5, { score: 80, difficultAllIn: true })

    expect(normal).toBe(3500)
    expect(difficultAllIn).toBe(9950)
    expect(difficultAllIn - normal).toBeGreaterThanOrEqual(3000)
  })

  it('caps even the hardest decision at the configured maximum', () => {
    expect(sampleTargetReactionMs(() => 1, { score: 100, difficultAllIn: true }))
      .toBeLessThanOrEqual(12000)
  })

  it('subtracts actual computation from the remaining artificial delay', () => {
    expect(planBotDecisionTiming(1200, 175)).toEqual({
      targetReactionMs: 1200,
      computationMs: 175,
      remainingDelayMs: 1025,
    })
  })

  it('does not add delay when computation already exceeded the target', () => {
    expect(planBotDecisionTiming(600, 850).remainingDelayMs).toBe(0)
  })

  it('keeps total response time stable across different computation times', () => {
    const fast = planBotDecisionTiming(1200, 5)
    const slow = planBotDecisionTiming(1200, 400)

    expect(fast.computationMs + fast.remainingDelayMs).toBe(1200)
    expect(slow.computationMs + slow.remainingDelayMs).toBe(1200)
  })
})
