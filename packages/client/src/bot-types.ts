import type { Card } from '@cpc/shared'

// Mental events that trigger state changes
export type MentalEvent =
  | { type: 'won-small-pot'; potBb: number }
  | { type: 'lost-small-pot'; potBb: number; opponentId?: string }
  | { type: 'lost-big-pot'; potBb: number; opponentId?: string }
  | { type: 'bad-beat'; equityBeforeRiver: number; potBb: number; opponentId?: string }
  | { type: 'bluff-caught'; potBb: number; opponentId?: string }
  | { type: 'successful-bluff'; potBb: number; opponentId?: string }
  | { type: 'suckout-win'; potBb: number }
  | { type: 'coolered'; potBb: number; opponentId?: string }

// Personality traits that affect emotional responses
export interface BotPersonality {
  name: string
  preflopLooseness: { mean: number; stddev: number }
  aggression: { mean: number; stddev: number }
  bluffFrequency: { mean: number; stddev: number }
  riskTolerance: { mean: number; stddev: number }
  patience: { mean: number; stddev: number }
  observationSkill: { mean: number; stddev: number }
  // Emotional traits
  tiltSensitivity: { mean: number; stddev: number }  // How quickly tilt increases
  tiltRecovery: { mean: number; stddev: number }    // How quickly tilt decreases
  emotionality: { mean: number; stddev: number }     // How much events affect state
}

// Mental state (changes during session)
export interface MentalState {
  tilt: number              // 0-100: current tilt level
  confidence: number        // 0-100: self-belief
  patience: number          // 0-100: willingness to wait for good spots
  frustration: Map<string, number>  // playerId → frustration level (0-100)
  momentum: number          // -100 to +100: "hot" or "cold" streak
}

/** Immutable rolled traits for one bot in this session. */
export interface BotPersonalityState {
  archetype: BotPersonality
  preflopLooseness: number
  aggression: number
  bluffFrequency: number
  riskTolerance: number
  patience: number
  tiltSensitivity: number
  tiltRecovery: number
  emotionality: number
}

/** Immutable evaluation and observation ability. */
export interface BotSkillState {
  level: number
  observation: number
}

export interface BotReadsState {
  opponents: Map<string, OpponentRead>
}

export interface BotHandMemory {
  raisedPreflop: boolean
  lastAction: 'bet' | 'check' | 'call' | 'fold' | null
  lastStreet: 'preflop' | 'flop' | 'turn' | 'river' | null
  /** Street on which a thin-value bet was explicitly planned to fold to a raise. */
  betFoldStreet: 'flop' | 'turn' | 'river' | null
}

export interface BotSessionMemory {
  handsPlayed: number
  handsWon: number
  hand: BotHandMemory
}

/** Composition root; each concern owns a separate state object. */
export interface BotState {
  personality: BotPersonalityState
  skill: BotSkillState
  mentalState: MentalState
  reads: BotReadsState
  memory: BotSessionMemory
}

// Opponent read with Beta distribution
export interface SizingRead {
  /** Exponential moving average of pot-fraction bet sizes (weighted, 0-3+) */
  average: number
  /** Count of sizing observations */
  count: number
}

export interface OpponentRead {
  playerId: string
  vpipEstimate: { successes: number; failures: number }
  aggressionEstimate: { successes: number; failures: number }
  foldToBetEstimate: { successes: number; failures: number }
  handsSampled: number
  effectiveObservations: number
  sizing: SizingRead
}

// Position types
export type Position = 'early' | 'middle' | 'late' | 'blinds'
