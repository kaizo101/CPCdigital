import { describe, expect, it } from 'vitest'
import type { DecisionActionHistoryEvent } from '@cpc/shared'
import type { BotContext } from './bot-context'
import {
  calculateOmahaBlockerValue,
  calculateOmahaEquityCollapse,
  findStraightTop,
  omahaVariantEvaluator,
} from './omaha-hand-evaluation'

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

function evaluatePreflop(
  ownCards: BotContext['ownCards'],
  overrides: Partial<BotContext> = {},
) {
  const context = makeContext([])
  context.publicState.phase = 'preflop'
  context.ownCards = ownCards
  Object.assign(context, overrides)
  return omahaVariantEvaluator.evaluate(context).handAssessment
}

function preflopRaise(): Extract<DecisionActionHistoryEvent, { type: 'PlayerActed' }> {
  return {
    type: 'PlayerActed',
    phase: 'preflop',
    playerId: 'villain',
    action: { type: 'raise', amount: 0.06 },
    amount: 0.06,
    totalBet: 0.06,
    toCall: 0,
    currentBetBefore: 0.02,
    potAfter: 0.09,
    source: 'player',
  }
}

describe('omaha preflop structure', () => {
  it('recognizes premium double-pair aces and connected double-suited rundowns', () => {
    const acesAndKings = evaluatePreflop([
      { rank: 'A', suit: 'hearts' },
      { rank: 'A', suit: 'diamonds' },
      { rank: 'K', suit: 'diamonds' },
      { rank: 'K', suit: 'spades' },
    ])
    const wheelRundown = evaluatePreflop([
      { rank: 'A', suit: 'hearts' },
      { rank: '2', suit: 'hearts' },
      { rank: '3', suit: 'diamonds' },
      { rank: '4', suit: 'diamonds' },
    ])

    expect(acesAndKings.category).toBe('premium')
    expect(wheelRundown.category).toBe('strong')
  })

  it('does not mistake triple- or monotone suits for double-suited hands', () => {
    const doubleSuited = evaluatePreflop([
      { rank: 'K', suit: 'clubs' },
      { rank: 'Q', suit: 'clubs' },
      { rank: 'J', suit: 'hearts' },
      { rank: 'T', suit: 'hearts' },
    ])
    const tripleSuited = evaluatePreflop([
      { rank: 'K', suit: 'clubs' },
      { rank: 'Q', suit: 'clubs' },
      { rank: 'J', suit: 'clubs' },
      { rank: 'T', suit: 'hearts' },
    ])
    const monotoneDangler = evaluatePreflop([
      { rank: 'K', suit: 'diamonds' },
      { rank: '8', suit: 'diamonds' },
      { rank: '3', suit: 'diamonds' },
      { rank: '2', suit: 'diamonds' },
    ])

    expect(doubleSuited.category).toBe('strong')
    expect(doubleSuited.strength).toBeGreaterThan(tripleSuited.strength)
    expect(monotoneDangler.category).toBe('weak')
  })

  it('does not count duplicate ranks as connectivity', () => {
    const fourAces = evaluatePreflop([
      { rank: 'A', suit: 'clubs' },
      { rank: 'A', suit: 'diamonds' },
      { rank: 'A', suit: 'hearts' },
      { rank: 'A', suit: 'spades' },
    ])
    const disconnectedSingleSuit = evaluatePreflop([
      { rank: 'J', suit: 'hearts' },
      { rank: '7', suit: 'spades' },
      { rank: '3', suit: 'clubs' },
      { rank: '2', suit: 'hearts' },
    ])

    expect(['weak', 'marginal', 'medium']).toContain(fourAces.category)
    expect(disconnectedSingleSuit.category).toBe('weak')
  })

  it('keeps absolute hand quality independent of position and prior action', () => {
    const cards: BotContext['ownCards'] = [
      { rank: 'Q', suit: 'clubs' },
      { rank: 'J', suit: 'clubs' },
      { rank: '9', suit: 'hearts' },
      { rank: '8', suit: 'hearts' },
    ]
    const unopened = evaluatePreflop(cards)
    const facingRaiseContext = makeContext([])
    facingRaiseContext.publicState.phase = 'preflop'
    facingRaiseContext.ownCards = cards
    facingRaiseContext.bettingContext.toCall = 0.06
    facingRaiseContext.actionHistory = [preflopRaise()]
    facingRaiseContext.position = { ...facingRaiseContext.position, category: 'early' }
    const facingRaise = omahaVariantEvaluator.evaluate(facingRaiseContext).handAssessment

    expect(facingRaise.category).toBe(unopened.category)
    expect(facingRaise.strength).toBe(unopened.strength)
  })
})

