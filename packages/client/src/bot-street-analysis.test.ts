import { describe, expect, it } from 'vitest'
import type { DecisionActionHistoryEvent } from '@cpc/shared'
import { analyzeStreetAction } from './bot-street-analysis'

function makeHistory(events: DecisionActionHistoryEvent[]): DecisionActionHistoryEvent[] {
  return events
}

function acted(
  playerId: string,
  phase: string,
  type: string,
  amount?: number,
): Extract<DecisionActionHistoryEvent, { type: 'PlayerActed' }> {
  return {
    type: 'PlayerActed',
    phase,
    playerId,
    action: type === 'raise' ? { type: 'raise', amount: amount ?? 60 }
      : type === 'all-in' ? { type: 'all-in' }
      : { type: type as any },
    amount: amount ?? 20,
    totalBet: 20,
    toCall: 20,
    currentBetBefore: 20,
    potAfter: 100,
    source: 'player',
  }
}

function blindPosted(playerId: string, amount: number, blindType: 'small' | 'big'): DecisionActionHistoryEvent {
  return {
    type: 'BlindPosted',
    phase: 'preflop',
    playerId,
    amount,
    totalBet: amount,
    blindType,
  }
}

describe('street analysis', () => {
  it('identifies the preflop aggressor', () => {
    const history = makeHistory([
      blindPosted('bot-1', 10, 'small'),
      blindPosted('bot-2', 20, 'big'),
      acted('bot-3', 'preflop', 'raise', 60),
      acted('hero', 'preflop', 'call'),
      acted('bot-1', 'preflop', 'fold'),
      acted('bot-2', 'preflop', 'call'),
    ])
    const analysis = analyzeStreetAction('hero', history, 'flop', ['hero', 'bot-2', 'bot-3'])
    expect(analysis.preflopAggressor).toBe('bot-3')
    expect(analysis.iAmPreflopAggressor).toBe(false)
  })

  it('detects continuation bet opportunity on flop', () => {
    const history = makeHistory([
      blindPosted('bot-1', 10, 'small'),
      blindPosted('bot-2', 20, 'big'),
      acted('hero', 'preflop', 'raise', 60),
      acted('bot-1', 'preflop', 'fold'),
      acted('bot-2', 'preflop', 'call'),
    ])
    const analysis = analyzeStreetAction('hero', history, 'flop', ['hero', 'bot-2'])
    expect(analysis.iAmPreflopAggressor).toBe(true)
    expect(analysis.activeOpponents).toBe(1)
  })

  it('detects opponent weakness when they check after being the aggressor', () => {
    const history = makeHistory([
      blindPosted('bot-1', 10, 'small'),
      blindPosted('bot-2', 20, 'big'),
      acted('bot-1', 'preflop', 'raise', 60),
      acted('hero', 'preflop', 'call'),
      acted('bot-2', 'preflop', 'fold'),
      acted('bot-1', 'flop', 'raise', 100),
      acted('hero', 'flop', 'call'),
      acted('bot-1', 'turn', 'check'),
      acted('hero', 'turn', 'raise', 200),
    ])
    const analysis = analyzeStreetAction('hero', history, 'river', ['hero', 'bot-1'])
    expect(analysis.opponentShowedWeakness).toBe(true)
    expect(analysis.streetAggressor.turn).toBe('hero')
  })

  it('builds opponent lines correctly', () => {
    const history = makeHistory([
      blindPosted('hero', 10, 'small'),
      blindPosted('bot-1', 20, 'big'),
      acted('hero', 'preflop', 'raise', 60),
      acted('bot-1', 'preflop', 'call'),
      acted('hero', 'flop', 'raise', 100),
      acted('bot-1', 'flop', 'call'),
      acted('hero', 'turn', 'raise', 200),
      acted('bot-1', 'turn', 'fold'),
    ])
    const analysis = analyzeStreetAction('hero', history, 'river', ['hero', 'bot-1'])
    const line = analysis.opponentLines.get('bot-1')!
    expect(line.preflop).toBe('called')
    expect(line.flop).toBe('check-call')
    expect(line.turn).toBe('check-fold')
    expect(line.river).toBeNull()
  })

  it('detects check-raise', () => {
    const history = makeHistory([
      blindPosted('hero', 10, 'small'),
      blindPosted('bot-1', 20, 'big'),
      acted('hero', 'preflop', 'raise', 60),
      acted('bot-1', 'preflop', 'call'),
      acted('hero', 'flop', 'check'),
      acted('bot-1', 'flop', 'raise', 100),
      acted('hero', 'flop', 'raise', 300),
      acted('bot-1', 'flop', 'call'),
    ])
    const flopAnalysis = analyzeStreetAction('hero', history, 'flop', ['hero', 'bot-1'])
    expect(flopAnalysis.opponentCheckRaised).toBe(false)
    expect(flopAnalysis.iCheckedCurrentStreet).toBe(true)
    expect(flopAnalysis.iCheckRaisedCurrentStreet).toBe(true)

    const turnAnalysis = analyzeStreetAction('hero', history, 'turn', ['hero', 'bot-1'])
    expect(turnAnalysis.opponentCheckRaised).toBe(false)
    expect(turnAnalysis.iCheckedCurrentStreet).toBe(false)
    expect(turnAnalysis.iCheckRaisedCurrentStreet).toBe(false)
  })

  it('detects an opponent check-raise only on the current street', () => {
    const history = makeHistory([
      blindPosted('hero', 10, 'small'),
      blindPosted('bot-1', 20, 'big'),
      acted('hero', 'preflop', 'raise', 60),
      acted('bot-1', 'preflop', 'call'),
      acted('bot-1', 'flop', 'check'),
      acted('hero', 'flop', 'raise', 100),
      acted('bot-1', 'flop', 'raise', 300),
    ])

    expect(analyzeStreetAction('hero', history, 'flop', ['hero', 'bot-1']).opponentCheckRaised).toBe(true)
    expect(analyzeStreetAction('hero', history, 'turn', ['hero', 'bot-1']).opponentCheckRaised).toBe(false)
  })

  it('detects an opponent raise after the bot opened the current street', () => {
    const history = makeHistory([
      acted('bot-1', 'river', 'check'),
      acted('hero', 'river', 'raise', 100),
      acted('bot-1', 'river', 'raise', 300),
    ])

    const river = analyzeStreetAction('hero', history, 'river', ['hero', 'bot-1'])
    expect(river.iBetCurrentStreet).toBe(true)
    expect(river.opponentRaisedMyBetCurrentStreet).toBe(true)

    const turn = analyzeStreetAction('hero', history, 'turn', ['hero', 'bot-1'])
    expect(turn.iBetCurrentStreet).toBe(false)
    expect(turn.opponentRaisedMyBetCurrentStreet).toBe(false)
  })

  it('does not mistake the bots raise over an opponent bet for an opening bet', () => {
    const history = makeHistory([
      acted('bot-1', 'river', 'raise', 100),
      acted('hero', 'river', 'raise', 300),
    ])
    const analysis = analyzeStreetAction('hero', history, 'river', ['hero', 'bot-1'])

    expect(analysis.iBetCurrentStreet).toBe(false)
    expect(analysis.opponentRaisedMyBetCurrentStreet).toBe(false)
  })

  it('detects a turn float only after flop call and hero turn check', () => {
    const history = makeHistory([
      blindPosted('hero', 10, 'small'),
      blindPosted('bot-1', 20, 'big'),
      acted('hero', 'preflop', 'raise', 60),
      acted('bot-1', 'preflop', 'call'),
      acted('hero', 'flop', 'raise', 100),
      acted('bot-1', 'flop', 'call'),
      acted('hero', 'turn', 'check'),
      acted('bot-1', 'turn', 'raise', 120),
    ])
    const analysis = analyzeStreetAction('hero', history, 'turn', ['hero', 'bot-1'])

    expect(analysis.opponentLines.get('bot-1')).toEqual(expect.objectContaining({
      flop: 'check-call',
      turn: 'bet',
    }))
    expect(analysis.turnFloatPlayerIds).toEqual(['bot-1'])

    const withoutTurnCheck = history.filter(event => !(
      event.type === 'PlayerActed' && event.phase === 'turn' && event.playerId === 'hero'
    ))
    expect(analyzeStreetAction('hero', withoutTurnCheck, 'turn', ['hero', 'bot-1']).turnFloatPlayerIds)
      .toEqual([])
  })

  it('tracks multiway situations', () => {
    const history = makeHistory([
      blindPosted('bot-1', 10, 'small'),
      blindPosted('bot-2', 20, 'big'),
      acted('bot-3', 'preflop', 'call'),
      acted('hero', 'preflop', 'raise', 80),
      acted('bot-1', 'preflop', 'call'),
      acted('bot-2', 'preflop', 'call'),
      acted('bot-3', 'preflop', 'call'),
    ])
    const analysis = analyzeStreetAction('hero', history, 'flop', ['hero', 'bot-1', 'bot-2', 'bot-3'])
    expect(analysis.activeOpponents).toBe(3)
  })

  it('counts actions on current street', () => {
    const history = makeHistory([
      blindPosted('bot-1', 10, 'small'),
      blindPosted('bot-2', 20, 'big'),
      acted('hero', 'preflop', 'raise', 60),
      acted('bot-1', 'preflop', 'call'),
      acted('bot-2', 'preflop', 'fold'),
      acted('hero', 'flop', 'raise', 100),
      acted('bot-1', 'flop', 'call'),
      acted('hero', 'turn', 'raise', 200),
    ])
    const analysis = analyzeStreetAction('hero', history, 'turn', ['hero', 'bot-1'])
    expect(analysis.actionCountThisStreet).toBe(1)
  })

  it('stores aggressive sizing as committed chips over the pre-action pot', () => {
    const event = acted('bot-1', 'flop', 'raise', 75)
    event.potAfter = 175
    const analysis = analyzeStreetAction('hero', [event], 'flop', ['hero', 'bot-1'])

    expect(analysis.opponentLines.get('bot-1')?.aggressivePotFractions.flop).toBe(0.75)
  })

  it('does not treat a passive all-in call as aggression or sizing evidence', () => {
    const event = acted('bot-1', 'flop', 'all-in', 20)
    event.totalBet = 40
    event.currentBetBefore = 80
    event.potAfter = 120
    const analysis = analyzeStreetAction('hero', [event], 'flop', ['hero', 'bot-1'])

    expect(analysis.streetAggressor.flop).toBeNull()
    expect(analysis.opponentLines.get('bot-1')?.aggressivePotFractions.flop).toBeNull()
  })
})
