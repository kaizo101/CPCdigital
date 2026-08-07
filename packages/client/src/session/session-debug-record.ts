import type {
  DecisionActionHistoryEvent,
  DecisionPosition,
  DecisionSnapshot,
  DecisionVisibleState,
  HandEvent,
  HandResult,
  Player,
  PlayerAction,
  PublicGameState,
  TableOptions,
} from '@cpc/shared'
import { requestTextFileExport } from '../utils/file-export'
import type { BotDebugDecision, BotDebugProfile } from '../bot-debug'
import type { BotIdentity } from '../bot-identities'
import type { DecisionComplexity } from '../bot-decision-complexity'
import type { DecisionResult } from '../bot-pipeline'
import type { BotDecisionTiming } from '../bot-timing'
import type { DisplayCurrency } from '../utils/format'

export const SESSION_DEBUG_SCHEMA = 'cpcdigital.session-debug'
export const SESSION_DEBUG_SCHEMA_VERSION = 1
const SESSION_DEBUG_SCHEMA_VERSION_V2 = 2

export interface SessionHistoryEvent {
  handNumber: number
  event: HandEvent
}

export interface SessionDecisionSnapshot {
  handNumber: number
  snapshot: DecisionSnapshot
}

export interface SessionDebugRecord {
  schema: typeof SESSION_DEBUG_SCHEMA
  schemaVersion: typeof SESSION_DEBUG_SCHEMA_VERSION
  app: {
    name: 'CPCdigital'
    version: string
  }
  exportedAt: string
  session: {
    startedAt: string
    currentHandNumber: number
    displayCurrency: DisplayCurrency
    config: TableOptions
    players: Player[]
    currentGameState: PublicGameState | null
    lastResults: HandResult[] | null
    pendingRebuyPlayerIds: string[]
  }
  botProfiles: Array<{
    playerId: string
    profile: BotDebugProfile
  }>
  botIdentities: Array<{
    playerId: string
    identity: BotIdentity
  }>
  history: SessionHistoryEvent[]
  decisionSnapshots: SessionDecisionSnapshot[]
  botDecisions: BotDebugDecision[]
}

export interface CompactDecisionSnapshot {
  decisionIndex: number
  handNumber: number
  playerId: string
  visibleState: DecisionVisibleState
  ownCards: { rank: string; suit: string }[]
  bettingContext: {
    playerId: string
    legalActions: {
      fold: boolean
      check: boolean
      callAmount: number | null
      raise: { minAmount: number; maxAmount: number } | null
      allInAmount: number | null
    }
    totalPot: number
    effectiveStack: number
    toCall: number
    minRaiseTo: number
    maxRaiseTo: number
    spr: number
    potOdds: number
  }
  position: DecisionPosition
  newActionHistoryEvents: DecisionActionHistoryEvent[]
  chosenAction: PlayerAction
  source: 'player' | 'forced'
}

export interface CompactBotDebugDecision {
  sequence: number
  handNumber: number
  playerId: string
  playerName: string
  snapshot: {
    phase: string
    hand: string
    board: string
    potOdds: number
    spr: number
    tilt: number
    confidence: number
  }
  action: PlayerAction
  scores: string[]
  perceptionErrors: string[]
  complexity: DecisionComplexity
  timing: BotDecisionTiming
}

export interface SessionDebugRecordV2 {
  schema: 'cpcdigital.session-debug'
  schemaVersion: 2
  app: {
    name: 'CPCdigital'
    version: string
  }
  exportedAt: string
  session: {
    startedAt: string
    currentHandNumber: number
    displayCurrency: DisplayCurrency
    config: TableOptions
    players: Player[]
    currentGameState: PublicGameState | null
    lastResults: HandResult[] | null
    pendingRebuyPlayerIds: string[]
  }
  botProfiles: Array<{
    playerId: string
    profile: BotDebugProfile
  }>
  botIdentities: Array<{
    playerId: string
    identity: BotIdentity
  }>
  history: SessionHistoryEvent[]
  decisionSnapshots: CompactDecisionSnapshot[]
  botDecisions: CompactBotDebugDecision[]
}

export function serializeSessionDebugRecord(record: SessionDebugRecord | SessionDebugRecordV2): string {
  return JSON.stringify(record, null, 2)
}

export function createSessionDebugFilename(exportedAt: string): string {
  const timestamp = exportedAt.replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
  return `cpcdigital-session-debug_${timestamp}.json`
}

export function downloadSessionDebugRecord(record: SessionDebugRecord | SessionDebugRecordV2): void {
  requestTextFileExport({
    data: serializeSessionDebugRecord(record),
    filename: createSessionDebugFilename(record.exportedAt),
    mimeType: 'application/json',
    title: 'CPCdigital Debug-Session',
    dialogTitle: 'Debug-Session exportieren',
  })
}
