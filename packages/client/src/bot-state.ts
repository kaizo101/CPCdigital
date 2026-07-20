import type { BotIdentity } from './bot-identities'
import type { BotPersonality, BotPersonalityState, BotState } from './bot-types'

export function createBotState(
  archetype: BotPersonality,
  skillLevel: number = 50,
  random: () => number = Math.random,
): BotState {
  const preflopLooseness = rollFromDistribution(archetype.preflopLooseness, random)
  const aggression = rollFromDistribution(archetype.aggression, random)
  const bluffFrequency = rollFromDistribution(archetype.bluffFrequency, random)
  const riskTolerance = rollFromDistribution(archetype.riskTolerance, random)
  const patience = rollFromDistribution(archetype.patience, random)
  const observation = rollFromDistribution(archetype.observationSkill, random)
  const tiltSensitivity = rollFromDistribution(archetype.tiltSensitivity, random)
  const tiltRecovery = rollFromDistribution(archetype.tiltRecovery, random)
  const emotionality = rollFromDistribution(archetype.emotionality, random)

  return initializeBotState(archetype, skillLevel, observation, {
    preflopLooseness,
    aggression,
    bluffFrequency,
    riskTolerance,
    patience,
    tiltSensitivity,
    tiltRecovery,
    emotionality,
  })
}

export function createBotStateFromIdentity(
  identity: BotIdentity,
  archetype: BotPersonality,
  random: () => number = Math.random,
): BotState {
  const sessionValue = (
    baseline: number,
    distribution: { stddev: number },
  ) => rollFromDistribution({ mean: baseline, stddev: distribution.stddev * 0.25 }, random)

  return initializeBotState(archetype, identity.skill, identity.traits.observation, {
    preflopLooseness: sessionValue(identity.traits.preflopLooseness, archetype.preflopLooseness),
    aggression: sessionValue(identity.traits.aggression, archetype.aggression),
    bluffFrequency: sessionValue(identity.traits.bluffFrequency, archetype.bluffFrequency),
    riskTolerance: sessionValue(identity.traits.riskTolerance, archetype.riskTolerance),
    patience: sessionValue(identity.traits.patience, archetype.patience),
    tiltSensitivity: sessionValue(identity.traits.tiltSensitivity, archetype.tiltSensitivity),
    tiltRecovery: sessionValue(identity.traits.tiltRecovery, archetype.tiltRecovery),
    emotionality: sessionValue(identity.traits.emotionality, archetype.emotionality),
  })
}

function initializeBotState(
  archetype: BotPersonality,
  skillLevel: number,
  observation: number,
  personality: Omit<BotPersonalityState, 'archetype'>,
): BotState {
  return {
    personality: {
      archetype,
      ...personality,
    },
    skill: {
      level: Math.max(0, Math.min(100, skillLevel)),
      observation,
    },
    mentalState: {
      tilt: 0,
      confidence: 50,
      patience: personality.patience,
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
