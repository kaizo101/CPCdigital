export function formatChips(value: number): string {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100
  return `€${rounded.toLocaleString('de-DE', {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

/** Editable chip amount without currency sign, grouping, or redundant zeroes. */
export function formatChipInput(value: number): string {
  const rounded = roundToCents(value)
  if (!Number.isFinite(rounded)) return ''
  return rounded.toLocaleString('de-DE', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export function sanitizeChipInput(rawValue: string): string {
  const raw = rawValue.replace(/[^\d,.]/g, '')
  const separatorIndex = raw.search(/[,.]/)
  const whole = separatorIndex < 0 ? raw : raw.slice(0, separatorIndex)
  const decimals = separatorIndex < 0
    ? ''
    : raw.slice(separatorIndex + 1).replace(/[,.]/g, '').slice(0, 2)
  const separator = separatorIndex < 0 ? '' : raw[separatorIndex]
  return `${whole}${separator}${decimals}`
}

export function parseChipInput(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
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
