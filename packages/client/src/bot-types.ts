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

// Bot state (combines personality, mental state, and tracking)
export interface BotState {
  personality: BotPersonality
  // Individual values (rolled from distribution at session start)
  aggression: number
  bluffFrequency: number
  riskTolerance: number
  patience: number
  observationSkill: number
  tiltSensitivity: number
  tiltRecovery: number
  emotionality: number
  // Mental state (changes during session)
  mentalState: MentalState
  // Skill
  skill: number             // 0-100 (higher = fewer mistakes)
  // Stats
  handsPlayed: number
  handsWon: number
  // Hand tracking (for c-bets, delayed bluffs)
  raisedPreflop: boolean    // Raised pre-flop this hand?
  lastAction: 'bet' | 'check' | 'call' | 'fold' | null
  lastStreet: 'preflop' | 'flop' | 'turn' | 'river' | null
  // Player reads (simple opponent modeling)
  opponentReads: Map<string, OpponentRead>
}

// Opponent read with Beta distribution
export interface OpponentRead {
  playerId: string
  // Beta distribution parameters (successes + failures)
  vpipEstimate: { successes: number; failures: number }
  aggressionEstimate: { successes: number; failures: number }
  foldToBetEstimate: { successes: number; failures: number }
  handsSampled: number
}

// Position types
export type Position = 'early' | 'middle' | 'late' | 'blinds'
