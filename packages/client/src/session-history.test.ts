import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalGameRunner } from './LocalGameRunner'

describe('LocalGameRunner session history', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('collects structured hand events with a session hand number', () => {
    vi.useFakeTimers()
    const runner = new LocalGameRunner()
    runner.setupTable({
      smallBlind: 10,
      bigBlind: 20,
      startingChips: 1000,
      maxPlayers: 2,
    }, 1)

    runner.startHand()

    expect(runner.state.sessionHistory.map(entry => ({
      handNumber: entry.handNumber,
      type: entry.event.type,
    }))).toEqual([
      { handNumber: 1, type: 'HandStarted' },
      { handNumber: 1, type: 'BlindPosted' },
      { handNumber: 1, type: 'BlindPosted' },
    ])
    runner.cleanup()
  })

  it('reproduces cards, bot decisions, and session events from the same seed', () => {
    vi.useFakeTimers()
    const first = new LocalGameRunner()
    const second = new LocalGameRunner()
    const options = {
      smallBlind: 10,
      bigBlind: 20,
      startingChips: 1000,
      maxPlayers: 6,
      seed: 'reproducible-session',
    }

    first.setupTable(options, 5)
    second.setupTable(options, 5)
    first.startHand()
    second.startHand()

    for (let step = 0; step < 20; step++) {
      expect(first.state).toEqual(second.state)

      const gameState = first.state.gameState
      if (!gameState) throw new Error('Expected an active game')

      if (gameState.phase === 'waiting') {
        vi.advanceTimersByTime(3000)
        continue
      }

      if (first.state.isMyTurn) {
        const legal = gameState.bettingContext?.legalActions
        if (!legal) throw new Error('Expected legal actions for hero')
        const action = legal.check ? { type: 'check' as const } : { type: 'call' as const }
        first.playerAction(action)
        second.playerAction(action)
        continue
      }

      vi.advanceTimersByTime(1800)
    }

    expect(first.state).toEqual(second.state)
    expect(first.getPrivateDecisionSnapshots()).toEqual(second.getPrivateDecisionSnapshots())
    expect(first.getPrivateDecisionSnapshots().length).toBeGreaterThan(0)
    expect('decisionSnapshots' in first.state).toBe(false)
    expect(first.state.sessionHistory.some(entry =>
      entry.event.type === 'PlayerActed' && entry.event.playerId.startsWith('bot-')
    )).toBe(true)

    first.cleanup()
    second.cleanup()
  })
})
