import type {
  DecisionActionHistoryEvent,
  DecisionPosition,
  DecisionSnapshot,
  DecisionVisibleState,
  Card,
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
import type { PerceivedOpponentRange } from '../bot-range-estimation'
import type { OpponentLine, StreetAggressionState, BettingStreet } from '../bot-street-analysis'
import type { VariantHandAssessment } from '../bot-variant-evaluation'
import type { ActionIntent, ScoreContribution } from '../bot-decision-types'
import type { BotDecisionTiming } from '../bot-timing'
import type { DisplayCurrency } from '../utils/format'

export const SESSION_DEBUG_SCHEMA = 'cpcdigital.session-debug'
export const SESSION_DEBUG_SCHEMA_VERSION = 1
const SESSION_DEBUG_SCHEMA_VERSION_V2 = 2
export const SESSION_DEBUG_SCHEMA_VERSION_V3 = 3
export const SESSION_DEBUG_SCHEMA_VERSION_V4 = 4
export const SESSION_DEBUG_JSONL_BATCH_BYTES = 256 * 1024

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
    playerStack?: number
    playerStartingStack?: number
    voluntaryHandContribution?: number
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
    potCommitment: number
    forcedAllInRatio: number
    tilt: number
    confidence: number
  }
  action: PlayerAction
  scores: string[]
  perceptionErrors: string[]
  complexity: DecisionComplexity
  timing: BotDecisionTiming
}

