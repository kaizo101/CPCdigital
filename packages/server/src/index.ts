import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { io as createSocketClient, type Socket as ClientSocket } from 'socket.io-client'
import jwt from 'jsonwebtoken'
import type { ChatMessage, ClientToServerEvents, JwtPayload, Player, PublicGameState, ServerToClientEvents } from '@cpc/shared'
import { PokerGame } from '@cpc/poker-engine'
import authRouter, { JWT_SECRET } from './auth-router.js'
import { tableManager } from './table-manager.js'
import { getHandRecord, getHandSummaries, getSessionStats, saveHand } from './history-db.js'

const app = express()
const httpServer = createServer(app)

app.use(express.json())
app.use('/auth', authRouter)

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  },
})

declare module 'socket.io' {
  interface SocketData {
    userId: number
    username: string
    role: JwtPayload['role']
  }
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

let game: PokerGame | null = null
let handStartPlayers: Player[] = []
let announcedHandEventCount = 0

interface BotClient {
  userId: number
  username: string
  socket: ClientSocket<ServerToClientEvents, ClientToServerEvents>
}

const botClients = new Map<number, BotClient>()
let nextBotUserId = 1_000_000
let nextBotNumber = 1

// ---------------------------------------------------------------------------
// Turn timer
// ---------------------------------------------------------------------------

const DEFAULT_TURN_TIMEOUT_MS = 30_000
const DISCONNECT_TURN_TIMEOUT_MS = 10_000

let turnTimer: ReturnType<typeof setTimeout> | null = null
let currentTurnDeadline: number | null = null
let currentTurnPlayerId: string | null = null
let autoStartTimer: ReturnType<typeof setTimeout> | null = null

function createGameFromCurrentTable(): PokerGame {
  const info = tableManager.getTableInfo()
  if (!info) throw new Error('No active table')
  return new PokerGame(tableManager.getPlayers(), { bigBlind: info.bigBlind, smallBlind: info.smallBlind })
}

function clearTurnTimer(): void {
  if (turnTimer) { clearTimeout(turnTimer); turnTimer = null }
  currentTurnDeadline = null
  currentTurnPlayerId = null
}

function handlePlayerRemovalFromActiveGame(playerId: string): void {
  if (!game) return
  if (game.getPublicState().phase === 'waiting') {
    game.removePlayer(playerId)
    return
  }
  game.forceFold(playerId)
}

function startTurnTimer(playerId: string, ms: number = DEFAULT_TURN_TIMEOUT_MS): void {
  clearTurnTimer()
  currentTurnPlayerId = playerId
  currentTurnDeadline = Date.now() + ms

  turnTimer = setTimeout(() => {
    if (!game || game.getPublicState().currentPlayerId !== playerId) return
    const state = game.getPublicState()
    const player = state.players.find(p => p.id === playerId)
    if (!player) return

    const toCall = state.currentBet - player.roundBet
    const action = toCall === 0 ? { type: 'check' as const } : { type: 'fold' as const }

    try {
      console.log(`[server] turn timeout — auto-${action.type} for player ${playerId}`)
      game.applyAction(playerId, action, 'forced')
      clearTurnTimer()
      manageTurnTimer()
      broadcastGameState()
      flushHandHistoryMessages()
      dealHoleCards()
      handleHandEnd()
    } catch (err) {
      console.error('[server] auto-act failed:', (err as Error).message)
    }
  }, ms)
}

/** Start/stop turn timer based on current game state. Does NOT broadcast. */
function manageTurnTimer(): void {
  if (!game) { clearTurnTimer(); return }
  const state = game.getPublicState()

  if (
    state.currentPlayerId &&
    state.phase !== 'waiting' &&
    state.phase !== 'showdown'
  ) {
    if (state.currentPlayerId !== currentTurnPlayerId) {
      startTurnTimer(state.currentPlayerId)
    }
  } else {
    clearTurnTimer()
  }
}

// ---------------------------------------------------------------------------
// Broadcast helpers
// ---------------------------------------------------------------------------

function broadcastGameState(): void {
  if (!game) return
  const state: PublicGameState = { ...game.getPublicState(), turnDeadline: currentTurnDeadline }
  io.emit('game:state', state)
}

function emitSystemMessage(text: string): void {
  const message: ChatMessage = {
    playerId: 'system',
    playerName: 'Dealer',
    text,
    timestamp: Date.now(),
  }
  io.emit('chat:message', message)
}

function flushHandHistoryMessages(): void {
  if (!game) return
  const players = game.getPublicState().players
  const nameMap = new Map(players.map(player => [player.id, player.name]))
  const newEvents = game.getPublicHandHistory().slice(announcedHandEventCount)

  for (const event of newEvents) {
    switch (event.type) {
      case 'HandStarted':
        emitSystemMessage(`New hand — blinds ${event.smallBlind}/${event.bigBlind}`)
        break
      case 'BlindPosted':
        emitSystemMessage(`${nameMap.get(event.playerId) ?? event.playerId} posts ${event.blindType} blind ${event.amount}`)
        break
      case 'PlayerActed': {
        const playerName = nameMap.get(event.playerId) ?? event.playerId
        const actionText = (() => {
          switch (event.action.type) {
            case 'fold': return 'folds'
            case 'check': return 'checks'
            case 'call': return `calls ${event.amount}`
            case 'raise': return event.currentBetBefore === 0
              ? `bets ${event.totalBet}`
              : `raises to ${event.totalBet}`
            case 'all-in': return `is all-in for ${event.totalBet}`
          }
        })()
        emitSystemMessage(`${playerName} ${actionText}`)
        break
      }
      case 'CommunityCardDealt':
        emitSystemMessage(`${event.phase}: ${event.cards.map(card => `${card.rank}${card.suit[0]}`).join(' ')}`)
        break
      case 'UncalledBetReturned':
        emitSystemMessage(`Uncalled bet ${event.amount} returned to ${nameMap.get(event.playerId) ?? event.playerId}`)
        break
      case 'CardsRevealed':
        emitSystemMessage(`${nameMap.get(event.playerId) ?? event.playerId} shows ${event.cards.map(card => `${card.rank}${card.suit[0]}`).join(' ')}`)
        break
      case 'PotAwarded':
        emitSystemMessage(`${nameMap.get(event.playerId) ?? event.playerId} wins ${event.amount}${event.handName ? ` with ${event.handName}` : ''}`)
        break
      case 'HandEnded':
        break
    }
  }

  announcedHandEventCount += newEvents.length
}

function dealHoleCards(): void {
  if (!game) return
  const seatedPlayerIds = new Set(game.getPublicState().players.map(player => player.id))
  for (const socket of io.sockets.sockets.values()) {
    const { userId } = socket.data
    if (!userId || !seatedPlayerIds.has(String(userId))) continue
    const cards = game.getPlayerView(String(userId)).ownCards
    if (cards) socket.emit('game:your-cards', cards)
  }
}

function handleHandEnd(): void {
  if (!game) return
  const state = game.getPublicState()
  if (state.phase !== 'waiting') return

  clearTurnTimer()
  const results = game.getLastHandResults()
  io.emit('game:hand-result', results)
  console.log('[server] hand ended, results:', results)

  // Persist hand to SQLite
  try {
    saveHand(handStartPlayers, game.getPublicHandHistory(), results)
  } catch (err) {
    console.error('[server] failed to save hand history:', (err as Error).message)
  }

  // Sync chip counts back to tableManager
  const adminId = tableManager.getAdminUserId()
  if (adminId !== null) {
    for (const p of state.players) {
      try { tableManager.setChips(adminId, parseInt(p.id, 10), p.chips) } catch { /* ignore */ }
    }
  }

  // Auto-start next hand after delay
  if (autoStartTimer) clearTimeout(autoStartTimer)
  autoStartTimer = setTimeout(() => {
    try {
      game = createGameFromCurrentTable()
      handStartPlayers = game.getPublicState().players.filter(p => p.chips > 0 && !p.isSittingOut)
      announcedHandEventCount = 0
      game.startHand()
      manageTurnTimer()
      broadcastGameState()
      flushHandHistoryMessages()
      dealHoleCards()
    } catch (err) {
      console.log('[server] could not auto-start next hand:', (err as Error).message)
    }
  }, 3_000)
}

function randomBotAction(state: PublicGameState, myId: string) {
  const me = state.players.find(player => player.id === myId)
  if (!me) return { type: 'fold' as const }

  const toCall = Math.max(0, state.currentBet - me.roundBet)
  const canCheck = toCall === 0
  const roll = Math.random()

  if (canCheck) {
    if (roll < 0.72) return { type: 'check' as const }
    if (roll < 0.92) return { type: 'raise' as const, amount: state.currentBet + state.minRaise }
    return { type: 'all-in' as const }
  }

  if (roll < 0.16) return { type: 'fold' as const }
  if (roll < 0.78) return { type: 'call' as const }

  const minRaiseTo = state.currentBet + state.minRaise
  if (me.chips > minRaiseTo - me.roundBet) {
    return { type: 'raise' as const, amount: minRaiseTo }
  }
  return { type: 'call' as const }
}

function connectBot(inviteCode: string, startingChips: number): Promise<Player> {
  return new Promise((resolve, reject) => {
    const userId = nextBotUserId++
    const username = `Bot ${nextBotNumber++}`
    const payload: JwtPayload = { userId, username, role: 'player' }
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
    const socket = createSocketClient(process.env.SERVER_URL ?? `http://127.0.0.1:${PORT}`, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket'],
    })

    let resolved = false
    const timeout = setTimeout(() => {
      fail('Bot connection timed out')
    }, 5_000)

    const fail = (message: string) => {
      if (resolved) return
      resolved = true
      clearTimeout(timeout)
      socket.disconnect()
      reject(new Error(message))
    }

    socket.on('connect_error', (err) => fail(err.message))
    socket.on('error', (message) => {
      if (!resolved) fail(message)
    })

    socket.on('connect', () => {
      socket.emit('table:join', inviteCode)
    })

    socket.on('table:joined', (_info, player) => {
      if (resolved || player.id !== String(userId)) return

      try {
        resolved = true
        clearTimeout(timeout)
        botClients.set(userId, { userId, username, socket })

        const adminId = tableManager.getAdminUserId()
        if (adminId !== null && startingChips > 0) {
          tableManager.setChips(adminId, userId, startingChips)
          io.emit('table:chips-updated', String(userId), startingChips)
        }

        socket.on('game:state', (state) => {
          try {
            if (state.currentPlayerId !== String(userId)) return
            const delay = 600 + Math.random() * 1200
            setTimeout(() => {
              const latestGame = game
              if (!latestGame || latestGame.getPublicState().currentPlayerId !== String(userId)) return
              socket.emit('game:action', randomBotAction(latestGame.getPublicState(), String(userId)))
            }, delay)
          } catch (err) {
            console.error(`[server] bot ${username} state handler failed:`, (err as Error).message)
          }
        })

        socket.on('disconnect', () => {
          botClients.delete(userId)
        })

        resolve(player)
      } catch (err) {
        fail((err as Error).message)
      }
    })
  })
}

