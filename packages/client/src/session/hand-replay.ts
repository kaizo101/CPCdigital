// CPCdigital hand history formatter and replay data.
import type { Card, HandEvent, HandResult, Player } from '@cpc/shared'
import {
  createArchiveId,
  formatLocalTimestamp,
  handReference,
  safeIdSegment,
} from './session-export-metadata'

export interface BotDecisionInfo {
  playerId: string
  playerName?: string
  sequence?: number
  phase?: string
  archetype?: string
  skill?: number
  action: string
  handCategory: string
  handProfile?: string
  chosenCandidateId?: string
  scores: Array<{ candidateId?: string; action: string; utility: number }>
  topContributions: string[]
}

export interface ReplayFrame {
  type: 'action' | 'community' | 'showdown' | 'result'
  phase: string
  actorId?: string
  actorName?: string
  actorCards?: Card[]
  action?: string
  amount?: number  // total bet for display (e.g. "calls 0.09")
  betAmount?: number  // incremental chips added this action (for bet tracking)
  communityCards: Card[]
  pot: number
  playerStacks: Record<string, number>
  playerStatuses: Record<string, string>
  playerBets?: Record<string, number>
  isRevealed: boolean
  index: number
  total: number
}

export interface HandReplay {
  handNumber: number
  sessionId?: string
  sessionStartedAt?: string
  sessionTimeZone?: string
  sessionUtcOffsetMinutes?: number
  /** Canonical UTC timestamp for the start of the hand. */
  date: string
  timeZone?: string
  utcOffsetMinutes?: number
  variant: string
  blinds: { small: number; big: number }
  players: { id: string; name: string; seat: number; chips: number }[]
  dealerId: string
  holeCards: Record<string, Card[]>
  frames: ReplayFrame[]
  results: HandResult[]
  totalPot: number
  pots?: Array<{ potIndex: number; potType: 'main' | 'side'; amount: number }>
  botDecisions: BotDecisionInfo[]
}

export interface HandReplayMetadata {
  sessionId?: string
  sessionStartedAt?: string
  sessionTimeZone?: string
  sessionUtcOffsetMinutes?: number
  startedAt?: string
  timeZone?: string
  utcOffsetMinutes?: number
}

export interface SessionHandHistoryOptions {
  includeDecisions?: boolean
  summaryLines?: readonly string[]
  exportedAt?: string
}

const HAND_REPLAY_ARCHIVE_KEY = 'cpcdigital-hand-history'
const MAX_ARCHIVED_HANDS = 200

export function loadHandReplayArchive(): HandReplay[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(HAND_REPLAY_ARCHIVE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((replay): replay is HandReplay =>
      typeof replay === 'object'
      && replay !== null
      && typeof (replay as HandReplay).handNumber === 'number'
      && Array.isArray((replay as HandReplay).frames)
    ).slice(-MAX_ARCHIVED_HANDS)
  } catch {
    return []
  }
}

export function appendHandReplayToArchive(replay: HandReplay): HandReplay[] {
  const archive = [...loadHandReplayArchive(), replay].slice(-MAX_ARCHIVED_HANDS)
  try {
    localStorage.setItem(HAND_REPLAY_ARCHIVE_KEY, JSON.stringify(archive))
  } catch {
    // The in-memory session replay remains available if storage is unavailable.
  }
  return archive
}

function cardToString(card: Card): string {
  return card.rank + suitSymbol(card.suit)
}

function suitSymbol(suit: string): string {
  switch (suit) {
    case 'spades': return '♠'
    case 'hearts': return '♥'
    case 'diamonds': return '♦'
    case 'clubs': return '♣'
    default: return suit
  }
}

function cardsToString(cards: Card[]): string {
  return cards.map(cardToString).join(' ')
}

function formatAmount(amount: number): string {
  return amount.toFixed(2)
}

function formatVariantName(variantId: string): string {
  switch (variantId) {
    case 'omaha-high': return 'Omaha Pot Limit'
    default: return 'Hold\'em No Limit'
  }
}

