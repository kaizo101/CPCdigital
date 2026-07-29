import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { serverConfig } from './runtime-config.js'
import db from './db.js'
import type { JwtPayload, UserRole } from '@cpc/shared'

const router = Router()
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
})
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
})

interface UserRow {
  id: number
  username: string
  password_hash: string
  role: UserRole
}

router.post('/register', registerLimiter, async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string }

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' })
    return
  }
  if (username.length < 2 || username.length > 20) {
    res.status(400).json({ error: 'Username must be 2–20 characters' })
    return
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const stmt = db.prepare(
      'INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)'
    )
    const result = stmt.run(username, passwordHash, 'player', Date.now())
    const userId = result.lastInsertRowid as number

    const payload: JwtPayload = { userId, username, role: 'player' }
    const token = jwt.sign(payload, serverConfig.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: '7d',
    })

    res.status(201).json({ token, username, role: 'player' })
  } catch {
    res.status(409).json({ error: 'Username already taken' })
  }
})

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string }

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' })
    return
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'Invalid username or password' })
    return
  }

  const payload: JwtPayload = { userId: user.id, username: user.username, role: user.role }
  const token = jwt.sign(payload, serverConfig.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: '7d',
  })

  res.json({ token, username: user.username, role: user.role })
})

export default router
