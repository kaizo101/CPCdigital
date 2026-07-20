import type { Card, LegalActions, PlayerAction } from '@cpc/shared'
import type { ActiveHabit } from './bot-habits'
import type { DecisionMetrics } from './bot-decision-metrics'
import type { BotState, Position } from './bot-types'
import type { BoardTexture, VariantHandAssessment } from './bot-variant-evaluation'

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
}

export interface BotGameView {
  myCards: [Card, Card]
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
  botId: string
  botState: BotState
  position: Position
  playerCount: number
  boardTexture: BoardTexture
  handAssessment: VariantHandAssessment
  metrics: DecisionMetrics
  legalActions: LegalActions
  preferredRaiseTo?: number
  preflopRangeAction?: 'raise' | 'call' | 'fold'
  opponentStats?: { vpip: number; aggression: number; foldToBet: number; confidence: number }
  botHabits?: ActiveHabit[]
}
