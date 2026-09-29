import { describe, expect, it } from 'vitest'
import type { Card, GameState, Player } from '@cpc/shared'
import { assessHand } from './nlhe-hand-evaluation'
import { createBotState, decideTagAction, decideTagDecision, TAG_PERSONALITY } from './bot-tag'
import { createBotContext } from './bot-context'

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

function riverBoardPlayState(): GameState {
  return withBotBettingContext({
    variantId: 'texas-holdem',
    phase: 'river',
    players: [player('bot', 1000), player('villain', 925, 75)],
    communityCards: [
      card('A', 'clubs'), card('A', 'diamonds'), card('T', 'hearts'), card('T', 'spades'), card('5', 'clubs'),
    ],
    pot: 100,
    sidePots: [],
    currentPlayerId: 'bot',
    dealerIndex: 1,
    bigBlind: 20,
    smallBlind: 10,
    currentBet: 75,
    minRaise: 75,
    canRaise: false,
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
      eligiblePot: totalPot,
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

function contextFor(state: GameState, ownCards: [Card, Card]) {
  return createBotContext('bot', { state, ownCards }, [])
}

describe('NLHE bot hand assessment', () => {
  it('uses the numeric engine rank for descriptive hand names', () => {
    const assessment = assessHand(
      [card('A', 'hearts'), card('A', 'diamonds')],
      [card('A', 'clubs'), card('K', 'hearts'), card('K', 'diamonds'), card('2', 'spades'), card('3', 'clubs')],
    )

    expect(assessment.rank).toBe(7)
    expect(assessment.category).toBe('strong')
    expect(assessment.made).toBe(true)
  })

  it('does not invent a private flush draw from four suited board cards', () => {
    const board = [
      card('T', 'diamonds'), card('9', 'diamonds'), card('3', 'diamonds'), card('5', 'diamonds'),
    ]

    const jacks = assessHand(
      [card('J', 'hearts'), card('J', 'spades')],
      board,
    )
    const topPair = assessHand(
      [card('T', 'clubs'), card('7', 'spades')],
      board,
    )

    expect(jacks.drawTypes).not.toContain('flush-draw')
    expect(jacks.drawTypes).not.toContain('nut-flush-draw')
    expect(topPair.drawTypes).not.toContain('flush-draw')
    expect(topPair.drawTypes).not.toContain('nut-flush-draw')
  })

  it('keeps genuine flush draws, exact outs and nut provenance distinct', () => {
    const twoHoleCards = assessHand(
      [card('A', 'diamonds'), card('7', 'diamonds')],
      [card('K', 'diamonds'), card('2', 'diamonds'), card('9', 'clubs')],
    )
    const boardAceNutDraw = assessHand(
      [card('K', 'diamonds'), card('8', 'clubs')],
      [
        card('A', 'diamonds'), card('7', 'diamonds'),
        card('2', 'diamonds'), card('9', 'clubs'),
      ],
    )
    const boardAceNonNutDraw = assessHand(
      [card('Q', 'diamonds'), card('8', 'clubs')],
      [
        card('A', 'diamonds'), card('7', 'diamonds'),
        card('2', 'diamonds'), card('9', 'clubs'),
      ],
    )

    expect(twoHoleCards).toMatchObject({ drawTypes: expect.arrayContaining(['nut-flush-draw']), cleanOuts: 9 })
    expect(boardAceNutDraw).toMatchObject({ drawTypes: expect.arrayContaining(['nut-flush-draw']), cleanOuts: 9 })
    expect(boardAceNonNutDraw).toMatchObject({ drawTypes: expect.arrayContaining(['flush-draw']), cleanOuts: 7 })
    expect(boardAceNonNutDraw.drawTypes).not.toContain('nut-flush-draw')
  })

  it('rates pocket pairs by overcards instead of granting every pocket pair high strength', () => {
    const scenarios: Array<{
      holeCards: [Card, Card]
      board: Card[]
      expected: number
    }> = [
      {
        holeCards: [card('2', 'clubs'), card('2', 'spades')],
        board: [card('K', 'hearts'), card('9', 'diamonds'), card('3', 'clubs')],
        expected: 25,
      },
      {
        holeCards: [card('8', 'clubs'), card('8', 'diamonds')],
        board: [card('K', 'diamonds'), card('J', 'diamonds'), card('2', 'clubs')],
        expected: 40,
      },
      {
        holeCards: [card('Q', 'clubs'), card('Q', 'spades')],
        board: [card('K', 'hearts'), card('6', 'diamonds'), card('2', 'clubs')],
        expected: 55,
      },
      {
        holeCards: [card('J', 'hearts'), card('J', 'spades')],
        board: [card('T', 'diamonds'), card('9', 'diamonds'), card('3', 'diamonds')],
        expected: 85,
      },
    ]

    for (const scenario of scenarios) {
      expect(assessHand(scenario.holeCards, scenario.board).relativeStrength).toBe(scenario.expected)
    }
  })

  it('keeps top, middle and bottom pair strength ordered', () => {
    const board = [card('K', 'hearts'), card('T', 'diamonds'), card('3', 'clubs')]

    expect(assessHand([card('K', 'clubs'), card('7', 'spades')], board).relativeStrength).toBe(80)
    expect(assessHand([card('T', 'clubs'), card('7', 'spades')], board).relativeStrength).toBe(55)
    expect(assessHand([card('3', 'diamonds'), card('7', 'spades')], board).relativeStrength).toBe(35)
  })

  it('characterizes the H0006 paired-board bottom-pair bluffcatcher without reclassifying it', () => {
    const assessment = assessHand(
      [card('J', 'clubs'), card('4', 'hearts')],
      [
        card('6', 'spades'), card('T', 'diamonds'), card('9', 'clubs'),
        card('4', 'diamonds'), card('6', 'clubs'),
      ],
    )

    expect(assessment).toMatchObject({
      rank: 3,
      category: 'marginal',
      made: true,
      pairType: 'bottom',
      showdownValue: 46,
    })
  })

  it('does not overvalue a hole card that merely duplicates a double-paired board kicker', () => {
    const community = [
      card('A', 'clubs'), card('A', 'diamonds'), card('T', 'hearts'), card('T', 'spades'), card('5', 'clubs'),
    ]
    const pairedFive = assessHand(
      [card('5', 'hearts'), card('2', 'clubs')],
      community,
    )
    const boardPlays = assessHand(
      [card('4', 'hearts'), card('2', 'clubs')],
      community,
    )

    expect(pairedFive).toMatchObject({
      rank: 3,
      category: 'weak',
      made: false,
      relativeStrength: 20,
      showdownValue: 25,
      nutPotential: 'weak',
    })
    expect(boardPlays).toMatchObject({
      rank: 3,
      category: 'weak',
      made: false,
      relativeStrength: 20,
      showdownValue: 25,
      nutPotential: 'weak',
    })
    expect(pairedFive.pairType).toBeUndefined()
    expect(boardPlays.pairType).toBeUndefined()
  })

  it('keeps real kicker improvements and full houses distinct on double-paired boards', () => {
    const community = [
      card('A', 'clubs'), card('A', 'diamonds'), card('T', 'hearts'), card('T', 'spades'), card('5', 'clubs'),
    ]
    const kingKicker = assessHand(
      [card('K', 'hearts'), card('2', 'clubs')],
      community,
    )
    const sixKicker = assessHand(
      [card('6', 'hearts'), card('2', 'clubs')],
      community,
    )
    const aceFull = assessHand(
      [card('A', 'hearts'), card('2', 'clubs')],
      community,
    )
    const tensFull = assessHand(
      [card('T', 'clubs'), card('2', 'clubs')],
      community,
    )
    const fivesFull = assessHand(
      [card('5', 'hearts'), card('5', 'diamonds')],
      community,
    )

    expect(sixKicker).toMatchObject({ rank: 3, category: 'marginal', made: true })
    expect(kingKicker).toMatchObject({ rank: 3, category: 'marginal', made: true })
    expect(aceFull).toMatchObject({ rank: 7, category: 'strong', made: true })
    expect(tensFull).toMatchObject({ rank: 7, category: 'strong', made: true })
    expect(fivesFull).toMatchObject({ rank: 7, category: 'strong', made: true })
  })

  it('classifies board plays consistently on other double-paired rivers', () => {
    const scenarios: Array<{ community: Card[]; boardPlay: [Card, Card]; improvement: [Card, Card] }> = [
      {
        community: [
          card('K', 'clubs'), card('K', 'diamonds'), card('7', 'hearts'), card('7', 'spades'), card('3', 'clubs'),
        ],
        boardPlay: [card('3', 'hearts'), card('2', 'clubs')],
        improvement: [card('4', 'hearts'), card('2', 'clubs')],
      },
      {
        community: [
          card('Q', 'clubs'), card('Q', 'diamonds'), card('8', 'hearts'), card('8', 'spades'), card('4', 'clubs'),
        ],
        boardPlay: [card('3', 'hearts'), card('2', 'clubs')],
        improvement: [card('5', 'hearts'), card('3', 'clubs')],
      },
    ]

    for (const { community, boardPlay, improvement } of scenarios) {
      expect(assessHand(boardPlay, community)).toMatchObject({
        rank: 3,
        category: 'weak',
        made: false,
      })
      expect(assessHand(improvement, community)).toMatchObject({
        rank: 3,
        category: 'marginal',
        made: true,
      })
    }
  })

  it('preserves the real two-pair hierarchy on a single-paired board', () => {
    const streets = [
      [card('K', 'diamonds'), card('6', 'clubs'), card('6', 'diamonds')],
      [card('K', 'diamonds'), card('6', 'clubs'), card('6', 'diamonds'), card('7', 'clubs')],
      [card('K', 'diamonds'), card('6', 'clubs'), card('6', 'diamonds'), card('7', 'clubs'), card('J', 'hearts')],
    ]

    for (const community of streets) {
      const aces = assessHand([card('A', 'clubs'), card('A', 'diamonds')], community)
      const king = assessHand([card('K', 'clubs'), card('Q', 'clubs')], community)
      const queens = assessHand([card('Q', 'spades'), card('Q', 'hearts')], community)
      const deuces = assessHand([card('2', 'spades'), card('2', 'hearts')], community)
      const trips = assessHand([card('6', 'spades'), card('5', 'spades')], community)

      expect(aces).toMatchObject({ rank: 3, category: 'good', pairType: 'pocket' })
      expect(king).toMatchObject({ rank: 3, category: 'medium', pairType: 'top', kickerStrength: 'top' })
      expect(queens).toMatchObject({ rank: 3, category: 'marginal', pairType: 'pocket' })
      expect(deuces).toMatchObject({ rank: 3, category: 'weak', pairType: 'pocket' })
      expect(trips).toMatchObject({ rank: 4, category: 'medium' })
      expect(aces.relativeStrength).toBeGreaterThan(king.relativeStrength)
      expect(king.relativeStrength).toBeGreaterThan(queens.relativeStrength)
      expect(queens.relativeStrength).toBeGreaterThan(deuces.relativeStrength)
    }
  })

  it('exports objective made-hand provenance without changing the action category key', () => {
    const assessment = assessHand(
      [card('A', 'clubs'), card('A', 'diamonds')],
      [card('K', 'diamonds'), card('6', 'clubs'), card('6', 'diamonds'), card('7', 'clubs'), card('J', 'hearts')],
    )

    expect(assessment.madeHandProfile).toMatchObject({
      name: expect.stringContaining('Two Pair'),
      usesHoleCards: 2,
      playsBoard: false,
      pairRanks: [14, 6],
      kickerRanks: [13],
      counterfeitStatus: 'none',
    })
  })

  it('carries the board-play downgrade through game state, bot context and action selection', () => {
    const decision = decideTagDecision(
      contextFor(
        riverBoardPlayState(),
        [card('5', 'hearts'), card('2', 'clubs')],
      ),
      createBotState(TAG_PERSONALITY, 100, () => 0.5),
      () => 0.5,
    )
    const fold = decision.decisionResult.allActions.find(candidate => candidate.action.type === 'fold')!
    const call = decision.decisionResult.allActions.find(candidate => candidate.action.type === 'call')!

    expect(decision.evaluation.handAssessment).toMatchObject({
      rank: 3,
      category: 'weak',
      made: false,
    })
    expect(fold.utility).toBeGreaterThan(call.utility)
    expect(decision.action).toEqual({ type: 'fold' })
  })

  it('turns a raise into an all-in when a full raise is unaffordable', () => {
    const action = decideTagAction(
      contextFor(preflopState(true), [card('A', 'hearts'), card('A', 'diamonds')]),
      createBotState(TAG_PERSONALITY),
      () => 0.5,
    )

    expect(action).toEqual({ type: 'all-in' })
  })

  it('does not raise when action has not been reopened', () => {
    const action = decideTagAction(
      contextFor(preflopState(false), [card('A', 'hearts'), card('A', 'diamonds')]),
      createBotState(TAG_PERSONALITY),
      () => 0.5,
    )

    expect(action).toEqual({ type: 'call' })
  })

  it('snaps raises to the table chip step', () => {
    const action = decideTagAction(
      contextFor(preflopState(true, 1000), [card('A', 'hearts'), card('A', 'diamonds')]),
      createBotState(TAG_PERSONALITY),
      () => 0.5,
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
      contextFor(gameState, [card('A', 'hearts'), card('A', 'diamonds')]),
      createBotState(TAG_PERSONALITY),
      () => 0.5,
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
    const botState = createBotState(TAG_PERSONALITY, 50, () => 0.5)
    botState.memory.hand.raisedPreflop = true

    const action = decideTagAction(
      contextFor(gameState, [card('7', 'clubs'), card('2', 'diamonds')]),
      botState,
      () => 0.5,
    )

    expect(action).toEqual({ type: 'call' })
  })
})
