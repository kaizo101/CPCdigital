/**
 * GameVariant interface — designed early to avoid a refactor when Omaha (v1.1.0) is added.
 * Texas Hold'em is the only implementation for v1.0.
 */
export interface GameVariant {
  readonly name: string
  readonly holeCardsPerPlayer: number
}

export const TEXAS_HOLDEM: GameVariant = {
  name: "Texas Hold'em",
  holeCardsPerPlayer: 2,
}
