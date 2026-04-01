import type { Card, GameState, Player, PlayerAction } from '@poker/shared'
import { createDeck, shuffleDeck, dealCards } from './deck.js'

export interface GameConfig {
  bigBlind: number
  smallBlind: number
}

/**
 * Core game state machine.
 *
 * Current state: foundation scaffold only.
 * Full implementation (blinds, betting rounds, side pots, showdown) planned for 0.3.0-alpha.1.
 */
export class PokerGame {
  private state: GameState
  private deck: Card[] = []
  private holeCards: Map<string, [Card, Card]> = new Map()

  constructor(players: Player[], config: GameConfig) {
    this.state = {
      phase: 'waiting',
      players,
      communityCards: [],
      pot: 0,
      currentPlayerId: null,
      dealerIndex: 0,
      bigBlind: config.bigBlind,
      smallBlind: config.smallBlind,
    }
  }

  getState(): Readonly<GameState> {
    return this.state
  }

  getHoleCards(playerId: string): [Card, Card] | undefined {
    return this.holeCards.get(playerId)
  }

  startHand(): void {
    this.deck = shuffleDeck(createDeck())
    this.holeCards.clear()

    // Deal 2 hole cards to each active player
    for (const player of this.state.players) {
      const [cards, remaining] = dealCards(this.deck, 2)
      this.holeCards.set(player.id, cards as [Card, Card])
      this.deck = remaining
    }

    this.state = {
      ...this.state,
      phase: 'preflop',
      communityCards: [],
      pot: 0,
    }

    // TODO 0.3.0-alpha.1: post blinds, set currentPlayerId, handle dealer button rotation
  }

  applyAction(_playerId: string, _action: PlayerAction): void {
    // TODO 0.3.0-alpha.1: validate action, update state, advance phase
    throw new Error('Not implemented — planned for 0.3.0-alpha.1')
  }
}
