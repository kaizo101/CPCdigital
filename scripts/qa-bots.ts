/**
 * QA-Bot-Suite v0.5 — stress-tests disconnect, timeout, and invalid-action edge cases.
 *
 * Usage:
 *   node --import tsx/esm scripts/qa-bots.ts <inviteCode> <botType>
 *
 * Bot types:
 *   disconnect-after-flop  — joins, waits for flop, disconnects, reconnects after 5s
 *   timeout-bot            — joins but never sends game:action (exercises auto-fold)
 *   invalid-action-bot     — tries illegal actions, verifies server rejects them
 */

import { io as ioClient } from 'socket.io-client'
import type { ClientToServerEvents, GameState, ServerToClientEvents } from '@cpc/shared'

const SERVER = process.env.SERVER_URL ?? 'http://localhost:3001'
const [, , inviteCode, botType] = process.argv

if (!inviteCode || !botType) {
  console.error('Usage: node --import tsx/esm scripts/qa-bots.ts <inviteCode> <botType>')
  console.error('Bot types: disconnect-after-flop | timeout-bot | invalid-action-bot')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function registerOrLogin(username: string, password: string): Promise<string> {
  for (const path of ['/auth/register', '/auth/login']) {
    const res = await fetch(`${SERVER}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json() as { token?: string; error?: string }
    if (data.token) return data.token
    if (path === '/auth/login') throw new Error(`Auth failed for ${username}: ${data.error}`)
  }
  throw new Error('Unreachable')
}

// ---------------------------------------------------------------------------
// Bot: disconnect-after-flop
// ---------------------------------------------------------------------------

async function runDisconnectBot(token: string, name: string) {
  console.log(`[${name}] starting disconnect-after-flop bot`)

  let socket = ioClient(SERVER, { auth: { token } })
  let reconnected = false

  socket.on('connect', () => {
    console.log(`[${name}] connected`)
    socket.emit('table:join', inviteCode)
  })

  socket.on('game:state', (state: GameState) => {
    if (reconnected) {
      console.log(`[${name}] reconnected OK — phase: ${state.phase}`)
      return
    }

    if (state.phase === 'flop' || state.phase === 'turn' || state.phase === 'river') {
      console.log(`[${name}] flop seen — disconnecting now`)
      socket.disconnect()

      setTimeout(async () => {
        console.log(`[${name}] reconnecting...`)
        reconnected = true
        const newToken = await registerOrLogin(name, 'qapassword123')
        socket = ioClient(SERVER, { auth: { token: newToken } })
        socket.on('connect', () => {
          console.log(`[${name}] reconnect socket connected`)
          socket.emit('table:join', inviteCode)
        })
        socket.on('game:state', (s: GameState) => {
          console.log(`[${name}] post-reconnect state: phase=${s.phase}, players=${s.players.length}`)
        })
        socket.on('error', (msg: string) => console.error(`[${name}] error: ${msg}`))
      }, 5_000)
    }
  })

  socket.on('error', (msg: string) => console.error(`[${name}] error: ${msg}`))
}

// ---------------------------------------------------------------------------
// Bot: timeout-bot
// ---------------------------------------------------------------------------

async function runTimeoutBot(token: string, name: string) {
  console.log(`[${name}] starting timeout-bot — will never act`)

  const socket = ioClient(SERVER, { auth: { token } })

  socket.on('connect', () => {
    console.log(`[${name}] connected`)
    socket.emit('table:join', inviteCode)
  })

  socket.on('game:state', (state: GameState) => {
    if (state.currentPlayerId) {
      const me = state.players.find(p => p.id === state.currentPlayerId)
      if (me) console.log(`[${name}] it's ${me.name}'s turn — deadline: ${state.turnDeadline ? new Date(state.turnDeadline).toISOString() : 'none'}`)
    }
  })

  socket.on('error', (msg: string) => console.error(`[${name}] error: ${msg}`))

  console.log(`[${name}] waiting — expect auto-fold after turn timeout`)
}

// ---------------------------------------------------------------------------
// Bot: invalid-action-bot
// ---------------------------------------------------------------------------

async function runInvalidActionBot(token: string, name: string) {
  console.log(`[${name}] starting invalid-action-bot`)

  const socket = ioClient(SERVER, { auth: { token } })
  let tested = false

  socket.on('connect', () => {
    console.log(`[${name}] connected`)
    socket.emit('table:join', inviteCode)
  })

  socket.on('game:state', (state: GameState) => {
    if (tested || state.currentPlayerId !== state.players.find(p => p.name === name)?.id) return
    tested = true

    console.log(`[${name}] it's my turn — sending invalid actions`)

    // Wrong player ID (no effect — server uses socket identity)
    socket.emit('game:action', { type: 'raise', amount: -999 })

    setTimeout(() => {
      // Check when there's a bet (invalid)
      socket.emit('game:action', { type: 'check' })
    }, 200)

    setTimeout(() => {
      // Raise below minimum
      socket.emit('game:action', { type: 'raise', amount: 1 })
    }, 400)

    setTimeout(() => {
      // Valid fallback: fold
      console.log(`[${name}] sending valid fold`)
      socket.emit('game:action', { type: 'fold' })
    }, 600)
  })

  socket.on('error', (msg: string) => {
    console.log(`[${name}] server rejected (expected): ${msg}`)
  })
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

const botName = `qa-${botType}-${Math.random().toString(36).slice(2, 6)}`

try {
  const token = await registerOrLogin(botName, 'qapassword123')

  switch (botType) {
    case 'disconnect-after-flop':
      await runDisconnectBot(token, botName)
      break
    case 'timeout-bot':
      await runTimeoutBot(token, botName)
      break
    case 'invalid-action-bot':
      await runInvalidActionBot(token, botName)
      break
    default:
      console.error(`Unknown bot type: ${botType}`)
      console.error('Available: disconnect-after-flop | timeout-bot | invalid-action-bot')
      process.exit(1)
  }
} catch (err) {
  console.error('Fatal:', (err as Error).message)
  process.exit(1)
}
