import type { Card, PlayerAction, PublicGameState } from '@cpc/shared'
import { getPreflopAction, getPreflopSituation } from './preflop-ranges'
import { assessHand, analyzeBoardTexture, type HandAssessment } from './bot-hand-evaluation'
import { createBotState, updateMentalState, getOpponentStats, updateOpponentRead } from './bot-mental'
import { decideAction as pipelineDecide, type DecisionResult } from './bot-pipeline'
import type { BotState, BotPersonality, Position, MentalEvent } from './bot-types'
import type { DecisionContext } from './bot-pipeline'
import { calculateChipUnit, roundToCents } from './utils/format'

export type { BotState, BotPersonality, Position, MentalEvent, HandAssessment }
export { createBotState, updateMentalState, getOpponentStats, updateOpponentRead }

// TAG Personality (as distribution for variance)
export const TAG_PERSONALITY: BotPersonality = {
  name: 'TAG',
  aggression: { mean: 65, stddev: 10 },
  bluffFrequency: { mean: 25, stddev: 8 },
  riskTolerance: { mean: 50, stddev: 12 },
  patience: { mean: 70, stddev: 10 },
  observationSkill: { mean: 60, stddev: 15 },
  tiltSensitivity: { mean: 40, stddev: 15 },  // Moderate tilt sensitivity
  tiltRecovery: { mean: 60, stddev: 15 },    // Good recovery
  emotionality: { mean: 50, stddev: 10 },    // Balanced emotionality
}

// Get position relative to dealer (using all seats, not just active players)
function getPosition(state: PublicGameState, playerId: string): Position {
  const allPlayers = state.players
  const playerIndex = allPlayers.findIndex(p => p.id === playerId)
  if (playerIndex === -1) return 'middle'

  const n = allPlayers.length
  const dealerIndex = state.dealerIndex
  const positionsFromDealer = (playerIndex - dealerIndex + n) % n

  // Generic mapping: BTN=0, SB=1, BB=2, then early → middle → late
  if (positionsFromDealer === 0) return 'late'       // BTN
  if (positionsFromDealer === 1) return 'blinds'     // SB
  if (positionsFromDealer === 2) return 'blinds'     // BB
  if (positionsFromDealer <= Math.floor(n / 2)) return 'early'  // UTG, UTG+1, ...
  if (positionsFromDealer === n - 1) return 'late'   // CO/HJ
  return 'middle'
}

// Pre-Flop decision logic using range tables
function decidePreflopAction(
  state: PublicGameState,
  holeCards: [Card, Card],
  botState: BotState,
  position: Position,
  toCall: number,
  canCheck: boolean,
  potOdds: number,
  effectiveAggression: number,
  random: () => number,
): PlayerAction {
  const situation = getPreflopSituation(state, position)
  const tableAction = getPreflopAction(holeCards, position, situation)

  const tiltModifier = botState.mentalState.tilt / 100
  const looseTendency = calculateLooseTendency(botState, tiltModifier)
  const raiseAmount = calculatePreflopRaiseTo(state, position, canCheck)

  switch (tableAction) {
    case 'raise':
      if (tiltModifier > 0.7 && random() < 0.3) {
        return { type: 'fold' }
      }
      return { type: 'raise', amount: raiseAmount }

    case 'call':
      if (canCheck) {
        // TAG raises most limps — only occasionally limps marginal hands
        if (random() < 0.82 + effectiveAggression / 300) {
          return { type: 'raise', amount: raiseAmount }
        }
        return { type: 'check' }
      }
      // Facing a raise: TAG sometimes 3-bets with calling-range hands
      if (random() < 0.3 + effectiveAggression / 200) {
        return { type: 'raise', amount: raiseAmount }
      }
      return { type: 'call' }

    case 'fold':
      if (canCheck) return { type: 'check' }
      // Preserve range consistency after our own raise when a shove offers an
      // overwhelming price. This is based on required equity, not sunk cost.
      if (botState.raisedPreflop && potOdds > 0 && potOdds <= 0.15) {
        return { type: 'call' }
      }
      if (toCall <= state.bigBlind && random() < looseTendency * 0.06) {
        return { type: 'call' }
      }
      return { type: 'fold' }
  }
}

