import { describe, expect, it } from 'vitest'
import type { PublicGameState } from '@cpc/shared'
import { legalizeBotAction } from './bot-tag'

describe('bot raise legalization', () => {
  it('never converts a selected raise into a differently scored all-in', () => {
    const player = { id: 'bot', chips: 1_000 } as PublicGameState['players'][number]
    const state = {
      currentBet: 100,
      smallBlind: 10,
      bigBlind: 20,
      bettingContext: {
        playerId: 'bot',
        legalActions: {
          fold: true,
          check: false,
          callAmount: 100,
          raise: { minAmount: 200, maxAmount: 1_000 },
          allInAmount: 1_000,
        },
      },
    } as PublicGameState

    expect(legalizeBotAction(state, player, { type: 'raise', amount: 1_000 }))
      .toEqual({ type: 'raise', amount: 990 })
    expect(legalizeBotAction(state, player, { type: 'all-in' }))
      .toEqual({ type: 'all-in' })
  })
})