/** Generate PokerStars-style text hand history */
export function formatHandHistory(replay: HandReplay): string {
  const lines: string[] = []
  const bb = replay.blinds.big
  const sb = replay.blinds.small

  lines.push(
    `CPCdigital Hand #${replay.handNumber} [${handReference(replay.sessionId, replay.handNumber)}]: ${replay.variant} `
    + `(${formatAmount(sb)}/${formatAmount(bb)}) - ${formatLocalTimestamp(
      replay.date,
      replay.timeZone,
      replay.utcOffsetMinutes,
    )}`
  )
  const dealer = replay.players.find(player => player.id === replay.dealerId)
  lines.push(`Table 'CPCdigital' ${replay.players.length}-max Seat #${(dealer?.seat ?? 0) + 1} is the button`)
  for (const p of replay.players) {
    lines.push(`Seat ${p.seat + 1}: ${p.name} (${formatAmount(p.chips)} in chips)`)
  }

  // Blinds: determine from dealer position
  const playersInOrder = [...replay.players].sort((a, b) => a.seat - b.seat)
  const dealerIdx = playersInOrder.findIndex(p => p.id === replay.dealerId)
  if (dealerIdx >= 0 && playersInOrder.length >= 2) {
    const n = playersInOrder.length
    const sbIdx = n === 2 ? dealerIdx : (dealerIdx + 1) % n
    const bbIdx = n === 2 ? (dealerIdx + 1) % 2 : (dealerIdx + 2) % n
    const sbPlayer = playersInOrder[sbIdx]
    const bbPlayer = playersInOrder[bbIdx]
    if (sbPlayer) lines.push(`${sbPlayer.name}: posts small blind ${formatAmount(sb)}`)
    if (bbPlayer) lines.push(`${bbPlayer.name}: posts big blind ${formatAmount(bb)}`)
  }

  lines.push('*** HOLE CARDS ***')
  for (const [id, cards] of Object.entries(replay.holeCards)) {
    const player = replay.players.find(p => p.id === id)
    const name = player?.name ?? id
    if (name === 'You') {
      lines.push(`Dealt to ${name} [${cardsToString(cards)}]`)
    }
  }

  let currentPhase = 'preflop'
  let accumulatedBoard: Card[] = []

  for (const frame of replay.frames) {
    if (frame.type === 'community') {
      accumulatedBoard.push(...frame.communityCards)
      const boardStr = cardsToString(accumulatedBoard)
      if (frame.phase === 'flop') {
        lines.push(`*** FLOP *** [${boardStr}]`)
        currentPhase = 'flop'
      } else if (frame.phase === 'turn') {
        lines.push(`*** TURN *** [${cardsToString(accumulatedBoard.slice(0, 3))}] [${cardToString(accumulatedBoard[3])}]`)
        currentPhase = 'turn'
      } else if (frame.phase === 'river') {
        lines.push(`*** RIVER *** [${cardsToString(accumulatedBoard.slice(0, 4))}] [${cardToString(accumulatedBoard[4])}]`)
        currentPhase = 'river'
      }
    }

    if (frame.type === 'action' && frame.actorName && frame.action) {
      const name = frame.actorName
      switch (frame.action) {
        case 'fold':
          lines.push(`${name}: folds`)
          break
        case 'check':
          lines.push(`${name}: checks`)
          break
        case 'call':
          lines.push(`${name}: calls ${formatAmount(frame.amount ?? 0)}`)
          break
        case 'raise':
          lines.push(`${name}: raises to ${formatAmount(frame.amount ?? 0)}`)
          break
        case 'bet':
          lines.push(`${name}: bets ${formatAmount(frame.amount ?? 0)}`)
          break
        case 'all-in':
          lines.push(`${name}: raises to ${formatAmount(frame.amount ?? 0)} and is all-in`)
          break
        case 'all-in-call':
          lines.push(`${name}: calls ${formatAmount(frame.amount ?? 0)} and is all-in`)
          break
        case 'all-in-bet':
          lines.push(`${name}: bets ${formatAmount(frame.amount ?? 0)} and is all-in`)
          break
        case 'all-in-raise':
          lines.push(`${name}: raises to ${formatAmount(frame.amount ?? 0)} and is all-in`)
          break
      }
    }

    if (frame.type === 'showdown') {
      if (frame.actorName && frame.actorCards) {
        lines.push(`${frame.actorName}: shows [${cardsToString(frame.actorCards)}]`)
      }
    }

    if (frame.type === 'result' && frame.action === 'uncalled') {
      if (frame.actorName) {
        lines.push(`Uncalled bet (${formatAmount(frame.amount ?? 0)}) returned to ${frame.actorName}`)
      }
    }
  }

  // Summary
  if (replay.results.length > 0) {
    lines.push('*** SUMMARY ***')
    lines.push(`Total pot ${formatAmount(replay.totalPot)} | Rake 0`)
    if (accumulatedBoard.length > 0) {
      lines.push(`Board [${cardsToString(accumulatedBoard)}]`)
    }
    for (const p of replay.players) {
      const playerResults = replay.results.filter(result => result.playerId === p.id)
      if (playerResults.length > 0) {
        const amount = playerResults.reduce((sum, result) => sum + result.amount, 0)
        const handName = playerResults.find(result => result.handName)?.handName
        const hand = handName ? ` (${handName})` : ''
        if (amount > 0) {
          lines.push(`Seat ${p.seat + 1}: ${p.name} collected (${formatAmount(amount)})${hand}`)
        } else {
          lines.push(`Seat ${p.seat + 1}: ${p.name} mucked${hand}`)
        }
      }
    }
  }

  lines.push('')
  return lines.join('\n')
}

