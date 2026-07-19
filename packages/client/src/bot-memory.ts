import type { BotSessionMemory } from './bot-types'

export interface BotDecisionMemoryUpdate {
  raisedPreflop?: boolean
  lastAction?: 'bet' | 'check' | 'call' | 'fold' | null
  lastStreet?: string | null
}

export function resetHandMemory(memory: BotSessionMemory): void {
  memory.hand.raisedPreflop = false
  memory.hand.lastAction = null
  memory.hand.lastStreet = null
}

export function applyDecisionMemory(
  memory: BotSessionMemory,
  update: BotDecisionMemoryUpdate,
): void {
  if (update.raisedPreflop !== undefined) memory.hand.raisedPreflop = update.raisedPreflop
  if (update.lastAction !== undefined) memory.hand.lastAction = update.lastAction
  if (update.lastStreet !== undefined) {
    memory.hand.lastStreet = isStreet(update.lastStreet) ? update.lastStreet : null
  }
}

export function recordHandResult(memory: BotSessionMemory, won: boolean): void {
  memory.handsPlayed++
  if (won) memory.handsWon++
}

function isStreet(value: string | null): value is NonNullable<BotSessionMemory['hand']['lastStreet']> {
  return value === 'preflop' || value === 'flop' || value === 'turn' || value === 'river'
}
