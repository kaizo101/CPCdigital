import Database, { type Database as DatabaseType } from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), 'data.db')
fs.mkdirSync(path.dirname(dbPath), { recursive: true, mode: 0o700 })

// Server runtime data may contain password hashes and private hand histories.
// Keep newly created database, WAL and SHM files private to the current user.
if (process.platform !== 'win32') process.umask(0o077)
const db: DatabaseType = new Database(dbPath)

db.pragma('journal_mode = WAL')

for (const runtimePath of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
  if (fs.existsSync(runtimePath)) fs.chmodSync(runtimePath, 0o600)
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'player',
    created_at INTEGER NOT NULL
  )
`)

export default db
