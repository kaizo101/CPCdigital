import type { GameVariant } from '../game-variant'

export const OMAHA_HIGH: GameVariant = {
  id: 'omaha-high',
  name: 'Omaha High',
  holeCardsPerPlayer: 4,
  bettingStructure: { type: 'pot-limit' },
  phases: [
    {
      id: 'preflop',
      kind: 'betting',
      dealBefore: null,
      actionOrder: 'after-big-blind',
      minimumBetBigBlinds: 1,
    },
    {
      id: 'flop',
      kind: 'betting',
      dealBefore: { target: 'community', count: 3 },
      actionOrder: 'left-of-dealer',
      minimumBetBigBlinds: 1,
    },
    {
      id: 'turn',
      kind: 'betting',
      dealBefore: { target: 'community', count: 1 },
      actionOrder: 'left-of-dealer',
      minimumBetBigBlinds: 1,
    },
    {
      id: 'river',
      kind: 'betting',
      dealBefore: { target: 'community', count: 1 },
      actionOrder: 'left-of-dealer',
      minimumBetBigBlinds: 1,
    },
  ],
}
