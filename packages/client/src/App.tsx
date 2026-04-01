import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, LobbyInfo, ServerToClientEvents } from '@poker/shared'

type PokerSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export default function App() {
  const [connected, setConnected] = useState(false)
  const [lobbies, setLobbies] = useState<LobbyInfo[]>([])

  useEffect(() => {
    const socket: PokerSocket = io({ path: '/socket.io' })

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('lobby:list')
    })

    socket.on('disconnect', () => setConnected(false))
    socket.on('lobby:list', setLobbies)

    return () => { socket.disconnect() }
  }, [])

  return (
    <div>
      <h1>Poker</h1>
      <p>Status: {connected ? 'Connected' : 'Connecting...'}</p>
      <h2>Lobbies</h2>
      {lobbies.length === 0
        ? <p>No lobbies yet.</p>
        : <ul>{lobbies.map(l => <li key={l.id}>{l.name} ({l.playerCount}/{l.maxPlayers})</li>)}</ul>
      }
    </div>
  )
}
