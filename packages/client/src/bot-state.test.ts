import { describe, expect, it } from 'vitest'
import { applyDecisionMemory, resetHandMemory } from './bot-memory'
import { updateMentalState } from './bot-mental'
import { getOpponentStats, updateOpponentRead } from './bot-reads'
import { createBotState } from './bot-state'
import { TAG_PERSONALITY } from './bot-tag'

describe('separated bot state', () => {
  it('keeps personality, skill, mental state, reads, and memory in distinct owners', () => {
    const state = createBotState(TAG_PERSONALITY, 70, () => 0.5)

    expect(state).toEqual({
      personality: expect.objectContaining({ archetype: TAG_PERSONALITY, aggression: expect.any(Number) }),
      skill: expect.objectContaining({ level: 70, observation: expect.any(Number) }),
      mentalState: expect.objectContaining({ tilt: 0, confidence: 50 }),
      reads: { opponents: expect.any(Map) },
      memory: expect.objectContaining({
        handsPlayed: 0,
        handsWon: 0,
        hand: { raisedPreflop: false, lastAction: null, lastStreet: null },
      }),
    })
    expect(state).not.toHaveProperty('aggression')
    expect(state).not.toHaveProperty('opponentReads')
    expect(state).not.toHaveProperty('raisedPreflop')
  })

  it('updates hand memory without changing the other concerns', () => {
    const state = createBotState(TAG_PERSONALITY, 70, () => 0.5)
    const personality = { ...state.personality }
    const mentalState = { ...state.mentalState }

    applyDecisionMemory(state.memory, {
      raisedPreflop: true,
      lastAction: 'bet',
      lastStreet: 'preflop',
    })
    expect(state.memory.hand).toEqual({ raisedPreflop: true, lastAction: 'bet', lastStreet: 'preflop' })

    resetHandMemory(state.memory)
    expect(state.memory.hand).toEqual({ raisedPreflop: false, lastAction: null, lastStreet: null })
    expect(state.personality).toEqual(personality)
    expect(state.mentalState).toEqual(mentalState)
    expect(state.reads.opponents.size).toBe(0)
  })

  it('updates reads independently from mental state and personality', () => {
    const state = createBotState(TAG_PERSONALITY, 70, () => 0.5)
    const tiltBefore = state.mentalState.tilt
    const aggressionBefore = state.personality.aggression

    updateOpponentRead(state.reads, 'villain', 'vpip', state.skill.observation)
    updateOpponentRead(state.reads, 'villain', 'aggression', state.skill.observation)
    const read = state.reads.opponents.get('villain')!

    expect(getOpponentStats(read).vpip).toBeGreaterThan(25)
    expect(state.mentalState.tilt).toBe(tiltBefore)
    expect(state.personality.aggression).toBe(aggressionBefore)
  })

  it('updates mental state without mutating personality, reads, or memory', () => {
    const state = createBotState(TAG_PERSONALITY, 70, () => 0.5)
    const personality = { ...state.personality }
    const memory = structuredClone(state.memory)

    updateMentalState(
      state.mentalState,
      state.personality,
      { type: 'lost-big-pot', potBb: 20, opponentId: 'villain' },
      20,
    )

    expect(state.mentalState.tilt).toBeGreaterThan(0)
    expect(state.personality).toEqual(personality)
    expect(state.reads.opponents.size).toBe(0)
    expect(state.memory).toEqual(memory)
  })
})