export interface CompactBotDebugDecisionV3 extends CompactBotDebugDecision {
  chosenCandidateId: string
  candidates: Array<{
    candidateId: string
    action: PlayerAction
    intent: ActionIntent
    utility: number
    selectionEligible: boolean
    contributions: ScoreContribution[]
  }>
  selectionDiagnostics: DecisionResult['selectionDiagnostics']
  analysis: {
    objectiveHandAssessment: VariantHandAssessment
    perceivedHandAssessment: VariantHandAssessment
    objectiveOpponentRanges: PerceivedOpponentRange[]
    perceivedOpponentRanges: PerceivedOpponentRange[]
    street: {
      preflopAggressor: string | null
      preflopRaiseCount: number
      streetAggression?: Record<BettingStreet, StreetAggressionState>
      opponentLines: OpponentLine[]
    } | null
  }
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

export interface SessionDebugRecordV3 extends Omit<SessionDebugRecordV2, 'schemaVersion' | 'botDecisions'> {
  schemaVersion: typeof SESSION_DEBUG_SCHEMA_VERSION_V3
  botDecisions: CompactBotDebugDecisionV3[]
}

export type CompactContributionV4 = [category: number, label: string, value: number]
export type CompactCandidateV4 = [
  candidateId: string,
  action: PlayerAction,
  intent: ActionIntent,
  utility: number,
  selectionEligible: boolean,
  contributions: CompactContributionV4[],
]
export type CompactRangeV4 = [
  playerId: string,
  strength: PerceivedOpponentRange['strength'],
  summary: string,
  score: number,
  lineScore: number,
  positionAdjustment: number,
  roleAdjustment: number,
  boardFitAdjustment: number,
  pairedBoardRank: number | null,
  tripsRepresentation: number | null,
  baseTripsRepresentation: number | null,
  cardRemovalScale: number | null,
  multiwayScale: number | null,
]

export interface CompactBotDebugDecisionV4 {
  sequence: number
  playerId: string
  playerName: string
  snapshot: {
    phase: string
    hand: string
    board: string
    potOdds: number
    spr: number
    potCommitment: number
    forcedAllInRatio: number
    tilt: number
    confidence: number
  }
  action: PlayerAction
  chosenCandidateId: string
  candidates: CompactCandidateV4[]
  selection: [
    bestUtility: number,
    runnerUpUtility: number | null,
    utilityGap: number | null,
    plausibilityThreshold: number,
    plausibleCandidateCount: number,
  ]
  objectiveHand: VariantHandAssessment
  perceivedHandDelta?: Partial<VariantHandAssessment>
  objectiveRanges: CompactRangeV4[]
  perceivedRangeDeltas?: Array<{
    playerId: string
    changes: Partial<Omit<PerceivedOpponentRange, 'playerId'>>
  }>
  street: {
    preflopAggressor: string | null
    preflopRaiseCount: number
    aggression?: Array<[
      street: BettingStreet,
      aggressiveActionCount: number,
      openingAggressor: string | null,
      lastAggressor: string | null,
      orderedAggressors: string[],
    ]>
    opponentLines: Array<[
      playerId: string,
      positionsFromDealer: number | null,
      positionCategory: string | null,
      preflopRole: string | null,
      preflop: string | null,
      flop: string | null,
      turn: string | null,
      river: string | null,
      preflopPotFraction: number | null,
      flopPotFraction: number | null,
      turnPotFraction: number | null,
      riverPotFraction: number | null,
    ]>
  } | null
  perceptionErrors: Array<[field: string, label: string, actual: number | string | string[], perceived: number | string | string[]]>
  complexity: [
    score: number,
    utilityGap: number | null,
    facingAllIn: boolean,
    chosenAllIn: boolean,
    difficultAllIn: boolean,
    factors: Array<[label: string, value: number]>,
  ]
  timing: [targetReactionMs: number, computationMs: number, remainingDelayMs: number]
}

export interface SessionDebugHandV4 {
  recordType: 'hand'
  handNumber: number
  privateCards: Record<string, Card[]>
  events: HandEvent[]
  botDecisions: CompactBotDebugDecisionV4[]
}

export interface SessionDebugHeaderV4 {
  recordType: 'session'
  schema: typeof SESSION_DEBUG_SCHEMA
  schemaVersion: typeof SESSION_DEBUG_SCHEMA_VERSION_V4
  app: { name: 'CPCdigital'; version: string }
  exportedAt: string
  session: SessionDebugRecordV2['session']
  botProfiles: SessionDebugRecordV2['botProfiles']
  botIdentities: SessionDebugRecordV2['botIdentities']
  encoding: {
    contribution: readonly ['categoryIndex', 'label', 'value']
    scoreCategories: readonly string[]
    candidate: readonly ['candidateId', 'action', 'intent', 'utility', 'selectionEligible', 'contributions']
    selection: readonly ['bestUtility', 'runnerUpUtility', 'utilityGap', 'plausibilityThreshold', 'plausibleCandidateCount']
    range: readonly string[]
    aggression: readonly ['street', 'aggressiveActionCount', 'openingAggressor', 'lastAggressor', 'orderedAggressors']
    opponentLine: readonly string[]
    complexity: readonly ['score', 'utilityGap', 'facingAllIn', 'chosenAllIn', 'difficultAllIn', 'factors']
    timing: readonly ['targetReactionMs', 'computationMs', 'remainingDelayMs']
  }
}

export interface SessionDebugEndV4 {
  recordType: 'end'
  handCount: number
  decisionCount: number
}

export interface SessionDebugExportV4 {
  header: SessionDebugHeaderV4
  hands: readonly SessionDebugHandV4[]
  end: SessionDebugEndV4
}

const SCORE_CATEGORIES = [
  'base',
  'hand-strength',
  'position',
  'board-texture',
  'betting-context',
  'personality',
  'mental-state',
  'opponent-read',
  'skill-perception',
  'strategy',
] as const

const SCORE_CATEGORY_INDEX = new Map(SCORE_CATEGORIES.map((category, index) => [category, index]))

export function createSessionDebugEncodingV4(): SessionDebugHeaderV4['encoding'] {
  return {
    contribution: ['categoryIndex', 'label', 'value'],
    scoreCategories: SCORE_CATEGORIES,
    candidate: ['candidateId', 'action', 'intent', 'utility', 'selectionEligible', 'contributions'],
    selection: ['bestUtility', 'runnerUpUtility', 'utilityGap', 'plausibilityThreshold', 'plausibleCandidateCount'],
    range: [
      'playerId', 'strength', 'summary', 'score', 'lineScore', 'positionAdjustment',
      'roleAdjustment', 'boardFitAdjustment', 'pairedBoardRank', 'tripsRepresentation',
      'baseTripsRepresentation', 'cardRemovalScale', 'multiwayScale',
    ],
    aggression: ['street', 'aggressiveActionCount', 'openingAggressor', 'lastAggressor', 'orderedAggressors'],
    opponentLine: [
      'playerId', 'positionsFromDealer', 'positionCategory', 'preflopRole', 'preflop',
      'flop', 'turn', 'river', 'preflopPotFraction', 'flopPotFraction',
      'turnPotFraction', 'riverPotFraction',
    ],
    complexity: ['score', 'utilityGap', 'facingAllIn', 'chosenAllIn', 'difficultAllIn', 'factors'],
    timing: ['targetReactionMs', 'computationMs', 'remainingDelayMs'],
  }
}

export function compactBotDebugDecisionV4(decision: BotDebugDecision): CompactBotDebugDecisionV4 {
  const selection = decision.decision.selectionDiagnostics
  const street = decision.decision.objectiveStreetAnalysis
  return {
    sequence: decision.sequence,
    playerId: decision.playerId,
    playerName: decision.playerName,
    snapshot: {
      phase: decision.context.publicState.phase,
      hand: decision.context.ownCards.map(card => `${card.rank}${card.suit[0]}`).join(' '),
      board: decision.context.publicState.communityCards.map(card => `${card.rank}${card.suit[0]}`).join(' ') || '-',
      potOdds: roundDiagnostic(decision.metrics.potOdds * 100),
      spr: roundDiagnostic(decision.metrics.spr),
      potCommitment: roundDiagnostic(decision.metrics.potCommitment),
      forcedAllInRatio: roundDiagnostic(decision.metrics.forcedAllInRatio),
      tilt: roundDiagnostic(decision.profile.mentalState.tilt),
      confidence: roundDiagnostic(decision.profile.mentalState.confidence),
    },
    action: decision.decision.action,
    chosenCandidateId: decision.decision.chosenCandidateId,
    candidates: decision.decision.allActions.map(candidate => [
      candidate.candidateId,
      candidate.action,
      candidate.intent,
      roundDiagnostic(candidate.utility),
      candidate.selectionEligible !== false,
      candidate.contributions
        .filter(contribution => contribution.value !== 0)
        .map(contribution => [
          SCORE_CATEGORY_INDEX.get(contribution.category) ?? 0,
          contribution.label,
          roundDiagnostic(contribution.value),
        ]),
    ]),
    selection: [
      roundDiagnostic(selection.bestUtility),
      roundNullable(selection.runnerUpUtility),
      roundNullable(selection.utilityGap),
      roundDiagnostic(selection.plausibilityThreshold),
      selection.plausibleCandidateCount,
    ],
    objectiveHand: roundDiagnosticObject(decision.decision.objectiveHandAssessment),
    perceivedHandDelta: objectDelta(
      decision.decision.objectiveHandAssessment,
      decision.decision.perceivedHandAssessment,
    ),
    objectiveRanges: decision.decision.objectiveOpponentRanges.map(compactRange),
    perceivedRangeDeltas: rangeDeltas(
      decision.decision.objectiveOpponentRanges,
      decision.decision.perceivedOpponentRanges,
    ),
    street: street ? {
      preflopAggressor: street.preflopAggressor,
      preflopRaiseCount: street.preflopRaiseCount,
      aggression: street.streetAggression
        ? (Object.entries(street.streetAggression) as Array<[BettingStreet, StreetAggressionState]>)
            .filter(([, aggression]) => aggression.aggressiveActionCount > 0)
            .map(([streetName, aggression]) => [
              streetName,
              aggression.aggressiveActionCount,
              aggression.openingAggressor,
              aggression.lastAggressor,
              aggression.orderedAggressors,
            ])
        : undefined,
      opponentLines: [...street.opponentLines.values()].map(line => [
        line.playerId,
        line.position?.positionsFromDealer ?? null,
        line.position?.category ?? null,
        line.preflopRole ?? null,
        line.preflop,
        line.flop,
        line.turn,
        line.river,
        roundNullable(line.aggressivePotFractions.preflop),
        roundNullable(line.aggressivePotFractions.flop),
        roundNullable(line.aggressivePotFractions.turn),
        roundNullable(line.aggressivePotFractions.river),
      ]),
    } : null,
    perceptionErrors: decision.decision.perceptionErrors.map(error => [
      error.field,
      error.label,
      roundDiagnosticValue(error.actual),
      roundDiagnosticValue(error.perceived),
    ]),
    complexity: [
      roundDiagnostic(decision.complexity.score),
      roundNullable(decision.complexity.utilityGap),
      decision.complexity.facingAllIn,
      decision.complexity.chosenAllIn,
      decision.complexity.difficultAllIn,
      decision.complexity.factors.map(factor => [factor.label, roundDiagnostic(factor.value)]),
    ],
    timing: [
      roundDiagnostic(decision.timing.targetReactionMs),
      roundDiagnostic(decision.timing.computationMs),
      roundDiagnostic(decision.timing.remainingDelayMs),
    ],
  }
}

function compactRange(range: PerceivedOpponentRange): CompactRangeV4 {
  return [
    range.playerId,
    range.strength,
    range.summary,
    roundDiagnostic(range.score),
    roundDiagnostic(range.lineScore),
    roundDiagnostic(range.positionAdjustment),
    roundDiagnostic(range.roleAdjustment),
    roundDiagnostic(range.boardFitAdjustment),
    roundNullable(range.pairedBoardRank ?? null),
    roundNullable(range.tripsRepresentation ?? null),
    roundNullable(range.baseTripsRepresentation ?? null),
    roundNullable(range.cardRemovalScale ?? null),
    roundNullable(range.multiwayScale ?? null),
  ]
}

function rangeDeltas(
  objective: readonly PerceivedOpponentRange[],
  perceived: readonly PerceivedOpponentRange[],
): CompactBotDebugDecisionV4['perceivedRangeDeltas'] {
  const objectiveByPlayer = new Map(objective.map(range => [range.playerId, range]))
  const deltas: NonNullable<CompactBotDebugDecisionV4['perceivedRangeDeltas']> = []
  for (const range of perceived) {
    const base = objectiveByPlayer.get(range.playerId)
    if (!base) {
      const { playerId: _playerId, ...changes } = roundDiagnosticObject(range)
      deltas.push({ playerId: range.playerId, changes })
      continue
    }
    const changes = objectDelta(base, range) ?? {}
    delete (changes as Partial<PerceivedOpponentRange>).playerId
    if (Object.keys(changes).length > 0) deltas.push({ playerId: range.playerId, changes })
  }
  return deltas.length > 0 ? deltas : undefined
}

function objectDelta<T extends object>(objective: T, perceived: T): Partial<T> | undefined {
  const delta: Partial<T> = {}
  for (const key of Object.keys(perceived) as Array<keyof T>) {
    if (JSON.stringify(objective[key]) !== JSON.stringify(perceived[key])) {
      delta[key] = roundDiagnosticValue(perceived[key]) as T[keyof T]
    }
  }
  return Object.keys(delta).length > 0 ? delta : undefined
}

function roundDiagnostic(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}

function roundNullable(value: number | null): number | null {
  return value == null ? null : roundDiagnostic(value)
}

function roundDiagnosticValue<T>(value: T): T {
  if (typeof value === 'number') return roundDiagnostic(value) as T
  if (Array.isArray(value)) return value.map(item => roundDiagnosticValue(item)) as T
  if (value && typeof value === 'object') return roundDiagnosticObject(value as object) as T
  return value
}

function roundDiagnosticObject<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, roundDiagnosticValue(entry)]),
  ) as T
}

