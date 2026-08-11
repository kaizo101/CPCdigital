export interface ForcedAllInSeverity {
  stack: number
  price: number
  combined: number
}

/** Linear 0..1 progress with inclusive zero/full boundaries. */
export function calculateLinearSeverity(
  value: number,
  zeroAt: number,
  fullAt: number,
): number {
  if (value <= zeroAt) return 0
  if (value >= fullAt) return 1
  return (value - zeroAt) / (fullAt - zeroAt)
}

/** Inverse 1..0 progress used for skill-dependent human error. */
export function calculateInverseSeverity(
  value: number,
  fullAt: number,
  zeroAt: number,
): number {
  if (value <= fullAt) return 1
  if (value >= zeroAt) return 0
  return (zeroAt - value) / (zeroAt - fullAt)
}

/**
 * Stack exposure and price are independent axes, but combine
 * multiplicatively: either zero axis neutralizes the complete penalty.
 */
export function calculateForcedAllInSeverity(
  forcedAllInRatio: number,
  potOdds: number,
  thresholds: {
    forcedAllInStart: number
    forcedAllInFull: number
    freePriceThreshold: number
    fullPriceThreshold: number
  },
): ForcedAllInSeverity {
  const stack = calculateLinearSeverity(
    forcedAllInRatio,
    thresholds.forcedAllInStart,
    thresholds.forcedAllInFull,
  )
  const price = calculateLinearSeverity(
    potOdds,
    thresholds.freePriceThreshold,
    thresholds.fullPriceThreshold,
  )
  return { stack, price, combined: stack * price }
}
