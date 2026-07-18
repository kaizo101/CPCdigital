declare module 'pokersolver' {
  class Hand {
    rank: number
    name: string
    descr: string
    cards: { value: string; suit: string }[]
    cardPool: string[]
    values: string[][]
    static solve(cards: string[]): Hand
    static winners(hands: Hand[]): Hand[]
  }
  const pokersolver: { Hand: typeof Hand }
  export = pokersolver
}
