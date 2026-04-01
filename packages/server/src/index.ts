import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '@poker/shared'

const app = express()
const httpServer = createServer(app)

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  },
})

const PORT = process.env.PORT ?? 3001

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0-alpha.1' })
})

io.on('connection', (socket) => {
  console.log('[server] client connected:', socket.id)

  socket.on('lobby:list', () => {
    // TODO 0.2.0-alpha.1: return real lobby list from lobby manager
    socket.emit('lobby:list', [])
  })

  socket.on('lobby:create', (_name, _options) => {
    // TODO 0.2.0-alpha.1
    socket.emit('error', 'Lobbies not yet implemented')
  })

  socket.on('lobby:join', (_lobbyId, _playerName) => {
    // TODO 0.2.0-alpha.1
    socket.emit('error', 'Lobbies not yet implemented')
  })

  socket.on('game:action', (_action) => {
    // TODO 0.3.0-alpha.1
    socket.emit('error', 'Game actions not yet implemented')
  })

  socket.on('disconnect', (reason) => {
    console.log('[server] client disconnected:', socket.id, reason)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`)
})
