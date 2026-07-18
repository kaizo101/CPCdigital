import { describe, expect, it } from 'vitest'
import type { Player, PlayerAction } from '@cpc/shared'
import { PokerGame } from './game'

const config = { smallBlind: 10, bigBlind: 20, seed: 'decision-snapshots' }

function makePlayers(count = 3): Player[] {
  return Array.from({ length: count }, (_, seatIndex) => ({
    id: `p${seatIndex + 1}`,
    name: `Player ${seatIndex + 1}`,
    role: 'player',
    chips: 1000,
    seatIndex,
    isConnected: true,
    isSittingOut: false,
    status: 'waiting',
    roundBet: 0,
  }))
}

function passiveAction(game: PokerGame): PlayerAction {
  const legal = game.getPublicState().bettingContext!.legalActions
  return legal.callAmount != null ? { type: 'call' } : { type: 'check' }
}

describe('decision snapshots', () => {
  it('captures the complete pre-action context and only the acting player’s private cards', () => {
    const game = new PokerGame(makePlayers(), config)
    game.startHand()
    const stateBefore = game.getPublicState()
    const playerId = stateBefore.currentPlayerId!
    const ownCards = game.getPlayerView(playerId).ownCards!.map(card => ({ ...card }))
    const chosenAction = passiveAction(game)

    game.applyAction(playerId, chosenAction)

    const snapshot = game.getPrivateDecisionSnapshots()[0]
    expect(snapshot).toEqual(expect.objectContaining({
      decisionIndex: 0,
      playerId,
      ownCards,
      chosenAction,
      source: 'player',
    }))
    expect(snapshot.visibleState).toEqual(expect.objectContaining({
      phase: 'preflop',
      communityCards: [],
      sidePots: [],
      pot: stateBefore.bettingContext!.totalPot,
      currentBet: stateBefore.currentBet,
      smallBlind: 10,
      bigBlind: 20,
    }))
    expect(snapshot.bettingContext).toEqual(stateBefore.bettingContext)
    expect(snapshot.actionHistory.map(event => event.type)).toEqual(['BlindPosted', 'BlindPosted'])
    expect(snapshot.position.tableSize).toBe(3)
    expect(snapshot.position.positionsFromDealer).toBeGreaterThanOrEqual(0)
    expect(snapshot.position.positionsFromDealer).toBeLessThan(3)

    for (const player of snapshot.visibleState.players) {
      expect(Object.keys(player).sort()).toEqual([
        'chips',
        'isDealer',
        'playerId',
        'roundBet',
        'seatIndex',
        'status',
      ])
    }
    expect(game.getPublicHandHistory().some(event => (event as { type: string }).type === 'DecisionSnapshot')).toBe(false)
  })

  it('keeps earlier snapshots unchanged as the hand advances', () => {
    const game = new PokerGame(makePlayers(), config)
    game.startHand()
    game.applyAction(game.getPublicState().currentPlayerId!, passiveAction(game))
    const firstSnapshot = game.getPrivateDecisionSnapshots()[0]
    const serializedBefore = JSON.stringify(firstSnapshot)

    game.applyAction(game.getPublicState().currentPlayerId!, passiveAction(game))

    expect(game.getPrivateDecisionSnapshots()).toHaveLength(2)
    expect(JSON.stringify(firstSnapshot)).toBe(serializedBefore)
    expect(game.getPrivateDecisionSnapshots()[1].actionHistory.filter(event => event.type === 'PlayerActed')).toHaveLength(1)
  })

  it('records the source but does not record rejected actions', () => {
    const game = new PokerGame(makePlayers(), config)
    game.startHand()
    const playerId = game.getPublicState().currentPlayerId!

    expect(() => game.applyAction(playerId, { type: 'raise', amount: Number.NaN })).toThrow(/invalid raise/i)
    expect(game.getPrivateDecisionSnapshots()).toHaveLength(0)

    game.applyAction(playerId, { type: 'fold' }, 'forced')
    expect(game.getPrivateDecisionSnapshots()).toHaveLength(1)
    expect(game.getPrivateDecisionSnapshots()[0]).toEqual(expect.objectContaining({
      chosenAction: { type: 'fold' },
      source: 'forced',
    }))
  })

  it('creates exactly one snapshot for every successful decision in a complete hand', () => {
    const game = new PokerGame(makePlayers(2), config)
    game.startHand()
    let decisionCount = 0

    while (game.getPublicState().phase !== 'waiting') {
      const playerId = game.getPublicState().currentPlayerId!
      const ownCards = game.getPlayerView(playerId).ownCards!.map(card => ({ ...card }))
      game.applyAction(playerId, passiveAction(game))
      decisionCount++

      expect(game.getPrivateDecisionSnapshots()).toHaveLength(decisionCount)
      expect(game.getPrivateDecisionSnapshots().at(-1)).toEqual(expect.objectContaining({
        playerId,
        ownCards,
      }))
    }

    const actionEvents = game.getPublicHandHistory().filter(event => event.type === 'PlayerActed')
    expect(game.getPrivateDecisionSnapshots()).toHaveLength(actionEvents.length)
  })

  it('starts a fresh snapshot sequence for every hand', () => {
    const game = new PokerGame(makePlayers(), config)
    game.startHand()
    while (game.getPublicState().phase !== 'waiting') {
      const context = game.getPublicState().bettingContext!
      game.applyAction(context.playerId, context.legalActions.fold ? { type: 'fold' } : { type: 'check' })
    }
    expect(game.getPrivateDecisionSnapshots().length).toBeGreaterThan(0)

    game.startHand()
    expect(game.getPrivateDecisionSnapshots()).toHaveLength(0)
  })
})
