import type { Card, HandEvent, HandResult, PlayerId } from '@cpc/shared'
import type { GameVariant } from './game-variant'
import { TEXAS_HOLDEM } from './variants/texas-holdem'

export type HandReplayPhase = string

export interface HandReplayPlayerState {
  playerId: PlayerId
  seatIndex: number
  startingChips: number
  chips: number
  roundBet: number
  status: 'active' | 'folded' | 'all-in'
  holeCards: Card[] | null
}

export interface HandReplayState {
  phase: HandReplayPhase
  variantId: string
  dealerId: PlayerId
  smallBlind: number
  bigBlind: number
  players: HandReplayPlayerState[]
  communityCards: Card[]
  pot: number
  currentBet: number
  actingPlayerId: PlayerId | null
  results: HandResult[]
}

export interface HandReplayFrame {
  eventIndex: number
  event: HandEvent
  state: HandReplayState
}

export function replayHand(
  events: readonly HandEvent[],
  variant: GameVariant = TEXAS_HOLDEM,
): HandReplayFrame[] {
  const frames: HandReplayFrame[] = []
  let state: HandReplayState | null = null

  for (const [eventIndex, event] of events.entries()) {
    if (event.type === 'HandStarted') {
      if (eventIndex !== 0 || state !== null) throw new Error('HandStarted must be the first replay event')
      const playerIds = new Set(event.players.map(player => player.playerId))
      if (playerIds.size !== event.players.length) throw new Error('HandStarted contains duplicate players')
      if (!playerIds.has(event.dealerId)) throw new Error('Replay dealer must be part of the hand')
      if (event.variantId !== variant.id) {
        throw new Error(`Replay variant mismatch: expected ${variant.id}, received ${event.variantId}`)
      }

      state = {
        phase: variant.phases[0].id,
        variantId: variant.id,
        dealerId: event.dealerId,
        smallBlind: event.smallBlind,
        bigBlind: event.bigBlind,
        players: event.players.map(player => ({
          ...player,
          chips: player.startingChips,
          roundBet: 0,
          status: 'active',
          holeCards: null,
        })),
        communityCards: [],
        pot: 0,
        currentBet: 0,
        actingPlayerId: null,
        results: [],
      }
      frames.push({ eventIndex, event, state: cloneReplayState(state) })
      continue
    }

    if (!state) throw new Error('Replay history must start with HandStarted')
    if (state.phase === 'complete') throw new Error('Replay contains events after HandEnded')

    switch (event.type) {
      case 'BlindPosted': {
        assertPhase(state, event.phase)
        const player = getReplayPlayer(state, event.playerId)
        commitChips(player, event.amount)
        player.roundBet = event.totalBet
        if (player.chips === 0) player.status = 'all-in'
        state.pot = roundMoney(state.pot + event.amount)
        state.currentBet = event.blindType === 'big'
          ? state.bigBlind
          : Math.max(state.currentBet, event.totalBet)
        state.actingPlayerId = event.playerId
        break
      }
      case 'PlayerActed': {
        assertPhase(state, event.phase)
        const player = getReplayPlayer(state, event.playerId)
        commitChips(player, event.amount)
        player.roundBet = event.totalBet
        state.pot = event.potAfter
        state.actingPlayerId = event.playerId

        if (event.action.type === 'fold') {
          player.status = 'folded'
        } else if (player.chips === 0 || event.action.type === 'all-in') {
          player.status = 'all-in'
        }

        if (event.action.type === 'raise') state.currentBet = event.totalBet
        if (event.action.type === 'all-in' && event.totalBet > state.currentBet) {
          state.currentBet = event.totalBet
        }
        break
      }
      case 'CommunityCardDealt': {
        assertNextPhase(state.phase, event.phase, variant)
        state.phase = event.phase
        state.communityCards.push(...event.cards.map(cloneCard))
        state.currentBet = 0
        state.actingPlayerId = null
        for (const player of state.players) player.roundBet = 0
        break
      }
      case 'UncalledBetReturned': {
        assertPhase(state, event.phase)
        const player = getReplayPlayer(state, event.playerId)
        player.chips = roundMoney(player.chips + event.amount)
        player.roundBet = roundMoney(Math.max(0, player.roundBet - event.amount))
        if (player.status === 'all-in' && player.chips > 0) player.status = 'active'
        state.pot = roundMoney(Math.max(0, state.pot - event.amount))
        state.currentBet = Math.max(0, ...state.players.map(candidate => candidate.roundBet))
        state.actingPlayerId = event.playerId
        break
      }
      case 'CardsRevealed': {
        const player = getReplayPlayer(state, event.playerId)
        player.holeCards = event.cards.map(cloneCard) as Card[]
        state.phase = 'showdown'
        state.actingPlayerId = event.playerId
        for (const candidate of state.players) candidate.roundBet = 0
        break
      }
      case 'PotAwarded': {
        const player = getReplayPlayer(state, event.playerId)
        player.chips = roundMoney(player.chips + event.amount)
        state.pot = roundMoney(Math.max(0, state.pot - event.amount))
        state.phase = 'showdown'
        state.actingPlayerId = event.playerId
        state.results.push({ playerId: event.playerId, amount: event.amount, handName: event.handName })
        break
      }
      case 'HandEnded': {
        state.phase = 'complete'
        state.pot = 0
        state.currentBet = 0
        state.actingPlayerId = null
        state.results = event.results.map(result => ({ ...result }))
        for (const player of state.players) player.roundBet = 0
        break
      }
    }

    frames.push({ eventIndex, event, state: cloneReplayState(state) })
  }

  return frames
}

function getReplayPlayer(state: HandReplayState, playerId: PlayerId): HandReplayPlayerState {
  const player = state.players.find(candidate => candidate.playerId === playerId)
  if (!player) throw new Error(`Replay event references unknown player ${playerId}`)
  return player
}

function commitChips(player: HandReplayPlayerState, amount: number): void {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Replay chip amount must be finite and non-negative')
  if (amount > player.chips) throw new Error(`Replay action exceeds stack for player ${player.playerId}`)
  player.chips = roundMoney(player.chips - amount)
}

function assertPhase(state: HandReplayState, phase: string): void {
  if (state.phase !== phase) throw new Error(`Replay phase mismatch: expected ${state.phase}, received ${phase}`)
}

function assertNextPhase(current: HandReplayPhase, next: string, variant: GameVariant): void {
  const currentIndex = variant.phases.findIndex(phase => phase.id === current)
  const expected = currentIndex >= 0 ? variant.phases[currentIndex + 1]?.id : null
  if (next !== expected) throw new Error(`Invalid replay phase transition from ${current} to ${next}`)
}

function cloneReplayState(state: HandReplayState): HandReplayState {
  return {
    ...state,
    players: state.players.map(player => ({
      ...player,
      holeCards: player.holeCards?.map(cloneCard) as Card[] | null,
    })),
    communityCards: state.communityCards.map(cloneCard),
    results: state.results.map(result => ({ ...result })),
  }
}

function cloneCard(card: Card): Card {
  return { ...card }
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100
}
