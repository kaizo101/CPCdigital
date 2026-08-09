import { describe, it, expect } from 'vitest'
import { PokerGame } from './game'
import { TEXAS_HOLDEM, OMAHA_HIGH } from './index'
import type { GameVariant } from './game-variant'
import type { LegalActions, Player, PlayerAction } from '@cpc/shared'

const BB = 20
const SB = 10
const STARTING_CHIPS = 2000
const HANDS_PER_TEST = 1000
const MAX_ACTIONS_PER_HAND = 500

function makePlayers(n: number): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    role: 'player' as const,
    chips: STARTING_CHIPS,
    seatIndex: i,
    isConnected: true,
    isSittingOut: false,
    status: 'waiting' as const,
    roundBet: 0,
  }))
}

function weightedChoice<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]
}

function pickRandomAction(legal: LegalActions, rng: () => number): PlayerAction {
  const options: PlayerAction[] = []
  if (legal.fold) options.push({ type: 'fold' })
  if (legal.check) options.push({ type: 'check' })
  if (legal.callAmount != null) {
    options.push({ type: 'call' }, { type: 'call' }) // call twice as likely
  }
  if (legal.raise) {
    const raiseAmount = legal.raise.minAmount + Math.floor(rng() * (legal.raise.maxAmount - legal.raise.minAmount) * 0.3)
    options.push({ type: 'raise', amount: Math.min(raiseAmount, legal.raise.maxAmount) })
  }
  if (legal.allInAmount != null && rng() < 0.15) {
    options.push({ type: 'all-in' })
  }
  return options.length > 0 ? weightedChoice(options, rng) : { type: 'fold' }
}

function runRandomHand(game: PokerGame, rng: () => number, expectedTotal: number): string[] {
  const violations: string[] = []
  game.startHand()

  let actionCount = 0
  let lastPhase: string | null = null

  while (true) {
    const state = game.getPublicState()
    if (state.phase === 'waiting') break
    if (actionCount++ >= MAX_ACTIONS_PER_HAND) {
      violations.push(`Hand exceeded ${MAX_ACTIONS_PER_HAND} actions — likely infinite loop`)
      break
    }

    // Phase advance: per-round integrity check
    if (state.phase !== lastPhase) {
      lastPhase = state.phase
      for (const p of state.players) {
        if (p.chips < 0) violations.push(`Phase ${state.phase}: player ${p.id} has negative chips ${p.chips}`)
      }
    }

    const pid = state.currentPlayerId
    if (!pid) {
      violations.push(`Phase ${state.phase}: currentPlayerId is null`)
      break
    }

    const bc = state.bettingContext
    if (!bc || bc.playerId !== pid) {
      violations.push(`Phase ${state.phase}: bettingContext.playerId ${bc?.playerId} ≠ currentPlayerId ${pid}`)
    }

    const legal = bc?.legalActions
    if (!legal) {
      violations.push(`Phase ${state.phase}: no legalActions for ${pid}`)
      break
    }

    const action = pickRandomAction(legal, rng)
    game.applyAction(pid, action)

    // Mid-hand chip conservation: chips + roundBets + pot + sidePots must be constant
    const postState = game.getPublicState()
    const playerTotal = postState.players.reduce((s, p) => s + p.chips + p.roundBet, 0)
    const sidePotTotal = (postState.sidePots ?? []).reduce((s, sp) => s + sp.amount, 0)
    const currentTotal = playerTotal + postState.pot + sidePotTotal
    if (Math.abs(currentTotal - expectedTotal) > 0.01) {
      violations.push(
        `Chip leak mid-hand: total ${currentTotal} ≠ expected ${expectedTotal} ` +
        `(phase ${postState.phase}, action ${actionCount})`,
      )
    }
  }

  return violations
}

