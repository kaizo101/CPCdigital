import type { Card, ChatMessage, HandResult, Player, PlayerAction, PublicGameState, TableInfo, TableOptions } from './types.js'

// Client → Server
export interface ClientToServerEvents {
  // Table management
  'table:create': (options: TableOptions) => void
  'table:join': (inviteCode: string) => void
  'table:leave': () => void
  'table:sit-out': (sittingOut: boolean) => void

  // Admin-only
  'table:kick': (playerId: string) => void
  'table:set-chips': (playerId: string, chips: number) => void
  'table:start-game': () => void
  'table:add-bot': (count: number) => void

  // Game
  'game:action': (action: PlayerAction) => void

  // Chat
  'chat:message': (text: string) => void
}

// Server → Client
export interface ServerToClientEvents {
  // Table management
  'table:created': (table: TableInfo, inviteCode: string) => void
  'table:joined': (table: TableInfo, player: Player) => void
  'table:player-joined': (player: Player) => void
  'table:player-left': (playerId: string) => void
  'table:player-updated': (player: Player) => void
  'table:player-kicked': (playerId: string) => void
  'table:chips-updated': (playerId: string, chips: number) => void

  // Game
  'game:state': (state: PublicGameState) => void
  'game:your-cards': (cards: Card[]) => void
  'game:hand-result': (results: HandResult[]) => void

  // Chat
  'chat:message': (message: ChatMessage) => void

  error: (message: string) => void
}
