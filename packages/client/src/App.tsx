import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type {
  Card, ClientToServerEvents, GameState, HandResult,
  Player, ServerToClientEvents, TableInfo, TableOptions,
} from '@cpc/shared'
import { api } from './api.js'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>
type Screen = 'auth' | 'lobby' | 'table'

interface AuthState { token: string; username: string }

const TOKEN_KEY = 'cpc_token'
const USERNAME_KEY = 'cpc_username'

function loadAuth(): AuthState | null {
  const token = localStorage.getItem(TOKEN_KEY)
  const username = localStorage.getItem(USERNAME_KEY)
  return token && username ? { token, username } : null
}
function saveAuth(a: AuthState) {
  localStorage.setItem(TOKEN_KEY, a.token)
  localStorage.setItem(USERNAME_KEY, a.username)
}
function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
}

const SUIT_SYMBOL: Record<string, string> = {
  clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠',
}
const SUIT_COLOR: Record<string, string> = {
  clubs: '#222', diamonds: '#c00', hearts: '#c00', spades: '#222',
}

function CardView({ card }: { card: Card }) {
  return (
    <span style={{
      display: 'inline-block', width: 36, height: 52, border: '1px solid #999',
      borderRadius: 4, background: '#fff', textAlign: 'center', lineHeight: '52px',
      fontSize: 16, fontWeight: 'bold', color: SUIT_COLOR[card.suit], margin: '0 2px',
      userSelect: 'none',
    }}>
      {card.rank}{SUIT_SYMBOL[card.suit]}
    </span>
  )
}

