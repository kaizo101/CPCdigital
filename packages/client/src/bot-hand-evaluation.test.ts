import { describe, expect, it } from 'vitest'
import type { Card, GameState, Player } from '@cpc/shared'
import { assessHand } from './bot-hand-evaluation'
import { createBotState, decideTagAction, TAG_PERSONALITY } from './bot-tag'

const card = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })

function player(id: string, chips: number, roundBet = 0): Player {
  return {
    id,
    name: id,
    role: 'player',
    chips,
    seatIndex: id === 'bot' ? 0 : 1,
    isConnected: true,
    isSittingOut: false,
    status: 'active',
    roundBet,
  }
}

function preflopState(canRaise: boolean, botChips = 30): GameState {
  return withBotBettingContext({
    variantId: 'texas-holdem',
    phase: 'preflop',
    players: [player('bot', botChips), player('villain', 100, 20)],
    communityCards: [],
    pot: 30,
    sidePots: [],
    currentPlayerId: 'bot',
    dealerIndex: 0,
    bigBlind: 20,
    smallBlind: 10,
    currentBet: 20,
    minRaise: 20,
    canRaise,
    bettingContext: null,
    turnDeadline: null,
  })
}

function withBotBettingContext(state: GameState): GameState {
  const bot = state.players.find(candidate => candidate.id === 'bot')!
  const totalPot = state.pot + state.players.reduce((sum, candidate) => sum + candidate.roundBet, 0)
  const toCall = Math.max(0, state.currentBet - bot.roundBet)
  const callAmount = Math.min(toCall, bot.chips)
  const minRaiseTo = state.currentBet + state.minRaise
  const maxRaiseTo = bot.roundBet + bot.chips
  const canFullRaise = state.canRaise && maxRaiseTo >= minRaiseTo
  const deepestOpponentStack = Math.max(...state.players.filter(candidate => candidate.id !== bot.id).map(candidate => candidate.chips))
  const effectiveStack = Math.min(bot.chips, deepestOpponentStack)

  return {
    ...state,
    bettingContext: {
      playerId: bot.id,
      totalPot,
      toCall,
      callAmount,
      potOdds: callAmount > 0 ? callAmount / (totalPot + callAmount) : 0,
      toCallPotRatio: toCall > 0 && totalPot > 0 ? toCall / totalPot : 0,
      potRaiseTo: bot.roundBet + totalPot + (2 * callAmount),
      minRaiseTo,
      maxRaiseTo,
      playerStack: bot.chips,
      effectiveStack,
      spr: totalPot > 0 ? effectiveStack / totalPot : 0,
      legalActions: {
        fold: toCall > 0,
        check: toCall === 0,
        callAmount: toCall > 0 ? callAmount : null,
        raise: canFullRaise ? { minAmount: minRaiseTo, maxAmount: maxRaiseTo } : null,
        allInAmount: state.canRaise || maxRaiseTo <= state.currentBet ? maxRaiseTo : null,
      },
    },
  }
}

describe('bot hand assessment', () => {
  it('uses the numeric engine rank for descriptive hand names', () => {
    const assessment = assessHand(
      [card('A', 'hearts'), card('A', 'diamonds')],
      [card('A', 'clubs'), card('K', 'hearts'), card('K', 'diamonds'), card('2', 'spades'), card('3', 'clubs')],
    )

    expect(assessment.rank).toBe(7)
    expect(assessment.category).toBe('strong')
    expect(assessment.made).toBe(true)
  })

  it('turns a raise into an all-in when a full raise is unaffordable', () => {
    const action = decideTagAction(
      preflopState(true),
      'bot',
      [card('A', 'hearts'), card('A', 'diamonds')],
      createBotState(TAG_PERSONALITY),
    )

    expect(action).toEqual({ type: 'all-in' })
  })

  it('does not raise when action has not been reopened', () => {
    const action = decideTagAction(
      preflopState(false),
      'bot',
      [card('A', 'hearts'), card('A', 'diamonds')],
      createBotState(TAG_PERSONALITY),
    )

    expect(action).toEqual({ type: 'call' })
  })

  it('snaps raises to the table chip step', () => {
    const action = decideTagAction(
      preflopState(true, 1000),
      'bot',
      [card('A', 'hearts'), card('A', 'diamonds')],
      createBotState(TAG_PERSONALITY),
    )

    expect(action.type).toBe('raise')
    if (action.type === 'raise') {
      expect(action.amount % 10).toBe(0)
    }
  })

  it('uses a realistic 3-bet size instead of the legal minimum', () => {
    const gameState = withBotBettingContext({
      ...preflopState(true, 1000),
      players: [player('bot', 1000, 20), player('villain', 950, 50)],
      currentBet: 50,
      minRaise: 30,
    })

    const action = decideTagAction(
      gameState,
      'bot',
      [card('A', 'hearts'), card('A', 'diamonds')],
      createBotState(TAG_PERSONALITY),
    )

    expect(action).toEqual({ type: 'raise', amount: 150 })
  })

  it('calls a small shove after committing most of its stack with a raise', () => {
    const bot = player('bot', 200, 800)
    const villain = { ...player('villain', 0, 950), status: 'all-in' as const }
    const gameState = withBotBettingContext({
      ...preflopState(false),
      players: [bot, villain],
      pot: 0,
      currentBet: 950,
      minRaise: 600,
      canRaise: false,
    })
    const botState = createBotState(TAG_PERSONALITY)
    botState.raisedPreflop = true

    const action = decideTagAction(
      gameState,
      'bot',
      [card('7', 'clubs'), card('2', 'diamonds')],
      botState,
    )

    expect(action).toEqual({ type: 'call' })
  })
})
