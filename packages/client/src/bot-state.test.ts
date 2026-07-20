import { describe, expect, it } from 'vitest'
import { applyDecisionMemory, resetHandMemory } from './bot-memory'
import { updateMentalState } from './bot-mental'
import { getOpponentStats, shouldActOnRead, updateOpponentRead } from './bot-reads'
import { createBotState } from './bot-state'
import {
  CALLING_STATION_PERSONALITY,
  LAG_PERSONALITY,
  NIT_PERSONALITY,
  TAG_PERSONALITY,
} from './bot-tag'

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

  it('combines archetype and skill independently', () => {
    const tag = createBotState(TAG_PERSONALITY, 70, () => 0.5)
    const nit = createBotState(NIT_PERSONALITY, 70, () => 0.5)
    const lag = createBotState(LAG_PERSONALITY, 70, () => 0.5)
    const callingStation = createBotState(CALLING_STATION_PERSONALITY, 70, () => 0.5)

    expect(tag.skill.level).toBe(nit.skill.level)
    expect(tag.skill.level).toBe(lag.skill.level)
    expect(tag.skill.level).toBe(callingStation.skill.level)
    expect(tag.personality.archetype.name).toBe('TAG')
    expect(nit.personality.archetype.name).toBe('Nit')
    expect(lag.personality.archetype.name).toBe('LAG')
    expect(callingStation.personality.archetype.name).toBe('Calling Station')
    expect(nit.personality.preflopLooseness).toBeLessThan(tag.personality.preflopLooseness)
    expect(nit.personality.riskTolerance).toBeLessThan(tag.personality.riskTolerance)
    expect(lag.personality.preflopLooseness).toBeGreaterThan(tag.personality.preflopLooseness)
    expect(lag.personality.aggression).toBeGreaterThan(tag.personality.aggression)
    expect(lag.personality.bluffFrequency).toBeGreaterThan(tag.personality.bluffFrequency)
    expect(callingStation.personality.preflopLooseness).toBeGreaterThan(tag.personality.preflopLooseness)
    expect(callingStation.personality.aggression).toBeLessThan(tag.personality.aggression)
    expect(callingStation.personality.riskTolerance).toBeGreaterThan(tag.personality.riskTolerance)
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

  it('applies archetype-specific observation profiles', () => {
    const tag = createBotState(TAG_PERSONALITY, 70, () => 0.5)
    const lag = createBotState(LAG_PERSONALITY, 70, () => 0.5)

    updateOpponentRead(tag.reads, 'villain', 'vpip', tag.skill.observation, 'tag')
    updateOpponentRead(lag.reads, 'villain', 'vpip', lag.skill.observation, 'lag')

    const tagRead = tag.reads.opponents.get('villain')!
    const lagRead = lag.reads.opponents.get('villain')!

    expect(tagRead.effectiveObservations).toBeGreaterThan(lagRead.effectiveObservations)
  })

  it('lets impatient LAG act on reads with fewer samples', () => {
    const lag = createBotState(LAG_PERSONALITY, 70, () => 0.5)
    lag.mentalState.patience = 30
    updateOpponentRead(lag.reads, 'villain', 'vpip', lag.skill.observation, 'lag')
    updateOpponentRead(lag.reads, 'villain', 'vpip', lag.skill.observation, 'lag')
    const read = lag.reads.opponents.get('villain')!

    expect(shouldActOnRead(read, lag.mentalState, 'lag')).toBe(true)
  })

  it('requires TAG to gather enough samples before trusting reads', () => {
    const tag = createBotState(TAG_PERSONALITY, 70, () => 0.5)
    updateOpponentRead(tag.reads, 'villain', 'vpip', tag.skill.observation, 'tag')
    const read = tag.reads.opponents.get('villain')!

    expect(shouldActOnRead(read, tag.mentalState, 'tag')).toBe(false)

    for (let i = 0; i < 4; i++) {
      updateOpponentRead(tag.reads, 'villain', 'vpip', tag.skill.observation, 'tag')
    }

    expect(shouldActOnRead(read, tag.mentalState, 'tag')).toBe(true)
  })

  it('assigns biased priors deterministically per opponent', () => {
    const tag = createBotState(TAG_PERSONALITY, 70, () => 0.5)
    updateOpponentRead(tag.reads, 'alice', 'vpip', tag.skill.observation)
    updateOpponentRead(tag.reads, 'bob', 'vpip', tag.skill.observation)

    const aliceRead = tag.reads.opponents.get('alice')!
    const bobRead = tag.reads.opponents.get('bob')!

    expect(getOpponentStats(aliceRead).vpip).not.toBe(getOpponentStats(bobRead).vpip)
  })

  it('gives higher confidence with more observations', () => {
    const tag = createBotState(TAG_PERSONALITY, 70, () => 0.5)
    updateOpponentRead(tag.reads, 'villain', 'vpip', tag.skill.observation, 'tag')
    const firstConfidence = getOpponentStats(tag.reads.opponents.get('villain')!).confidence

    for (let i = 0; i < 10; i++) {
      updateOpponentRead(tag.reads, 'villain', 'vpip', tag.skill.observation, 'tag')
    }
    const laterConfidence = getOpponentStats(tag.reads.opponents.get('villain')!).confidence

    expect(laterConfidence).toBeGreaterThan(firstConfidence)
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

  it('gives different mental event responses per archetype', () => {
    const rng = () => 0.5
    const tag = createBotState(TAG_PERSONALITY, 70, rng)
    const nit = createBotState(NIT_PERSONALITY, 70, rng)
    const lag = createBotState(LAG_PERSONALITY, 70, rng)
    const cs = createBotState(CALLING_STATION_PERSONALITY, 70, rng)

    const event = { type: 'lost-big-pot' as const, potBb: 20, opponentId: 'villain' }

    updateMentalState(tag.mentalState, tag.personality, event, 20)
    updateMentalState(nit.mentalState, nit.personality, event, 20)
    updateMentalState(lag.mentalState, lag.personality, event, 20)
    updateMentalState(cs.mentalState, cs.personality, event, 20)

    expect(lag.mentalState.tilt).toBeGreaterThan(nit.mentalState.tilt + 1)
    expect(lag.mentalState.confidence).toBeLessThan(nit.mentalState.confidence)
    expect(cs.mentalState.tilt).toBeLessThan(tag.mentalState.tilt + 1)
  })

  it('applies archetype multipliers for bad-beat events', () => {
    const rng = () => 0.5
    const nit = createBotState(NIT_PERSONALITY, 70, rng)
    const cs = createBotState(CALLING_STATION_PERSONALITY, 70, rng)

    const badBeat = { type: 'bad-beat' as const, equityBeforeRiver: 0.9, potBb: 30, opponentId: 'villain' }
    updateMentalState(nit.mentalState, nit.personality, badBeat, 30)
    updateMentalState(cs.mentalState, cs.personality, badBeat, 30)

    expect(nit.mentalState.tilt).toBeGreaterThan(cs.mentalState.tilt)
    expect(nit.mentalState.confidence).toBeLessThan(cs.mentalState.confidence)
  })

  it('amplifies LAG emotional response to bluff outcomes', () => {
    const rng = () => 0.5
    const lag = createBotState(LAG_PERSONALITY, 70, rng)
    const tag = createBotState(TAG_PERSONALITY, 70, rng)

    const bluffCaught = { type: 'bluff-caught' as const, potBb: 15, opponentId: 'villain' }
    updateMentalState(lag.mentalState, lag.personality, bluffCaught, 15)
    updateMentalState(tag.mentalState, tag.personality, bluffCaught, 15)

    expect(lag.mentalState.tilt).toBeGreaterThan(tag.mentalState.tilt)
    expect(lag.mentalState.momentum).toBeLessThan(tag.mentalState.momentum)
  })
})