function CardBack() {
  return (
    <span style={{
      display: 'inline-block', width: 36, height: 52, border: '1px solid #999',
      borderRadius: 4, background: '#336', textAlign: 'center', lineHeight: '52px',
      fontSize: 20, margin: '0 2px',
    }}>🂠</span>
  )
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
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [tableError, setTableError] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [createOptions, setCreateOptions] = useState<TableOptions>({
    bigBlind: 20, smallBlind: 10, maxPlayers: 9, startingChips: 1000,
  })

  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [myCards, setMyCards] = useState<[Card, Card] | null>(null)
  const [lastResults, setLastResults] = useState<HandResult[] | null>(null)
  const [raiseAmount, setRaiseAmount] = useState(0)

  const socketRef = useRef<AppSocket | null>(null)
  const isAdmin = myPlayer?.role === 'admin'
  const isMyTurn = gameState?.currentPlayerId === myPlayer?.id
  const inActiveHand = gameState && gameState.phase !== 'waiting'

  // Derived action availability
  const myRoundBet = gameState?.players.find(p => p.id === myPlayer?.id)?.roundBet ?? 0
  const toCall = Math.max(0, (gameState?.currentBet ?? 0) - myRoundBet)
  const canCheck = toCall === 0
  const minRaise = (gameState?.currentBet ?? 0) + (gameState?.minRaise ?? 20)

  useEffect(() => {
    if (!auth) return
    const socket: AppSocket = io({ path: '/socket.io', auth: { token: auth.token } })
    socketRef.current = socket

    socket.on('connect', () => setScreen(prev => prev === 'auth' ? 'lobby' : prev))
    socket.on('connect_error', (err) => {
      if (err.message === 'Authentication required' || err.message === 'Invalid or expired token') {
        clearAuth(); setAuth(null); setScreen('auth')
      }
    })

    socket.on('table:created', (info) => {
      setTableInfo(info); setPlayers([]); setScreen('table')
    })
    socket.on('table:joined', (info, player) => {
      setTableInfo(info)
      setMyPlayer(player)
      setPlayers(prev => [...prev.filter(p => p.id !== player.id), player])
      setScreen('table')
    })
    socket.on('table:player-joined', (player) => {
      setPlayers(prev => [...prev.filter(p => p.id !== player.id), player])
    })
    socket.on('table:player-left', (playerId) => {
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, isConnected: false } : p))
    })
    socket.on('table:player-kicked', (playerId) => {
      if (myPlayer?.id === playerId) {
        setScreen('lobby'); setMyPlayer(null); setTableInfo(null); setPlayers([])
      } else {
        setPlayers(prev => prev.filter(p => p.id !== playerId))
      }
    })
    socket.on('table:chips-updated', (playerId, chips) => {
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, chips } : p))
      if (myPlayer?.id === playerId) setMyPlayer(prev => prev ? { ...prev, chips } : prev)
    })

    socket.on('game:state', (state) => {
      setGameState(state)
      setPlayers(state.players)
      setMyPlayer(prev => prev ? (state.players.find(p => p.id === prev.id) ?? prev) : prev)
      setLastResults(null)
      if (state.phase !== 'waiting') setRaiseAmount(0)
    })
    socket.on('game:your-cards', (cards) => setMyCards(cards))
    socket.on('game:hand-result', (results) => {
      setLastResults(results)
      setMyCards(null)
    })

    socket.on('error', (msg) => setTableError(msg))
    return () => { socket.disconnect() }
  }, [auth])

  useEffect(() => {
    if (auth && screen === 'auth') setScreen('lobby')
  }, [])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthError(''); setAuthLoading(true)
    try {
      const result = authMode === 'login'
        ? await api.login(username, password)
        : await api.register(username, password)
      saveAuth(result); setAuth(result)
    } catch (err) { setAuthError((err as Error).message) }
    finally { setAuthLoading(false) }
  }

  function handleLogout() {
    socketRef.current?.disconnect(); socketRef.current = null
    clearAuth(); setAuth(null); setScreen('auth')
    setTableInfo(null); setMyPlayer(null); setPlayers([])
    setGameState(null); setMyCards(null)
  }

  function handleCreateTable(e: React.FormEvent) {
    e.preventDefault(); setTableError('')
    socketRef.current?.emit('table:create', createOptions)
  }

  function handleJoinTable(e: React.FormEvent) {
    e.preventDefault(); setTableError('')
    socketRef.current?.emit('table:join', joinCode.toUpperCase())
  }

  function handleStartGame() {
    setTableError('')
    socketRef.current?.emit('table:start-game')
  }

  function handleAction(action: Parameters<AppSocket['emit']>[1] extends (a: infer A) => void ? A : never) {
    setTableError('')
    socketRef.current?.emit('game:action', action as any)
  }

  function handleSetChips(playerId: string, playerName: string) {
    const input = prompt(`Chips für ${playerName}:`)
    const chips = parseInt(input ?? '', 10)
    if (!isNaN(chips) && chips >= 0) socketRef.current?.emit('table:set-chips', playerId, chips)
  }

  function handleKick(playerId: string) {
    socketRef.current?.emit('table:kick', playerId)
  }

  // ---- Auth screen ----
  if (screen === 'auth') {
    return (
      <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'monospace' }}>
        <h1>CPC-Online</h1>
        <h2>{authMode === 'login' ? 'Login' : 'Register'}</h2>
        <form onSubmit={handleAuth}>
          <div><input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" /></div>
          <div><input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} /></div>
          {authError && <p style={{ color: 'red' }}>{authError}</p>}
          <button type="submit" disabled={authLoading}>{authLoading ? '...' : authMode === 'login' ? 'Login' : 'Register'}</button>
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

  // ---- Lobby screen ----
  if (screen === 'lobby') {
    return (
      <div style={{ maxWidth: 480, margin: '60px auto', fontFamily: 'monospace' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>CPC-Online</h1>
          <span>{auth?.username} &nbsp;<button onClick={handleLogout}>Logout</button></span>
        </div>
        <h2>Tisch erstellen</h2>
        <form onSubmit={handleCreateTable}>
          <label>Small Blind: <input type="number" value={createOptions.smallBlind} onChange={e => setCreateOptions(o => ({ ...o, smallBlind: +e.target.value }))} /></label><br />
          <label>Big Blind: <input type="number" value={createOptions.bigBlind} onChange={e => setCreateOptions(o => ({ ...o, bigBlind: +e.target.value }))} /></label><br />
          <label>Max. Spieler: <input type="number" min={2} max={9} value={createOptions.maxPlayers} onChange={e => setCreateOptions(o => ({ ...o, maxPlayers: +e.target.value }))} /></label><br />
          <button type="submit">Tisch erstellen</button>
        </form>
        <hr />
        <h2>Tisch beitreten</h2>
        <form onSubmit={handleJoinTable}>
          <input placeholder="Invite-Code" value={joinCode} onChange={e => setJoinCode(e.target.value)} style={{ textTransform: 'uppercase' }} />
          <button type="submit">Beitreten</button>
        </form>
        {tableError && <p style={{ color: 'red' }}>{tableError}</p>}
      </div>
    )
  }

  // ---- Table / Game screen ----
  const phase = gameState?.phase ?? tableInfo?.phase ?? 'waiting'
  const pot = gameState?.pot ?? 0
  const community = gameState?.communityCards ?? []
  const activePlayers = players.filter(p => p.status !== 'waiting' || !inActiveHand)

  return (
    <div style={{ maxWidth: 700, margin: '30px auto', fontFamily: 'monospace' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>CPC-Online</h2>
        <span>
          {tableInfo && <><strong>{tableInfo.inviteCode}</strong> &nbsp;</>}
          Blinds {tableInfo?.smallBlind}/{tableInfo?.bigBlind} &nbsp;
          <button onClick={handleLogout}>Logout</button>
        </span>
      </div>

      {tableError && <p style={{ color: 'red', margin: '4px 0' }}>{tableError}</p>}

      {/* Community cards + pot */}
      <div style={{ margin: '16px 0', padding: '12px', background: '#1a4a1a', borderRadius: 8 }}>
        <div style={{ color: '#fff', marginBottom: 8 }}>
          Phase: <strong>{phase}</strong>
          {pot > 0 && <> &nbsp;|&nbsp; Pot: <strong>{pot}</strong></>}
          {(gameState?.sidePots?.length ?? 0) > 1 && (
            <> &nbsp;({gameState!.sidePots.map((sp, i) => `Side${i + 1}: ${sp.amount}`).join(', ')})</>
          )}
        </div>
        <div style={{ minHeight: 52 }}>
          {community.length === 0
            ? <span style={{ color: '#888' }}>{phase === 'waiting' ? '— Warte auf Spielstart —' : '— Karten werden aufgedeckt —'}</span>
            : community.map((c, i) => <CardView key={i} card={c} />)
          }
        </div>
      </div>

      {/* Hand result overlay */}
      {lastResults && lastResults.length > 0 && (
        <div style={{ background: '#fffbe6', border: '1px solid #f0c040', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
          <strong>Hand beendet:</strong>{' '}
          {lastResults.map((r, i) => {
            const p = players.find(pl => pl.id === r.playerId)
            return <span key={i}>{p?.name ?? r.playerId} +{r.amount}{r.handName ? ` (${r.handName})` : ''}{i < lastResults.length - 1 ? ', ' : ''}</span>
          })}
        </div>
      )}

      {/* My hole cards */}
      {myCards && (
        <div style={{ margin: '8px 0' }}>
          Deine Karten: <CardView card={myCards[0]} /><CardView card={myCards[1]} />
        </div>
      )}

      {/* Action bar */}
      {isMyTurn && inActiveHand && (
        <div style={{ margin: '12px 0', padding: '10px 12px', background: '#e8f4e8', borderRadius: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>Dein Zug</strong>
          {toCall > 0 && <span style={{ color: '#555' }}>({toCall} to call)</span>}
          <button onClick={() => handleAction({ type: 'fold' })}>Fold</button>
          {canCheck
            ? <button onClick={() => handleAction({ type: 'check' })}>Check</button>
            : <button onClick={() => handleAction({ type: 'call' })}>Call {toCall}</button>
          }
          <button onClick={() => handleAction({ type: 'all-in' })}>All-in</button>
          <span>
            <input
              type="number"
              min={minRaise}
              value={raiseAmount || minRaise}
              onChange={e => setRaiseAmount(+e.target.value)}
              style={{ width: 70 }}
            />
            <button onClick={() => handleAction({ type: 'raise', amount: raiseAmount || minRaise })}>Raise</button>
          </span>
        </div>
      )}

      {/* Start game button */}
      {isAdmin && phase === 'waiting' && !inActiveHand && (
        <div style={{ margin: '12px 0' }}>
          <button onClick={handleStartGame} style={{ fontWeight: 'bold' }}>
            Hand starten
          </button>
        </div>
      )}

      {/* Players table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
            <th>Name</th>
            <th>Rolle</th>
            <th>Chips</th>
            <th>Status</th>
            <th>Karten</th>
            {isAdmin && <th>Admin</th>}
          </tr>
        </thead>
        <tbody>
          {(inActiveHand ? activePlayers : players).map(p => {
            const isDealer = gameState && gameState.players[gameState.dealerIndex]?.id === p.id
            const isCurrent = gameState?.currentPlayerId === p.id
            return (
              <tr key={p.id} style={{ background: isCurrent ? '#fffbe6' : 'transparent', fontWeight: p.id === myPlayer?.id ? 'bold' : 'normal' }}>
                <td>
                  {p.name}
                  {p.id === myPlayer?.id ? ' (du)' : ''}
                  {isDealer ? ' 🔘' : ''}
                </td>
                <td>{p.role}</td>
                <td>{p.chips}{p.roundBet > 0 ? ` (${p.roundBet} bet)` : ''}</td>
                <td>{p.isConnected ? '🟢' : '🔴'} {inActiveHand ? p.status : ''}</td>
                <td>
                  {inActiveHand && p.status !== 'folded' && p.status !== 'waiting' && (
                    p.id === myPlayer?.id && myCards
                      ? <><CardView card={myCards[0]} /><CardView card={myCards[1]} /></>
                      : <><CardBack /><CardBack /></>
                  )}
                </td>
                {isAdmin && (
                  <td>
                    {p.role !== 'admin' && (
                      <>
                        <button onClick={() => handleSetChips(p.id, p.name)}>Chips</button>{' '}
                        <button onClick={() => handleKick(p.id)}>Kick</button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
