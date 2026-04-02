import type { Card, GamePhase, GameState, HandResult, Player, PlayerAction, PlayerId } from '@cpc/shared'
import { createDeck, dealCards, shuffleDeck } from './deck.js'
import { evaluateHand, findWinnerIndices } from './hand-evaluator.js'
import { calculateSidePots } from './side-pot.js'

export interface GameConfig {
  bigBlind: number
  smallBlind: number
}

export type HandEvent =
  | { type: 'BlindPosted'; playerId: PlayerId; amount: number; blindType: 'small' | 'big' }
  | { type: 'PlayerActed'; playerId: PlayerId; action: PlayerAction }
  | { type: 'CommunityCardDealt'; cards: Card[] }
  | { type: 'PotAwarded'; playerId: PlayerId; amount: number; handName: string }

/**
 * Core Texas Hold'em state machine. Pure logic — no IO.
 *
 * Lifecycle:
 *   new PokerGame(players, config)
 *   game.startHand()          → deals cards, posts blinds, sets currentPlayerId
 *   game.applyAction(id, act) → validates + advances state
 *   ... repeat until phase === 'waiting'
 *   game.startHand()          → next hand
 */
export class PokerGame {
  private deck: Card[] = []
  private holeCards = new Map<PlayerId, [Card, Card]>()
  private handHistory: HandEvent[] = []
  private lastHandResults: HandResult[] = []

  // Betting round internals (not exposed in GameState)
  private currentBet = 0
  private minRaise = 0
  private roundBets = new Map<PlayerId, number>()    // reset each street
  private totalHandBets = new Map<PlayerId, number>() // accumulates whole hand (for side pots)
  private foldedPlayers = new Set<PlayerId>()
  private allInPlayers = new Set<PlayerId>()
  private bettingQueue: PlayerId[] = []              // ordered queue: next to act = [0]

  private state: GameState

