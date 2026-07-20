import type { BotContext } from './bot-context'
import type { DecisionComplexity } from './bot-decision-complexity'
import type { DecisionMetrics } from './bot-decision-metrics'
import type { DecisionResult } from './bot-pipeline'
import type { BotDecisionTiming } from './bot-timing'
import type { VariantEvaluation } from './bot-variant-evaluation'

export interface BotDebugProfile {
  archetype: string
  personality: {
    preflopLooseness: number
    aggression: number
    bluffFrequency: number
    riskTolerance: number
    patience: number
  }
  skill: { level: number; observation: number }
  mentalState: {
    tilt: number
    confidence: number
    patience: number
    momentum: number
  }
  memory: {
    handsPlayed: number
    handsWon: number
    raisedPreflop: boolean
    lastAction: string | null
  }
  reads: Array<{
    playerId: string
    handsSampled: number
    vpip: number
    aggression: number
    foldToBet: number
  }>
}

/** Private local-only record used by the opt-in bot Debug Inspector. */
export interface BotDebugDecision {
  sequence: number
  handNumber: number
  playerId: string
  playerName: string
  profile: BotDebugProfile
  context: BotContext
  evaluation: VariantEvaluation
  metrics: DecisionMetrics
  decision: DecisionResult
  complexity: DecisionComplexity
  timing: BotDecisionTiming
}
