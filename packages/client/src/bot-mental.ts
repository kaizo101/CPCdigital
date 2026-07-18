import type { BotState, MentalEvent, MentalState } from './bot-types'

// Prior distribution for Beta distribution (represents prior belief)
const PRIOR_VPIP = { successes: 2.5, failures: 7.5 }
const PRIOR_AGGRESSION = { successes: 3, failures: 7 }
const PRIOR_FOLD_TO_BET = { successes: 5, failures: 5 }

// Roll a value from a normal distribution
export function rollFromDistribution(
  dist: { mean: number; stddev: number },
  random: () => number = Math.random,
): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.max(random(), Number.EPSILON)
  const u2 = random()
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return Math.max(0, Math.min(100, dist.mean + z0 * dist.stddev))
}

// Create initial bot state
export function createBotState(personality: any, skill: number = 50, random: () => number = Math.random): BotState {
  const aggression = rollFromDistribution(personality.aggression, random)
  const bluffFrequency = rollFromDistribution(personality.bluffFrequency, random)
  const riskTolerance = rollFromDistribution(personality.riskTolerance, random)
  const patience = rollFromDistribution(personality.patience, random)
  const observationSkill = rollFromDistribution(personality.observationSkill, random)
  const tiltSensitivity = rollFromDistribution(personality.tiltSensitivity, random)
  const tiltRecovery = rollFromDistribution(personality.tiltRecovery, random)
  const emotionality = rollFromDistribution(personality.emotionality, random)

  return {
    personality,
    aggression,
    bluffFrequency,
    riskTolerance,
    patience,
    observationSkill,
    tiltSensitivity,
    tiltRecovery,
    emotionality,
    mentalState: {
      tilt: 0,
      confidence: 50,
      patience: patience,  // Initialize from rolled patience
      frustration: new Map(),  // Empty map - no frustration yet
      momentum: 0,
    },
    skill,
    handsPlayed: 0,
    handsWon: 0,
    raisedPreflop: false,
    lastAction: null,
    lastStreet: null,
    opponentReads: new Map(),
  }
}

// Update mental state based on event
export function updateMentalState(state: BotState, event: MentalEvent, bigBlind: number): void {
  const { tiltSensitivity, tiltRecovery, emotionality, patience } = state
  const ms = state.mentalState

  // Calculate event severity (0-1)
  const severity = Math.min(1, event.potBb / 20)  // 20BB = max severity

  // Calculate emotional impact
  const emotionalImpact = severity * (emotionality / 100)

  switch (event.type) {
    case 'won-small-pot':
      ms.confidence = Math.min(100, ms.confidence + 3 * emotionalImpact)
      ms.momentum = Math.min(100, ms.momentum + 5 * emotionalImpact)
      ms.tilt = Math.max(0, ms.tilt - 2 * (tiltRecovery / 100))
      ms.patience = Math.min(100, ms.patience + 2)
      break

    case 'lost-small-pot':
      ms.confidence = Math.max(0, ms.confidence - 2 * emotionalImpact)
      ms.momentum = Math.max(-100, ms.momentum - 3 * emotionalImpact)
      ms.tilt = Math.min(100, ms.tilt + 3 * (tiltSensitivity / 100))
      ms.patience = Math.max(0, ms.patience - 2)
      break

    case 'lost-big-pot':
      ms.confidence = Math.max(0, ms.confidence - 5 * emotionalImpact)
      ms.momentum = Math.max(-100, ms.momentum - 8 * emotionalImpact)
      ms.tilt = Math.min(100, ms.tilt + 8 * (tiltSensitivity / 100))
      ms.patience = Math.max(0, ms.patience - 5)
      break

    case 'bad-beat':
      // Bad beats cause significant tilt
      const badBeatSeverity = (1 - event.equityBeforeRiver) * 2  // Lower equity = worse beat
      ms.confidence = Math.max(0, ms.confidence - 8 * badBeatSeverity * emotionalImpact)
      ms.momentum = Math.max(-100, ms.momentum - 15 * badBeatSeverity * emotionalImpact)
      ms.tilt = Math.min(100, ms.tilt + 15 * badBeatSeverity * (tiltSensitivity / 100))
      // Frustration is opponent-specific
      if (event.opponentId) {
        const currentFrustration = ms.frustration.get(event.opponentId) ?? 0
        ms.frustration.set(event.opponentId, Math.min(100, currentFrustration + 10 * emotionalImpact))
      }
      ms.patience = Math.max(0, ms.patience - 10)
      break

    case 'bluff-caught':
      ms.confidence = Math.max(0, ms.confidence - 6 * emotionalImpact)
      ms.momentum = Math.max(-100, ms.momentum - 10 * emotionalImpact)
      ms.tilt = Math.min(100, ms.tilt + 5 * (tiltSensitivity / 100))
      ms.patience = Math.max(0, ms.patience - 3)
      break

    case 'successful-bluff':
      ms.confidence = Math.min(100, ms.confidence + 7 * emotionalImpact)
      ms.momentum = Math.min(100, ms.momentum + 10 * emotionalImpact)
      ms.tilt = Math.max(0, ms.tilt - 3 * (tiltRecovery / 100))
      ms.patience = Math.min(100, ms.patience + 3)
      break

    case 'suckout-win':
      // Winning with a lucky hit
      ms.confidence = Math.min(100, ms.confidence + 5 * emotionalImpact)
      ms.momentum = Math.min(100, ms.momentum + 12 * emotionalImpact)
      ms.tilt = Math.max(0, ms.tilt - 2 * (tiltRecovery / 100))
      ms.patience = Math.min(100, ms.patience + 2)
      break

    case 'coolered':
      // Losing with a very strong hand
      ms.confidence = Math.max(0, ms.confidence - 7 * emotionalImpact)
      ms.momentum = Math.max(-100, ms.momentum - 12 * emotionalImpact)
      ms.tilt = Math.min(100, ms.tilt + 10 * (tiltSensitivity / 100))
      // Frustration is opponent-specific
      if (event.opponentId) {
        const currentFrustration = ms.frustration.get(event.opponentId) ?? 0
        ms.frustration.set(event.opponentId, Math.min(100, currentFrustration + 8 * emotionalImpact))
      }
      ms.patience = Math.max(0, ms.patience - 5)
      break
  }

  // Natural decay: tilt decreases over time, momentum regresses to 0
  ms.tilt = Math.max(0, ms.tilt - 1 * (tiltRecovery / 100))
  // Decay all frustrations
  for (const [opponentId, frustration] of ms.frustration.entries()) {
    const decayed = Math.max(0, frustration - 2)
    if (decayed === 0) {
      ms.frustration.delete(opponentId)
    } else {
      ms.frustration.set(opponentId, decayed)
    }
  }
  ms.momentum = ms.momentum * 0.95  // Regress to 0

  state.handsPlayed++
}

