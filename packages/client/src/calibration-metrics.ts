import type { PlayerAction } from '@cpc/shared'

export const CALIBRATION_METRIC_SCHEMA_VERSION = 2

export function calibrationPercentage(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0
}

export function isWithinCalibrationTarget(
  value: number,
  target: readonly [number, number],
): boolean {
  return Number.isFinite(value) && value >= target[0] && value <= target[1]
}

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

export interface CalibrationActionObservation {
  phase: string
  playerId: string
  action: PlayerAction
  currentBet: number
  allInAmount?: number | null
}

export interface CalibrationActionDelta {
  threeBetOpportunity: boolean
  threeBet: boolean
  cBetOpportunity: boolean
  cBet: boolean
  foldToCBetOpportunity: boolean
  foldToCBet: boolean
  turnCBetOpportunity: boolean
  turnCBet: boolean
  aggressionClass: AggressionActionClass
  aggressionRole: 'pfa' | 'non-pfa' | null
  preflopAggressorId: string | null
}

/** Canonical per-hand reducer for calibration metric definitions. */
export class CalibrationHandAccumulator {
  readonly vpipPlayers = new Set<string>()
  readonly pfrPlayers = new Set<string>()
  readonly threeBetOpportunityPlayers = new Set<string>()
  readonly threeBetPlayers = new Set<string>()

  private preflopRaiseCount = 0
  private preflopAggressorId: string | null = null
  private activeFlopCbettorId: string | null = null

  recordAction(observation: CalibrationActionObservation): CalibrationActionDelta {
    const { phase, playerId, action, currentBet, allInAmount } = observation
    const aggressionClass = classifyAggressionAction(action, currentBet, allInAmount)
    const aggressive = aggressionClass === 'aggressive'
    let threeBetOpportunity = false
    let threeBet = false
    let cBetOpportunity = false
    let cBet = false
    let foldToCBetOpportunity = false
    let foldToCBet = false
    let turnCBetOpportunity = false
    let turnCBet = false
    let aggressionRole: CalibrationActionDelta['aggressionRole'] = null

    if (phase === 'preflop') {
      threeBetOpportunity = isThreeBetOpportunity(
        this.preflopRaiseCount,
        this.threeBetOpportunityPlayers.has(playerId),
      )
      if (threeBetOpportunity) this.threeBetOpportunityPlayers.add(playerId)

      if (action.type === 'call' || action.type === 'raise' || action.type === 'all-in') {
        this.vpipPlayers.add(playerId)
      }

      if (aggressive) {
        this.pfrPlayers.add(playerId)
        if (this.preflopRaiseCount === 1) {
          threeBet = true
          this.threeBetPlayers.add(playerId)
        }
        this.preflopRaiseCount++
      }
      this.preflopAggressorId = updatePreflopAggressor(
        this.preflopAggressorId,
        phase,
        playerId,
        aggressive,
      )
    } else {
      aggressionRole = playerId === this.preflopAggressorId ? 'pfa' : 'non-pfa'
      cBetOpportunity = isContinuationBetOpportunity({
        phase,
        actingPlayerId: playerId,
        preflopAggressorId: this.preflopAggressorId,
        currentBet,
      })
      if (cBetOpportunity && aggressive) {
        cBet = true
        this.activeFlopCbettorId = playerId
      }

      foldToCBetOpportunity = phase === 'flop'
        && playerId !== this.preflopAggressorId
        && this.activeFlopCbettorId === this.preflopAggressorId
        && currentBet > 0
      foldToCBet = foldToCBetOpportunity && action.type === 'fold'

      turnCBetOpportunity = phase === 'turn'
        && playerId === this.preflopAggressorId
        && this.activeFlopCbettorId === this.preflopAggressorId
        && currentBet === 0
      turnCBet = turnCBetOpportunity && aggressive

      if (phase === 'flop' && aggressive && playerId !== this.preflopAggressorId) {
        this.activeFlopCbettorId = null
      }
    }

    return {
      threeBetOpportunity,
      threeBet,
      cBetOpportunity,
      cBet,
      foldToCBetOpportunity,
      foldToCBet,
      turnCBetOpportunity,
      turnCBet,
      aggressionClass,
      aggressionRole,
      preflopAggressorId: this.preflopAggressorId,
    }
  }
}

export interface CalibrationInvariantSnapshot {
  threeBets: number
  threeBetOpportunities: number
  cBets: number
  cBetOpportunities: number
  foldToCBets: number
  foldToCBetOpportunities: number
  handsSeenFlop: number
  handsSeenTurn: number
  handsSeenRiver: number
  wentToShowdown: number
  wonAtShowdown: number
}

export function calibrationInvariantViolations(snapshot: CalibrationInvariantSnapshot): string[] {
  const violations: string[] = []
  if (snapshot.threeBets > snapshot.threeBetOpportunities) violations.push('3-bets exceed opportunities')
  if (snapshot.cBets > snapshot.cBetOpportunities) violations.push('c-bets exceed opportunities')
  if (snapshot.foldToCBets > snapshot.foldToCBetOpportunities) violations.push('fold-to-c-bets exceed opportunities')
  if (snapshot.handsSeenTurn > snapshot.handsSeenFlop) violations.push('turn participants exceed flop participants')
  if (snapshot.handsSeenRiver > snapshot.handsSeenTurn) violations.push('river participants exceed turn participants')
  if (snapshot.wentToShowdown > snapshot.handsSeenFlop) violations.push('showdowns exceed flop participants')
  if (snapshot.wonAtShowdown > snapshot.wentToShowdown) violations.push('showdown winners exceed participants')
  return violations
}
