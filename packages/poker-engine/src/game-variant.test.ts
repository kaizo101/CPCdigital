import { describe, expect, it } from 'vitest'
import type { Player, PlayerAction } from '@cpc/shared'
import { PokerGame } from './game'
import { replayHand } from './hand-replay'
import { validateGameVariant, type GameVariant } from './game-variant'
import { TEXAS_HOLDEM } from './variants/texas-holdem'

function makePlayers(chips = 1000, count = 3): Player[] {
  return Array.from({ length: count }, (_, seatIndex) => ({
    id: `p${seatIndex + 1}`,
    name: `Player ${seatIndex + 1}`,
    role: 'player',
    chips,
    seatIndex,
    isConnected: true,
    isSittingOut: false,
    status: 'waiting',
    roundBet: 0,
  }))
}

const condensedHoldem: GameVariant = {
  id: 'condensed-holdem',
  name: 'Condensed Holdem Test',
  holeCardsPerPlayer: 2,
  bettingStructure: { type: 'no-limit' },
  phases: [
    {
      id: 'opening',
      kind: 'betting',
      dealBefore: null,
      actionOrder: 'after-big-blind',
      minimumBetBigBlinds: 1,
    },
    {
      id: 'board',
      kind: 'betting',
      dealBefore: { target: 'community', count: 5 },
      actionOrder: 'left-of-dealer',
      minimumBetBigBlinds: 1,
    },
  ],
}

function passiveAction(game: PokerGame): PlayerAction {
  const legal = game.getPublicState().bettingContext!.legalActions
  return legal.callAmount != null ? { type: 'call' } : { type: 'check' }
}

function finishPassively(game: PokerGame): void {
  let actions = 0
  while (game.getPublicState().phase !== 'waiting' && actions < 30) {
    game.applyAction(game.getPublicState().currentPlayerId!, passiveAction(game))
    actions++
  }
  if (game.getPublicState().phase !== 'waiting') throw new Error('Variant test hand did not finish')
}

