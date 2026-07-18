export function formatChips(value: number): string {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100
  return `€${rounded.toLocaleString('de-DE', {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Smallest cent-based chip unit that divides both blinds exactly. */
export function calculateChipUnit(smallBlind: number, bigBlind: number): number {
  const smallBlindCents = Math.max(1, Math.round(Math.abs(smallBlind) * 100))
  const bigBlindCents = Math.max(1, Math.round(Math.abs(bigBlind) * 100))

  let a = smallBlindCents
  let b = bigBlindCents
  while (b !== 0) {
    const remainder = a % b
    a = b
    b = remainder
  }

  return a / 100
}

export function snapToChipUnit(
  amount: number,
  origin: number,
  chipUnit: number,
  mode: 'nearest' | 'up' | 'down' = 'nearest',
): number {
  const offset = (roundToCents(amount) - origin) / chipUnit
  const steps = mode === 'up'
    ? Math.ceil(offset)
    : mode === 'down'
      ? Math.floor(offset)
      : Math.round(offset)
  return roundToCents(origin + steps * chipUnit)
}
