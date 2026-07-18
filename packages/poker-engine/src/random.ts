export type RandomSeed = string | number
export type RandomSource = () => number

const UINT32_RANGE = 0x1_0000_0000

/** Cryptographically strong default source for normal, unseeded play. */
export const secureRandom: RandomSource = () => {
  const values = new Uint32Array(1)
  globalThis.crypto.getRandomValues(values)
  return values[0] / UINT32_RANGE
}

/**
 * Stable deterministic PRNG for tests, simulations and reproducible sessions.
 * It is intentionally not suitable for play where the seed is known to players.
 */
export function createSeededRandom(seed: RandomSeed): RandomSource {
  if (typeof seed === 'number' && !Number.isFinite(seed)) {
    throw new Error('Random seed number must be finite')
  }

  let state = hashSeed(`${typeof seed}:${String(seed)}`)
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE
  }
}

function hashSeed(seed: string): number {
  let hash = 0x811C9DC5
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