// Get opponent stats from Beta distribution
export function getOpponentStats(read: any): { vpip: number; aggression: number; foldToBet: number; confidence: number } {
  const vpip = betaMean(read.vpipEstimate) * 100
  const aggression = betaMean(read.aggressionEstimate) * 100
  const foldToBet = betaMean(read.foldToBetEstimate) * 100
  // Confidence increases with sample size
  const totalSamples = read.vpipEstimate.successes + read.vpipEstimate.failures
  const confidence = Math.min(1, totalSamples / 20) // 20 hands = 100% confidence
  return { vpip, aggression, foldToBet, confidence }
}

// Calculate mean from Beta distribution
function betaMean(estimate: { successes: number; failures: number }): number {
  const total = estimate.successes + estimate.failures
  return total > 0 ? estimate.successes / total : 0.5
}

// Update opponent read based on action
export function updateOpponentRead(
  state: BotState,
  opponentId: string,
  action: 'vpip' | 'aggression' | 'foldToBet' | 'no-vpip' | 'no-aggression' | 'no-fold',
  observationSkill: number
): void {
  let read = state.opponentReads.get(opponentId)
  if (!read) {
    read = {
      playerId: opponentId,
      vpipEstimate: { ...PRIOR_VPIP },
      aggressionEstimate: { ...PRIOR_AGGRESSION },
      foldToBetEstimate: { ...PRIOR_FOLD_TO_BET },
      handsSampled: 0,
    }
    state.opponentReads.set(opponentId, read)
  }

  // Learning rate based on observation skill
  const learningMultiplier = 0.5 + (observationSkill / 100) * 1.5

  switch (action) {
    case 'vpip':
      read.vpipEstimate.successes += learningMultiplier
      read.handsSampled++
      break
    case 'no-vpip':
      read.vpipEstimate.failures += learningMultiplier
      read.handsSampled++
      break
    case 'aggression':
      read.aggressionEstimate.successes += learningMultiplier
      break
    case 'no-aggression':
      read.aggressionEstimate.failures += learningMultiplier
      break
    case 'foldToBet':
      read.foldToBetEstimate.successes += learningMultiplier
      break
    case 'no-fold':
      read.foldToBetEstimate.failures += learningMultiplier
      break
  }
}
