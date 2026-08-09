export interface CalibrationHandSeeds {
  deck: string
  decisions: string
}

/** Isolate each hand from action-dependent random consumption in earlier hands. */
export function calibrationHandSeeds(namespace: string, handNumber: number): CalibrationHandSeeds {
  if (!Number.isInteger(handNumber) || handNumber < 0) {
    throw new Error(`Invalid calibration hand number: ${handNumber}`)
  }
  return {
    deck: `${namespace}:hand:${handNumber}:deck`,
    decisions: `${namespace}:hand:${handNumber}:decisions`,
  }
}

/** Match the engine's former first-button position while making rotation explicit per fresh game. */
export function calibrationDealerIndex(handNumber: number, playerCount: number): number {
  if (!Number.isInteger(handNumber) || handNumber < 0) {
    throw new Error(`Invalid calibration hand number: ${handNumber}`)
  }
  if (!Number.isInteger(playerCount) || playerCount < 2) {
    throw new Error(`Invalid calibration player count: ${playerCount}`)
  }
  return (handNumber + 1) % playerCount
}