describe('variant-neutral phase and betting structure', () => {
  it('defines NLHE entirely through ordered betting phases', () => {
    expect(TEXAS_HOLDEM).toEqual(expect.objectContaining({
      id: 'texas-holdem',
      holeCardsPerPlayer: 2,
      bettingStructure: { type: 'no-limit' },
    }))
    expect(TEXAS_HOLDEM.phases.map(phase => phase.id)).toEqual(['preflop', 'flop', 'turn', 'river'])
    expect(TEXAS_HOLDEM.phases.map(phase =>
      phase.kind === 'betting' ? phase.dealBefore?.count ?? 0 : 0
    )).toEqual([0, 3, 1, 1])
  })

  it('runs and replays phase ids and board deals without hard-coded Holdem street names', () => {
    const game = new PokerGame(makePlayers(), {
      smallBlind: 10,
      bigBlind: 20,
      seed: 'custom-phases',
      variant: condensedHoldem,
    })
    game.startHand()
    expect(game.getPublicState()).toEqual(expect.objectContaining({
      variantId: 'condensed-holdem',
      phase: 'opening',
    }))

    finishPassively(game)

    const history = game.getPublicHandHistory()
    expect(history[0]).toEqual(expect.objectContaining({
      type: 'HandStarted',
      variantId: 'condensed-holdem',
    }))
    expect(history.filter(event => event.type === 'CommunityCardDealt')).toEqual([
      expect.objectContaining({ phase: 'board', cards: expect.arrayContaining([]) }),
    ])
    const communityEvent = history.find(event => event.type === 'CommunityCardDealt')
    if (communityEvent?.type === 'CommunityCardDealt') expect(communityEvent.cards).toHaveLength(5)
    expect(game.getPublicState().communityCards).toHaveLength(5)
    expect(replayHand(history, condensedHoldem).at(-1)?.state).toEqual(expect.objectContaining({
      variantId: 'condensed-holdem',
      phase: 'complete',
    }))
    expect(() => replayHand(history)).toThrow(/variant mismatch/i)
  })

  it('uses the remaining phase definitions for an all-in runout', () => {
    const game = new PokerGame(makePlayers(40, 2), {
      smallBlind: 10,
      bigBlind: 20,
      seed: 'custom-runout',
      variant: condensedHoldem,
    })
    game.startHand()

    while (game.getPublicState().phase !== 'waiting') {
      const context = game.getPublicState().bettingContext
      if (!context) throw new Error('Expected betting context before runout')
      game.applyAction(
        context.playerId,
        context.legalActions.allInAmount != null ? { type: 'all-in' } : passiveAction(game),
      )
    }

    const communityEvents = game.getPublicHandHistory().filter(event => event.type === 'CommunityCardDealt')
    expect(communityEvents).toHaveLength(1)
    expect(communityEvents[0]).toEqual(expect.objectContaining({ phase: 'board' }))
    if (communityEvents[0]?.type === 'CommunityCardDealt') expect(communityEvents[0].cards).toHaveLength(5)
  })

  it('caps raises at the pot for a pot-limit variant', () => {
    const potLimitVariant: GameVariant = {
      ...TEXAS_HOLDEM,
      id: 'pot-limit-holdem-test',
      bettingStructure: { type: 'pot-limit' },
    }
    const game = new PokerGame(makePlayers(), {
      smallBlind: 10,
      bigBlind: 20,
      variant: potLimitVariant,
    })
    game.startHand()

    const context = game.getPublicState().bettingContext!
    expect(context.potRaiseTo).toBe(70)
    expect(context.maxRaiseTo).toBe(70)
    expect(context.legalActions.raise).toEqual({ minAmount: 40, maxAmount: 70 })
    expect(context.legalActions.allInAmount).toBeNull()
    expect(() => game.applyAction(context.playerId, { type: 'raise', amount: 80 })).toThrow(/maximum raise to 70/i)
    expect(() => game.applyAction(context.playerId, { type: 'raise', amount: 70 })).not.toThrow()
  })

  it('uses the phase bet unit and raise cap for fixed-limit variants', () => {
    const openingPhase = condensedHoldem.phases[0]
    const boardPhase = condensedHoldem.phases[1]
    if (openingPhase.kind !== 'betting' || boardPhase.kind !== 'betting') {
      throw new Error('Condensed Holdem test phases must be betting phases')
    }
    const fixedLimitVariant: GameVariant = {
      ...condensedHoldem,
      id: 'fixed-limit-holdem-test',
      bettingStructure: { type: 'fixed-limit', maxRaisesPerRound: 1 },
      phases: [
        openingPhase,
        { ...boardPhase, minimumBetBigBlinds: 2 },
      ],
    }
    const game = new PokerGame(makePlayers(1000, 2), {
      smallBlind: 10,
      bigBlind: 20,
      variant: fixedLimitVariant,
    })
    game.startHand()

    const firstContext = game.getPublicState().bettingContext!
    expect(firstContext.legalActions.raise).toEqual({ minAmount: 40, maxAmount: 40 })
    expect(firstContext.legalActions.allInAmount).toBeNull()
    expect(() => game.applyAction(firstContext.playerId, { type: 'raise', amount: 50 })).toThrow(/maximum raise to 40/i)
    game.applyAction(firstContext.playerId, { type: 'raise', amount: 40 })
    expect(game.getPublicState().bettingContext?.legalActions.raise).toBeNull()
    game.applyAction(game.getPublicState().currentPlayerId!, { type: 'call' })

    expect(game.getPublicState()).toEqual(expect.objectContaining({ phase: 'board', minRaise: 40 }))
    expect(game.getPublicState().bettingContext?.legalActions.raise).toEqual({ minAmount: 40, maxAmount: 40 })
  })

  it('rejects ambiguous phase definitions before a hand starts', () => {
    const invalid: GameVariant = {
      ...condensedHoldem,
      phases: [condensedHoldem.phases[0], { ...condensedHoldem.phases[0] }],
    }
    expect(() => validateGameVariant(invalid)).toThrow(/duplicate variant phase/i)
    expect(() => new PokerGame(makePlayers(), {
      smallBlind: 10,
      bigBlind: 20,
      variant: invalid,
    })).toThrow(/duplicate variant phase/i)

    const reserved: GameVariant = {
      ...condensedHoldem,
      phases: [{ ...condensedHoldem.phases[0], id: 'showdown' }],
    }
    expect(() => validateGameVariant(reserved)).toThrow(/reserved/i)
  })
})