function calculatePreflopRaiseTo(state: PublicGameState, position: Position, canCheck: boolean): number {
  const situation = getPreflopSituation(state, position)

  if (situation === 'unopened') {
    // A raise from the big blind after limpers needs extra size. Otherwise use
    // conventional position-dependent open sizes.
    if (canCheck) return state.bigBlind * 4
    if (position === 'early') return state.bigBlind * 3
    if (position === 'middle') return state.bigBlind * 2.75
    if (position === 'blinds') return state.bigBlind * 3
    return state.bigBlind * 2.5
  }

  if (situation === 'facing-open') {
    // Roughly 3x in position and 4x from the blinds; early/middle seats use a
    // slightly larger compromise because exact raiser position is not tracked yet.
    if (position === 'late') return state.currentBet * 3
    if (position === 'blinds') return state.currentBet * 4
    return state.currentBet * 3.5
  }

  // A compact non-all-in 4-bet size. Stack-aware deviations belong in BotContext.
  return state.currentBet * (position === 'blinds' ? 2.5 : 2.3)
}

// Calculate loose tendency
function calculateLooseTendency(botState: BotState, tiltModifier: number): number {
  const baseLooseTendency = botState.riskTolerance / 100
  const tiltLooseBonus = tiltModifier * 0.3
  const patienceLooseBonus = (1 - botState.mentalState.patience / 100) * 0.2
  const skillLoosePenalty = (1 - botState.skill / 100) * 0.25
  return Math.min(1, baseLooseTendency + tiltLooseBonus + patienceLooseBonus + skillLoosePenalty)
}

// Calculate optimal bet size
function calculateBetSize(
  state: PublicGameState,
  botId: string,
  botState: BotState,
  position: Position,
  handStrength: 'value' | 'bluff' | 'semi-bluff' | 'draw',
  boardTexture: 'dry' | 'wet' | 'neutral',
  isCbet: boolean = false
): number {
  const pot = state.pot
  const activePlayers = state.players.filter(p => p.status !== 'folded' && p.status !== 'waiting')
  const me = activePlayers.find(p => p.id === botId)
  if (!me) return state.minRaise
  const effectiveStack = me.chips

  let baseSize = 0.5

  switch (handStrength) {
    case 'value':
      baseSize = 0.7
      break
    case 'bluff':
      baseSize = 0.5
      break
    case 'semi-bluff':
      baseSize = 0.6
      break
    case 'draw':
      baseSize = 0.5
      break
  }

  const playerCount = activePlayers.length
  if (playerCount > 2) {
    baseSize += (playerCount - 2) * 0.05
  }

  const opponent = activePlayers.find(p => p.id !== me?.id)
  if (opponent) {
    const read = botState.opponentReads.get(opponent.id)
    if (read && read.handsSampled > 5) {
      const stats = getOpponentStats(read)
      if (stats.vpip > 40 && stats.foldToBet < 40) {
        if (handStrength === 'value') baseSize += 0.1
        if (handStrength === 'bluff') baseSize -= 0.1
      }
      if (stats.vpip < 20 && stats.foldToBet > 60) {
        if (handStrength === 'value') baseSize -= 0.1
        if (handStrength === 'bluff') baseSize += 0.1
      }
      if (stats.aggression > 60) {
        baseSize = baseSize * 0.9
      }
    }
  }

  if (position === 'late') {
    baseSize -= 0.05
  } else if (position === 'early') {
    baseSize += 0.1
  }

  if (boardTexture === 'dry') {
    baseSize -= 0.1
  } else if (boardTexture === 'wet') {
    baseSize += 0.1
  }

  const spr = effectiveStack / Math.max(pot, 1)
  if (spr < 3) {
    baseSize = Math.min(1.0, baseSize + 0.2)
  } else if (spr > 10) {
    baseSize = Math.max(0.3, baseSize - 0.1)
  }

  if (isCbet) {
    baseSize = 0.6
    if (boardTexture === 'dry') baseSize = 0.33
    if (opponent) {
      const read = botState.opponentReads.get(opponent.id)
      if (read) {
        const stats = getOpponentStats(read)
        if (stats.vpip > 40) baseSize *= 0.8
      }
    }
  }

  const aggressionModifier = (botState.aggression - 50) / 200
  baseSize += aggressionModifier

  baseSize = Math.max(0.3, Math.min(1.0, baseSize))

  const betAmount = roundToCents(pot * baseSize)

  return Math.max(betAmount, state.minRaise)
}