describe('omaha draw detection', () => {
  it('does not mark a third suited board card as deterioration for a made flush', () => {
    const ctx = makeContext([
      { rank: 'A', suit: 'hearts' },
      { rank: '7', suit: 'hearts' },
      { rank: '2', suit: 'clubs' },
      { rank: '4', suit: 'hearts' },
    ])

    expect(omahaVariantEvaluator.evaluate(ctx).handAssessment.boardGotWorse).toBe(false)
  })

  it('marks pairing and newly connected Omaha boards as deterioration', () => {
    const paired = makeContext([
      { rank: 'A', suit: 'clubs' },
      { rank: '8', suit: 'diamonds' },
      { rank: '2', suit: 'clubs' },
      { rank: '8', suit: 'spades' },
    ])
    const connected = makeContext([
      { rank: 'T', suit: 'clubs' },
      { rank: '6', suit: 'diamonds' },
      { rank: '2', suit: 'clubs' },
      { rank: '8', suit: 'spades' },
    ])

    expect(omahaVariantEvaluator.evaluate(paired).handAssessment.boardGotWorse).toBe(true)
    expect(omahaVariantEvaluator.evaluate(connected).handAssessment.boardGotWorse).toBe(true)
  })

  it('does not mark a blank turn or unchanged river danger as deterioration', () => {
    const blankTurn = makeContext([
      { rank: 'A', suit: 'clubs' },
      { rank: '8', suit: 'diamonds' },
      { rank: '2', suit: 'clubs' },
      { rank: 'Q', suit: 'spades' },
    ])
    const blankRiver = makeContext([
      { rank: 'A', suit: 'clubs' },
      { rank: '8', suit: 'clubs' },
      { rank: '2', suit: 'diamonds' },
      { rank: '4', suit: 'clubs' },
      { rank: 'Q', suit: 'spades' },
    ])

    expect(omahaVariantEvaluator.evaluate(blankTurn).handAssessment.boardGotWorse).toBe(false)
    expect(omahaVariantEvaluator.evaluate(blankRiver).handAssessment.boardGotWorse).toBe(false)
  })

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
    ctx.ownCards = [
      { rank: 'K', suit: 'spades' },
      { rank: '9', suit: 'spades' },
      { rank: '7', suit: 'diamonds' },
      { rank: '5', suit: 'spades' },
    ]
    const result = omahaVariantEvaluator.evaluate(ctx)
    expect(result.handAssessment.drawTypes).toContain('nut-flush-draw')
  })

  it('does not report a flush draw with only one suited hole card', () => {
    const ctx = makeContext([
      { rank: '2', suit: 'spades' },
      { rank: '7', suit: 'spades' },
      { rank: '9', suit: 'spades' },
    ])
    ctx.ownCards = [
      { rank: 'A', suit: 'spades' },
      { rank: 'K', suit: 'hearts' },
      { rank: 'Q', suit: 'diamonds' },
      { rank: 'J', suit: 'clubs' },
    ]

    const result = omahaVariantEvaluator.evaluate(ctx)

    expect(result.handAssessment.drawTypes).not.toContain('flush-draw')
    expect(result.handAssessment.drawTypes).not.toContain('nut-flush-draw')
  })

  it('does not treat a runner-runner flush as a direct flush draw', () => {
    const ctx = makeContext([
      { rank: '2', suit: 'spades' },
      { rank: '7', suit: 'hearts' },
      { rank: '9', suit: 'diamonds' },
    ])
    ctx.ownCards = [
      { rank: 'A', suit: 'spades' },
      { rank: 'K', suit: 'spades' },
      { rank: 'Q', suit: 'diamonds' },
      { rank: 'J', suit: 'clubs' },
    ]

    const result = omahaVariantEvaluator.evaluate(ctx)

    expect(result.handAssessment.drawTypes).not.toContain('nut-flush-draw')
    expect(result.handAssessment.cleanOuts).toBe(0)
  })

  describe('straight draw Omaha 3-board + 2-hand constraint', () => {
    it('does not count straight outs when hand has too few ranks in the straight', () => {
      // Board (turn): 3♠4♠5♠6♠, Hand: A♥A♦K♥K♦
      // X=2 completes 2-3-4-5-6, but hand has no ranks 2-6 → invalid
      const ctx = makeContext([
        { rank: '3', suit: 'spades' },
        { rank: '4', suit: 'spades' },
        { rank: '5', suit: 'spades' },
        { rank: '6', suit: 'spades' },
      ])
      ctx.ownCards = [
        { rank: 'A', suit: 'hearts' },
        { rank: 'A', suit: 'diamonds' },
        { rank: 'K', suit: 'hearts' },
        { rank: 'K', suit: 'diamonds' },
      ]
      const result = omahaVariantEvaluator.evaluate(ctx)
      // drawQuality would use wrapCount internally — if drawTypes has no
      // straight-related entries, the draw was rejected
      expect(result.handAssessment.drawTypes.filter(t =>
        t.startsWith('wrap') || t === 'oesd' || t === 'gutshot' || t === 'combo-draw')).toEqual([])
    })

    it('does not count straight outs when hand already has a made straight from board 3+ hand 2', () => {
      // Board (turn): 3♠4♠5♠6♠, Hand: 7♥8♥K♦Q♠
      // The straight 4-5-6-7-8 uses board 4,5,6 + hand 7,8 → already a made straight
      const ctx = makeContext([
        { rank: '3', suit: 'spades' },
        { rank: '4', suit: 'spades' },
        { rank: '5', suit: 'spades' },
        { rank: '6', suit: 'spades' },
      ])
      ctx.ownCards = [
        { rank: '7', suit: 'hearts' },
        { rank: '8', suit: 'hearts' },
        { rank: 'K', suit: 'diamonds' },
        { rank: 'Q', suit: 'spades' },
      ]
      const result = omahaVariantEvaluator.evaluate(ctx)
      // No straight draw needed — hand already has a straight
      expect(result.handAssessment.drawTypes.filter(t =>
        t.startsWith('wrap') || t === 'oesd' || t === 'gutshot' || t === 'combo-draw')).toEqual([])
    })

    it('counts physical cards for a 13-card wrap', () => {
      // Board 9-6-2 with T-8-7-x: ranks 5, 7, 8 and T complete a valid
      // Omaha straight. One 7, 8 and T are held, so 4+3+3+3 = 13 outs.
      const ctx = makeContext([
        { rank: '9', suit: 'spades' },
        { rank: '6', suit: 'diamonds' },
        { rank: '2', suit: 'clubs' },
      ])
      ctx.ownCards = [
        { rank: 'T', suit: 'hearts' },
        { rank: '8', suit: 'clubs' },
        { rank: '7', suit: 'diamonds' },
        { rank: 'K', suit: 'hearts' },
      ]

      const result = omahaVariantEvaluator.evaluate(ctx)

      expect(result.handAssessment.drawTypes).toContain('wrap-13+')
      expect(result.handAssessment.drawTypes).toContain('nut-wrap')
      expect(result.handAssessment.cleanOuts).toBe(13)
    })

    it('recognizes an ace-low wheel out but excludes it when every out is dominated', () => {
      const ctx = makeContext([
        { rank: '3', suit: 'spades' },
        { rank: '4', suit: 'diamonds' },
        { rank: '9', suit: 'clubs' },
      ])
      ctx.ownCards = [
        { rank: 'A', suit: 'hearts' },
        { rank: '2', suit: 'clubs' },
        { rank: 'Q', suit: 'diamonds' },
        { rank: 'K', suit: 'hearts' },
      ]

      const result = omahaVariantEvaluator.evaluate(ctx)

      expect(result.handAssessment.drawTypes).toContain('gutshot')
      expect(result.handAssessment.cleanOuts).toBe(0)
    })

    it('separates a large bottom wrap from a clean nut wrap', () => {
      const bottom = makeContext([
        { rank: 'A', suit: 'spades' },
        { rank: 'Q', suit: 'diamonds' },
        { rank: 'J', suit: 'clubs' },
      ])
      bottom.ownCards = [
        { rank: 'T', suit: 'hearts' },
        { rank: '9', suit: 'clubs' },
        { rank: '8', suit: 'diamonds' },
        { rank: '7', suit: 'hearts' },
      ]
      const nut = makeContext([
        { rank: '9', suit: 'spades' },
        { rank: '6', suit: 'diamonds' },
        { rank: '2', suit: 'clubs' },
      ])
      nut.ownCards = [
        { rank: 'T', suit: 'hearts' },
        { rank: '8', suit: 'clubs' },
        { rank: '7', suit: 'diamonds' },
        { rank: 'K', suit: 'hearts' },
      ]

      const bottomAssessment = omahaVariantEvaluator.evaluate(bottom).handAssessment
      const nutAssessment = omahaVariantEvaluator.evaluate(nut).handAssessment
      expect(bottomAssessment.drawTypes).toEqual(expect.arrayContaining(['wrap-13+', 'bottom-wrap']))
      expect(bottomAssessment.cleanOuts).toBe(0)
      expect(nutAssessment.drawTypes).toEqual(expect.arrayContaining(['wrap-13+', 'nut-wrap']))
      expect(nutAssessment.cleanOuts).toBe(13)
      expect(nutAssessment.drawQuality).toBeGreaterThan(bottomAssessment.drawQuality)
    })

    it('marks wraps whose outs are uniformly second-best', () => {
      const ctx = makeContext([
        { rank: 'A', suit: 'spades' },
        { rank: '9', suit: 'diamonds' },
        { rank: '8', suit: 'clubs' },
      ])
      ctx.ownCards = [
        { rank: 'K', suit: 'hearts' },
        { rank: 'J', suit: 'clubs' },
        { rank: '7', suit: 'diamonds' },
        { rank: '5', suit: 'hearts' },
      ]

      const assessment = omahaVariantEvaluator.evaluate(ctx).handAssessment
      expect(assessment.drawTypes).toEqual(expect.arrayContaining(['wrap-8+', 'second-wrap']))
      expect(assessment.cleanOuts).toBe(0)
    })

    it('filters dominated wrap cards when the next card is the river', () => {
      const ctx = makeContext([
        { rank: 'A', suit: 'spades' },
        { rank: 'K', suit: 'diamonds' },
        { rank: 'Q', suit: 'clubs' },
        { rank: '5', suit: 'hearts' },
      ])
      ctx.ownCards = [
        { rank: 'J', suit: 'diamonds' },
        { rank: '9', suit: 'clubs' },
        { rank: '4', suit: 'hearts' },
        { rank: '3', suit: 'spades' },
      ]

      const assessment = omahaVariantEvaluator.evaluate(ctx).handAssessment
      expect(assessment.drawTypes).toEqual(expect.arrayContaining(['wrap-8+', 'bottom-wrap']))
      expect(assessment.cleanOuts).toBe(0)
    })
  })

  describe('edge cases: pairs, two pair, duplicated ranks', () => {
    it('detects Broadway draw with 3+2 split on A/K board + Q/J/T hand', () => {
      // Board (flop): A♠K♠2♠, Hand: Q♥J♥T♥9♥
      // A/K board with Q/J/T/9 has multiple physical Broadway/wrap outs.
      const ctx = makeContext([
        { rank: 'A', suit: 'spades' },
        { rank: 'K', suit: 'spades' },
        { rank: '2', suit: 'spades' },
      ])
      ctx.ownCards = [
        { rank: 'Q', suit: 'hearts' },
        { rank: 'J', suit: 'hearts' },
        { rank: 'T', suit: 'hearts' },
        { rank: '9', suit: 'hearts' },
      ]
      const result = omahaVariantEvaluator.evaluate(ctx)
      expect(result.handAssessment.drawTypes).toContain('wrap-8+')
    })

    it('correctly detects straight draw with paired board + connected hand', () => {
      // Board (flop): K♠K♦7♣, Hand: A♥A♦Q♥J♥
      // boardUnique = [7,13], handUnique = [11,12,14]
      // After turn X=9: board = K,K,7,9. After river X=10: board = K,K,7,9,10
      // 9-10-J-Q-K: board 9,10,K(3) + hand Q,J(2) ✓
      // On flop: no single card completes a straight → wrapCount = 0 (correct)
      const ctx = makeContext([
        { rank: 'K', suit: 'spades' },
        { rank: 'K', suit: 'diamonds' },
        { rank: '7', suit: 'clubs' },
      ])
      ctx.ownCards = [
        { rank: 'A', suit: 'hearts' },
        { rank: 'A', suit: 'diamonds' },
        { rank: 'Q', suit: 'hearts' },
        { rank: 'J', suit: 'hearts' },
      ]
      const result = omahaVariantEvaluator.evaluate(ctx)
      // No single-card straight completion possible on this flop
      expect(result.handAssessment.drawTypes.filter(t =>
        t.startsWith('wrap') || t === 'oesd' || t === 'gutshot')).toEqual([])
    })
  })
})

