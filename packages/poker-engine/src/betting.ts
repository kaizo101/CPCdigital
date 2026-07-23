export type BettingStructure =
  | { readonly type: 'no-limit' }
  | { readonly type: 'pot-limit' }
  | { readonly type: 'fixed-limit'; readonly maxRaisesPerRound: number }
