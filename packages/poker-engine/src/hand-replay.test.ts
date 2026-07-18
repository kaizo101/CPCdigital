import { describe, expect, it } from 'vitest'
import type { HandEvent, Player } from '@cpc/shared'
import { PokerGame } from './game'
import { replayHand } from './hand-replay'

const config = { smallBlind: 10, bigBlind: 20 }

function makePlayers(chips: number[] = [1000, 1000]): Player[] {
  return chips.map((stack, index) => ({
    id: `p${index + 1}`,
    name: `Player ${index + 1}`,
    role: 'player',
    chips: stack,
    seatIndex: index,
    isConnected: true,
    isSittingOut: false,
    status: 'waiting',
    roundBet: 0,
  }))
}

function finishPassiveHand(game: PokerGame): void {
  let iterations = 0
  while (game.getPublicState().phase !== 'waiting' && iterations < 30) {
    const context = game.getPublicState().bettingContext!
    game.applyAction(
      context.playerId,
      context.legalActions.callAmount != null ? { type: 'call' } : { type: 'check' },
    )
    iterations++
  }
  if (game.getPublicState().phase !== 'waiting') throw new Error('Passive test hand did not finish')
}

describe('replayHand', () => {
  it('reconstructs immutable intermediate frames from blinds through the flop', () => {
    const game = new PokerGame(makePlayers(), config)
    game.startHand()
    game.applyAction(game.getPublicState().currentPlayerId!, { type: 'call' })
    game.applyAction(game.getPublicState().currentPlayerId!, { type: 'check' })

    const frames = replayHand(game.getPublicHandHistory())
    expect(frames[0].state).toEqual(expect.objectContaining({ phase: 'preflop', pot: 0, currentBet: 0 }))
    expect(frames[0].state.players.map(player => player.chips)).toEqual([1000, 1000])
    expect(frames[1].state.pot).toBe(10)
    expect(frames[2].state.pot).toBe(30)

    const flopFrame = frames.find(frame => frame.event.type === 'CommunityCardDealt')!
    expect(flopFrame.state.phase).toBe('flop')
    expect(flopFrame.state.pot).toBe(40)
    expect(flopFrame.state.currentBet).toBe(0)
    expect(flopFrame.state.communityCards).toHaveLength(3)
    expect(flopFrame.state.players.every(player => player.roundBet === 0)).toBe(true)

    expect(frames[0].state.players.map(player => player.chips)).toEqual([1000, 1000])
    expect(frames[0].state.communityCards).toEqual([])
  })

  it('produces identical frames for the same event history', () => {
    const game = new PokerGame(makePlayers(), config)
    game.startHand()
    finishPassiveHand(game)

    expect(replayHand(game.getPublicHandHistory())).toEqual(replayHand(game.getPublicHandHistory()))
  })

  it('matches the engine’s public final board, stacks and results', () => {
    const game = new PokerGame(makePlayers(), config)
    game.startHand()
    finishPassiveHand(game)

    const finalFrame = replayHand(game.getPublicHandHistory()).at(-1)!
    expect(finalFrame.event.type).toBe('HandEnded')
    expect(finalFrame.state.phase).toBe('complete')
    expect(finalFrame.state.pot).toBe(0)
    expect(finalFrame.state.communityCards).toEqual(game.getPublicState().communityCards)
    expect(finalFrame.state.results).toEqual(game.getLastHandResults())
    expect(finalFrame.state.players.map(player => [player.playerId, player.chips])).toEqual(
      game.getPublicState().players.map(player => [player.id, player.chips]),
    )
    expect(finalFrame.state.players.every(player => player.holeCards != null)).toBe(true)
  })

  it('replays an uncalled short-big-blind excess as a refund, not a pot award', () => {
    const game = new PokerGame(makePlayers([15, 100]), config)
    game.startHand()
    game.applyAction(game.getPublicState().currentPlayerId!, { type: 'call' })

    const history = game.getPublicHandHistory()
    expect(history.some(event => event.type === 'UncalledBetReturned')).toBe(true)
    const finalFrame = replayHand(history).at(-1)!
    expect(finalFrame.state.players.map(player => [player.playerId, player.chips])).toEqual(
      game.getPublicState().players.map(player => [player.id, player.chips]),
    )
    expect(finalFrame.state.results.reduce((sum, result) => sum + result.amount, 0)).toBe(30)
  })

  it('keeps hole cards hidden until their CardsRevealed event', () => {
    const game = new PokerGame(makePlayers(), config)
    game.startHand()
    finishPassiveHand(game)

    const frames = replayHand(game.getPublicHandHistory())
    const firstRevealIndex = frames.findIndex(frame => frame.event.type === 'CardsRevealed')
    expect(firstRevealIndex).toBeGreaterThan(0)
    expect(frames[firstRevealIndex - 1].state.players.every(player => player.holeCards == null)).toBe(true)
    expect(frames[firstRevealIndex].state.players.filter(player => player.holeCards != null)).toHaveLength(1)
  })

  it('rejects malformed event ordering and unknown players', () => {
    const blind: HandEvent = {
      type: 'BlindPosted',
      phase: 'preflop',
      playerId: 'p1',
      amount: 10,
      totalBet: 10,
      blindType: 'small',
    }
    const started: HandEvent = {
      type: 'HandStarted',
      variantId: 'texas-holdem',
      dealerId: 'p1',
      smallBlind: 10,
      bigBlind: 20,
      players: [{ playerId: 'p1', seatIndex: 0, startingChips: 100 }],
    }

    expect(() => replayHand([blind])).toThrow(/start with HandStarted/i)
    expect(() => replayHand([started, started])).toThrow(/must be the first/i)
    expect(() => replayHand([started, { ...blind, playerId: 'missing' }])).toThrow(/unknown player/i)
  })
})