export function formatBotDecisionAppendix(
  replay: HandReplay,
  detail: 'full' | 'compact',
): string {
  if (!replay.botDecisions?.length) return ''
  const lines: string[] = [detail === 'full' ? '=== BOT DECISIONS ===' : '--- Bot Decisions ---']
  replay.botDecisions.forEach((decision, index) => {
    const playerName = decision.playerName
      ?? replay.players.find(player => player.id === decision.playerId)?.name
      ?? decision.playerId
    const sequence = decision.sequence ?? index + 1
    const phase = (decision.phase ?? 'unknown').toUpperCase()
    const botMeta = decision.archetype
      ? ` [${decision.archetype}${decision.skill == null ? '' : ` · Skill ${Math.round(decision.skill)}`}]`
      : ''
    const hand = decision.handProfile ?? decision.handCategory
    const headline = `#${sequence} ${phase} · ${playerName}${botMeta} (${hand}): ${decision.action}`

    if (detail === 'compact') {
      const reasons = decision.topContributions.slice(0, 3).map(roundLegacyContribution).join(' | ')
      lines.push(`${headline}${reasons ? ` | ${reasons}` : ''}`)
      return
    }

    lines.push('', headline)
    if (decision.scores.length > 0) {
      lines.push(`  Scores: ${decision.scores.map(score => `${score.action}:${score.utility.toFixed(0)}`).join(' | ')}`)
    }
    if (decision.topContributions.length > 0) {
      lines.push(`  Hauptgründe: ${decision.topContributions.map(roundLegacyContribution).join(', ')}`)
    }
  })
  return lines.join('\n')
}

