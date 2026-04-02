import type { Player, TableInfo, TableOptions, UserRole } from '@cpc/shared'

interface PlayerEntry {
  player: Player
  userId: number
  socketId: string | null
}

interface Table {
  id: string
  inviteCode: string
  options: TableOptions
  adminUserId: number
  players: Map<number, PlayerEntry>  // userId → entry
  nextSeatIndex: number
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function randomInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export class TableManager {
  private table: Table | null = null

  // userId → tableId (for fast lookup on disconnect)
  private userTableMap = new Map<number, string>()

  createTable(adminUserId: number, adminUsername: string, options: TableOptions): { tableId: string; inviteCode: string } {
    if (this.table) {
      throw new Error('A table already exists. Only one active table is supported.')
    }

    const tableId = randomId()
    const inviteCode = randomInviteCode()

    const adminPlayer: Player = {
      id: String(adminUserId),
      name: adminUsername,
      role: 'admin',
      chips: 0,
      seatIndex: 0,
      isConnected: true,
      status: 'waiting',
      roundBet: 0,
    }

    const players = new Map<number, PlayerEntry>()
    players.set(adminUserId, { player: adminPlayer, userId: adminUserId, socketId: null })

    this.table = { id: tableId, inviteCode, options, adminUserId, players, nextSeatIndex: 1 }
    this.userTableMap.set(adminUserId, tableId)

    return { tableId, inviteCode }
  }

  joinTable(inviteCode: string, userId: number, username: string): Player {
    if (!this.table || this.table.inviteCode !== inviteCode) {
      throw new Error('Invalid invite code')
    }

    if (this.table.players.has(userId)) {
      // Rejoin — just return existing player
      return this.table.players.get(userId)!.player
    }

    if (this.table.players.size >= this.table.options.maxPlayers) {
      throw new Error('Table is full')
    }

    const player: Player = {
      id: String(userId),
      name: username,
      role: 'player',
      chips: 0,
      seatIndex: this.table.nextSeatIndex++,
      isConnected: true,
      status: 'waiting',
      roundBet: 0,
    }

    this.table.players.set(userId, { player, userId, socketId: null })
    this.userTableMap.set(userId, this.table.id)

    return player
  }

  kickPlayer(requestingUserId: number, targetUserId: number): void {
    const table = this.requireTable()
    this.requireAdmin(table, requestingUserId)

    if (!table.players.has(targetUserId)) throw new Error('Player not found')
    if (targetUserId === table.adminUserId) throw new Error('Cannot kick the admin')

    table.players.delete(targetUserId)
    this.userTableMap.delete(targetUserId)
  }

  setChips(requestingUserId: number, targetUserId: number, chips: number): void {
    const table = this.requireTable()
    this.requireAdmin(table, requestingUserId)

    const entry = table.players.get(targetUserId)
    if (!entry) throw new Error('Player not found')
    if (chips < 0) throw new Error('Chips cannot be negative')

    entry.player.chips = chips
  }

  onConnect(userId: number, socketId: string): void {
    const table = this.getTableForUser(userId)
    if (!table) return

    const entry = table.players.get(userId)
    if (entry) {
      entry.socketId = socketId
      entry.player.isConnected = true
    }
  }

  onDisconnect(userId: number): void {
    const table = this.getTableForUser(userId)
    if (!table) return

    const entry = table.players.get(userId)
    if (entry) {
      entry.socketId = null
      entry.player.isConnected = false
    }
  }

  getSocketId(userId: number): string | null {
    const table = this.getTableForUser(userId)
    return table?.players.get(userId)?.socketId ?? null
  }

  getTableInfo(): TableInfo | null {
    if (!this.table) return null
    return {
      id: this.table.id,
      inviteCode: this.table.inviteCode,
      playerCount: this.table.players.size,
      maxPlayers: this.table.options.maxPlayers,
      bigBlind: this.table.options.bigBlind,
      smallBlind: this.table.options.smallBlind,
      phase: 'waiting',
    }
  }

  getPlayers(): Player[] {
    if (!this.table) return []
    return Array.from(this.table.players.values()).map(e => e.player)
  }

  getPlayer(userId: number): Player | undefined {
    const table = this.getTableForUser(userId)
    return table?.players.get(userId)?.player
  }

  isAdmin(userId: number): boolean {
    return this.table?.adminUserId === userId
  }

  getUserRole(userId: number): UserRole | undefined {
    return this.getPlayer(userId)?.role
  }

  private getTableForUser(userId: number): Table | null {
    if (!this.table) return null
    return this.userTableMap.has(userId) ? this.table : null
  }

  private requireTable(): Table {
    if (!this.table) throw new Error('No active table')
    return this.table
  }

  private requireAdmin(table: Table, userId: number): void {
    if (table.adminUserId !== userId) throw new Error('Admin only')
  }
}

export const tableManager = new TableManager()
