import type { Card, GameState, LobbyInfo, Player, PlayerAction } from './types.js'

// Client → Server
export interface ClientToServerEvents {
  'lobby:create': (name: string, options: { bigBlind: number; smallBlind: number; maxPlayers: number }) => void
  'lobby:join': (lobbyId: string, playerName: string) => void
  'lobby:leave': () => void
  'lobby:list': () => void
  'game:action': (action: PlayerAction) => void
  'game:ready': () => void
}

// Server → Client
export interface ServerToClientEvents {
  'lobby:created': (lobby: LobbyInfo) => void
  'lobby:joined': (lobby: LobbyInfo, player: Player) => void
  'lobby:list': (lobbies: LobbyInfo[]) => void
  'lobby:player-joined': (player: Player) => void
  'lobby:player-left': (playerId: string) => void
  'game:state': (state: GameState) => void
  'game:action': (playerId: string, action: PlayerAction) => void
  'game:your-cards': (cards: [Card, Card]) => void
  error: (message: string) => void
}