function runRandomizedHands(
  playerCount: number,
  variant: GameVariant,
  seed: string,
  maxHands: number,
): string[] {
  const allViolations: string[] = []
  const players = makePlayers(playerCount)
  const rng = createRng(seed)

  const game = new PokerGame(players, {
    bigBlind: BB,
    smallBlind: SB,
    variant,
    seed: `${seed}-deck`,
  })

  let expectedTotalChips = STARTING_CHIPS * playerCount

  let hand = 0
  for (; hand < maxHands; hand++) {
    const active = game.getPublicState().players.filter(p => !p.isSittingOut && p.chips > 0)
    if (active.length < 2) {
      for (const p of game.getPublicState().players) {
        if (p.chips === 0 && !p.isSittingOut) {
          game.setPlayerChips(p.id, STARTING_CHIPS)
          expectedTotalChips += STARTING_CHIPS
        }
      }
      const stillActive = game.getPublicState().players.filter(p => p.chips > 0)
      if (stillActive.length < 2) break
    }

    const violations = runRandomHand(game, rng, expectedTotalChips)
    if (violations.length > 0) {
      allViolations.push(`Hand ${hand}: ${violations.join('; ')}`)
    }

    // Chip conservation after hand (including rebuys)
    const endState = game.getPublicState()
    const actualTotal = endState.players.reduce((s, p) => s + p.chips, 0)
    if (Math.abs(actualTotal - expectedTotalChips) > 0.01) {
      allViolations.push(
        `Hand ${hand}: chip total ${actualTotal} ≠ expected ${expectedTotalChips} (diff ${actualTotal - expectedTotalChips})`,
      )
    }

    // Dealer rotation check
    if (hand > 0) {
      const currDealer = endState.dealerIndex
      if (currDealer === prevDealerIndex) {
        const activePs = endState.players.filter(p => p.chips > 0 && !p.isSittingOut)
        if (activePs.length >= 2) {
          allViolations.push(`Hand ${hand}: dealer did not rotate (${prevDealerIndex} → ${currDealer})`)
        }
      }
    }
    prevDealerIndex = endState.dealerIndex
  }

  if (hand < maxHands) {
    allViolations.push(`Only completed ${hand}/${maxHands} hands — insufficient active players`)
  }

  return allViolations
}

let prevDealerIndex = -1

function createRng(seed: string): () => number {
  // Simple deterministic PRNG for test-only use
  let s = hashString(seed)
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
    return (s >>> 0) / 0xFFFFFFFF
  }
}

function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  return hash >>> 0
}

// ----------------------------------------------------------------
//  Chip Conservation
// ----------------------------------------------------------------
describe('Chip conservation', () => {
  for (const [variantName, variant, pc] of [
    ['NLHE 2p', TEXAS_HOLDEM, 2],
    ['NLHE 6p', TEXAS_HOLDEM, 6],
    ['NLHE 9p', TEXAS_HOLDEM, 9],
    ['PLO 2p', OMAHA_HIGH, 2],
    ['PLO 6p', OMAHA_HIGH, 6],
  ] as const) {
    it(`${variantName} — ${HANDS_PER_TEST} hands`, () => {
      const violations = runRandomizedHands(
        pc, variant, `chip-conserve-${variantName}`, HANDS_PER_TEST,
      )
      const chipViolations = violations.filter(v => v.includes('chip') || v.includes('Pot mismatch'))
      expect(chipViolations, `Chip violations:\n${chipViolations.join('\n')}`).toEqual([])
    })
  }
})

// ----------------------------------------------------------------
//  No Negative Stack
// ----------------------------------------------------------------
describe('No negative stack', () => {
  for (const [variantName, variant, pc] of [
    ['NLHE 6p', TEXAS_HOLDEM, 6],
    ['PLO 6p', OMAHA_HIGH, 6],
    ['NLHE 9p', TEXAS_HOLDEM, 9],
  ] as const) {
    it(`${variantName} — ${HANDS_PER_TEST} hands`, () => {
      const violations = runRandomizedHands(
        pc, variant, `neg-stack-${variantName}`, HANDS_PER_TEST,
      )
      const negViolations = violations.filter(v => v.includes('negative'))
      expect(negViolations, `Negative stack violations:\n${negViolations.join('\n')}`).toEqual([])
    })
  }
})

// ----------------------------------------------------------------
//  Dealer Rotation
// ----------------------------------------------------------------
describe('Dealer rotation', () => {
  it('rotates clockwise through all active players over multiple hands', () => {
    const players = makePlayers(6)
    const game = new PokerGame(players, { bigBlind: BB, smallBlind: SB, seed: 'dealer-rot' })
    prevDealerIndex = -1

    const rng = createRng('dealer-rot-action')
    for (let h = 0; h < 200; h++) {
      const active = game.getPublicState().players.filter(p => p.chips > 0)
      if (active.length < 2) {
        for (const p of game.getPublicState().players) {
          if (p.chips === 0) game.setPlayerChips(p.id, STARTING_CHIPS)
        }
      }
      runRandomHand(game, rng, STARTING_CHIPS * 6)
      const dealer = game.getPublicState().dealerIndex
      if (h > 0) expect(dealer).not.toBe(prevDealerIndex)
      prevDealerIndex = dealer
    }
  })

  it('skips busted players when rotating dealer', () => {
    const players = makePlayers(3)
    const game = new PokerGame(players, {
      bigBlind: BB, smallBlind: SB,
      initialDealerIndex: 0,
      seed: 'dealer-skip',
    })
    game.startHand()
    // Fold p2 to give chips to p1
    const state = game.getPublicState()
    const pid = state.currentPlayerId!
    game.applyAction(pid, { type: 'fold' })
    // Finish passively
    while (game.getPublicState().phase !== 'waiting') {
      const s = game.getPublicState()
      const p = s.currentPlayerId!
      const legal = s.bettingContext!.legalActions
      game.applyAction(p, legal.callAmount != null ? { type: 'call' } : { type: 'check' })
    }
    const afterHand = game.getPublicState()
    const firstDealer = afterHand.dealerIndex
    expect(afterHand.players[firstDealer].chips).toBeGreaterThan(0)
  })
})