describe('PLO board equity collapse', () => {
  it('treats a paired final card as severe for straights and flushes but harmless for boats', () => {
    const pairedRiver = [
      { rank: 'K', suit: 'clubs' },
      { rank: '9', suit: 'diamonds' },
      { rank: '2', suit: 'spades' },
      { rank: '4', suit: 'hearts' },
      { rank: '4', suit: 'clubs' },
    ] as const

    expect(calculateOmahaEquityCollapse([...pairedRiver], 5, 'near-nuts')).toBe(0.85)
    expect(calculateOmahaEquityCollapse([...pairedRiver], 6, 'near-nuts')).toBe(0.85)
    expect(calculateOmahaEquityCollapse([...pairedRiver], 7, 'medium')).toBe(0)
  })

  it('collapses a non-flush hand when the board becomes three-suited', () => {
    const thirdHeart = [
      { rank: 'K', suit: 'hearts' },
      { rank: '9', suit: 'hearts' },
      { rank: '2', suit: 'clubs' },
      { rank: '4', suit: 'hearts' },
    ] as const

    expect(calculateOmahaEquityCollapse([...thirdHeart], 4, 'strong')).toBe(0.8)
    expect(calculateOmahaEquityCollapse([...thirdHeart], 6, 'near-nuts')).toBe(0)
  })

  it('grades new straight density by the hand actual rank and nut position', () => {
    const connectedTurn = [
      { rank: 'K', suit: 'clubs' },
      { rank: '6', suit: 'diamonds' },
      { rank: '2', suit: 'clubs' },
      { rank: '4', suit: 'spades' },
    ] as const

    expect(calculateOmahaEquityCollapse([...connectedTurn], 3, 'medium')).toBe(0.6)
    expect(calculateOmahaEquityCollapse([...connectedTurn], 5, 'nuts')).toBe(0.08)
    expect(calculateOmahaEquityCollapse([...connectedTurn], 5, 'weak')).toBe(0.5)
  })

  it('returns zero for a blank transition and before the turn', () => {
    const blankTurn = [
      { rank: 'A', suit: 'clubs' },
      { rank: '8', suit: 'diamonds' },
      { rank: '2', suit: 'clubs' },
      { rank: 'Q', suit: 'spades' },
    ] as const

    expect(calculateOmahaEquityCollapse([...blankTurn], 3, 'medium')).toBe(0)
    expect(calculateOmahaEquityCollapse(blankTurn.slice(0, 3), 3, 'medium')).toBe(0)
  })
})

