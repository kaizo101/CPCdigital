import type { Card, LegalActions, PlayerAction } from '@cpc/shared'
import type { ActiveHabit } from './bot-habits'
import type { PreflopStrategyAction } from './bot-category-scores'
import type { DecisionMetrics } from './bot-decision-metrics'
import type { StreetAnalysis } from './bot-street-analysis'
import type { BotState, Position } from './bot-types'
import type { BoardTexture, CategoryScoreTable, VariantHandAssessment } from './bot-variant-evaluation'

export type ScoreCategory =
  | 'base'
  | 'hand-strength'
  | 'position'
  | 'board-texture'
  | 'betting-context'
  | 'personality'
  | 'mental-state'
  | 'opponent-read'
  | 'skill-perception'
  | 'strategy'

export type ActionIntent =
  | 'fold'
  | 'pot-control'
  | 'trap'
  | 'bluff-catch'
  | 'draw'
  | 'value'
  | 'protection'
  | 'semi-bluff'
  | 'bluff'

export interface ScoreContribution {
  category: ScoreCategory
  label: string
  value: number
}

export interface ScoredAction {
  action: PlayerAction
  intent: ActionIntent
  utility: number
  contributions: ScoreContribution[]
  /** False keeps a legal engine action visible for diagnostics but out of bot selection. */
  selectionEligible?: boolean
}

export interface BotGameView {
  myCards: Card[]
  board: Card[]
  pot: number
  currentBet: number
  minRaiseTo: number
  maxRaiseTo: number
  canRaise: boolean
  bigBlind: number
  smallBlind: number
  phase: 'preflop' | 'flop' | 'turn' | 'river'
  players: Array<{
    id: string
    chips: number
    roundBet: number
    status: 'active' | 'folded' | 'all-in' | 'waiting'
    isDealer: boolean
  }>
  dealerIndex: number
}

export interface DecisionContext {
  gameView: BotGameView
  variantId: string
  botId: string
  botState: BotState
  position: Position
  playerCount: number
  boardTexture: BoardTexture
  handAssessment: VariantHandAssessment
  metrics: DecisionMetrics
  legalActions: LegalActions
  preferredRaiseTo?: number
  categoryScores: CategoryScoreTable
  preflopRangeAction?: PreflopStrategyAction
  opponentStats?: { vpip: number; aggression: number; foldToBet: number; confidence: number }
  botHabits?: ActiveHabit[]
  streetAnalysis?: StreetAnalysis
}
