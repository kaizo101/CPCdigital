import type {
  BettingContext,
  DecisionActionHistoryEvent,
  DecisionPosition,
  HandEvent,
  PlayerGameView,
  PlayerId,
  PublicGameState,
} from '@cpc/shared'
import type { BotArchetypeId } from './bot-archetypes'
import type { Position } from './bot-types'

export interface BotPosition extends DecisionPosition {
  category: Position
}

/**
 * Complete fair-information boundary for a bot decision.
 *
 * It deliberately contains only the actor's private cards, a public game-state
 * clone, engine-derived legal actions/betting values, and public action events.
 */
export interface BotContext {
  playerId: PlayerId
  publicState: PublicGameState
  ownCards: NonNullable<PlayerGameView['ownCards']>
  bettingContext: BettingContext
  position: BotPosition
  actionHistory: DecisionActionHistoryEvent[]
  archetypeId?: BotArchetypeId
}

export function createBotContext(
  playerId: PlayerId,
  playerView: Readonly<PlayerGameView>,
  publicHandHistory: readonly HandEvent[],
  archetypeId?: BotArchetypeId,
): BotContext {
  const sourceState = playerView.state
  if (sourceState.phase === 'waiting' || sourceState.phase === 'showdown') {
    throw new Error('Cannot create a bot context outside an active betting phase')
  }
  if (sourceState.currentPlayerId !== playerId) {
    throw new Error(`Cannot create a bot context when it is not ${playerId}'s turn`)
  }
  if (!playerView.ownCards) {
    throw new Error(`Cannot create a bot context without cards for ${playerId}`)
  }

  const sourceBettingContext = sourceState.bettingContext
  if (!sourceBettingContext || sourceBettingContext.playerId !== playerId) {
    throw new Error(`Missing betting context for bot ${playerId}`)
  }

  const playersInHand = sourceState.players
    .filter(player => player.status !== 'waiting')
    .sort((left, right) => left.seatIndex - right.seatIndex)
  const player = playersInHand.find(candidate => candidate.id === playerId)
  const dealer = sourceState.players[sourceState.dealerIndex]
  const playerIndex = playersInHand.findIndex(candidate => candidate.id === playerId)
  const dealerIndex = playersInHand.findIndex(candidate => candidate.id === dealer?.id)
  if (!player || !dealer || playerIndex < 0 || dealerIndex < 0) {
    throw new Error(`Cannot determine table position for bot ${playerId}`)
  }

  const positionsFromDealer = (playerIndex - dealerIndex + playersInHand.length) % playersInHand.length
  const bettingContext = cloneBettingContext(sourceBettingContext)
  const publicState = clonePublicState(sourceState, bettingContext)
  const position: BotPosition = {
    seatIndex: player.seatIndex,
    dealerSeatIndex: dealer.seatIndex,
    positionsFromDealer,
    tableSize: playersInHand.length,
    category: getPositionCategory(positionsFromDealer, playersInHand.length),
  }

  return {
    playerId,
    publicState,
    ownCards: playerView.ownCards.map(card => ({ ...card })) as BotContext['ownCards'],
    bettingContext,
    position,
    actionHistory: publicHandHistory
      .filter((event): event is DecisionActionHistoryEvent =>
        event.type === 'BlindPosted' || event.type === 'PlayerActed'
      )
      .map(event => event.type === 'PlayerActed'
        ? { ...event, action: { ...event.action } }
        : { ...event }),
    archetypeId,
  }
}

export function getPositionCategory(positionsFromDealer: number, tableSize: number): Position {
  if (tableSize < 2 || positionsFromDealer < 0 || positionsFromDealer >= tableSize) {
    throw new Error('Invalid table position')
  }
  if (positionsFromDealer === 0) return 'late'
  if (tableSize === 2 || positionsFromDealer <= 2) return 'blinds'

  const nonBlindPositions = tableSize - 3
  const actionIndex = positionsFromDealer - 3
  if (nonBlindPositions === 1) return 'late'

  const earlyCount = Math.max(1, Math.floor(nonBlindPositions / 3))
  const lateCount = Math.max(1, Math.ceil(nonBlindPositions / 3))
  if (actionIndex < earlyCount) return 'early'
  if (actionIndex >= nonBlindPositions - lateCount) return 'late'
  return 'middle'
}

function cloneBettingContext(context: Readonly<BettingContext>): BettingContext {
  return {
    ...context,
    legalActions: {
      ...context.legalActions,
      raise: context.legalActions.raise ? { ...context.legalActions.raise } : null,
    },
  }
}

function clonePublicState(
  state: Readonly<PublicGameState>,
  bettingContext: BettingContext,
): PublicGameState {
  return {
    ...state,
    players: state.players.map(player => ({ ...player })),
    communityCards: state.communityCards.map(card => ({ ...card })),
    sidePots: state.sidePots.map(sidePot => ({
      amount: sidePot.amount,
      eligiblePlayerIds: [...sidePot.eligiblePlayerIds],
    })),
    bettingContext,
  }
}
