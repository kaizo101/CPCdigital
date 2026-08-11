import type { DecisionActionHistoryEvent } from '@cpc/shared'
import { aggressiveActionPotFraction, isAggressiveHistoryEvent } from './bot-sizing'

type BettingStreet = 'preflop' | 'flop' | 'turn' | 'river'

export interface OpponentLine {
  playerId: string
  preflop: 'raised' | 'called' | 'folded' | null
  flop: 'bet' | 'check-call' | 'check-fold' | 'check-raise' | 'bet-call' | 'bet-fold' | null
  turn: 'bet' | 'check-call' | 'check-fold' | 'check-raise' | 'bet-call' | 'bet-fold' | null
  river: 'bet' | 'check-call' | 'check-fold' | 'check-raise' | 'bet-call' | 'bet-fold' | null
  /** Last aggressive action size per street, normalized against the pre-action pot. */
  aggressivePotFractions: Record<BettingStreet, number | null>
}

export interface StreetAnalysis {
  /** botId that made the last raise or all-in preflop */
  preflopAggressor: string | null
  /** Number of genuine preflop raises; passive all-in calls do not count. */
  preflopRaiseCount: number
  /** Who has the initiative on each street (last aggressor) */
  streetAggressor: { preflop: string | null; flop: string | null; turn: string | null; river: string | null }
  /** Am I the preflop aggressor? */
  iAmPreflopAggressor: boolean
  /** Per-opponent action lines for the current hand */
  opponentLines: Map<string, OpponentLine>
  /** Number of active opponents remaining */
  activeOpponents: number
  /** Did anyone show weakness by checking after betting on a previous street? */
  opponentShowedWeakness: boolean
  /** Did an opponent show strength with a check-raise? */
  opponentCheckRaised: boolean
  /** Did the bot check earlier on the current street? */
  iCheckedCurrentStreet?: boolean
  /** Did the bot already complete a check-raise on the current street? */
  iCheckRaisedCurrentStreet?: boolean
  /** Did the bot make the first aggressive action on the current street? */
  iBetCurrentStreet?: boolean
  /** Did an opponent raise after that opening bet on the current street? */
  opponentRaisedMyBetCurrentStreet?: boolean
  /** Active opponents that called the bot's flop bet and bet after its turn check. */
  turnFloatPlayerIds?: string[]
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
  let preflopRaiseCount = 0
  let flopLastAggressor: string | null = null
  let turnLastAggressor: string | null = null
  let riverLastAggressor: string | null = null

  const opponentLines = new Map<string, OpponentLine>()
  for (const id of opponentIds) {
    opponentLines.set(id, {
      playerId: id,
      preflop: null,
      flop: null,
      turn: null,
      river: null,
      aggressivePotFractions: { preflop: null, flop: null, turn: null, river: null },
    })
  }

  const currentPhase = phase === 'waiting' ? 'preflop' : phase as StreetAnalysis['street']

  let opponentShowedWeakness = false
  let opponentCheckRaised = false
  let iCheckedCurrentStreet = false
  let iCheckRaisedCurrentStreet = false
  let iBetCurrentStreet = false
  let opponentRaisedMyBetCurrentStreet = false
  let actionCountThisStreet = 0
  const flopCBetCallers = new Set<string>()
  const turnBettorsAfterBotCheck = new Set<string>()

  const streetStates = new Map<string, { lastAction: string | null; lastAggressor: string | null; checkedPlayers: Set<string> }>()
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
        state = { lastAction: null, lastAggressor: null, checkedPlayers: new Set() }
        streetStates.set(eventPhase, state)
      }

      const action = event.action.type
      const aggressiveAction = isAggressiveHistoryEvent(event)
      const lineAction = action === 'all-in'
        ? aggressiveAction ? 'raise' : 'call'
        : action

      if (aggressiveAction) {
        const previousStreetAggressor = state.lastAggressor
        if (eventPhase === currentPhase) {
          if (event.playerId === botId && previousStreetAggressor === null) {
            iBetCurrentStreet = true
          } else if (
            event.playerId !== botId
            && previousStreetAggressor === botId
            && iBetCurrentStreet
          ) {
            opponentRaisedMyBetCurrentStreet = true
          }
        }
        if (
          eventPhase === 'turn'
          && event.playerId !== botId
          && state.checkedPlayers.has(botId)
        ) {
          turnBettorsAfterBotCheck.add(event.playerId)
        }
        if (state.checkedPlayers.has(event.playerId)) {
          if (eventPhase === currentPhase) {
            if (event.playerId === botId) iCheckRaisedCurrentStreet = true
            else opponentCheckRaised = true
          }
          state.checkedPlayers.delete(event.playerId)
        }
        switch (eventPhase) {
          case 'preflop':
            preflopLastAggressor = event.playerId
            preflopRaiseCount++
            break
          case 'flop': flopLastAggressor = event.playerId; break
          case 'turn': turnLastAggressor = event.playerId; break
          case 'river': riverLastAggressor = event.playerId; break
        }
        state.lastAggressor = event.playerId
        state.lastAction = 'raise'
      } else if (action === 'check') {
        state.checkedPlayers.add(event.playerId)
        if (eventPhase === currentPhase && event.playerId === botId) {
          iCheckedCurrentStreet = true
        }
        if (previousPhaseAggressor === event.playerId || state.lastAction === 'raise') {
          opponentShowedWeakness = true
        }
      } else if (action === 'call') {
        if (eventPhase === 'flop' && state.lastAggressor === botId && event.playerId !== botId) {
          flopCBetCallers.add(event.playerId)
        }
        state.lastAction = 'call'
      } else if (action === 'fold') {
        state.lastAction = 'fold'
      }

      if (aggressiveAction) {
        previousPhaseAggressor = event.playerId
      }

      const line = opponentLines.get(event.playerId)
      if (!line) continue

      if (aggressiveAction) {
        line.aggressivePotFractions[eventPhase] = aggressiveActionPotFraction(event)
      }

      switch (eventPhase) {
        case 'preflop':
          if (aggressiveAction) {
            if (line.preflop === null || line.preflop === 'called') {
              line.preflop = 'raised'
            }
          } else if (lineAction === 'call') {
            if (line.preflop === null) line.preflop = 'called'
          } else if (lineAction === 'fold') {
            line.preflop = 'folded'
          }
          break
        case 'flop':
          line.flop = resolveLineAction(lineAction, line.flop)
          break
        case 'turn':
          line.turn = resolveLineAction(lineAction, line.turn)
          break
        case 'river':
          line.river = resolveLineAction(lineAction, line.river)
          break
      }
    }
  }

  const turnFloatPlayerIds = currentPhase === 'turn'
    && flopLastAggressor === botId
    && iCheckedCurrentStreet
    ? [...flopCBetCallers].filter(playerId => turnBettorsAfterBotCheck.has(playerId))
    : []

  return {
    preflopAggressor: preflopLastAggressor,
    preflopRaiseCount,
    streetAggressor: { preflop: preflopLastAggressor, flop: flopLastAggressor, turn: turnLastAggressor, river: riverLastAggressor },
    iAmPreflopAggressor: preflopLastAggressor === botId,
    opponentLines,
    activeOpponents: opponentIds.length,
    opponentShowedWeakness,
    opponentCheckRaised,
    iCheckedCurrentStreet,
    iCheckRaisedCurrentStreet,
    iBetCurrentStreet,
    opponentRaisedMyBetCurrentStreet,
    turnFloatPlayerIds,
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
