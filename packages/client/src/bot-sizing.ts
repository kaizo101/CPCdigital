import type { DecisionActionHistoryEvent } from '@cpc/shared'

export type PlayerActedHistoryEvent = Extract<DecisionActionHistoryEvent, { type: 'PlayerActed' }>

export function isAggressiveHistoryEvent(event: PlayerActedHistoryEvent): boolean {
  return event.action.type === 'raise'
    || (event.action.type === 'all-in' && event.totalBet > event.currentBetBefore)
}

/**
 * Canonical observed action size: chips committed by an aggressive action,
 * divided by the live pot immediately before that action.
 */
export function aggressiveActionPotFraction(event: PlayerActedHistoryEvent): number | null {
  if (!isAggressiveHistoryEvent(event)) return null

  const potBefore = event.potAfter - event.amount
  if (!Number.isFinite(potBefore) || potBefore <= 0 || event.amount <= 0) return null

  return event.amount / potBefore
}