export function *serializeSessionDebugJsonlParts(
  debugExport: SessionDebugExportV4,
  batchBytes = SESSION_DEBUG_JSONL_BATCH_BYTES,
): Generator<string> {
  let batch = ''
  function *records(): Generator<SessionDebugHeaderV4 | SessionDebugHandV4 | SessionDebugEndV4> {
    yield debugExport.header
    yield *debugExport.hands
    yield debugExport.end
  }
  for (const record of records()) {
    const line = `${JSON.stringify(record)}\n`
    if (batch && new Blob([batch, line]).size > batchBytes) {
      yield batch
      batch = ''
    }
    if (new Blob([line]).size > batchBytes) {
      if (batch) yield batch
      batch = ''
      yield line
    } else {
      batch += line
    }
  }
  if (batch) yield batch
}

export function parseSessionDebugJsonl(text: string): SessionDebugExportV4 {
  const records = text.trimEnd().split('\n').map(line => JSON.parse(line) as (
    SessionDebugHeaderV4 | SessionDebugHandV4 | SessionDebugEndV4
  ))
  const header = records[0]
  const end = records.at(-1)
  if (header?.recordType !== 'session' || header.schemaVersion !== SESSION_DEBUG_SCHEMA_VERSION_V4) {
    throw new Error('Invalid or unsupported debug-session header')
  }
  if (end?.recordType !== 'end') throw new Error('Incomplete debug session: end record is missing')
  const hands = records.slice(1, -1)
  if (!hands.every(record => record.recordType === 'hand')) throw new Error('Invalid debug-session record order')
  if (end.handCount !== hands.length) throw new Error('Incomplete debug session: hand count does not match footer')
  const decisionCount = hands.reduce((sum, hand) => sum + hand.botDecisions.length, 0)
  if (end.decisionCount !== decisionCount) throw new Error('Incomplete debug session: decision count does not match footer')
  return { header, hands, end }
}

