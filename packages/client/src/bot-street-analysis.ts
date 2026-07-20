import type { DecisionActionHistoryEvent } from '@cpc/shared'

export interface OpponentLine {
  playerId: string
  preflop: 'raised' | 'called' | 'folded' | null
  flop: 'bet' | 'check-call' | 'check-fold' | 'check-raise' | 'bet-call' | 'bet-fold' | null
  turn: 'bet' | 'check-call' | 'check-fold' | 'check-raise' | 'bet-call' | 'bet-fold' | null
  river: 'bet' | 'check-call' | 'check-fold' | 'check-raise' | 'bet-call' | 'bet-fold' | null
}

export interface StreetAnalysis {
  /** botId that made the last raise or all-in preflop */
  preflopAggressor: string | null
  /** Who has the initiative on each street (last aggressor) */
  streetAggressor: { preflop: string | null; flop: string | null; turn: string | null; river: string | null }
  /** Am I the preflop aggressor? */
  iAmPreflopAggressor: boolean
  /** Am I in position against the last aggressor? */
  iAmInPosition: boolean
  /** Per-opponent action lines for the current hand */
  opponentLines: Map<string, OpponentLine>
  /** Number of active opponents remaining */
  activeOpponents: number
  /** Did anyone show weakness by checking after betting on a previous street? */
  opponentShowedWeakness: boolean
  /** Did an opponent show strength with a check-raise? */
  opponentCheckRaised: boolean
  /** Current street */
  street: 'preflop' | 'flop' | 'turn' | 'river'
  /** Total number of non-fold actions viable this street */
  actionCountThisStreet: number
}

export function analyzeStreetAction(
  botId: string,
  actionHistory: readonly DecisionActionHistoryEvent[],
  phase: string,
  activePlayerIds: string[],
): StreetAnalysis {
  const opponentIds = activePlayerIds.filter(id => id !== botId)

  let preflopLastAggressor: string | null = null
  let flopLastAggressor: string | null = null
  let turnLastAggressor: string | null = null
  let riverLastAggressor: string | null = null

  const opponentLines = new Map<string, OpponentLine>()
  for (const id of opponentIds) {
    opponentLines.set(id, { playerId: id, preflop: null, flop: null, turn: null, river: null })
  }

  const currentPhase = phase === 'waiting' ? 'preflop' : phase as StreetAnalysis['street']

  let iAmInPosition = false
  let opponentShowedWeakness = false
  let opponentCheckRaised = false
  let actionCountThisStreet = 0

  const streetStates = new Map<string, { lastAction: string | null; lastAggressor: string | null; checksThisRound: string[] }>()
  let previousPhaseAggressor: string | null = null

  for (const event of actionHistory) {
    if (event.type === 'PlayerActed') {
      const eventPhase = mapPhase(event.phase)
      if (!eventPhase) continue

      if (eventPhase === currentPhase) {
        actionCountThisStreet++
      }

      let state = streetStates.get(eventPhase)
      if (!state) {
        state = { lastAction: null, lastAggressor: null, checksThisRound: [] }
        streetStates.set(eventPhase, state)
      }

      const action = event.action.type

      if (action === 'raise' || action === 'all-in') {
        if (state.checksThisRound.includes(event.playerId)) {
          opponentCheckRaised = true
        }
        switch (eventPhase) {
          case 'preflop': preflopLastAggressor = event.playerId; break
          case 'flop': flopLastAggressor = event.playerId; break
          case 'turn': turnLastAggressor = event.playerId; break
          case 'river': riverLastAggressor = event.playerId; break
        }
        state.lastAggressor = event.playerId
        state.lastAction = 'raise'
        state.checksThisRound = []
      } else if (action === 'check') {
        state.checksThisRound.push(event.playerId)
        if (previousPhaseAggressor === event.playerId || state.lastAction === 'raise') {
          opponentShowedWeakness = true
        }
      } else if (action === 'call') {
        state.lastAction = 'call'
      } else if (action === 'fold') {
        state.lastAction = 'fold'
      }

      if (action === 'raise' || action === 'all-in') {
        previousPhaseAggressor = event.playerId
      }

      const line = opponentLines.get(event.playerId)
      if (!line) continue

      switch (eventPhase) {
        case 'preflop':
          if (action === 'raise' || action === 'all-in') {
            if (line.preflop === null || line.preflop === 'called') {
              line.preflop = 'raised'
            }
          } else if (action === 'call') {
            if (line.preflop === null) line.preflop = 'called'
          } else if (action === 'fold') {
            line.preflop = 'folded'
          }
          break
        case 'flop':
          line.flop = resolveLineAction(action, line.flop)
          break
        case 'turn':
          line.turn = resolveLineAction(action, line.turn)
          break
        case 'river':
          line.river = resolveLineAction(action, line.river)
          break
      }
    }
  }

  const lastAggressor = flopLastAggressor ?? turnLastAggressor ?? riverLastAggressor ?? preflopLastAggressor
  if (lastAggressor && lastAggressor !== botId && opponentIds.includes(lastAggressor)) {
    iAmInPosition = true
  }

  return {
    preflopAggressor: preflopLastAggressor,
    streetAggressor: { preflop: preflopLastAggressor, flop: flopLastAggressor, turn: turnLastAggressor, river: riverLastAggressor },
    iAmPreflopAggressor: preflopLastAggressor === botId,
    iAmInPosition,
    opponentLines,
    activeOpponents: opponentIds.length,
    opponentShowedWeakness,
    opponentCheckRaised,
    street: currentPhase,
    actionCountThisStreet,
  }
}

function resolveLineAction(
  action: string,
  current: OpponentLine['flop'] | OpponentLine['turn'] | OpponentLine['river'],
): OpponentLine['flop'] {
  if (current === null) {
    if (action === 'raise' || action === 'all-in') return 'bet'
    if (action === 'check') return 'check-call'
    if (action === 'fold') return 'check-fold'
    if (action === 'call') return 'check-call'
    return null
  }

  if (current === 'check-call' || current === 'bet' || current === 'bet-call') {
    if (action === 'raise' || action === 'all-in') {
      return current.startsWith('check') ? 'check-raise' : 'bet-call'
    }
    if (action === 'fold') return current.startsWith('check') ? 'check-fold' : 'bet-fold'
    if (action === 'call') return current.startsWith('check') ? 'check-call' : 'bet-call'
    if (action === 'check') return current
  }

  if (current === 'check-raise' || current === 'check-fold' || current === 'bet-fold') {
    return current
  }

  return current
}

function mapPhase(phase: string): Exclude<StreetAnalysis['street'], ''> | null {
  switch (phase) {
    case 'preflop': return 'preflop'
    case 'flop': return 'flop'
    case 'turn': return 'turn'
    case 'river': return 'river'
    default: return null
  }
}