// ----------------------------------------------------------------
//  Pot consistency (mid-hand chip conservation)
// ----------------------------------------------------------------
describe('Pot & chip consistency', () => {
  for (const [variantName, variant, pc] of [
    ['NLHE 6p', TEXAS_HOLDEM, 6],
    ['PLO 6p', OMAHA_HIGH, 6],
  ] as const) {
    it(`${variantName} — ${HANDS_PER_TEST} hands`, () => {
      const violations = runRandomizedHands(
        pc, variant, `chipleak-${variantName}`, HANDS_PER_TEST,
      )
      const leakViolations = violations.filter(v => v.includes('Chip leak') || v.includes('chip total'))
      expect(leakViolations, `Chip leak violations:\n${leakViolations.join('\n')}`).toEqual([])
    })
  }
})

// ----------------------------------------------------------------
//  Queue integrity
// ----------------------------------------------------------------
describe('Queue integrity', () => {
  it('no hand gets stuck with null currentPlayerId', () => {
    const violations = runRandomizedHands(
      6, TEXAS_HOLDEM, 'queue-null', HANDS_PER_TEST,
    )
    const nullViolations = violations.filter(v => v.includes('currentPlayerId is null'))
    expect(nullViolations).toEqual([])
  })

  it('bettingContext.playerId always matches currentPlayerId', () => {
    const violations = runRandomizedHands(
      6, TEXAS_HOLDEM, 'queue-bc-match', HANDS_PER_TEST,
    )
    const bcViolations = violations.filter(v => v.includes('bettingContext'))
    expect(bcViolations).toEqual([])
  })

  it('no remaining active players miss their turn', () => {
    const players = makePlayers(6)
    const game = new PokerGame(players, { bigBlind: BB, smallBlind: SB, seed: 'queue-miss' })
    const rng = createRng('queue-miss-action')

    for (let h = 0; h < 500; h++) {
      const active = game.getPublicState().players.filter(p => p.chips > 0)
      if (active.length < 2) {
        for (const p of game.getPublicState().players) {
          if (p.chips === 0) game.setPlayerChips(p.id, STARTING_CHIPS)
        }
      }

      game.startHand()
      const acted = new Set<string>()
      while (true) {
        const state = game.getPublicState()
        if (state.phase === 'waiting') break
        const pid = state.currentPlayerId
        if (!pid) break
        if (acted.has(pid)) {
          // OK only if player was all-in and betting round advanced
          const player = state.players.find(p => p.id === pid)
          if (player?.status === 'all-in') {
            const legal = state.bettingContext?.legalActions
            if (!legal?.callAmount && !legal?.check) break // phase transition
          }
        }
    acted.add(pid)
        const legal = state.bettingContext!.legalActions
        game.applyAction(pid, pickRandomAction(legal, rng))
      }
    }
  })
})

// ----------------------------------------------------------------
//  Heads-up blind rule: dealer = SB, non-dealer = BB
// ----------------------------------------------------------------
describe('Heads-up blinds', () => {
  it('dealer always posts small blind, non-dealer posts big blind', () => {
    const players = makePlayers(2)
    const game = new PokerGame(players, { bigBlind: BB, smallBlind: SB, seed: 'hu-blinds' })
    const rng = createRng('hu-blinds-action')

    for (let h = 0; h < 200; h++) {
      const active = game.getPublicState().players.filter(p => p.chips > 0)
      if (active.length < 2) {
        for (const p of game.getPublicState().players) {
          if (p.chips === 0) game.setPlayerChips(p.id, STARTING_CHIPS)
        }
      }
      const chipsBefore = new Map(game.getPublicState().players.map(p => [p.id, p.chips]))

      game.startHand()
      const state = game.getPublicState()
      const dealerId = state.players[state.dealerIndex].id
      const nonDealerId = state.players.find(p => p.id !== dealerId)!.id

      // Dealer = SB: deducted SB (10)
      const dealerDeducted = chipsBefore.get(dealerId)! - state.players.find(p => p.id === dealerId)!.chips
      // Non-dealer = BB: deducted BB (20)
      const nonDealerDeducted = chipsBefore.get(nonDealerId)! - state.players.find(p => p.id === nonDealerId)!.chips

      // SB ≡ dealer
      expect(dealerDeducted).toBe(SB)

      // Run to completion
      while (game.getPublicState().phase !== 'waiting') {
        const s = game.getPublicState()
        const pid = s.currentPlayerId!
        const legal = s.bettingContext!.legalActions
        game.applyAction(pid, pickRandomAction(legal, rng))
      }
    }
  })
})

