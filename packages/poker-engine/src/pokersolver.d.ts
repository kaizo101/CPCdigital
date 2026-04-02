declare module 'pokersolver' {
  export class Hand {
    rank: number
    descr: string
    cards: { value: string; suit: string }[]
    static solve(cards: string[]): Hand
    static winners(hands: Hand[]): Hand[]
  }
}