export function serializeSessionDebugRecord(record: SessionDebugRecord | SessionDebugRecordV2 | SessionDebugRecordV3): string {
  return JSON.stringify(record, null, 2)
}

export function createSessionDebugFilename(exportedAt: string): string {
  const timestamp = exportedAt.replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
  return `cpcdigital-session-debug_${timestamp}.json`
}

export function createSessionDebugJsonlFilename(exportedAt: string): string {
  const timestamp = exportedAt.replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
  return `cpcdigital-session-debug_${timestamp}.jsonl`
}

export function downloadSessionDebugRecord(record: SessionDebugRecord | SessionDebugRecordV2 | SessionDebugRecordV3): void {
  requestTextFileExport({
    data: serializeSessionDebugRecord(record),
    filename: createSessionDebugFilename(record.exportedAt),
    mimeType: 'application/json',
    title: 'CPCdigital Debug-Session',
    dialogTitle: 'Debug-Session exportieren',
  })
}

export function downloadSessionDebugExport(debugExport: SessionDebugExportV4): Promise<void> {
  return requestTextFileExport({
    data: serializeSessionDebugJsonlParts(debugExport),
    filename: createSessionDebugJsonlFilename(debugExport.header.exportedAt),
    mimeType: 'application/x-ndjson',
    title: 'CPCdigital Debug-Session',
    dialogTitle: 'Debug-Session exportieren',
  })
}
