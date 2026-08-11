import type { PlayerAction } from '@cpc/shared'
import type { HandStrengthCategory } from './bot-variant-evaluation'

export type PostflopStreet = 'flop' | 'turn' | 'river'
export type ShowdownPath = 'all-in' | 'call-down' | 'aggressor-to-showdown' | 'check-down'
export type ShowdownRole = 'pfa' | 'non-pfa'
export type OpponentBucket = 'heads-up' | 'three-way' | 'multiway'
export type PriceBand = 'cheap-0-10' | 'normal-10-25' | 'expensive-25-40' | 'very-expensive-40+'

export interface FoldExit {
  street: PostflopStreet
  role: ShowdownRole
  category: HandStrengthCategory | 'unknown'
  priceBand: PriceBand
  opponentBucket: OpponentBucket
}

export interface ShowdownSegment {
  playerId: string
  role: ShowdownRole
  opponentBucket: OpponentBucket
}

export interface ShowdownPathResult extends ShowdownSegment {
  path: ShowdownPath
}

export interface ShowdownHandSummary {
  flopSeen: ShowdownSegment[]
  showdowns: ShowdownPathResult[]
  foldExits: FoldExit[]
}

export function opponentBucket(activeOpponents: number): OpponentBucket {
  if (activeOpponents <= 1) return 'heads-up'
  if (activeOpponents === 2) return 'three-way'
  return 'multiway'
}

export function priceBand(potOdds: number): PriceBand {
  if (potOdds <= 0.1) return 'cheap-0-10'
  if (potOdds <= 0.25) return 'normal-10-25'
  if (potOdds <= 0.4) return 'expensive-25-40'
  return 'very-expensive-40+'
}

export class CalibrationShowdownHandTracker {
  private readonly flopSeen = new Map<string, Omit<ShowdownSegment, 'playerId'>>()
  private readonly allInPlayers = new Set<string>()
  private readonly postflopCallers = new Set<string>()
  private readonly postflopAggressors = new Set<string>()
  private readonly foldExits: FoldExit[] = []

  recordFlopSeen(playerId: string, role: ShowdownRole, activeOpponents: number): void {
    if (this.flopSeen.has(playerId)) return
    this.flopSeen.set(playerId, { role, opponentBucket: opponentBucket(activeOpponents) })
  }

  recordAction(observation: {
    playerId: string
    phase: string
    action: PlayerAction
    role: ShowdownRole
    category: HandStrengthCategory | null
    potOdds: number
    activeOpponents: number
  }): void {
    const { playerId, phase, action } = observation
    if (action.type === 'all-in') this.allInPlayers.add(playerId)
    if (phase === 'preflop' || phase === 'waiting' || phase === 'showdown') return

    if (action.type === 'call') this.postflopCallers.add(playerId)
    if (action.type === 'raise') this.postflopAggressors.add(playerId)
    if (action.type === 'fold') {
      this.foldExits.push({
        street: phase as PostflopStreet,
        role: observation.role,
        category: observation.category ?? 'unknown',
        priceBand: priceBand(observation.potOdds),
        opponentBucket: opponentBucket(observation.activeOpponents),
      })
    }
  }

  summarize(
    revealedPlayerIds: Iterable<string>,
    preflopAggressorId: string | null,
  ): ShowdownHandSummary {
    const revealed = new Set(revealedPlayerIds)
    const fallbackOpponents = Math.max(1, revealed.size - 1)

    // Preflop all-ins can be revealed without ever producing a postflop action.
    for (const playerId of revealed) {
      this.recordFlopSeen(
        playerId,
        playerId === preflopAggressorId ? 'pfa' : 'non-pfa',
        fallbackOpponents,
      )
    }

    const flopSeen = [...this.flopSeen].map(([playerId, segment]) => ({ playerId, ...segment }))
    const showdowns = [...revealed].map(playerId => {
      const segment = this.flopSeen.get(playerId)!
      const path: ShowdownPath = this.allInPlayers.has(playerId)
        ? 'all-in'
        : this.postflopCallers.has(playerId)
          ? 'call-down'
          : this.postflopAggressors.has(playerId)
            ? 'aggressor-to-showdown'
            : 'check-down'
      return { playerId, ...segment, path }
    })

    return { flopSeen, showdowns, foldExits: [...this.foldExits] }
  }
}

interface SegmentCounts {
  flopSeen: number
  showdowns: number
}

export class CalibrationShowdownDiagnostics {
  readonly paths: Record<ShowdownPath, number> = {
    'all-in': 0,
    'call-down': 0,
    'aggressor-to-showdown': 0,
    'check-down': 0,
  }

  readonly byRole: Record<ShowdownRole, SegmentCounts> = {
    pfa: { flopSeen: 0, showdowns: 0 },
    'non-pfa': { flopSeen: 0, showdowns: 0 },
  }

  readonly byOpponents: Record<OpponentBucket, SegmentCounts> = {
    'heads-up': { flopSeen: 0, showdowns: 0 },
    'three-way': { flopSeen: 0, showdowns: 0 },
    multiway: { flopSeen: 0, showdowns: 0 },
  }

  private readonly foldExitCounts = new Map<string, number>()

  recordHand(summary: ShowdownHandSummary): void {
    for (const player of summary.flopSeen) {
      this.byRole[player.role].flopSeen++
      this.byOpponents[player.opponentBucket].flopSeen++
    }
    for (const player of summary.showdowns) {
      this.paths[player.path]++
      this.byRole[player.role].showdowns++
      this.byOpponents[player.opponentBucket].showdowns++
    }
    for (const exit of summary.foldExits) {
      const key = [exit.street, exit.role, exit.category, exit.priceBand, exit.opponentBucket].join('|')
      this.foldExitCounts.set(key, (this.foldExitCounts.get(key) ?? 0) + 1)
    }
  }

  foldExits(): Array<{ key: string; count: number }> {
    return [...this.foldExitCounts]
      .map(([key, count]) => ({ key, count }))
      .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
  }

  violations(expectedFlopSeen: number, expectedShowdowns: number): string[] {
    const pathTotal = Object.values(this.paths).reduce((sum, count) => sum + count, 0)
    const roleFlopTotal = Object.values(this.byRole).reduce((sum, segment) => sum + segment.flopSeen, 0)
    const roleShowdownTotal = Object.values(this.byRole).reduce((sum, segment) => sum + segment.showdowns, 0)
    const fieldFlopTotal = Object.values(this.byOpponents).reduce((sum, segment) => sum + segment.flopSeen, 0)
    const fieldShowdownTotal = Object.values(this.byOpponents).reduce((sum, segment) => sum + segment.showdowns, 0)
    const violations: string[] = []
    if (pathTotal !== expectedShowdowns) violations.push('showdown paths do not conserve showdowns')
    if (roleFlopTotal !== expectedFlopSeen) violations.push('role segments do not conserve flop participants')
    if (roleShowdownTotal !== expectedShowdowns) violations.push('role segments do not conserve showdowns')
    if (fieldFlopTotal !== expectedFlopSeen) violations.push('opponent segments do not conserve flop participants')
    if (fieldShowdownTotal !== expectedShowdowns) violations.push('opponent segments do not conserve showdowns')
    return violations
  }
}
