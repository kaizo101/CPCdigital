/**
 * Dummy-Bot v0 — verbindet sich als Socket-Client mit gültigem JWT,
 * macht zufällige gültige Aktionen.
 *
 * Usage:
 *   npx tsx scripts/dummy-bot.ts <inviteCode> [botCount]
 *
 * Example:
 *   npx tsx scripts/dummy-bot.ts ABC123 3
 */

import { randomBytes } from 'node:crypto'
import { io } from 'socket.io-client'
import type { GameState, PlayerAction } from '@cpc/shared'

const SERVER = process.env.SERVER_URL ?? 'http://localhost:3001'
const [, , inviteCode, countArg] = process.argv
const BOT_COUNT = parseInt(countArg ?? '1', 10)

if (!inviteCode) {
  console.error('Usage: npx tsx scripts/dummy-bot.ts <inviteCode> [botCount]')
  process.exit(1)
}

async function register(username: string, password: string): Promise<string> {
  // Try login first, fallback to register
  for (const path of ['/auth/login', '/auth/register']) {
    const res = await fetch(`${SERVER}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json() as { token?: string; error?: string }
    if (data.token) return data.token
  }
  throw new Error(`Could not authenticate bot ${username}`)
}

function randomAction(state: GameState, myId: string): PlayerAction {
  const me = state.players.find(p => p.id === myId)
  if (!me) return { type: 'fold' }

  const myRoundBet = me.roundBet
  const toCall = Math.max(0, state.currentBet - myRoundBet)
  const canCheck = toCall === 0

  const roll = Math.random()

  if (canCheck) {
    // 70% check, 20% raise, 10% all-in
    if (roll < 0.70) return { type: 'check' }
    if (roll < 0.90) {
      const minRaise = state.currentBet + state.minRaise
      return { type: 'raise', amount: minRaise }
    }
    return { type: 'all-in' }
  } else {
    // 20% fold, 60% call, 20% raise
    if (roll < 0.20) return { type: 'fold' }
    if (roll < 0.80) return { type: 'call' }
    const minRaise = state.currentBet + state.minRaise
    if (me.chips > minRaise - myRoundBet) {
      return { type: 'raise', amount: minRaise }
    }
    return { type: 'call' }
  }
}

async function spawnBot(index: number) {
  const username = `bot_${index}_${Date.now()}`
  const password = randomBytes(24).toString('base64url')

  let token: string
  try {
    token = await register(username, password)
  } catch (err) {
    console.error(`[bot${index}] auth failed:`, err)
    return
  }

  const socket = io(SERVER, {
    path: '/socket.io',
    auth: { token },
  })

  let myId: string | null = null
  let gameState: GameState | null = null

  socket.on('connect', () => {
    console.log(`[bot${index}] connected as ${username}`)
    socket.emit('table:join', inviteCode)
  })

  socket.on('table:joined', (_info, player) => {
    myId = player.id
    console.log(`[bot${index}] joined table as player ${myId}`)
  })

  socket.on('game:state', (state) => {
    gameState = state

    if (state.currentPlayerId === myId && myId) {
      // Random delay 0.5–2s to feel more human
      const delay = 500 + Math.random() * 1500
      setTimeout(() => {
        if (!gameState || gameState.currentPlayerId !== myId) return
        const action = randomAction(gameState, myId!)
        console.log(`[bot${index}] acting:`, action.type)
        socket.emit('game:action', action)
      }, delay)
    }
  })

  socket.on('game:hand-result', (results) => {
    for (const r of results) {
      if (r.playerId === myId) {
        console.log(`[bot${index}] hand ended, won ${r.amount}${r.handName ? ` (${r.handName})` : ''}`)
      }
    }
  })

  socket.on('error', (msg) => {
    console.error(`[bot${index}] server error: ${msg}`)
  })

  socket.on('disconnect', () => {
    console.log(`[bot${index}] disconnected`)
  })
}

console.log(`Starting ${BOT_COUNT} bot(s) joining table ${inviteCode}...`)
for (let i = 1; i <= BOT_COUNT; i++) {
  await spawnBot(i)
  // Stagger connections slightly
  await new Promise(r => setTimeout(r, 300))
}