// Main decision function using Pipeline for postflop
export function decideTagAction(
  state: PublicGameState,
  botId: string,
  holeCards: [Card, Card],
  botState: BotState,
  random: () => number = Math.random,
): PlayerAction {
  const me = state.players.find(p => p.id === botId)
  if (!me) return { type: 'fold' }
  const bettingContext = state.bettingContext
  if (!bettingContext || bettingContext.playerId !== botId) {
    throw new Error(`Missing betting context for bot ${botId}`)
  }

  const { toCall, potOdds, totalPot: livePot, legalActions } = bettingContext
  const canCheck = legalActions.check
  const position = getPosition(state, botId)

  // Preflop: Use range tables (works well)
  if (state.phase === 'preflop') {
    const tiltModifier = botState.mentalState.tilt / 100
    const confidenceModifier = botState.mentalState.confidence / 100
    const effectiveAggression = Math.max(0, Math.min(100,
      botState.aggression + (tiltModifier * 20) - ((1 - confidenceModifier) * 15)
    ))
    const action = legalizeBotAction(
      state,
      me,
      decidePreflopAction(state, holeCards, botState, position, toCall, canCheck, potOdds, effectiveAggression, random),
    )
    if (action.type === 'raise') {
      botState.raisedPreflop = true
    }
    botState.lastAction = action.type === 'raise' || action.type === 'all-in' ? 'bet' : action.type
    botState.lastStreet = 'preflop'
    return action
  }

  // Postflop: Use Pipeline
  const playerCount = state.players.filter(p => p.status !== 'folded' && p.status !== 'waiting').length
  const handAssessment = assessHand(holeCards, state.communityCards)
  const boardTexture = analyzeBoardTexture(state.communityCards)

  // Get opponent stats if available
  const opponent = state.players.find(p => p.id !== botId && p.status === 'active')
  let opponentStats = undefined
  if (opponent) {
    const read = botState.opponentReads.get(opponent.id)
    if (read && read.handsSampled > 5) {
      opponentStats = getOpponentStats(read)
    }
  }

  // Create BotGameView (fair information only)
  const gameView = {
    myCards: holeCards,
    board: state.communityCards,
    pot: livePot,
    currentBet: state.currentBet,
    minRaiseTo: bettingContext.minRaiseTo,
    maxRaiseTo: bettingContext.maxRaiseTo,
    canRaise: !!(
      legalActions.raise
      || (legalActions.allInAmount != null && legalActions.allInAmount > state.currentBet)
    ),
    bigBlind: state.bigBlind,
    smallBlind: state.smallBlind,
    phase: state.phase as any,
    players: state.players.map(p => ({
      id: p.id,
      chips: p.chips,
      roundBet: p.roundBet,
      status: p.status,
      isDealer: p.id === state.players[state.dealerIndex]?.id
    })),
    dealerIndex: state.dealerIndex,
    potOdds,
    toCallPotRatio: bettingContext.toCallPotRatio,
    effectiveStack: bettingContext.effectiveStack,
    spr: bettingContext.spr,
  }

  const context: DecisionContext = {
    gameView,
    botId,
    botState,
    position,
    toCall,
    canCheck,
    playerCount,
    boardTexture,
    handAssessment,
    opponentStats
  }

  const result = pipelineDecide(context, { random })
  const action = result.action

  // Apply state updates from the decision (separated for purity)
  if (result.stateUpdates.raisedPreflop !== undefined) {
    botState.raisedPreflop = result.stateUpdates.raisedPreflop
  }
  if (result.stateUpdates.lastAction !== undefined) {
    botState.lastAction = result.stateUpdates.lastAction
  }
  if (result.stateUpdates.lastStreet !== undefined) {
    botState.lastStreet = result.stateUpdates.lastStreet as any
  }

  return legalizeBotAction(state, me, action)
}

function legalizeBotAction(
  state: PublicGameState,
  player: PublicGameState['players'][number],
  action: PlayerAction,
): PlayerAction {
  const bettingContext = state.bettingContext
  if (!bettingContext || bettingContext.playerId !== player.id) {
    throw new Error(`Missing betting context for bot ${player.id}`)
  }
  const legal = bettingContext.legalActions
  const passiveAction: PlayerAction = legal.check
    ? { type: 'check' }
    : legal.callAmount != null
      ? { type: 'call' }
      : { type: 'fold' }

  if (action.type === 'fold') return legal.fold ? action : passiveAction
  if (action.type === 'check') return legal.check ? action : passiveAction
  if (action.type === 'call') return legal.callAmount != null ? action : passiveAction
  if (action.type === 'all-in') return legal.allInAmount != null ? action : passiveAction

  const aggressiveAllIn = legal.allInAmount != null && legal.allInAmount > state.currentBet
  if (!legal.raise) return aggressiveAllIn ? { type: 'all-in' } : passiveAction

  const betStep = calculateChipUnit(state.smallBlind, state.bigBlind)
  const snappedAmount = roundToCents(Math.round(action.amount / betStep) * betStep)
  const raiseAmount = Math.max(legal.raise.minAmount, snappedAmount)
  if (raiseAmount >= legal.raise.maxAmount) return { type: 'all-in' }

  return { type: 'raise', amount: raiseAmount }
}
