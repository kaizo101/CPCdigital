import type {
  BettingContext,
  ActiveGamePhase,
  Card,
  DecisionActionHistoryEvent,
  DecisionSnapshot,
  HandEvent,
  HandResult,
  Player,
  PlayerAction,
  PlayerGameView,
  PlayerId,
  PublicGameState,
} from '@cpc/shared'
import { createDeck, dealCards, shuffleDeck } from './deck'
import { describeWinningHand, findWinnerIndices } from './hand-evaluator'
import { createSeededRandom, secureRandom, type RandomSeed, type RandomSource } from './random'
import { calculateSidePots } from './side-pot'
import {
  cloneGameVariant,
  validateGameVariant,
  type BettingPhaseDefinition,
  type GameVariant,
} from './game-variant'
import { TEXAS_HOLDEM } from './variants/texas-holdem'

const RANK_VALUE: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
}

function byRankDesc(a: Card, b: Card): number {
  return (RANK_VALUE[b.rank] ?? 0) - (RANK_VALUE[a.rank] ?? 0)
}

export interface GameConfig {
  bigBlind: number
  smallBlind: number
  variant?: GameVariant
  /** Dealer for the first hand. Later hands continue rotating from this seat. */
  initialDealerIndex?: number
  /** Deterministic deck stream for tests and reproducible sessions. Never expose a live seed to players. */
  seed?: RandomSeed
  /** Explicit random source for advanced tests. Mutually exclusive with seed. */
  random?: RandomSource
}

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
  private holeCards = new Map<PlayerId, Card[]>()
  private handHistory: HandEvent[] = []
  private decisionSnapshots: DecisionSnapshot[] = []
  private lastHandResults: HandResult[] = []

  // Betting round internals (not exposed in PublicGameState)
  private currentBet = 0
  private minRaise = 0
  private roundBets = new Map<PlayerId, number>()    // reset each street
  private totalHandBets = new Map<PlayerId, number>() // accumulates whole hand (for side pots)
  private foldedPlayers = new Set<PlayerId>()
  private allInPlayers = new Set<PlayerId>()
  private lastActionBet = new Map<PlayerId, number>()
  private lastActionMinRaise = new Map<PlayerId, number>()
  private bettingQueue: PlayerId[] = []              // ordered queue: next to act = [0]
  private random: RandomSource
  private variant: GameVariant
  private initialDealerIndex: number | null
  private fullRaisesThisRound = 0

  private state: PublicGameState

  constructor(players: Player[], private config: GameConfig) {
    if (!Number.isFinite(config.bigBlind) || config.bigBlind <= 0) throw new Error('Big blind must be positive')
    if (!Number.isFinite(config.smallBlind) || config.smallBlind <= 0) throw new Error('Small blind must be positive')
    if (config.smallBlind > config.bigBlind) throw new Error('Small blind cannot exceed big blind')
    if (players.some(player => !Number.isFinite(player.chips) || player.chips < 0)) {
      throw new Error('Player chips must be finite and non-negative')
    }
    if (config.seed !== undefined && config.random !== undefined) {
      throw new Error('GameConfig cannot specify both seed and random')
    }
    if (
      config.initialDealerIndex !== undefined
      && (
        !Number.isInteger(config.initialDealerIndex)
        || config.initialDealerIndex < 0
        || config.initialDealerIndex >= players.length
      )
    ) {
      throw new Error('Initial dealer index must reference an existing player')
    }
    this.variant = cloneGameVariant(config.variant ?? TEXAS_HOLDEM)
    validateGameVariant(this.variant)
    if (this.variant.holeCardsPerPlayer !== 2 && this.variant.holeCardsPerPlayer !== 4) {
      throw new Error('PokerGame currently supports variants with 2 or 4 hole cards')
    }
    this.random = config.random ?? (config.seed !== undefined ? createSeededRandom(config.seed) : secureRandom)
    this.initialDealerIndex = config.initialDealerIndex ?? null
    this.state = {
      variantId: this.variant.id,
      phase: 'waiting',
      players: players.map(p => ({ ...p, status: 'waiting', roundBet: 0 })),
      communityCards: [],
      pot: 0,
      sidePots: [],
      currentPlayerId: null,
      dealerIndex: config.initialDealerIndex ?? 0,
      bigBlind: config.bigBlind,
      smallBlind: config.smallBlind,
      currentBet: 0,
      minRaise: this.getMinimumBetSize(this.getOpeningBettingPhase()),
      canRaise: false,
      bettingContext: null,
      turnDeadline: null,
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  getPublicState(): PublicGameState { return this.clonePublicState() }

  getPlayerView(playerId: PlayerId): PlayerGameView {
    if (!this.state.players.some(player => player.id === playerId)) {
      throw new Error(`Unknown player ${playerId}`)
    }
    const cards = this.holeCards.get(playerId)
    return {
      state: this.clonePublicState(),
      ownCards: cards ? cards.map(card => ({ ...card })).sort(byRankDesc) as Card[] : null,
    }
  }

  getPublicHandHistory(): readonly HandEvent[] {
    return this.handHistory.map(event => this.cloneHandEvent(event))
  }

  /** Private per-actor analysis records; never include these in a public broadcast. */
  getPrivateDecisionSnapshots(): readonly DecisionSnapshot[] { return this.decisionSnapshots }

  getRevealedCards(): Readonly<Record<PlayerId, Card[]>> {
    const revealed: Record<PlayerId, Card[]> = {}
    for (const event of this.handHistory) {
      if (event.type === 'CardsRevealed') {
        revealed[event.playerId] = event.cards.map(card => ({ ...card })).sort(byRankDesc) as Card[]
      }
    }
    return revealed
  }

  getLastHandResults(): HandResult[] { return this.lastHandResults.map(result => ({ ...result })) }

  forceFold(playerId: PlayerId): void {
    if (this.state.phase === 'waiting' || this.state.phase === 'showdown') return
    const phase = this.state.phase
    const player = this.findPlayer(playerId)
    if (!player || player.status !== 'active') return
    const totalBet = this.roundBets.get(playerId) ?? 0
    const toCall = this.roundCents(Math.max(0, this.currentBet - totalBet))

    this.foldedPlayers.add(playerId)
    this.setStatus(playerId, 'folded')
    this.bettingQueue = this.bettingQueue.filter(id => id !== playerId)
    this.lastActionBet.delete(playerId)
    this.lastActionMinRaise.delete(playerId)
    this.handHistory.push({
      type: 'PlayerActed',
      phase,
      playerId,
      action: { type: 'fold' },
      amount: 0,
      totalBet,
      toCall,
      currentBetBefore: this.currentBet,
      potAfter: this.getLivePotTotal(),
      source: 'forced',
    })

    if (this.getInHandPlayers().length === 1) {
      this.awardUncontestedPot()
      return
    }

    if (this.bettingQueue.length === 0) {
      this.endBettingRound()
      return
    }

    this.syncCurrentPlayer()
  }

  setPlayerChips(playerId: PlayerId, chips: number): void {
    if (this.state.phase !== 'waiting') throw new Error('Cannot change chips during a hand')
    if (!Number.isFinite(chips) || chips < 0) throw new Error('Chips must be finite and non-negative')
    this.mutatePlayer(playerId, p => ({ ...p, chips }))
  }

  setPlayerSittingOut(playerId: PlayerId, sittingOut: boolean): void {
    this.mutatePlayer(playerId, p => ({ ...p, isSittingOut: sittingOut }))
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
    const eligible = this.state.players.filter(p => p.chips > 0 && !p.isSittingOut)
    if (eligible.length < 2) throw new Error('Need at least 2 players with chips')

    this.deck = shuffleDeck(createDeck(), this.random)
    this.holeCards.clear()
    this.handHistory = []
    this.decisionSnapshots = []
    this.lastHandResults = []
    this.foldedPlayers.clear()
    this.allInPlayers.clear()
    this.lastActionBet.clear()
    this.lastActionMinRaise.clear()
    this.roundBets.clear()
    this.totalHandBets.clear()
    this.currentBet = 0
    const openingPhase = this.getOpeningBettingPhase()
    this.minRaise = this.getMinimumBetSize(openingPhase)
    this.fullRaisesThisRound = 0

    const newDealerIndex = this.initialDealerIndex == null
      ? this.advanceDealerIndex(eligible)
      : this.resolveInitialDealerIndex(eligible, this.initialDealerIndex)
    this.initialDealerIndex = null

    this.state = {
      ...this.state,
      variantId: this.variant.id,
      phase: openingPhase.id,
      communityCards: [],
      pot: 0,
      sidePots: [],
      currentBet: 0,
      minRaise: this.minRaise,
      bettingContext: null,
      dealerIndex: newDealerIndex,
      players: this.state.players.map(p => ({
        ...p,
        status: p.chips > 0 && !p.isSittingOut ? 'active' as const : 'waiting' as const,
        roundBet: 0,
      })),
    }

    const dealer = this.state.players[newDealerIndex]
    this.handHistory.push({
      type: 'HandStarted',
      variantId: this.variant.id,
      dealerId: dealer.id,
      smallBlind: this.config.smallBlind,
      bigBlind: this.config.bigBlind,
      players: this.state.players
        .filter(player => player.status === 'active')
        .map(player => ({
          playerId: player.id,
          seatIndex: player.seatIndex,
          startingChips: player.chips,
        })),
    })

    for (const player of this.getInHandPlayers()) {
      const [cards, remaining] = dealCards(this.deck, this.variant.holeCardsPerPlayer)
      this.holeCards.set(player.id, cards)
      this.deck = remaining
    }

    this.postBlinds()
  }

  applyAction(playerId: PlayerId, action: PlayerAction, source: 'player' | 'forced' = 'player'): void {
    if (this.state.phase === 'waiting' || this.state.phase === 'showdown') {
      throw new Error('No active betting round')
    }
    if (this.state.currentPlayerId !== playerId) throw new Error('Not your turn')
    const phase = this.state.phase

    const player = this.findPlayer(playerId)
    if (!player) throw new Error('Player not found')
    if (this.foldedPlayers.has(playerId)) throw new Error('Already folded')
    if (this.allInPlayers.has(playerId)) throw new Error('Already all-in')

    const alreadyBet = this.roundBets.get(playerId) ?? 0
    const currentBetBefore = this.currentBet
    const toCall = this.roundCents(this.currentBet - alreadyBet)
    const chipsBeforeAction = player.chips
    const decisionSnapshot = this.createDecisionSnapshot(playerId, action, source)

    switch (action.type) {
      case 'fold': {
        if (toCall <= 0) throw new Error('Cannot fold — check is available')
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
        const amount = this.roundCents(action.amount) // total round bet after raise
        if (!Number.isFinite(amount)) throw new Error('Invalid raise amount')
        if (!this.hasRaiseRights(playerId)) throw new Error('Action is not reopened for a raise')
        const minRaiseTo = this.roundCents(this.currentBet + this.minRaise)
        if (amount < minRaiseTo) {
          throw new Error(`Minimum raise to ${minRaiseTo}`)
        }
        const maximumRaiseTo = this.state.bettingContext?.legalActions.raise?.maxAmount
        if (maximumRaiseTo == null || amount > maximumRaiseTo) {
          throw new Error(`Maximum raise to ${maximumRaiseTo ?? this.currentBet}`)
        }
        const additional = this.roundCents(amount - alreadyBet)
        if (additional > player.chips) throw new Error('Not enough chips')
        const raiseSize = this.roundCents(amount - this.currentBet)
        if (this.variant.bettingStructure.type !== 'fixed-limit') this.minRaise = raiseSize
        this.fullRaisesThisRound++
        this.currentBet = amount
        this.placeBet(playerId, additional)
        if (this.findPlayer(playerId)!.chips === 0) {
          this.allInPlayers.add(playerId)
          this.setStatus(playerId, 'all-in')
        }
        this.reopenBettingAfterRaise(playerId)
        break
      }
      case 'all-in': {
        const chips = player.chips
        const newTotal = this.roundCents(alreadyBet + chips)
        if (!this.hasRaiseRights(playerId) && newTotal > this.currentBet) {
          throw new Error('Action is not reopened for a raise')
        }
        if (this.state.bettingContext?.legalActions.allInAmount !== newTotal) {
          throw new Error('All-in is not legal for this betting structure')
        }
        if (newTotal > this.currentBet) {
          const raiseSize = this.roundCents(newTotal - this.currentBet)
          const isFullRaise = raiseSize >= this.minRaise
          if (isFullRaise) {
            if (this.variant.bettingStructure.type !== 'fixed-limit') this.minRaise = raiseSize
            this.fullRaisesThisRound++
          }
          this.currentBet = newTotal
          this.reopenBettingAfterRaise(playerId)
        }
        this.placeBet(playerId, chips)
        this.allInPlayers.add(playerId)
        this.setStatus(playerId, 'all-in')
        break
      }
    }

    this.recordPlayerAction(playerId)
    if (decisionSnapshot) this.decisionSnapshots.push(decisionSnapshot)
    const playerAfterAction = this.findPlayer(playerId)!
    this.handHistory.push({
      type: 'PlayerActed',
      phase,
      playerId,
      action: { ...action },
      amount: this.roundCents(chipsBeforeAction - playerAfterAction.chips),
      totalBet: this.roundBets.get(playerId) ?? alreadyBet,
      toCall,
      currentBetBefore,
      potAfter: this.getLivePotTotal(),
      source,
    })
    this.advanceAction()
  }

  // ---------------------------------------------------------------------------
  // Blinds
  // ---------------------------------------------------------------------------

  private postBlinds(): void {
    const openingPhase = this.getOpeningBettingPhase()
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
    this.handHistory.push({
      type: 'BlindPosted',
      phase: openingPhase.id,
      playerId: sb.id,
      amount: sbAmt,
      totalBet: this.roundBets.get(sb.id) ?? 0,
      blindType: 'small',
    })

    const bbAmt = Math.min(this.config.bigBlind, bb.chips)
    this.placeBet(bb.id, bbAmt)
    if (this.findPlayer(bb.id)!.chips === 0) { this.allInPlayers.add(bb.id); this.setStatus(bb.id, 'all-in') }
    // A short all-in big blind does not reduce the preflop bring-in.
    this.currentBet = this.config.bigBlind
    this.minRaise = this.getMinimumBetSize(openingPhase)
    this.handHistory.push({
      type: 'BlindPosted',
      phase: openingPhase.id,
      playerId: bb.id,
      amount: bbAmt,
      totalBet: this.roundBets.get(bb.id) ?? 0,
      blindType: 'big',
    })

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
    const raiserSeat = this.state.players.findIndex(p => p.id === raiserId)
    const n = this.state.players.length
    const needToReact = this.getInHandPlayers()
      .filter(p =>
        !inQueue.has(p.id) &&
        p.id !== raiserId &&
        canBet.has(p.id) &&
        (this.roundBets.get(p.id) ?? 0) < this.currentBet
      )
      .sort((a, b) => {
        const aDist = (a.seatIndex - raiserSeat + n) % n
        const bDist = (b.seatIndex - raiserSeat + n) % n
        return aDist - bDist
      })
      .map(p => p.id)
    this.bettingQueue.push(...needToReact)
  }

  private endBettingRound(): void {
    this.returnUncalledBet()
    this.collectBetsIntoPot()

    if (this.getInHandPlayers().length === 1) {
      this.awardUncontestedPot()
      return
    }

    const everyoneAllIn = this.getCanBetPlayers().length <= 1

    const currentPhaseIndex = this.variant.phases.findIndex(phase => phase.id === this.state.phase)
    if (currentPhaseIndex < 0) throw new Error(`Unknown variant phase ${this.state.phase}`)
    const remainingPhases = this.variant.phases.slice(currentPhaseIndex + 1)
    if (remainingPhases.length === 0) {
      this.showdown()
      return
    }

    if (everyoneAllIn) {
      for (const phase of remainingPhases) {
        if (phase.kind !== 'betting') {
          throw new Error(`PokerGame cannot run out unsupported ${phase.kind} phase ${phase.id}`)
        }
        this.dealForBettingPhase(phase)
      }
      this.showdown()
      return
    }

    const nextPhase = remainingPhases[0]
    if (nextPhase.kind !== 'betting') {
      throw new Error(`PokerGame cannot execute unsupported ${nextPhase.kind} phase ${nextPhase.id}`)
    }
    this.dealForBettingPhase(nextPhase)
    this.startBettingRound(nextPhase)
  }

  private startBettingRound(phase: BettingPhaseDefinition): void {
    this.roundBets.clear()
    this.currentBet = 0
    this.minRaise = this.getMinimumBetSize(phase)
    this.fullRaisesThisRound = 0
    this.lastActionBet.clear()
    this.lastActionMinRaise.clear()

    this.state = {
      ...this.state,
      phase: phase.id,
      currentBet: 0,
      minRaise: this.minRaise,
      canRaise: false,
      bettingContext: null,
      players: this.state.players.map(p => ({ ...p, roundBet: 0 })),
    }

    const inHand = this.getInHandPlayers()
    const canBet = new Set(this.getCanBetPlayers().map(p => p.id))
    const dealerIdx = this.dealerIdxInHand(inHand)
    const n = inHand.length

    if (phase.actionOrder !== 'left-of-dealer') {
      throw new Error(`Betting phase ${phase.id} uses an opening-only action order`)
    }

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
    this.state = { ...this.state, phase: 'showdown', currentPlayerId: null, bettingContext: null }

    const sidePots = calculateSidePots(
      this.state.players
        .filter(p => p.status !== 'waiting')
        .map(p => ({
          playerId: p.id,
          totalBet: this.totalHandBets.get(p.id) ?? 0,
          inHand: !this.foldedPlayers.has(p.id),
        }))
    )

    for (const player of this.getInHandPlayers()) {
      const cards = this.holeCards.get(player.id)
      if (cards) {
        this.handHistory.push({ type: 'CardsRevealed', playerId: player.id, cards: [...cards].sort(byRankDesc) as Card[] })
      }
    }

    const awards: HandResult[] = []
    const awardEvents: Extract<HandEvent, { type: 'PotAwarded' }>[] = []

    for (const [potIndex, pot] of sidePots.entries()) {
      const { eligiblePlayerIds, amount } = pot
      if (eligiblePlayerIds.length === 0) {
        throw new Error('Cannot award a side pot without eligible players')
      }

      if (eligiblePlayerIds.length === 1) {
        const award = { playerId: eligiblePlayerIds[0], amount, handName: '' }
        awards.push(award)
        awardEvents.push({
          type: 'PotAwarded',
          potIndex,
          potType: potIndex === 0 ? 'main' : 'side',
          ...award,
          isSplit: false,
        })
        continue
      }

      const community = this.state.communityCards
      const handsToEval = eligiblePlayerIds.map(id => ({
        holeCards: this.holeCards.get(id)!,
        communityCards: community,
      }))
      const winnerIdxs = findWinnerIndices(handsToEval)
      const amountCents = Math.round(this.roundCents(amount) * 100)
      const shareCents = Math.floor(amountCents / winnerIdxs.length)
      let remainderCents = amountCents - (shareCents * winnerIdxs.length)
      const winnerPlayerIds = this.orderPlayerIdsLeftOfDealer(
        winnerIdxs.map(index => eligiblePlayerIds[index])
      )

      for (const pid of winnerPlayerIds) {
        const losingHoleCards = eligiblePlayerIds
          .filter(opponentId => !winnerPlayerIds.includes(opponentId))
          .map(opponentId => this.holeCards.get(opponentId)!)
        const handName = describeWinningHand(this.holeCards.get(pid)!, community, losingHoleCards)
        const awardCents = shareCents + (remainderCents > 0 ? 1 : 0)
        remainderCents = Math.max(0, remainderCents - 1)
        const amount = awardCents / 100
        const award = { playerId: pid, amount, handName }
        awards.push(award)
        awardEvents.push({
          type: 'PotAwarded',
          potIndex,
          potType: potIndex === 0 ? 'main' : 'side',
          ...award,
          isSplit: winnerPlayerIds.length > 1,
        })
      }
    }

    for (const [index, award] of awards.entries()) {
      this.mutatePlayer(award.playerId, p => ({ ...p, chips: this.roundCents(p.chips + award.amount) }))
      this.handHistory.push(awardEvents[index])
    }

    this.lastHandResults = awards
    this.handHistory.push({
      type: 'HandEnded',
      reason: 'showdown',
      totalPot: this.roundCents(awards.reduce((sum, award) => sum + award.amount, 0)),
      results: awards.map(result => ({ ...result })),
    })
    this.endHand()
  }

  private awardUncontestedPot(): void {
    this.collectBetsIntoPot()
    const winner = this.getInHandPlayers()[0]
    this.mutatePlayer(winner.id, p => ({ ...p, chips: this.roundCents(p.chips + this.state.pot) }))
    const award = { playerId: winner.id, amount: this.state.pot, handName: '' }
    this.handHistory.push({
      type: 'PotAwarded',
      potIndex: 0,
      potType: 'main',
      ...award,
      isSplit: false,
    })
    this.lastHandResults = [award]
    this.handHistory.push({
      type: 'HandEnded',
      reason: 'uncontested',
      totalPot: this.state.pot,
      results: [{ ...award }],
    })
    this.endHand()
  }

  private endHand(): void {
    this.state = {
      ...this.state,
      phase: 'waiting',
      pot: 0,
      sidePots: [],
      currentPlayerId: null,
      canRaise: false,
      bettingContext: null,
      players: this.state.players.map(p => ({ ...p, roundBet: 0 })),
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private dealForBettingPhase(phase: BettingPhaseDefinition): void {
    if (!phase.dealBefore) return
    if (phase.dealBefore.target !== 'community') {
      throw new Error(`Unsupported deal target for phase ${phase.id}`)
    }
    this.dealCommunity(phase.dealBefore.count, phase.id)
  }

  private dealCommunity(count: number, phase: ActiveGamePhase): void {
    const [cards, remaining] = dealCards(this.deck, count)
    this.deck = remaining
    this.handHistory.push({ type: 'CommunityCardDealt', phase, cards })
    this.state = { ...this.state, communityCards: [...this.state.communityCards, ...cards] }
  }

  private roundCents(n: number): number {
    return Math.round(n * 100) / 100
  }

  private clonePublicState(): PublicGameState {
    const bettingContext = this.state.bettingContext
    return {
      ...this.state,
      players: this.state.players.map(player => ({ ...player })),
      communityCards: this.state.communityCards.map(card => ({ ...card })),
      sidePots: this.state.sidePots.map(sidePot => ({
        amount: sidePot.amount,
        eligiblePlayerIds: [...sidePot.eligiblePlayerIds],
      })),
      bettingContext: bettingContext ? {
        ...bettingContext,
        legalActions: {
          ...bettingContext.legalActions,
          raise: bettingContext.legalActions.raise
            ? { ...bettingContext.legalActions.raise }
            : null,
        },
      } : null,
    }
  }

  private cloneHandEvent(event: HandEvent): HandEvent {
    switch (event.type) {
      case 'HandStarted':
        return { ...event, players: event.players.map(player => ({ ...player })) }
      case 'BlindPosted':
      case 'UncalledBetReturned':
      case 'PotAwarded':
        return { ...event }
      case 'PlayerActed':
        return { ...event, action: { ...event.action } }
      case 'CommunityCardDealt':
        return { ...event, cards: event.cards.map(card => ({ ...card })) }
      case 'CardsRevealed':
        return { ...event, cards: event.cards.map(card => ({ ...card })) as Card[] }
      case 'HandEnded':
        return { ...event, results: event.results.map(result => ({ ...result })) }
    }
  }

  private getLivePotTotal(): number {
    return this.roundCents(
      this.state.pot + [...this.roundBets.values()].reduce((sum, amount) => sum + amount, 0)
    )
  }

  private createDecisionSnapshot(
    playerId: PlayerId,
    chosenAction: PlayerAction,
    source: 'player' | 'forced',
  ): DecisionSnapshot | null {
    const phase = this.state.phase
    if (phase === 'waiting' || phase === 'showdown') {
      throw new Error('Cannot capture a decision outside a betting round')
    }

    const player = this.findPlayer(playerId)
    const ownCards = this.holeCards.get(playerId)
    const bettingContext = this.state.bettingContext
    // Some low-level betting tests intentionally construct a round without a
    // dealt deck. That state cannot occur in a real hand and has no private
    // cards from which a complete decision record could be built.
    if (!ownCards) return null
    if (!player || !bettingContext || bettingContext.playerId !== playerId) {
      throw new Error(`Cannot capture decision context for player ${playerId}`)
    }

    const playersInHand = this.state.players
      .filter(candidate => candidate.status !== 'waiting')
      .sort((left, right) => left.seatIndex - right.seatIndex)
    const positionIndex = playersInHand.findIndex(candidate => candidate.id === playerId)
    const dealerId = this.state.players[this.state.dealerIndex]?.id
    const dealerPositionIndex = playersInHand.findIndex(candidate => candidate.id === dealerId)
    if (positionIndex < 0 || dealerPositionIndex < 0 || !dealerId) {
      throw new Error(`Cannot determine table position for player ${playerId}`)
    }

    const actionHistory = this.handHistory
      .filter((event): event is DecisionActionHistoryEvent =>
        event.type === 'BlindPosted' || event.type === 'PlayerActed'
      )
      .map(event => event.type === 'PlayerActed'
        ? { ...event, action: { ...event.action } }
        : { ...event })

    return {
      decisionIndex: this.decisionSnapshots.length,
      playerId,
      visibleState: {
        variantId: this.variant.id,
        phase,
        communityCards: this.state.communityCards.map(card => ({ ...card })),
        players: this.state.players.map(candidate => ({
          playerId: candidate.id,
          seatIndex: candidate.seatIndex,
          chips: candidate.chips,
          roundBet: candidate.roundBet,
          status: candidate.status,
          isDealer: candidate.id === dealerId,
        })),
        sidePots: this.state.sidePots.map(sidePot => ({
          amount: sidePot.amount,
          eligiblePlayerIds: [...sidePot.eligiblePlayerIds],
        })),
        dealerId,
        pot: bettingContext.totalPot,
        currentBet: this.state.currentBet,
        smallBlind: this.state.smallBlind,
        bigBlind: this.state.bigBlind,
      },
      ownCards: ownCards.map(card => ({ ...card })).sort(byRankDesc) as Card[],
      bettingContext: {
        ...bettingContext,
        legalActions: {
          ...bettingContext.legalActions,
          raise: bettingContext.legalActions.raise
            ? { ...bettingContext.legalActions.raise }
            : null,
        },
      },
      position: {
        seatIndex: player.seatIndex,
        dealerSeatIndex: this.state.players[this.state.dealerIndex].seatIndex,
        positionsFromDealer: (positionIndex - dealerPositionIndex + playersInHand.length) % playersInHand.length,
        tableSize: playersInHand.length,
      },
      actionHistory,
      chosenAction: { ...chosenAction },
      source,
    }
  }

  private placeBet(playerId: PlayerId, amount: number): void {
    const player = this.findPlayer(playerId)!
    const actual = this.roundCents(Math.min(amount, player.chips))
    const newRound = this.roundCents((this.roundBets.get(playerId) ?? 0) + actual)
    const newTotal = this.roundCents((this.totalHandBets.get(playerId) ?? 0) + actual)
    this.roundBets.set(playerId, newRound)
    this.totalHandBets.set(playerId, newTotal)
    this.mutatePlayer(playerId, p => ({ ...p, chips: this.roundCents(p.chips - actual), roundBet: newRound }))
  }

  private collectBetsIntoPot(): void {
    const total = this.roundCents([...this.roundBets.values()].reduce((a, b) => a + b, 0))
    this.roundBets.clear()
    this.state = {
      ...this.state,
      pot: this.roundCents(this.state.pot + total),
      players: this.state.players.map(p => ({ ...p, roundBet: 0 })),
    }
  }

  private returnUncalledBet(): void {
    const bets = this.state.players
      .map(player => ({ playerId: player.id, amount: this.roundBets.get(player.id) ?? 0 }))
      .filter(bet => bet.amount > 0)
      .sort((a, b) => b.amount - a.amount)

    const highest = bets[0]
    if (!highest) return

    const matchedAmount = bets[1]?.amount ?? 0
    const refund = this.roundCents(highest.amount - matchedAmount)
    if (refund <= 0) return

    if (this.state.phase !== 'waiting' && this.state.phase !== 'showdown') {
      this.handHistory.push({
        type: 'UncalledBetReturned',
        phase: this.state.phase,
        playerId: highest.playerId,
        amount: refund,
      })
    }

    this.roundBets.set(highest.playerId, matchedAmount)
    this.totalHandBets.set(
      highest.playerId,
      this.roundCents((this.totalHandBets.get(highest.playerId) ?? 0) - refund)
    )
    this.allInPlayers.delete(highest.playerId)
    this.mutatePlayer(highest.playerId, player => ({
      ...player,
      chips: this.roundCents(player.chips + refund),
      roundBet: matchedAmount,
      status: player.status === 'all-in' ? 'active' : player.status,
    }))
  }

  private syncCurrentPlayer(): void {
    const currentPlayerId = this.bettingQueue[0] ?? null
    const currentPlayer = currentPlayerId ? this.findPlayer(currentPlayerId) : undefined
    const currentRoundBet = currentPlayerId ? (this.roundBets.get(currentPlayerId) ?? 0) : 0
    const bettingContext = currentPlayer ? this.buildBettingContext(currentPlayer, currentRoundBet) : null
    this.state = {
      ...this.state,
      currentPlayerId,
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      canRaise: bettingContext?.legalActions.raise != null,
      bettingContext,
    }
  }

  private buildBettingContext(currentPlayer: Player, currentRoundBet: number): BettingContext {
    const totalPot = this.roundCents(
      this.state.pot + this.state.players.reduce((sum, player) => sum + player.roundBet, 0)
    )
    const toCall = this.roundCents(Math.max(0, this.currentBet - currentRoundBet))
    const callAmount = this.roundCents(Math.min(toCall, currentPlayer.chips))
    const minRaiseTo = this.roundCents(this.currentBet + this.minRaise)
    const stackRaiseTo = this.roundCents(currentRoundBet + currentPlayer.chips)
    const potRaiseTo = this.roundCents(currentRoundBet + totalPot + (2 * callAmount))
    const maxRaiseTo = this.getMaximumRaiseTo(stackRaiseTo, potRaiseTo, minRaiseTo)
    const capAllowsRaise = this.variant.bettingStructure.type !== 'fixed-limit'
      || this.fullRaisesThisRound < this.variant.bettingStructure.maxRaisesPerRound
    const hasRaiseRights = this.hasRaiseRights(currentPlayer.id)
      && capAllowsRaise
      && stackRaiseTo > this.currentBet
    const fullRaise = hasRaiseRights && maxRaiseTo >= minRaiseTo
    const opponents = this.state.players.filter(player =>
      player.id !== currentPlayer.id && (player.status === 'active' || player.status === 'all-in')
    )
    const deepestOpponentStack = opponents.reduce((max, opponent) => Math.max(max, opponent.chips), 0)
    const effectiveStack = this.roundCents(Math.min(currentPlayer.chips, deepestOpponentStack))
    const canMoveAllIn = currentPlayer.chips > 0 && (
      stackRaiseTo <= this.currentBet
      || (hasRaiseRights && stackRaiseTo <= maxRaiseTo)
    )

    return {
      playerId: currentPlayer.id,
      totalPot,
      toCall,
      callAmount,
      potOdds: callAmount > 0 ? callAmount / (totalPot + callAmount) : 0,
      toCallPotRatio: toCall > 0 && totalPot > 0 ? toCall / totalPot : 0,
      potRaiseTo,
      minRaiseTo,
      maxRaiseTo,
      playerStack: currentPlayer.chips,
      effectiveStack,
      spr: totalPot > 0 ? effectiveStack / totalPot : 0,
      legalActions: {
        fold: toCall > 0,
        check: toCall === 0,
        callAmount: toCall > 0 ? callAmount : null,
        raise: fullRaise ? { minAmount: minRaiseTo, maxAmount: maxRaiseTo } : null,
        allInAmount: canMoveAllIn ? stackRaiseTo : null,
      },
    }
  }

  private getOpeningBettingPhase(): BettingPhaseDefinition {
    const phase = this.variant.phases[0]
    if (phase.kind !== 'betting') throw new Error('Variant opening phase must be a betting phase')
    return phase
  }

  private getMinimumBetSize(phase: BettingPhaseDefinition): number {
    return this.roundCents(this.config.bigBlind * phase.minimumBetBigBlinds)
  }

  private getMaximumRaiseTo(stackRaiseTo: number, potRaiseTo: number, minRaiseTo: number): number {
    switch (this.variant.bettingStructure.type) {
      case 'no-limit':
        return stackRaiseTo
      case 'pot-limit':
        return this.roundCents(Math.min(stackRaiseTo, potRaiseTo))
      case 'fixed-limit':
        return this.roundCents(Math.min(stackRaiseTo, minRaiseTo))
    }
  }

  private hasRaiseRights(playerId: PlayerId): boolean {
    const betAtLastAction = this.lastActionBet.get(playerId)
    if (betAtLastAction == null) return true

    const fullRaiseRequired = this.lastActionMinRaise.get(playerId) ?? this.minRaise
    const raiseFacedSinceLastAction = this.roundCents(this.currentBet - betAtLastAction)
    return raiseFacedSinceLastAction >= fullRaiseRequired
  }

  private recordPlayerAction(playerId: PlayerId): void {
    this.lastActionBet.set(playerId, this.currentBet)
    this.lastActionMinRaise.set(playerId, this.minRaise)
  }

  private orderPlayerIdsLeftOfDealer(playerIds: PlayerId[]): PlayerId[] {
    const playerCount = this.state.players.length
    return [...playerIds].sort((leftId, rightId) => {
      const leftIndex = this.state.players.findIndex(player => player.id === leftId)
      const rightIndex = this.state.players.findIndex(player => player.id === rightId)
      const leftDistance = ((leftIndex - this.state.dealerIndex + playerCount) % playerCount) || playerCount
      const rightDistance = ((rightIndex - this.state.dealerIndex + playerCount) % playerCount) || playerCount
      return leftDistance - rightDistance
    })
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

  private resolveInitialDealerIndex(eligible: Player[], preferredIndex: number): number {
    const eligibleIds = new Set(eligible.map(player => player.id))
    const playerCount = this.state.players.length
    for (let offset = 0; offset < playerCount; offset++) {
      const index = (preferredIndex + offset) % playerCount
      if (eligibleIds.has(this.state.players[index].id)) return index
    }
    return preferredIndex
  }
}
