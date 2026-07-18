import type { PlayerAction, PublicGameState } from '@cpc/shared'

export interface BotConfig {
  actionDelayMs: number
}

const DEFAULT_CONFIG: BotConfig = {
  actionDelayMs: 800,
}

export function decideBotAction(
  state: PublicGameState,
  botId: string,
  random: () => number = Math.random,
): PlayerAction {
  const me = state.players.find(p => p.id === botId)
  const context = state.bettingContext
  if (!me || !context || context.playerId !== botId) return { type: 'fold' }

  const canCheck = context.legalActions.check
  const roll = random()

  if (canCheck) {
    if (roll < 0.72) return { type: 'check' }
    if (roll < 0.92 && context.legalActions.raise) {
      return { type: 'raise', amount: context.legalActions.raise.minAmount }
    }
    return context.legalActions.allInAmount != null ? { type: 'all-in' } : { type: 'check' }
  }

  if (roll < 0.16) return { type: 'fold' }
  if (roll < 0.78) return { type: 'call' }

  if (context.legalActions.raise) {
    return { type: 'raise', amount: context.legalActions.raise.minAmount }
  }
  return { type: 'call' }
}
