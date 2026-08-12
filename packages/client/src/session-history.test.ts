import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalGameRunner, SHOWDOWN_DISPLAY_MS } from './session/LocalGameRunner'

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

  it('stores session and hand start timestamps instead of the post-hand capture time', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-12T12:00:00.000Z'))
    const runner = new LocalGameRunner()
    runner.setupTable({
      smallBlind: 10,
      bigBlind: 20,
      startingChips: 1000,
      maxPlayers: 2,
      seed: 'timestamp-session',
    }, 1)

    vi.setSystemTime(new Date('2026-08-12T12:05:00.000Z'))
    runner.startHand()
    vi.setSystemTime(new Date('2026-08-12T12:10:00.000Z'))

    for (let step = 0; step < 10 && runner.state.handReplays.length === 0; step++) {
      const gameState = runner.state.gameState
      if (!gameState) throw new Error('Expected game state')
      if (runner.state.isMyTurn) {
        const legal = gameState.bettingContext?.legalActions
        if (!legal) throw new Error('Expected hero legal actions')
        runner.playerAction(legal.fold ? { type: 'fold' } : { type: 'check' })
      } else {
        vi.advanceTimersByTime(6000)
      }
    }

    const replay = runner.state.handReplays[0]
    expect(replay).toBeDefined()
    expect(replay.sessionId).toBe('S20260812T120000000Z')
    expect(replay.sessionStartedAt).toBe('2026-08-12T12:00:00.000Z')
    expect(replay.date).toBe('2026-08-12T12:05:00.000Z')
    expect(replay.date).not.toBe('2026-08-12T12:10:00.000Z')
    runner.cleanup()
  })

  it('selects a reproducible but non-fixed dealer for the first hand', () => {
    const firstDealers = new Set<string>()
    const dealerForSeed = (seed: string): string => {
      const runner = new LocalGameRunner()
      runner.setupTable({
        smallBlind: 10,
        bigBlind: 20,
        startingChips: 1000,
        maxPlayers: 6,
        seed,
      }, 5)
      runner.startHand()
      const handStart = runner.state.sessionHistory.find(entry =>
        entry.event.type === 'HandStarted'
      )
      const dealerId = handStart?.event.type === 'HandStarted'
        ? handStart.event.dealerId
        : null
      runner.cleanup()
      if (!dealerId) throw new Error('Expected first hand dealer')
      return dealerId
    }

    for (let index = 0; index < 12; index++) {
      firstDealers.add(dealerForSeed(`initial-dealer-${index}`))
    }

    expect(firstDealers.size).toBeGreaterThan(1)
    expect(dealerForSeed('same-session')).toBe(dealerForSeed('same-session'))
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
        const waitTime = Object.keys(first.state.showdownCards).length > 0
          ? SHOWDOWN_DISPLAY_MS
          : 3000
        vi.advanceTimersByTime(waitTime)
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
    const debugDecision = first.getBotDebugDecisions().at(-1)
    expect(debugDecision).toBeDefined()
    expect(debugDecision?.playerId).toMatch(/^bot-/)
    expect(debugDecision?.decision.allActions.length).toBeGreaterThan(1)
    expect(debugDecision?.decision.allActions.some(action => action.contributions.length > 0)).toBe(true)
    expect('botDebugDecisions' in first.state).toBe(false)
    expect(first.state.sessionHistory.some(entry =>
      entry.event.type === 'PlayerActed' && entry.event.playerId.startsWith('bot-')
    )).toBe(true)
    const debugRecord = first.createSessionDebugRecord('test', 'EUR')
    expect(debugRecord.header.botProfiles.some(({ profile }) =>
      profile.reads.some(read => read.playerId.startsWith('bot-'))
    )).toBe(true)

    first.cleanup()
    second.cleanup()
  })

  it('queues rebuys during a hand and applies them before the next hand', () => {
    vi.useFakeTimers()
    const runner = new LocalGameRunner()
    runner.setupTable({
      smallBlind: 10,
      bigBlind: 20,
      startingChips: 1000,
      maxPlayers: 2,
      seed: 'rebuy-session',
    }, 1)
    runner.startHand()

    const chipsAfterBlinds = runner.state.gameState?.players.map(player => player.chips)
    expect(runner.requestRebuy('hero')).toBe('queued')
    expect(runner.requestRebuy('bot-0')).toBe('queued')
    expect(runner.state.gameState?.players.map(player => player.chips)).toEqual(chipsAfterBlinds)
    expect(runner.state.pendingRebuyPlayerIds).toEqual(expect.arrayContaining(['hero', 'bot-0']))

    for (let step = 0; step < 20; step++) {
      const secondHand = runner.state.sessionHistory.find(entry =>
        entry.handNumber === 2 && entry.event.type === 'HandStarted'
      )
      if (secondHand?.event.type === 'HandStarted') {
        expect(secondHand.event.players.every(player => player.startingChips >= 1000)).toBe(true)
        break
      }

      const gameState = runner.state.gameState
      if (!gameState) throw new Error('Expected game state')
      if (gameState.phase === 'waiting') {
        vi.advanceTimersByTime(SHOWDOWN_DISPLAY_MS)
      } else if (runner.state.isMyTurn) {
        const legal = gameState.bettingContext?.legalActions
        if (!legal) throw new Error('Expected hero legal actions')
        runner.playerAction(legal.fold ? { type: 'fold' } : { type: 'check' })
      } else {
        vi.advanceTimersByTime(6000)
      }
    }

    expect(runner.state.sessionHistory.some(entry =>
      entry.handNumber === 2 && entry.event.type === 'HandStarted'
    )).toBe(true)
    expect(runner.state.pendingRebuyPlayerIds).toEqual([])
    runner.cleanup()
  })
})
