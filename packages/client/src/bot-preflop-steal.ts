import type { DecisionActionHistoryEvent, HandEvent } from '@cpc/shared'

export type StealPosition = 'button' | 'cutoff'
export interface StealSpot { openerId: string; position: StealPosition }

/** Classifies a public first action; folds before the opener preserve an unopened pot. */
export function classifyStealOpportunity(
  history: readonly HandEvent[],
  eventIndex: number,
): { position: StealPosition; attempted: boolean } | null {
  const start = history[0]
  const event = history[eventIndex]
  if (
    start?.type !== 'HandStarted'
    || event?.type !== 'PlayerActed'
    || event.phase !== 'preflop'
    || event.source === 'forced'
    || start.players.length < 4
  ) return null

  const players = [...start.players].sort((left, right) => left.seatIndex - right.seatIndex)
  const dealerIndex = players.findIndex(player => player.playerId === start.dealerId)
  const actorIndex = players.findIndex(player => player.playerId === event.playerId)
  if (dealerIndex < 0 || actorIndex < 0) return null
  const position: StealPosition | null = actorIndex === dealerIndex
    ? 'button'
    : actorIndex === (dealerIndex - 1 + players.length) % players.length
      ? 'cutoff'
      : null
  if (!position) return null

  const priorActions = history.slice(1, eventIndex).filter((prior): prior is Extract<HandEvent, { type: 'PlayerActed' }> =>
    prior.type === 'PlayerActed' && prior.phase === 'preflop' && prior.source !== 'forced'
  )
  if (priorActions.some(prior => prior.playerId === event.playerId || prior.action.type !== 'fold')) {
    return null
  }

  // Short-stack open shoves are not evidence of a routine steal frequency.
  return { position, attempted: event.action.type === 'raise' }
}

/** Only a single unopened late-position raise against a blind is an anti-steal spot. */
export function currentStealSpot(
  botId: string,
  botPositionsFromDealer: number,
  playerPositions: ReadonlyMap<string, { positionsFromDealer: number }>,
  tableSize: number,
  history: readonly DecisionActionHistoryEvent[],
): StealSpot | null {
  if (tableSize < 4 || (botPositionsFromDealer !== 1 && botPositionsFromDealer !== 2)) return null
  const actions = history.filter((event): event is Extract<DecisionActionHistoryEvent, { type: 'PlayerActed' }> =>
    event.type === 'PlayerActed' && event.phase === 'preflop' && event.source !== 'forced'
  )
  const openerIndex = actions.findIndex(event => event.action.type !== 'fold')
  if (openerIndex < 0) return null
  const opener = actions[openerIndex]
  if (opener.playerId === botId || opener.action.type !== 'raise') return null
  if (actions.slice(openerIndex + 1).some(event => event.action.type !== 'fold')) return null
  const openerPosition = playerPositions.get(opener.playerId)?.positionsFromDealer
  const position: StealPosition | null = openerPosition === 0
    ? 'button'
    : openerPosition === tableSize - 1 ? 'cutoff' : null
  return position ? { openerId: opener.playerId, position } : null
}
