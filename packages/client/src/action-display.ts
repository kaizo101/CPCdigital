import type { PlayerAction } from '@cpc/shared'

export type PlayerActionLabel = 'Bet' | 'Raise' | 'Call' | 'Check' | 'All-in'

export function getAggressiveActionLabel(currentBet: number): 'Bet' | 'Raise' {
  return currentBet === 0 ? 'Bet' : 'Raise'
}

export function getPlayerActionLabel(action: PlayerAction, currentBet: number): PlayerActionLabel | null {
  switch (action.type) {
    case 'fold':
      return null
    case 'check':
      return 'Check'
    case 'call':
      return 'Call'
    case 'raise':
      return getAggressiveActionLabel(currentBet)
    case 'all-in':
      return 'All-in'
  }
}
