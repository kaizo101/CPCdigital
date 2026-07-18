import type { PlayerAction } from '@cpc/shared'

export type PlayerActionLabel = 'Bet' | 'Raise' | 'Call' | 'Check' | 'All-in'

export function getPlayerActionLabel(action: PlayerAction, currentBet: number): PlayerActionLabel | null {
  switch (action.type) {
    case 'fold':
      return null
    case 'check':
      return 'Check'
    case 'call':
      return 'Call'
    case 'raise':
      return currentBet === 0 ? 'Bet' : 'Raise'
    case 'all-in':
      return 'All-in'
  }
}
