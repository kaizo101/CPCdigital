import type { PlayerAction } from '@cpc/shared'

export interface ContinuationBetSpot {
  phase: string
  actingPlayerId: string
  preflopAggressorId: string | null
  currentBet: number
}

/**
 * A continuation-bet opportunity exists only when the last preflop aggressor
 * can open the flop betting. Facing a donk bet is a response spot, not a
 * missed continuation bet.
 */
export function isContinuationBetOpportunity(spot: ContinuationBetSpot): boolean {
  return spot.phase === 'flop'
    && spot.preflopAggressorId !== null
    && spot.actingPlayerId === spot.preflopAggressorId
    && spot.currentBet === 0
}

export function updatePreflopAggressor(
  currentAggressorId: string | null,
  phase: string,
  actingPlayerId: string,
  aggressiveAction: boolean,
): string | null {
  return phase === 'preflop' && aggressiveAction
    ? actingPlayerId
    : currentAggressorId
}

export function isThreeBetOpportunity(
  preflopRaiseCount: number,
  opportunityAlreadyRecorded: boolean,
): boolean {
  return preflopRaiseCount === 1 && !opportunityAlreadyRecorded
}

export type AggressionActionClass = 'aggressive' | 'call' | 'neutral'

export function classifyAggressionAction(
  action: PlayerAction,
  currentBet: number,
  allInAmount: number | null | undefined,
): AggressionActionClass {
  if (action.type === 'raise') return 'aggressive'
  if (action.type === 'call') return 'call'
  if (action.type === 'all-in') {
    return (allInAmount ?? 0) > currentBet ? 'aggressive' : 'call'
  }
  return 'neutral'
}

export function summarizeShowdown(
  sawFlopPlayerIds: Iterable<string>,
  revealedPlayerIds: Iterable<string>,
): { handsSeenFlop: number; wentToShowdown: number } {
  const sawFlop = new Set(sawFlopPlayerIds)
  const revealed = new Set(revealedPlayerIds)

  // Preflop all-ins can reach showdown without taking a postflop action.
  for (const playerId of revealed) sawFlop.add(playerId)

  return {
    handsSeenFlop: sawFlop.size,
    wentToShowdown: revealed.size,
  }
}