describe('PLO river blockers', () => {
  it('grades the nut and second-nut flush blockers on a three-flush board', () => {
    const board = [
      { rank: 'K', suit: 'hearts' },
      { rank: '9', suit: 'hearts' },
      { rank: '2', suit: 'hearts' },
      { rank: '4', suit: 'clubs' },
      { rank: '7', suit: 'diamonds' },
    ] as const

    expect(calculateOmahaBlockerValue([
      { rank: 'A', suit: 'hearts' },
      { rank: 'Q', suit: 'clubs' },
      { rank: 'J', suit: 'diamonds' },
      { rank: 'T', suit: 'spades' },
    ], [...board])).toBe(30)
    expect(calculateOmahaBlockerValue([
      { rank: 'Q', suit: 'hearts' },
      { rank: '8', suit: 'clubs' },
      { rank: '6', suit: 'diamonds' },
      { rank: '3', suit: 'spades' },
    ], [...board])).toBe(15)
  })

  it('recognizes complete and partial nut-straight blockers', () => {
    const board = [
      { rank: '9', suit: 'clubs' },
      { rank: 'T', suit: 'diamonds' },
      { rank: 'J', suit: 'spades' },
      { rank: '2', suit: 'hearts' },
      { rank: '2', suit: 'clubs' },
    ] as const

    expect(calculateOmahaBlockerValue([
      { rank: 'K', suit: 'hearts' },
      { rank: 'Q', suit: 'clubs' },
      { rank: '5', suit: 'diamonds' },
      { rank: '4', suit: 'spades' },
    ], [...board])).toBe(30)
    expect(calculateOmahaBlockerValue([
      { rank: 'K', suit: 'hearts' },
      { rank: '8', suit: 'clubs' },
      { rank: '5', suit: 'diamonds' },
      { rank: '4', suit: 'spades' },
    ], [...board])).toBe(12)
  })

  it('treats the wheel as five-high when finding its nut hole-card pair', () => {
    expect(findStraightTop([14, 5, 4, 3, 2], 5)).toBe(5)
    expect(calculateOmahaBlockerValue([
      { rank: '5', suit: 'hearts' },
      { rank: '4', suit: 'clubs' },
      { rank: 'K', suit: 'diamonds' },
      { rank: 'Q', suit: 'spades' },
    ], [
      { rank: 'A', suit: 'clubs' },
      { rank: '2', suit: 'diamonds' },
      { rank: '3', suit: 'spades' },
      { rank: '8', suit: 'hearts' },
      { rank: '9', suit: 'clubs' },
    ])).toBe(30)
  })
})
