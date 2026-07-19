import type { BotPersonality, BotState } from './bot-types'

export function createBotState(
  archetype: BotPersonality,
  skillLevel: number = 50,
  random: () => number = Math.random,
): BotState {
  const aggression = rollFromDistribution(archetype.aggression, random)
  const bluffFrequency = rollFromDistribution(archetype.bluffFrequency, random)
  const riskTolerance = rollFromDistribution(archetype.riskTolerance, random)
  const patience = rollFromDistribution(archetype.patience, random)
  const observation = rollFromDistribution(archetype.observationSkill, random)
  const tiltSensitivity = rollFromDistribution(archetype.tiltSensitivity, random)
  const tiltRecovery = rollFromDistribution(archetype.tiltRecovery, random)
  const emotionality = rollFromDistribution(archetype.emotionality, random)

  return {
    personality: {
      archetype,
      aggression,
      bluffFrequency,
      riskTolerance,
      patience,
      tiltSensitivity,
      tiltRecovery,
      emotionality,
    },
    skill: {
      level: Math.max(0, Math.min(100, skillLevel)),
      observation,
    },
    mentalState: {
      tilt: 0,
      confidence: 50,
      patience,
      frustration: new Map(),
      momentum: 0,
    },
    reads: { opponents: new Map() },
    memory: {
      handsPlayed: 0,
      handsWon: 0,
      hand: { raisedPreflop: false, lastAction: null, lastStreet: null },
    },
  }
}

export function rollFromDistribution(
  distribution: { mean: number; stddev: number },
  random: () => number = Math.random,
): number {
  const u1 = Math.max(random(), Number.EPSILON)
  const u2 = random()
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return Math.max(0, Math.min(100, distribution.mean + z0 * distribution.stddev))
}
