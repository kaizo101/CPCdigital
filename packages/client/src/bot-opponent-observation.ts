import type { HandEvent } from '@cpc/shared'
import type { BotArchetypeId } from './bot-archetypes'
import { updateOpponentRead, updateOpponentSizing } from './bot-reads'
import { aggressiveActionPotFraction, isAggressiveHistoryEvent } from './bot-sizing'
import type { BotState } from './bot-types'

export interface OpponentObservationCursor {
  eventCount: number
  vpipPlayers: Set<string>
}

/** Applies newly visible public actions to one bot's persistent opponent reads. */
export function observeOpponentHistory(
  botId: string,
  botState: BotState,
  actionHistory: readonly HandEvent[],
  cursor: OpponentObservationCursor,
  archetypeId: BotArchetypeId,
): void {
  const observationSkill = botState.skill.observation

  for (const event of actionHistory.slice(cursor.eventCount)) {
    if (event.type !== 'PlayerActed' || event.playerId === botId) continue

    const opponentId = event.playerId
    const action = event.action
    const aggressiveAction = isAggressiveHistoryEvent(event)
    const passiveAllIn = action.type === 'all-in' && !aggressiveAction

    if (event.phase === 'preflop') {
      if (
        (action.type === 'call' || action.type === 'raise' || action.type === 'all-in')
        && !cursor.vpipPlayers.has(opponentId)
      ) {
        updateOpponentRead(botState.reads, opponentId, 'vpip', observationSkill, archetypeId)
        cursor.vpipPlayers.add(opponentId)
      } else if (
        (action.type === 'fold' || action.type === 'check')
        && !cursor.vpipPlayers.has(opponentId)
      ) {
        updateOpponentRead(botState.reads, opponentId, 'no-vpip', observationSkill, archetypeId)
        cursor.vpipPlayers.add(opponentId)
      }
    }

    if (aggressiveAction) {
      updateOpponentRead(botState.reads, opponentId, 'aggression', observationSkill, archetypeId)
    } else if (action.type === 'call' || action.type === 'check' || passiveAllIn) {
      updateOpponentRead(botState.reads, opponentId, 'no-aggression', observationSkill, archetypeId)
    }

    if (action.type === 'fold') {
      updateOpponentRead(botState.reads, opponentId, 'foldToBet', observationSkill, archetypeId)
    } else if (action.type === 'call' || aggressiveAction || passiveAllIn) {
      updateOpponentRead(botState.reads, opponentId, 'no-fold', observationSkill, archetypeId)
    }

    const potFraction = aggressiveActionPotFraction(event)
    if (event.phase !== 'preflop' && potFraction != null) {
      updateOpponentSizing(botState.reads, opponentId, potFraction)
    }
  }

  cursor.eventCount = actionHistory.length
}
