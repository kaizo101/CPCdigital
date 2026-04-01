import Database, { type Database as DatabaseType } from 'better-sqlite3'
import path from 'node:path'

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), 'data.db')
const db: DatabaseType = new Database(dbPath)

db.pragma('journal_mode = WAL')

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