async function addBots(count: number): Promise<Player[]> {
  const table = tableManager.getTableInfo()
  const options = tableManager.getTableOptions()
  if (!table || !options) throw new Error('No active table')

  const desired = Math.max(1, Math.min(5, Math.floor(count || 1)))
  const freeSeats = table.maxPlayers - table.playerCount
  if (freeSeats <= 0) throw new Error('Table is full')

  const toSpawn = Math.min(desired, freeSeats)
  const botStartingChips = options.bigBlind * 100
  const created: Player[] = []
  for (let i = 0; i < toSpawn; i++) {
    created.push(await connectBot(table.inviteCode, botStartingChips))
  }
  return created
}

// ---------------------------------------------------------------------------
// JWT middleware
// ---------------------------------------------------------------------------

io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined
  if (!token) return next(new Error('Authentication required'))
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    socket.data.userId = payload.userId
    socket.data.username = payload.username
    socket.data.role = payload.role
    next()
  } catch {
    next(new Error('Invalid or expired token'))
  }
})

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

const PORT = process.env.PORT ?? 3001

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.2.0' })
})

app.get('/history', (_req, res) => {
  res.json(getHandSummaries())
})

app.get('/history/:id', (req, res) => {
  const id = parseInt(req.params.id, 10)
  const record = getHandRecord(id)
  if (!record) { res.status(404).json({ error: 'Not found' }); return }
  res.json(record)
})