export function formatSessionHandHistory(
  replays: readonly HandReplay[],
  options: SessionHandHistoryOptions = {},
): string {
  const exportedAt = options.exportedAt ?? new Date().toISOString()
  const groups = groupReplaysBySession(replays)
  const archive = groups.length !== 1 || !groups[0]?.sessionId
  const documentId = archive
    ? createArchiveId(exportedAt)
    : groups[0]?.sessionId ?? createArchiveId(exportedAt)
  const lines: string[] = []

  if (archive) {
    lines.push(`CPCdigital Hand Archive ${documentId}`)
    lines.push(`Sessions: ${groups.length} · Hands: ${replays.length}`)
    lines.push(`Exported: ${exportedAt}`)
  } else {
    lines.push(`CPCdigital Session ${documentId} — ${replays.length} hands`)
    const first = replays[0]
    if (first) {
      lines.push(`Started: ${formatLocalTimestamp(
        first.sessionStartedAt ?? first.date,
        first.sessionTimeZone ?? first.timeZone,
        first.sessionUtcOffsetMinutes ?? first.utcOffsetMinutes,
      )}`)
      lines.push(`Variant: ${distinctLabel(replays.map(replay => replay.variant))}`)
      lines.push(`Blinds: ${distinctLabel(replays.map(replay => (
        `${formatAmount(replay.blinds.small)}/${formatAmount(replay.blinds.big)}`
      )))}`)
    }
    lines.push(...(options.summaryLines ?? []))
    lines.push(...formatBotRoster(replays))
  }
  lines.push('='.repeat(60), '')

  for (const [groupIndex, group] of groups.entries()) {
    if (archive) {
      const first = group.replays[0]
      lines.push(`=== Session ${group.sessionId ?? `Legacy-${groupIndex + 1}`} · ${group.replays.length} hands ===`)
      if (first) lines.push(`Started: ${formatLocalTimestamp(first.date, first.timeZone, first.utcOffsetMinutes)}`)
      lines.push(...formatBotRoster(group.replays), '')
    }
    for (const replay of group.replays) {
      lines.push(formatHandHistory(replay))
      if (options.includeDecisions) {
        const appendix = formatBotDecisionAppendix(replay, 'compact')
        if (appendix) lines.push(appendix, '')
      }
    }
  }
  return lines.join('\n').trimEnd() + '\n'
}

export function createHandHistoryFilename(replay: HandReplay): string {
  return `cpcdigital-hand_${safeIdSegment(handReference(replay.sessionId, replay.handNumber))}.txt`
}

export function createSessionHandHistoryFilename(
  replays: readonly HandReplay[],
  exportedAt = new Date().toISOString(),
): string {
  const groups = groupReplaysBySession(replays)
  if (groups.length === 1 && groups[0].sessionId) {
    return `cpcdigital-session_${safeIdSegment(groups[0].sessionId)}.txt`
  }
  return `cpcdigital-hand-archive_${createArchiveId(exportedAt)}.txt`
}

interface ReplaySessionGroup {
  sessionId?: string
  replays: HandReplay[]
}

function groupReplaysBySession(replays: readonly HandReplay[]): ReplaySessionGroup[] {
  const groups: ReplaySessionGroup[] = []
  let previous: HandReplay | undefined
  for (const replay of replays) {
    const current = groups.at(-1)
    const sameExplicitSession = replay.sessionId != null
      && current?.sessionId === replay.sessionId
    const sameLegacySession = replay.sessionId == null
      && current?.sessionId == null
      && previous != null
      && replay.handNumber > previous.handNumber
    if (!current || (!sameExplicitSession && !sameLegacySession)) {
      groups.push({ sessionId: replay.sessionId, replays: [replay] })
    } else {
      current.replays.push(replay)
    }
    previous = replay
  }
  return groups
}

function formatBotRoster(replays: readonly HandReplay[]): string[] {
  const bots = new Map<string, { name: string; archetype?: string; skill?: number }>()
  for (const replay of replays) {
    for (const decision of replay.botDecisions ?? []) {
      if (bots.has(decision.playerId)) continue
      bots.set(decision.playerId, {
        name: decision.playerName
          ?? replay.players.find(player => player.id === decision.playerId)?.name
          ?? decision.playerId,
        archetype: decision.archetype,
        skill: decision.skill,
      })
    }
  }
  if (bots.size === 0) return []
  return [
    'Bots:',
    ...[...bots.values()].map(bot => (
      `  ${bot.name}${bot.archetype ? ` — ${bot.archetype}` : ''}${bot.skill == null ? '' : ` · Skill ${Math.round(bot.skill)}`}`
    )),
  ]
}

