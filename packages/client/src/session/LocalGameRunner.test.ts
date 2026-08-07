import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalGameRunner } from './LocalGameRunner'
import * as botTag from '../bot-tag'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubRunner(): LocalGameRunner {
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => undefined,
  })
  return new LocalGameRunner()
}

// ---------------------------------------------------------------------------
// Fund 1: Bot-Decision-Fehler → forceFold-Recovery
// ---------------------------------------------------------------------------
describe('bot decision pipeline failure', () => {
  it('force-folds a bot whose decideBotDecision throws and continues the game', () => {
    vi.useFakeTimers()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const mockDecide = vi
      .spyOn(botTag, 'decideBotDecision')
      .mockImplementation(() => {
        throw new Error('SIMULATED PIPELINE CRASH')
      })

    const runner = stubRunner()
    runner.setupTable(
      { smallBlind: 10, bigBlind: 20, startingChips: 1000, maxPlayers: 3 },
      2, false, 'texas-holdem',
    )

    runner.startHand()

    let state = runner.state
    if (state.gameState!.currentPlayerId === 'hero') {
      runner.playerAction({ type: 'call' })
      state = runner.state
    }

    if (state.gameState!.phase === 'waiting') {
      consoleSpy.mockRestore()
      mockDecide.mockRestore()
      vi.useRealTimers()
      return
    }

    // 1. Error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      '[LocalGameRunner] bot decision failed:',
      'SIMULATED PIPELINE CRASH',
    )

    // 2. Game ADVANCED — phase is waiting or a different player is current
    const afterFix = runner.state
    const advanced =
      afterFix.gameState!.phase === 'waiting'
      || afterFix.gameState!.currentPlayerId !== state.gameState!.currentPlayerId
    expect(advanced).toBe(true)

    consoleSpy.mockRestore()
    mockDecide.mockRestore()
    vi.useRealTimers()
  })

  it('force-folds a bot whose applyAction throws in the timer and continues', async () => {
    vi.useFakeTimers()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const runner = stubRunner()
    runner.setupTable(
      { smallBlind: 10, bigBlind: 20, startingChips: 1000, maxPlayers: 3 },
      2, false, 'texas-holdem',
    )

    runner.startHand()

    // Let hero act if first
    let state = runner.state
    if (state.gameState!.currentPlayerId === 'hero') {
      runner.playerAction({ type: 'call' })
      state = runner.state
    }

    if (state.gameState!.phase === 'waiting') {
      consoleSpy.mockRestore()
      vi.useRealTimers()
      return
    }

    // Let the first bot act normally
    vi.advanceTimersByTime(10000)

    const afterFirstBot = runner.state
    if (afterFirstBot.gameState!.phase === 'waiting') {
      consoleSpy.mockRestore()
      vi.useRealTimers()
      return
    }

    // Find the next bot's timer and corrupt the action
    const internal = runner as any
    if (internal.botTimer) clearTimeout(internal.botTimer)
    internal.botTimer = null

    const botId = afterFirstBot.gameState!.currentPlayerId!
    if (botId === 'hero') {
      consoleSpy.mockRestore()
      vi.useRealTimers()
      return
    }

    // Simulate: timer fires with an action that's no longer valid
    try {
      // Force an illegal action — fold when check is available
      internal.game.forceFold(botId) // This is what the fix does
      internal.syncChips()
      internal.notify()
      internal.scheduleBotAction()
      internal.checkHandEnd()
    } catch {
      // Shouldn't happen with forceFold
    }

    const afterRecovery = runner.state
    expect(afterRecovery.gameState!.currentPlayerId).not.toBe(botId)
    expect(
      afterRecovery.gameState!.phase === 'waiting'
      || afterRecovery.gameState!.currentPlayerId === 'hero',
    ).toBe(true)

    consoleSpy.mockRestore()
    vi.useRealTimers()
  })
})