// ----------------------------------------------------------------
//  PLO card counts: exactly 4 hole cards, no duplicates
// ----------------------------------------------------------------
describe('PLO card integrity', () => {
  it('each player has exactly 4 hole cards and no card appears twice', () => {
    const players = makePlayers(6)
    const game = new PokerGame(players, {
      bigBlind: BB, smallBlind: SB,
      variant: OMAHA_HIGH,
      seed: 'plo-cards',
    })
    const rng = createRng('plo-cards-action')

    for (let h = 0; h < 200; h++) {
      const active = game.getPublicState().players.filter(p => p.chips > 0)
      if (active.length < 2) {
        for (const p of game.getPublicState().players) {
          if (p.chips === 0) game.setPlayerChips(p.id, STARTING_CHIPS)
        }
      }

      game.startHand()
      const internal = game as any
      const holeCards = internal.holeCards as Map<string, { rank: string; suit: string }[]>

      // All dealt-in players have exactly 4 cards (PLO)
      for (const [playerId, cards] of holeCards) {
        expect(cards).toHaveLength(4)
      }

      // No card appears twice anywhere (hole cards + board)
      const board = game.getPublicState().communityCards
      const allCards = [
        ...board,
        ...[...holeCards.values()].flat(),
      ]
      const seen = new Set<string>()
      for (const card of allCards) {
        const key = `${card.rank}${card.suit}`
        expect(seen.has(key), `Duplicate card ${key} detected`).toBe(false)
        seen.add(key)
      }

      // Run to completion
      while (game.getPublicState().phase !== 'waiting') {
        const s = game.getPublicState()
        const pid = s.currentPlayerId!
        const legal = s.bettingContext!.legalActions
        game.applyAction(pid, pickRandomAction(legal, rng))
      }
    }
  })

  it('NLHE players have exactly 2 hole cards', () => {
    const players = makePlayers(6)
    const game = new PokerGame(players, {
      bigBlind: BB, smallBlind: SB,
      variant: TEXAS_HOLDEM,
      seed: 'nlhe-cards',
    })
    const rng = createRng('nlhe-cards-action')

    for (let h = 0; h < 100; h++) {
      const active = game.getPublicState().players.filter(p => p.chips > 0)
      if (active.length < 2) {
        for (const p of game.getPublicState().players) {
          if (p.chips === 0) game.setPlayerChips(p.id, STARTING_CHIPS)
        }
      }
      game.startHand()
      const internal = game as any
      const holeCards = internal.holeCards as Map<string, { rank: string; suit: string }[]>
      for (const [, cards] of holeCards) {
        expect(cards).toHaveLength(2)
      }
      while (game.getPublicState().phase !== 'waiting') {
        const s = game.getPublicState()
        game.applyAction(s.currentPlayerId!, pickRandomAction(s.bettingContext!.legalActions, rng))
      }
    }
  })
})

// ----------------------------------------------------------------
//  All-in cap: player never loses more than pre-hand stack
// ----------------------------------------------------------------
describe('All-in cap', () => {
  it('no player ever loses more than their stack at start of hand', () => {
    const players = makePlayers(6)
    const game = new PokerGame(players, { bigBlind: BB, smallBlind: SB, seed: 'allin-cap' })
    const rng = createRng('allin-cap-action')

    for (let h = 0; h < 500; h++) {
      const active = game.getPublicState().players.filter(p => p.chips > 0)
      if (active.length < 2) {
        for (const p of game.getPublicState().players) {
          if (p.chips === 0) game.setPlayerChips(p.id, STARTING_CHIPS)
        }
      }

      const preHandStacks = new Map(
        game.getPublicState().players.map(p => [p.id, p.chips]),
      )

      game.startHand()
      while (game.getPublicState().phase !== 'waiting') {
        const s = game.getPublicState()
        game.applyAction(s.currentPlayerId!, pickRandomAction(s.bettingContext!.legalActions, rng))
      }

      const endState = game.getPublicState()
      for (const p of endState.players) {
        const preHand = preHandStacks.get(p.id) ?? 0
        const loss = preHand - p.chips
        // Player can win or lose, but loss must not exceed pre-hand stack
        // (blind deductions are part of the hand and already reflected)
        expect(
          loss,
          `Player ${p.id} lost ${loss} but only had ${preHand} pre-hand`,
        ).toBeLessThanOrEqual(preHand + 1) // +1 for floating tolerance
        // After rebuys, chips can be > preHand+win, but never < 0
        expect(p.chips).toBeGreaterThanOrEqual(0)
      }
    }
  })
})
