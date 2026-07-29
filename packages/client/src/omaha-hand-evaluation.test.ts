import { describe, expect, it } from 'vitest'
import type { BotContext } from './bot-context'
import { omahaVariantEvaluator } from './omaha-hand-evaluation'

function makeContext(communityCards: BotContext['publicState']['communityCards']): BotContext {
  return {
    playerId: 'bot',
    ownCards: [
      { rank: 'K', suit: 'hearts' },
      { rank: '9', suit: 'hearts' },
      { rank: '7', suit: 'diamonds' },
      { rank: '5', suit: 'hearts' },
    ],
    publicState: {
      variantId: 'omaha-high',
      phase: communityCards.length === 5 ? 'river' : communityCards.length === 4 ? 'turn' : 'flop',
      players: [],
      communityCards,
      pot: 0.5,
      sidePots: [],
      currentPlayerId: 'bot',
      dealerIndex: 0,
      bigBlind: 0.02,
      smallBlind: 0.01,
      currentBet: 0,
      minRaise: 0.04,
      canRaise: true,
      bettingContext: null,
      turnDeadline: null,
    },
    bettingContext: {
      playerId: 'bot',
      totalPot: 0.5,
      toCall: 0,
      callAmount: 0,
      potOdds: 0,
      toCallPotRatio: 0,
      potRaiseTo: 0.5,
      minRaiseTo: 0.04,
      maxRaiseTo: 2.22,
      playerStack: 2.22,
      effectiveStack: 2.22,
      spr: 4.44,
      legalActions: {
        fold: true,
        check: true,
        callAmount: null,
        raise: { minAmount: 0.04, maxAmount: 2.22 },
        allInAmount: 2.22,
      },
    },
    position: {
      seatIndex: 1,
      dealerSeatIndex: 0,
      positionsFromDealer: 1,
      tableSize: 6,
      category: 'blinds',
    },
    actionHistory: [],
  }
}

describe('omaha draw detection', () => {
  it('clears draw types on river (flush draw impossible with no cards remaining)', () => {
    // User's exact hand: K♥9♥7♦5♥, board J♠J♦A♠4♥5♣ (river)
    const ctx = makeContext([
      { rank: 'J', suit: 'spades' },
      { rank: 'J', suit: 'diamonds' },
      { rank: 'A', suit: 'spades' },
      { rank: '4', suit: 'hearts' },
      { rank: '5', suit: 'clubs' },
    ])
    const result = omahaVariantEvaluator.evaluate(ctx)
    expect(result.handAssessment.drawTypes).toEqual([])
  })

  it('omits flush draw on turn when board cannot reach 3 of flush suit', () => {
    // Flop: J♠J♦A♠ (0 hearts), Turn: 4♥ (1 heart)
    // Hand has 3 hearts, but board has only 1 heart with 1 card remaining → max 2 board hearts < 3
    const ctx = makeContext([
      { rank: 'J', suit: 'spades' },
      { rank: 'J', suit: 'diamonds' },
      { rank: 'A', suit: 'spades' },
      { rank: '4', suit: 'hearts' },
    ])
    const result = omahaVariantEvaluator.evaluate(ctx)
    expect(result.handAssessment.drawTypes).not.toContain('flush-draw')
    expect(result.handAssessment.drawTypes).not.toContain('nut-flush-draw')
  })

  it('detects flush draw on flop when board has at least 1 card of flush suit and 2+ cards remaining', () => {
    // Hand: K♠9♠7♦5♠ (3 spades), Board: J♠J♦A♠ (2 spades) → 5 spades total, board has 2 with 2 remaining → 2+2=4 ≥ 3 → viable
    const ctx = makeContext([
      { rank: 'J', suit: 'spades' },
      { rank: 'J', suit: 'diamonds' },
      { rank: 'A', suit: 'spades' },
    ])
    // Override ownCards to give actual flush draw
    ctx.ownCards = [
      { rank: 'K', suit: 'spades' },
      { rank: '9', suit: 'spades' },
      { rank: '7', suit: 'diamonds' },
      { rank: '5', suit: 'spades' },
    ]
    const result = omahaVariantEvaluator.evaluate(ctx)
    // A♠ on board + 4 spades in hand → nut flush draw
    expect(result.handAssessment.drawTypes).toContain('nut-flush-draw')
  })

})