function distinctLabel(values: readonly string[]): string {
  const unique = [...new Set(values)]
  return unique.length === 1 ? unique[0] : `Mixed (${unique.join(', ')})`
}

function roundLegacyContribution(value: string): string {
  return value.replace(/([+-]?\d+(?:\.\d+)?)$/, raw => {
    const numeric = Number(raw)
    if (!Number.isFinite(numeric)) return raw
    const rounded = Number(numeric.toFixed(1))
    return `${rounded > 0 ? '+' : ''}${rounded}`
  })
}

/** Build a HandReplay from the raw hand history and decision snapshots */
export function buildReplayFromSession(
  handNumber: number,
  handEvents: { event: HandEvent }[],
  holeCards: Record<string, Card[]>,
  results: HandResult[],
  playerNames: Map<string, string>,
  botDecisions?: BotDecisionInfo[],
  metadata: HandReplayMetadata = {},
): HandReplay | null {
  const handStart = handEvents.find(e => e.event.type === 'HandStarted')
  if (!handStart || handStart.event.type !== 'HandStarted') return null

  const players = handStart.event.players.map(p => ({
    id: p.playerId,
    name: playerNames.get(p.playerId) ?? p.playerId,
    seat: p.seatIndex,
    chips: p.startingChips,
  }))

  const frames: ReplayFrame[] = []
  let stepIndex = 0
  let lastPot = 0
  const playerStacks = Object.fromEntries(players.map(player => [player.id, player.chips]))
  const playerStatuses = Object.fromEntries(players.map(player => [player.id, 'active']))
  const playerBets = Object.fromEntries(players.map(player => [player.id, 0]))
  const potsByIndex = new Map<number, { potIndex: number; potType: 'main' | 'side'; amount: number }>()
  for (const { event } of handEvents) {
    if (event.type !== 'PotAwarded') continue
    const existing = potsByIndex.get(event.potIndex)
    if (existing) existing.amount += event.amount
    else potsByIndex.set(event.potIndex, {
      potIndex: event.potIndex,
      potType: event.potType,
      amount: event.amount,
    })
  }

  const snapshot = () => ({
    playerStacks: { ...playerStacks },
    playerStatuses: { ...playerStatuses },
    playerBets: { ...playerBets },
  })

  for (const { event } of handEvents) {
    if (event.type === 'BlindPosted') {
      playerStacks[event.playerId] = (playerStacks[event.playerId] ?? 0) - event.amount
      playerBets[event.playerId] = event.totalBet
      lastPot += event.amount
    } else if (event.type === 'PlayerActed') {
      const action = event.action
      let actionLabel: string = action.type
      let amount: number | undefined

      if (action.type === 'raise') {
        actionLabel = event.currentBetBefore === 0 ? 'bet' : 'raise'
        amount = event.totalBet
      } else if (action.type === 'all-in') {
        const aggressive = event.totalBet > event.currentBetBefore
        actionLabel = aggressive
          ? event.currentBetBefore === 0 ? 'all-in-bet' : 'all-in-raise'
          : 'all-in-call'
        amount = aggressive ? event.totalBet : event.amount
      } else if (action.type === 'call') {
        amount = event.amount
      }
      const betAmount = event.amount  // incremental chips committed

      playerStacks[event.playerId] = (playerStacks[event.playerId] ?? 0) - event.amount
      playerBets[event.playerId] = event.totalBet
      if (action.type === 'fold') playerStatuses[event.playerId] = 'folded'
      if (action.type === 'all-in') playerStatuses[event.playerId] = 'all-in'
      lastPot = event.potAfter
      frames.push({
        type: 'action',
        phase: event.phase,
        actorId: event.playerId,
        actorName: playerNames.get(event.playerId) ?? event.playerId,
        actorCards: holeCards[event.playerId] ?? undefined,
        action: actionLabel,
        amount,
        betAmount,
        communityCards: [],
        pot: event.potAfter,
        ...snapshot(),
        isRevealed: false,
        index: stepIndex++,
        total: 0,
      })
    } else if (event.type === 'CommunityCardDealt') {
      for (const playerId of Object.keys(playerBets)) playerBets[playerId] = 0
      frames.push({
        type: 'community',
        phase: event.phase,
        communityCards: event.cards,
        pot: lastPot,
        ...snapshot(),
        isRevealed: false,
        index: stepIndex++,
        total: 0,
      })
    } else if (event.type === 'CardsRevealed') {
      for (const playerId of Object.keys(playerBets)) playerBets[playerId] = 0
      const cards = holeCards[event.playerId]
      frames.push({
        type: 'showdown',
        phase: 'showdown',
        actorId: event.playerId,
        actorName: playerNames.get(event.playerId) ?? event.playerId,
        actorCards: cards ?? undefined,
        communityCards: [],
        pot: lastPot,
        ...snapshot(),
        isRevealed: true,
        index: stepIndex++,
        total: 0,
      })
    } else if (event.type === 'UncalledBetReturned') {
      playerStacks[event.playerId] = (playerStacks[event.playerId] ?? 0) + event.amount
      playerBets[event.playerId] = Math.max(0, (playerBets[event.playerId] ?? 0) - event.amount)
      lastPot = Math.max(0, lastPot - event.amount)
      frames.push({
        type: 'result',
        phase: event.phase,
        action: 'uncalled',
        actorId: event.playerId,
        actorName: playerNames.get(event.playerId) ?? event.playerId,
        amount: event.amount,
        communityCards: [],
        pot: lastPot,
        ...snapshot(),
        isRevealed: false,
        index: stepIndex++,
        total: 0,
      })
    } else if (event.type === 'PotAwarded') {
      playerStacks[event.playerId] = (playerStacks[event.playerId] ?? 0) + event.amount
      for (const playerId of Object.keys(playerBets)) playerBets[playerId] = 0
      lastPot = Math.max(0, lastPot - event.amount)
      frames.push({
        type: 'result',
        phase: 'result',
        action: 'award',
        actorId: event.playerId,
        actorName: playerNames.get(event.playerId) ?? undefined,
        amount: event.amount,
        communityCards: !event.isSplit ? [] : [],
        pot: lastPot,
        ...snapshot(),
        isRevealed: false,
        index: stepIndex++,
        total: 0,
      })
    } else if (event.type === 'HandEnded') {
      lastPot = 0
      frames.push({
        type: 'result',
        phase: 'result',
        communityCards: [],
        pot: 0,
        ...snapshot(),
        isRevealed: false,
        index: stepIndex++,
        total: 0,
      })
    }
  }

  // Set totals
  const totalFrames = frames.length
  for (const f of frames) f.total = totalFrames

  return {
    handNumber,
    sessionId: metadata.sessionId,
    sessionStartedAt: metadata.sessionStartedAt,
    sessionTimeZone: metadata.sessionTimeZone,
    sessionUtcOffsetMinutes: metadata.sessionUtcOffsetMinutes,
    date: metadata.startedAt ?? new Date().toISOString(),
    timeZone: metadata.timeZone,
    utcOffsetMinutes: metadata.utcOffsetMinutes,
    variant: formatVariantName(handStart.event.variantId),
    blinds: { small: handStart.event.smallBlind, big: handStart.event.bigBlind },
    players,
    dealerId: handStart.event.dealerId,
    holeCards,
    frames,
    results,
    totalPot: results.reduce((sum, r) => sum + (r.amount ?? 0), 0),
    pots: [...potsByIndex.values()].sort((left, right) => left.potIndex - right.potIndex),
    botDecisions: botDecisions ?? [],
  }
}
