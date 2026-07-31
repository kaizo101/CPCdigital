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
