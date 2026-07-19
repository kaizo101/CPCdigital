import { describe, expect, it } from 'vitest'
import { PokerGame } from '@cpc/poker-engine'
import type { Player } from '@cpc/shared'
import { createBotContext } from './bot-context'
import { evaluateBotVariant } from './bot-variant-registry'

const players: Player[] = ['bot', 'villain'].map((id, seatIndex) => ({
  id,
  name: id,
  role: 'player',
  chips: 1000,
  seatIndex,
  isConnected: true,
  isSittingOut: false,
  status: 'waiting',
  roundBet: 0,
}))

function currentContext() {
  const game = new PokerGame(players, { smallBlind: 10, bigBlind: 20, seed: 'variant-evaluator' })
  game.startHand()
  const playerId = game.getPublicState().currentPlayerId!
  return createBotContext(playerId, game.getPlayerView(playerId), game.getPublicHandHistory())
}

describe('bot variant evaluator registry', () => {
  it('evaluates NLHE behind the variant-neutral contract', () => {
    const evaluation = evaluateBotVariant(currentContext())

    expect(evaluation.variantId).toBe('texas-holdem')
    expect(evaluation.handAssessment).toEqual(expect.objectContaining({
      category: expect.any(String),
      relativeStrength: expect.any(Number),
      blockerValue: expect.any(Number),
      drawTypes: expect.any(Array),
    }))
    expect(evaluation.boardTexture).toBe('neutral')
  })

  it('fails explicitly when a variant has no evaluator', () => {
    const context = currentContext()
    context.publicState.variantId = 'unsupported-variant'

    expect(() => evaluateBotVariant(context)).toThrow(/no bot evaluator registered/i)
  })
})