app.get('/stats', (_req, res) => {
  res.json(getSessionStats())
})

// ---------------------------------------------------------------------------
// Socket events
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {
  const { userId, username } = socket.data
  console.log(`[server] connected: ${username} (${socket.id})`)

  tableManager.onConnect(userId, socket.id)

  // Restore state on reconnect
  const tableInfo = tableManager.getTableInfo()
  const existingPlayer = tableManager.getPlayer(userId)
  if (tableInfo && existingPlayer) {
    socket.broadcast.emit('table:player-updated', existingPlayer)
    socket.emit('table:joined', tableInfo, existingPlayer)
    if (game) {
      const state: PublicGameState = { ...game.getPublicState(), turnDeadline: currentTurnDeadline }
      socket.emit('game:state', state)
      const cards = state.players.some(player => player.id === String(userId))
        ? game.getPlayerView(String(userId)).ownCards
        : null
      if (cards) socket.emit('game:your-cards', cards)
    }
  }

  // ---- Table management ----

  socket.on('table:create', (options) => {
    try {
      tableManager.createTable(userId, username, options)
      tableManager.onConnect(userId, socket.id)
      const info = tableManager.getTableInfo()!
      const adminPlayer = tableManager.getPlayer(userId)!
      socket.emit('table:created', info, info.inviteCode)
      socket.emit('table:joined', info, adminPlayer)
      console.log(`[server] table created by ${username}, invite: ${info.inviteCode}`)
    } catch (err) {
      socket.emit('error', (err as Error).message)
    }
  })

  socket.on('table:join', (inviteCode) => {
    try {
      const player = tableManager.joinTable(inviteCode, userId, username)
      tableManager.onConnect(userId, socket.id)
      const info = tableManager.getTableInfo()!
      if (game && game.getPublicState().phase === 'waiting') {
        game.upsertPlayer(player)
      }
      socket.emit('table:joined', info, player)
      socket.broadcast.emit('table:player-joined', player)
      emitSystemMessage(`${username} joined the table`)
      if (game) {
        const state: PublicGameState = { ...game.getPublicState(), turnDeadline: currentTurnDeadline }
        socket.emit('game:state', state)
      }
      console.log(`[server] ${username} joined table`)
    } catch (err) {
      socket.emit('error', (err as Error).message)
    }
  })

  socket.on('table:leave', () => {
    const removedPlayer = tableManager.removePlayer(userId)
    handlePlayerRemovalFromActiveGame(String(userId))
    socket.broadcast.emit('table:player-left', String(userId))
    emitSystemMessage(`${username} left the table`)
    socket.emit('table:player-left', String(userId))
    if (removedPlayer) {
      clearTurnTimer()
      manageTurnTimer()
      broadcastGameState()
      flushHandHistoryMessages()
      dealHoleCards()
      handleHandEnd()
    }
  })

  socket.on('table:sit-out', (sittingOut) => {
    try {
      const player = tableManager.setSittingOut(userId, sittingOut)
      io.emit('table:player-updated', player)
      if (game) game.setPlayerSittingOut(String(userId), sittingOut)
      emitSystemMessage(`${username} is ${sittingOut ? 'sitting out next hand' : 'back in the game'}`)
    } catch (err) {
      socket.emit('error', (err as Error).message)
    }
  })

  socket.on('table:kick', (targetPlayerId) => {
    try {
      const targetUserId = parseInt(targetPlayerId, 10)
      const kickedSocketId = tableManager.getSocketId(targetUserId)
      tableManager.kickPlayer(userId, targetUserId)
      handlePlayerRemovalFromActiveGame(targetPlayerId)
      io.emit('table:player-kicked', targetPlayerId)
      emitSystemMessage(`${targetPlayerId} was kicked from the table`)
      if (kickedSocketId) {
        io.to(kickedSocketId).emit('error', 'You have been kicked from the table')
        io.sockets.sockets.get(kickedSocketId)?.disconnect(true)
      }
      clearTurnTimer()
      manageTurnTimer()
      broadcastGameState()
      flushHandHistoryMessages()
      dealHoleCards()
      handleHandEnd()
    } catch (err) {
      socket.emit('error', (err as Error).message)
    }
  })

  socket.on('table:set-chips', (targetPlayerId, chips) => {
    try {
      const targetUserId = parseInt(targetPlayerId, 10)
      tableManager.setChips(userId, targetUserId, chips)
      io.emit('table:chips-updated', targetPlayerId, chips)
      if (game && game.getPublicState().phase === 'waiting') {
        game.setPlayerChips(targetPlayerId, chips)
      }
    } catch (err) {
      socket.emit('error', (err as Error).message)
    }
  })

  // ---- Game ----

  socket.on('table:start-game', () => {
    try {
      if (!tableManager.isAdmin(userId)) throw new Error('Admin only')
      if (autoStartTimer) { clearTimeout(autoStartTimer); autoStartTimer = null }

      const players = tableManager.getPlayers()
      if (players.filter(p => p.chips > 0 && !p.isSittingOut).length < 2) {
        throw new Error('Need at least 2 players with chips to start')
      }

      const info = tableManager.getTableInfo()!
      game = new PokerGame(players, { bigBlind: info.bigBlind, smallBlind: info.smallBlind })
      handStartPlayers = players.filter(p => p.chips > 0 && !p.isSittingOut)
      announcedHandEventCount = 0
      game.startHand()

      manageTurnTimer()
      broadcastGameState()
      flushHandHistoryMessages()
      dealHoleCards()
      console.log('[server] hand started')
    } catch (err) {
      socket.emit('error', (err as Error).message)
    }
  })

  socket.on('table:add-bot', async (count) => {
    try {
      if (!tableManager.isAdmin(userId)) throw new Error('Admin only')
      const bots = await addBots(count)
      console.log(`[server] admin added ${bots.length} bot(s)`)
    } catch (err) {
      socket.emit('error', (err as Error).message)
    }
  })

  socket.on('game:action', (action) => {
    try {
      if (!game) throw new Error('No active game')
      const playerId = String(userId)
      game.applyAction(playerId, action)

      clearTurnTimer()
      manageTurnTimer()
      broadcastGameState()
      flushHandHistoryMessages()
      dealHoleCards()
      handleHandEnd()
    } catch (err) {
      socket.emit('error', (err as Error).message)
    }
  })

  socket.on('chat:message', (text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const message: ChatMessage = {
      playerId: String(userId),
      playerName: username,
      text: trimmed.slice(0, 280),
      timestamp: Date.now(),
    }
    io.emit('chat:message', message)
  })

  socket.on('disconnect', (reason) => {
    const player = tableManager.onDisconnect(userId)
    if (player) io.emit('table:player-updated', player)
    console.log(`[server] disconnected: ${username} (${reason})`)
    emitSystemMessage(`${username} disconnected`)

    // Shorten remaining turn time if it's this player's turn
    if (game && game.getPublicState().currentPlayerId === String(userId)) {
      startTurnTimer(String(userId), DISCONNECT_TURN_TIMEOUT_MS)
      broadcastGameState()
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`)
})
