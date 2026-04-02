import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import type { ClientToServerEvents, JwtPayload, ServerToClientEvents } from '@cpc/shared'
import { PokerGame } from '@cpc/poker-engine'
import authRouter, { JWT_SECRET } from './auth-router.js'
import { tableManager } from './table-manager.js'

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

// Single PokerGame instance for the one active table
let game: PokerGame | null = null

function broadcastGameState(): void {
  if (!game) return
  const state = game.getState()
  io.emit('game:state', state)
}

function dealHoleCards(): void {
  if (!game) return
  for (const socket of io.sockets.sockets.values()) {
    const { userId } = socket.data
    if (!userId) continue
    const cards = game.getHoleCards(String(userId))
    if (cards) socket.emit('game:your-cards', cards)
  }
}

// JWT auth middleware
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

const PORT = process.env.PORT ?? 3001

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.3.0-alpha.1' })
})

io.on('connection', (socket) => {
  const { userId, username } = socket.data
  console.log(`[server] connected: ${username} (${socket.id})`)

  tableManager.onConnect(userId, socket.id)

  // Restore table state on reconnect
  const tableInfo = tableManager.getTableInfo()
  const existingPlayer = tableManager.getPlayer(userId)
  if (tableInfo && existingPlayer) {
    socket.emit('table:joined', tableInfo, existingPlayer)
    if (game) {
      socket.emit('game:state', game.getState())
      const cards = game.getHoleCards(String(userId))
      if (cards) socket.emit('game:your-cards', cards)
    }
  }

  // ---- Table management ----

  socket.on('table:create', (options) => {
    try {
      tableManager.createTable(userId, username, options)
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
      const info = tableManager.getTableInfo()!
      socket.emit('table:joined', info, player)
      socket.broadcast.emit('table:player-joined', player)
      if (game) socket.emit('game:state', game.getState())
      console.log(`[server] ${username} joined table`)
    } catch (err) {
      socket.emit('error', (err as Error).message)
    }
  })

  socket.on('table:leave', () => {
    tableManager.onDisconnect(userId)
    socket.broadcast.emit('table:player-left', String(userId))
  })

  socket.on('table:kick', (targetPlayerId) => {
    try {
      const targetUserId = parseInt(targetPlayerId, 10)
      tableManager.kickPlayer(userId, targetUserId)
      io.emit('table:player-kicked', targetPlayerId)
      const kickedSocketId = tableManager.getSocketId(targetUserId)
      if (kickedSocketId) {
        io.to(kickedSocketId).emit('error', 'You have been kicked from the table')
        io.sockets.sockets.get(kickedSocketId)?.disconnect(true)
      }
    } catch (err) {
      socket.emit('error', (err as Error).message)
    }
  })

  socket.on('table:set-chips', (targetPlayerId, chips) => {
    try {
      const targetUserId = parseInt(targetPlayerId, 10)
      tableManager.setChips(userId, targetUserId, chips)
      io.emit('table:chips-updated', targetPlayerId, chips)
      // Sync into game engine if no hand is running
      if (game && game.getState().phase === 'waiting') {
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

      const players = tableManager.getPlayers()
      if (players.filter(p => p.chips > 0).length < 2) {
        throw new Error('Need at least 2 players with chips to start')
      }

      const info = tableManager.getTableInfo()!
      game = new PokerGame(players, { bigBlind: info.bigBlind, smallBlind: info.smallBlind })
      game.startHand()

      broadcastGameState()
      dealHoleCards()
      console.log(`[server] hand started`)
    } catch (err) {
      socket.emit('error', (err as Error).message)
    }
  })

  socket.on('game:action', (action) => {
    try {
      if (!game) throw new Error('No active game')
      const playerId = String(userId)
      game.applyAction(playerId, action)

      broadcastGameState()

      // If hand just ended, broadcast results and start next hand
      const state = game.getState()
      if (state.phase === 'waiting') {
        const results = game.getLastHandResults()
        io.emit('game:hand-result', results)
        console.log(`[server] hand ended, results:`, results)

        // Auto-start next hand after short delay
        setTimeout(() => {
          if (!game) return
          try {
            // Sync chip counts back to tableManager
            for (const p of game.getState().players) {
              tableManager.setChips(userId, parseInt(p.id, 10), p.chips)
            }
            game.startHand()
            broadcastGameState()
            dealHoleCards()
          } catch (err) {
            console.log('[server] could not auto-start next hand:', (err as Error).message)
          }
        }, 3000)
      }
    } catch (err) {
      socket.emit('error', (err as Error).message)
    }
  })

  socket.on('chat:message', (_text) => {
    // TODO 0.4.0-alpha.1
    socket.emit('error', 'Chat not yet implemented')
  })

  socket.on('disconnect', (reason) => {
    tableManager.onDisconnect(userId)
    socket.broadcast.emit('table:player-left', String(userId))
    console.log(`[server] disconnected: ${username} (${reason})`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`)
})