  constructor(players: Player[], private config: GameConfig) {
    this.state = {
      phase: 'waiting',
      players: players.map(p => ({ ...p, status: 'waiting', roundBet: 0 })),
      communityCards: [],
      pot: 0,
      sidePots: [],
      currentPlayerId: null,
      dealerIndex: 0,
      bigBlind: config.bigBlind,
      smallBlind: config.smallBlind,
      currentBet: 0,
      minRaise: config.bigBlind,
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  getState(): Readonly<GameState> { return this.state }
  getHoleCards(playerId: PlayerId): [Card, Card] | undefined { return this.holeCards.get(playerId) }
  getHandHistory(): readonly HandEvent[] { return this.handHistory }
  getLastHandResults(): HandResult[] { return this.lastHandResults }

  setPlayerChips(playerId: PlayerId, chips: number): void {
    if (this.state.phase !== 'waiting') throw new Error('Cannot change chips during a hand')
    this.mutatePlayer(playerId, p => ({ ...p, chips }))
  }

  upsertPlayer(player: Player): void {
    if (this.state.phase !== 'waiting') throw new Error('Cannot modify players during a hand')
    const exists = this.state.players.some(p => p.id === player.id)
    this.state = {
      ...this.state,
      players: exists
        ? this.state.players.map(p => p.id === player.id ? { ...player, status: 'waiting', roundBet: 0 } : p)
        : [...this.state.players, { ...player, status: 'waiting', roundBet: 0 }],
    }
  }

  removePlayer(playerId: PlayerId): void {
    if (this.state.phase !== 'waiting') throw new Error('Cannot remove players during a hand')
    this.state = { ...this.state, players: this.state.players.filter(p => p.id !== playerId) }
  }

  startHand(): void {
    if (this.state.phase !== 'waiting') throw new Error('Hand already in progress')
    const eligible = this.state.players.filter(p => p.chips > 0)
    if (eligible.length < 2) throw new Error('Need at least 2 players with chips')

    this.deck = shuffleDeck(createDeck())
    this.holeCards.clear()
    this.handHistory = []
    this.lastHandResults = []
    this.foldedPlayers.clear()
    this.allInPlayers.clear()
    this.roundBets.clear()
    this.totalHandBets.clear()
    this.currentBet = 0
    this.minRaise = this.config.bigBlind

    const newDealerIndex = this.advanceDealerIndex(eligible)

    this.state = {
      ...this.state,
      phase: 'preflop',
      communityCards: [],
      pot: 0,
      sidePots: [],
      currentBet: 0,
      minRaise: this.config.bigBlind,
      dealerIndex: newDealerIndex,
      players: this.state.players.map(p => ({
        ...p,
        status: p.chips > 0 ? 'active' as const : 'waiting' as const,
        roundBet: 0,
      })),
    }

    for (const player of this.getInHandPlayers()) {
      const [cards, remaining] = dealCards(this.deck, 2)
      this.holeCards.set(player.id, cards as [Card, Card])
      this.deck = remaining
    }

    this.postBlinds()
  }

  applyAction(playerId: PlayerId, action: PlayerAction): void {
    if (this.state.phase === 'waiting' || this.state.phase === 'showdown') {
      throw new Error('No active betting round')
    }
    if (this.state.currentPlayerId !== playerId) throw new Error('Not your turn')

    const player = this.findPlayer(playerId)
    if (!player) throw new Error('Player not found')
    if (this.foldedPlayers.has(playerId)) throw new Error('Already folded')
    if (this.allInPlayers.has(playerId)) throw new Error('Already all-in')

    const alreadyBet = this.roundBets.get(playerId) ?? 0
    const toCall = this.currentBet - alreadyBet

    switch (action.type) {
      case 'fold': {
        this.foldedPlayers.add(playerId)
        this.setStatus(playerId, 'folded')
        break
      }
      case 'check': {
        if (toCall > 0) throw new Error('Cannot check — there is a bet to call')
        break
      }
      case 'call': {
        if (toCall <= 0) throw new Error('Nothing to call — use check')
        const callAmt = Math.min(toCall, player.chips)
        this.placeBet(playerId, callAmt)
        if (this.findPlayer(playerId)!.chips === 0) {
          this.allInPlayers.add(playerId)
          this.setStatus(playerId, 'all-in')
        }
        break
      }
      case 'raise': {
        const { amount } = action // total round bet after raise
        if (amount < this.currentBet + this.minRaise) {
          throw new Error(`Minimum raise to ${this.currentBet + this.minRaise}`)
        }
        const additional = amount - alreadyBet
        if (additional > player.chips) throw new Error('Not enough chips')
        this.minRaise = amount - this.currentBet
        this.currentBet = amount
        this.placeBet(playerId, additional)
        this.reopenBettingAfterRaise(playerId)
        break
      }
      case 'all-in': {
        const chips = player.chips
        const newTotal = alreadyBet + chips
        if (newTotal > this.currentBet) {
          this.minRaise = Math.max(newTotal - this.currentBet, this.config.bigBlind)
          this.currentBet = newTotal
          this.reopenBettingAfterRaise(playerId)
        }
        this.placeBet(playerId, chips)
        this.allInPlayers.add(playerId)
        this.setStatus(playerId, 'all-in')
        break
      }
    }

    this.handHistory.push({ type: 'PlayerActed', playerId, action })
    this.advanceAction()
  }

  // ---------------------------------------------------------------------------
  // Blinds
  // ---------------------------------------------------------------------------

  private postBlinds(): void {
    const inHand = this.getInHandPlayers()
    const n = inHand.length
    const dealerIdx = this.dealerIdxInHand(inHand)

    let sbIdx: number, bbIdx: number, firstActIdx: number
    if (n === 2) {
      sbIdx = dealerIdx
      bbIdx = (dealerIdx + 1) % 2
      firstActIdx = dealerIdx // heads-up: dealer/SB acts first preflop
    } else {
      sbIdx = (dealerIdx + 1) % n
      bbIdx = (dealerIdx + 2) % n
      firstActIdx = (dealerIdx + 3) % n
    }

    const sb = inHand[sbIdx]
    const bb = inHand[bbIdx]

    const sbAmt = Math.min(this.config.smallBlind, sb.chips)
    this.placeBet(sb.id, sbAmt)
    if (this.findPlayer(sb.id)!.chips === 0) { this.allInPlayers.add(sb.id); this.setStatus(sb.id, 'all-in') }
    this.handHistory.push({ type: 'BlindPosted', playerId: sb.id, amount: sbAmt, blindType: 'small' })

    const bbAmt = Math.min(this.config.bigBlind, bb.chips)
    this.placeBet(bb.id, bbAmt)
    if (this.findPlayer(bb.id)!.chips === 0) { this.allInPlayers.add(bb.id); this.setStatus(bb.id, 'all-in') }
    this.currentBet = bbAmt
    this.minRaise = this.config.bigBlind
    this.handHistory.push({ type: 'BlindPosted', playerId: bb.id, amount: bbAmt, blindType: 'big' })

    // Build queue: starts at firstActIdx, wraps around, ends with BB (who has option)
    const canBetSet = new Set(this.getCanBetPlayers().map(p => p.id))
    const queue: PlayerId[] = []
    for (let i = 0; i < n; i++) {
      const p = inHand[(firstActIdx + i) % n]
      if (canBetSet.has(p.id)) queue.push(p.id)
    }
    this.bettingQueue = queue
    this.syncCurrentPlayer()
  }

  // ---------------------------------------------------------------------------
  // Action advancement
  // ---------------------------------------------------------------------------

  private advanceAction(): void {
    this.bettingQueue.shift()

    if (this.getInHandPlayers().length === 1) {
      this.awardUncontestedPot()
      return
    }

    if (this.bettingQueue.length === 0) {
      this.endBettingRound()
    } else {
      this.syncCurrentPlayer()
    }
  }

  private reopenBettingAfterRaise(raiserId: PlayerId): void {
    const canBet = new Set(this.getCanBetPlayers().map(p => p.id))
    canBet.delete(raiserId)
    const inQueue = new Set(this.bettingQueue)
    const needToReact = this.getInHandPlayers()
      .map(p => p.id)
      .filter(id => !inQueue.has(id) && id !== raiserId && canBet.has(id))
    this.bettingQueue.push(...needToReact)
  }

  private endBettingRound(): void {
    this.collectBetsIntoPot()

    if (this.getInHandPlayers().length === 1) {
      this.awardUncontestedPot()
      return
    }

    const everyoneAllIn = this.getCanBetPlayers().length <= 1

    switch (this.state.phase) {
      case 'preflop':
        this.dealCommunity(3)
        if (everyoneAllIn) { this.dealCommunity(1); this.dealCommunity(1); this.showdown() }
        else this.startBettingRound('flop')
        break
      case 'flop':
        this.dealCommunity(1)
        if (everyoneAllIn) { this.dealCommunity(1); this.showdown() }
        else this.startBettingRound('turn')
        break
      case 'turn':
        this.dealCommunity(1)
        if (everyoneAllIn) this.showdown()
        else this.startBettingRound('river')
        break
      case 'river':
        this.showdown()
        break
    }
  }

  private startBettingRound(phase: GamePhase): void {
    this.roundBets.clear()
    this.currentBet = 0
    this.minRaise = this.config.bigBlind

    this.state = {
      ...this.state,
      phase,
      currentBet: 0,
      minRaise: this.config.bigBlind,
      players: this.state.players.map(p => ({ ...p, roundBet: 0 })),
    }

    const inHand = this.getInHandPlayers()
    const canBet = new Set(this.getCanBetPlayers().map(p => p.id))
    const dealerIdx = this.dealerIdxInHand(inHand)
    const n = inHand.length

    const queue: PlayerId[] = []
    for (let i = 1; i <= n; i++) {
      const p = inHand[(dealerIdx + i) % n]
      if (canBet.has(p.id)) queue.push(p.id)
    }

    if (queue.length === 0) { this.endBettingRound(); return }
    this.bettingQueue = queue
    this.syncCurrentPlayer()
  }

  // ---------------------------------------------------------------------------
  // Showdown & pot award
  // ---------------------------------------------------------------------------

  private showdown(): void {
    this.state = { ...this.state, phase: 'showdown', currentPlayerId: null }

    const sidePots = calculateSidePots(
      this.state.players
        .filter(p => p.status !== 'waiting')
        .map(p => ({
          playerId: p.id,
          totalBet: this.totalHandBets.get(p.id) ?? 0,
          inHand: !this.foldedPlayers.has(p.id),
        }))
    )

    const awards: HandResult[] = []

    for (const pot of sidePots) {
      const { eligiblePlayerIds, amount } = pot
      if (eligiblePlayerIds.length === 0) continue

      if (eligiblePlayerIds.length === 1) {
        awards.push({ playerId: eligiblePlayerIds[0], amount, handName: '' })
        continue
      }

      const community = this.state.communityCards
      const handsToEval = eligiblePlayerIds.map(id => ({
        holeCards: this.holeCards.get(id)!,
        communityCards: community,
      }))
      const winnerIdxs = findWinnerIndices(handsToEval)
      const share = Math.floor(amount / winnerIdxs.length)
      let remainder = amount - share * winnerIdxs.length

      for (const idx of winnerIdxs) {
        const pid = eligiblePlayerIds[idx]
        const handName = evaluateHand(this.holeCards.get(pid)!, community).name
        const award = share + (remainder > 0 ? 1 : 0)
        remainder = Math.max(0, remainder - 1)
        awards.push({ playerId: pid, amount: award, handName })
      }
    }

    for (const award of awards) {
      this.mutatePlayer(award.playerId, p => ({ ...p, chips: p.chips + award.amount }))
      this.handHistory.push({ type: 'PotAwarded', ...award })
    }

    this.lastHandResults = awards
    this.endHand()
  }

  private awardUncontestedPot(): void {
    this.collectBetsIntoPot()
    const winner = this.getInHandPlayers()[0]
    this.mutatePlayer(winner.id, p => ({ ...p, chips: p.chips + this.state.pot }))
    const award = { playerId: winner.id, amount: this.state.pot, handName: '' }
    this.handHistory.push({ type: 'PotAwarded', ...award })
    this.lastHandResults = [award]
    this.endHand()
  }

  private endHand(): void {
    this.state = {
      ...this.state,
      phase: 'waiting',
      pot: 0,
      sidePots: [],
      currentPlayerId: null,
      players: this.state.players.map(p => ({ ...p, roundBet: 0 })),
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private dealCommunity(count: number): void {
    const [cards, remaining] = dealCards(this.deck, count)
    this.deck = remaining
    this.handHistory.push({ type: 'CommunityCardDealt', cards })
    this.state = { ...this.state, communityCards: [...this.state.communityCards, ...cards] }
  }

  private placeBet(playerId: PlayerId, amount: number): void {
    const player = this.findPlayer(playerId)!
    const actual = Math.min(amount, player.chips)
    const newRound = (this.roundBets.get(playerId) ?? 0) + actual
    const newTotal = (this.totalHandBets.get(playerId) ?? 0) + actual
    this.roundBets.set(playerId, newRound)
    this.totalHandBets.set(playerId, newTotal)
    this.mutatePlayer(playerId, p => ({ ...p, chips: p.chips - actual, roundBet: newRound }))
  }

  private collectBetsIntoPot(): void {
    const total = [...this.roundBets.values()].reduce((a, b) => a + b, 0)
    this.roundBets.clear()
    this.state = {
      ...this.state,
      pot: this.state.pot + total,
      players: this.state.players.map(p => ({ ...p, roundBet: 0 })),
    }
  }

  private syncCurrentPlayer(): void {
    this.state = {
      ...this.state,
      currentPlayerId: this.bettingQueue[0] ?? null,
      currentBet: this.currentBet,
      minRaise: this.minRaise,
    }
  }

  private setStatus(playerId: PlayerId, status: Player['status']): void {
    this.mutatePlayer(playerId, p => ({ ...p, status }))
  }

  private mutatePlayer(playerId: PlayerId, fn: (p: Player) => Player): void {
    this.state = {
      ...this.state,
      players: this.state.players.map(p => p.id === playerId ? fn(p) : p),
    }
  }

  private findPlayer(playerId: PlayerId): Player | undefined {
    return this.state.players.find(p => p.id === playerId)
  }

  private getInHandPlayers(): Player[] {
    return this.state.players.filter(p => p.status === 'active' || p.status === 'all-in')
  }

  private getCanBetPlayers(): Player[] {
    return this.state.players.filter(p => p.status === 'active' && p.chips > 0)
  }

  private dealerIdxInHand(inHand: Player[]): number {
    const dealer = this.state.players[this.state.dealerIndex]
    if (!dealer) return 0
    const idx = inHand.findIndex(p => p.id === dealer.id)
    return idx >= 0 ? idx : 0
  }

  private advanceDealerIndex(eligible: Player[]): number {
    const eligibleIds = new Set(eligible.map(p => p.id))
    const n = this.state.players.length
    for (let i = 1; i <= n; i++) {
      const idx = (this.state.dealerIndex + i) % n
      if (eligibleIds.has(this.state.players[idx].id)) return idx
    }
    return this.state.dealerIndex
  }
}
