import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import type { ClientToServerEvents, JwtPayload, ServerToClientEvents } from '@cpc/shared'
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

// JWT auth middleware for every socket connection
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
  res.json({ status: 'ok', version: '0.2.0-alpha.1' })
})

io.on('connection', (socket) => {
  const { userId, username } = socket.data
  console.log(`[server] connected: ${username} (${socket.id})`)

  tableManager.onConnect(userId, socket.id)

  // Restore state if user is already at a table (e.g. after page reload)
  const tableInfo = tableManager.getTableInfo()
  const existingPlayer = tableManager.getPlayer(userId)
  if (tableInfo && existingPlayer) {
    socket.emit('table:joined', tableInfo, existingPlayer)
  }

  socket.on('table:create', (options) => {
    try {
      const { inviteCode } = tableManager.createTable(userId, username, options)
      const info = tableManager.getTableInfo()!
      socket.emit('table:created', info, inviteCode)
      console.log(`[server] table created by ${username}, invite: ${inviteCode}`)
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
    } catch (err) {
      socket.emit('error', (err as Error).message)
    }
  })

  socket.on('game:action', (_action) => {
    // TODO 0.3.0-alpha.1
    socket.emit('error', 'Game actions not yet implemented')
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
