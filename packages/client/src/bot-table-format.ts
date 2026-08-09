export type BotTableFormat = 'full-ring' | 'six-max' | 'heads-up'

/**
 * Resolves the seated table format. This must never be called with the number
 * of players still active in the current pot.
 */
export function resolveTableFormat(tableSize: number): BotTableFormat {
  if (!Number.isInteger(tableSize) || tableSize < 2) {
    throw new Error(`Invalid table size: ${tableSize}`)
  }
  if (tableSize <= 2) return 'heads-up'
  if (tableSize <= 6) return 'six-max'
  return 'full-ring'
}
