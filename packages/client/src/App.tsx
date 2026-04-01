import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, Player, ServerToClientEvents, TableInfo, TableOptions } from '@cpc/shared'
import { api } from './api.js'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

type Screen = 'auth' | 'lobby' | 'table'

interface AuthState {
  token: string
  username: string
  role: 'admin' | 'player'
}

const TOKEN_KEY = 'cpc_token'
const USERNAME_KEY = 'cpc_username'
const ROLE_KEY = 'cpc_role'

function loadAuth(): AuthState | null {
  const token = localStorage.getItem(TOKEN_KEY)
  const username = localStorage.getItem(USERNAME_KEY)
  const role = localStorage.getItem(ROLE_KEY) as 'admin' | 'player' | null
  if (token && username && role) return { token, username, role }
  return null
}

function saveAuth(auth: AuthState) {
  localStorage.setItem(TOKEN_KEY, auth.token)
  localStorage.setItem(USERNAME_KEY, auth.username)
  localStorage.setItem(ROLE_KEY, auth.role)
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
  localStorage.removeItem(ROLE_KEY)
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('auth')
  const [auth, setAuth] = useState<AuthState | null>(loadAuth)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [tableError, setTableError] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [createOptions, setCreateOptions] = useState<TableOptions>({
    bigBlind: 20,
    smallBlind: 10,
    maxPlayers: 9,
    startingChips: 1000,
  })

  const socketRef = useRef<AppSocket | null>(null)

  // Connect socket when we have auth
  useEffect(() => {
    if (!auth) return

    const socket: AppSocket = io({
      path: '/socket.io',
      auth: { token: auth.token },
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setScreen(prev => prev === 'auth' ? 'lobby' : prev)
    })

    socket.on('connect_error', (err) => {
      if (err.message === 'Authentication required' || err.message === 'Invalid or expired token') {
        clearAuth()
        setAuth(null)
        setScreen('auth')
      }
    })

    socket.on('table:created', (info, code) => {
      setTableInfo(info)
      setInviteCode(code)
      setPlayers([])
      setScreen('table')
    })

    socket.on('table:joined', (info, player) => {
      setTableInfo(info)
      setPlayers(prev => {
        const without = prev.filter(p => p.id !== player.id)
        return [...without, player]
      })
      setScreen('table')
    })

    socket.on('table:player-joined', (player) => {
      setPlayers(prev => [...prev.filter(p => p.id !== player.id), player])
    })

    socket.on('table:player-left', (playerId) => {
      setPlayers(prev => prev.map(p =>
        p.id === playerId ? { ...p, isConnected: false } : p
      ))
    })

    socket.on('table:player-kicked', (playerId) => {
      setPlayers(prev => prev.filter(p => p.id !== playerId))
    })

    socket.on('table:chips-updated', (playerId, chips) => {
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, chips } : p))
    })

    socket.on('error', (msg) => setTableError(msg))

    socket.on('disconnect', () => {
      // Keep screen state — reconnect will restore
    })

    return () => { socket.disconnect() }
  }, [auth])

  // If we already have stored auth, skip to lobby
  useEffect(() => {
    if (auth && screen === 'auth') setScreen('lobby')
  }, [])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      const result = authMode === 'login'
        ? await api.login(username, password)
        : await api.register(username, password)
      saveAuth(result)
      setAuth(result)
    } catch (err) {
      setAuthError((err as Error).message)
    } finally {
      setAuthLoading(false)
    }
  }

  function handleLogout() {
    socketRef.current?.disconnect()
    socketRef.current = null
    clearAuth()
    setAuth(null)
    setScreen('auth')
    setTableInfo(null)
    setPlayers([])
    setInviteCode('')
  }

  function handleCreateTable(e: React.FormEvent) {
    e.preventDefault()
    setTableError('')
    socketRef.current?.emit('table:create', createOptions)
  }

  function handleJoinTable(e: React.FormEvent) {
    e.preventDefault()
    setTableError('')
    socketRef.current?.emit('table:join', joinCode.toUpperCase())
  }

  function handleKick(playerId: string) {
    socketRef.current?.emit('table:kick', playerId)
  }

  function handleSetChips(playerId: string, chips: number) {
    socketRef.current?.emit('table:set-chips', playerId, chips)
  }

  // --- Screens ---

  if (screen === 'auth') {
    return (
      <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'monospace' }}>
        <h1>CPC-Online</h1>
        <h2>{authMode === 'login' ? 'Login' : 'Register'}</h2>
        <form onSubmit={handleAuth}>
          <div>
            <input
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          {authError && <p style={{ color: 'red' }}>{authError}</p>}
          <button type="submit" disabled={authLoading}>
            {authLoading ? '...' : authMode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
        <p>
          {authMode === 'login' ? 'No account? ' : 'Already have one? '}
          <button onClick={() => { setAuthMode(m => m === 'login' ? 'register' : 'login'); setAuthError('') }}>
            {authMode === 'login' ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    )
  }

  if (screen === 'lobby') {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', fontFamily: 'monospace' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>CPC-Online</h1>
          <span>
            {auth?.username} ({auth?.role}) &nbsp;
            <button onClick={handleLogout}>Logout</button>
          </span>
        </div>

        <h2>Tisch erstellen</h2>
        <form onSubmit={handleCreateTable}>
          <label>Small Blind: <input type="number" value={createOptions.smallBlind} onChange={e => setCreateOptions(o => ({ ...o, smallBlind: +e.target.value }))} /></label><br />
          <label>Big Blind: <input type="number" value={createOptions.bigBlind} onChange={e => setCreateOptions(o => ({ ...o, bigBlind: +e.target.value }))} /></label><br />
          <label>Startchips: <input type="number" value={createOptions.startingChips} onChange={e => setCreateOptions(o => ({ ...o, startingChips: +e.target.value }))} /></label><br />
          <label>Max. Spieler: <input type="number" min={2} max={9} value={createOptions.maxPlayers} onChange={e => setCreateOptions(o => ({ ...o, maxPlayers: +e.target.value }))} /></label><br />
          <button type="submit">Tisch erstellen</button>
        </form>

        <hr />

        <h2>Tisch beitreten</h2>
        <form onSubmit={handleJoinTable}>
          <input
            placeholder="Invite-Code"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            style={{ textTransform: 'uppercase' }}
          />
          <button type="submit">Beitreten</button>
        </form>

        {tableError && <p style={{ color: 'red' }}>{tableError}</p>}
      </div>
    )
  }

  // Table screen
  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>CPC-Online — Tisch</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>

      {inviteCode && (
        <p>Invite-Code: <strong>{inviteCode}</strong></p>
      )}

      {tableInfo && (
        <p>Blinds: {tableInfo.smallBlind}/{tableInfo.bigBlind} &nbsp;|&nbsp; Phase: {tableInfo.phase}</p>
      )}

      {tableError && <p style={{ color: 'red' }}>{tableError}</p>}

      <h2>Spieler ({players.length})</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Name</th>
            <th>Rolle</th>
            <th>Chips</th>
            <th>Status</th>
            {auth?.role === 'admin' && <th>Aktionen</th>}
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td style={{ textAlign: 'center' }}>{p.role}</td>
              <td style={{ textAlign: 'center' }}>{p.chips}</td>
              <td style={{ textAlign: 'center' }}>{p.isConnected ? '🟢' : '🔴'}</td>
              {auth?.role === 'admin' && (
                <td style={{ textAlign: 'center' }}>
                  {p.role !== 'admin' && (
                    <>
                      <button onClick={() => {
                        const chips = parseInt(prompt(`Chips für ${p.name}:`) ?? '', 10)
                        if (!isNaN(chips)) handleSetChips(p.id, chips)
                      }}>Chips</button>
                      {' '}
                      <button onClick={() => handleKick(p.id)}>Kick</button>
                    </>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
