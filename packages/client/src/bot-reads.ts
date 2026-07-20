import type { BotArchetypeId } from './bot-archetypes'
import type { BotReadsState, BotSkillState, MentalState, OpponentRead } from './bot-types'

const PRIOR_VPIP = { successes: 2.5, failures: 7.5 }
const PRIOR_AGGRESSION = { successes: 3, failures: 7 }
const PRIOR_FOLD_TO_BET = { successes: 5, failures: 5 }

interface ObservationProfile {
  learningRate: number
  hurriesReads: boolean
  noticesAggression: number
  noticesFolds: number
}

const OBSERVATION_PROFILES: Record<BotArchetypeId, ObservationProfile> = {
  tag: { learningRate: 1.0, hurriesReads: false, noticesAggression: 1.0, noticesFolds: 1.0 },
  nit: { learningRate: 1.15, hurriesReads: false, noticesAggression: 0.8, noticesFolds: 1.2 },
  lag: { learningRate: 0.85, hurriesReads: true, noticesAggression: 1.2, noticesFolds: 0.8 },
  'calling-station': { learningRate: 0.7, hurriesReads: true, noticesAggression: 0.6, noticesFolds: 0.9 },
}

export function getOpponentStats(read: OpponentRead): {
  vpip: number
  aggression: number
  foldToBet: number
  confidence: number
  sizingAvg: number
  sizingCount: number
} {
  const totalSamples = read.vpipEstimate.successes + read.vpipEstimate.failures
  return {
    vpip: betaMean(read.vpipEstimate) * 100,
    aggression: betaMean(read.aggressionEstimate) * 100,
    foldToBet: betaMean(read.foldToBetEstimate) * 100,
    confidence: readConfidence(read),
    sizingAvg: read.sizing.count > 0 ? read.sizing.average : 0,
    sizingCount: read.sizing.count,
  }
}

export function updateOpponentRead(
  reads: BotReadsState,
  opponentId: string,
  action: 'vpip' | 'aggression' | 'foldToBet' | 'no-vpip' | 'no-aggression' | 'no-fold',
  observationSkill: number,
  archetypeId?: BotArchetypeId,
): void {
  let read = reads.opponents.get(opponentId)
  if (!read) {
    const biasRng = hashToNumber(opponentId + ':read-bias')
    read = createOpponentRead(opponentId, biasRng)
    reads.opponents.set(opponentId, read)
  }

  const profile = archetypeId
    ? OBSERVATION_PROFILES[archetypeId]
    : { learningRate: 1.0, hurriesReads: false, noticesAggression: 1.0, noticesFolds: 1.0 }

  const baseMultiplier = 0.5 + (observationSkill / 100) * 1.5
  const archetypeMultiplier = profile.learningRate

  switch (action) {
    case 'vpip': {
      const multiplier = baseMultiplier * archetypeMultiplier
      read.vpipEstimate.successes += multiplier
      read.handsSampled++
      read.effectiveObservations += multiplier
      break
    }
    case 'no-vpip': {
      const multiplier = baseMultiplier * archetypeMultiplier
      read.vpipEstimate.failures += multiplier
      read.handsSampled++
      read.effectiveObservations += multiplier
      break
    }
    case 'aggression': {
      const multiplier = baseMultiplier * archetypeMultiplier * profile.noticesAggression
      read.aggressionEstimate.successes += multiplier
      read.effectiveObservations += multiplier * 0.5
      break
    }
    case 'no-aggression': {
      const multiplier = baseMultiplier * archetypeMultiplier * (2 - profile.noticesAggression)
      read.aggressionEstimate.failures += multiplier
      read.effectiveObservations += multiplier * 0.5
      break
    }
    case 'foldToBet': {
      const multiplier = baseMultiplier * archetypeMultiplier * profile.noticesFolds
      read.foldToBetEstimate.successes += multiplier
      read.effectiveObservations += multiplier * 0.5
      break
    }
    case 'no-fold': {
      const multiplier = baseMultiplier * archetypeMultiplier * (2 - profile.noticesFolds)
      read.foldToBetEstimate.failures += multiplier
      read.effectiveObservations += multiplier * 0.5
      break
    }
  }
}

export function updateOpponentSizing(
  reads: BotReadsState,
  opponentId: string,
  potFraction: number,
): void {
  let read = reads.opponents.get(opponentId)
  if (!read) {
    const biasRng = hashToNumber(opponentId + ':read-bias')
    read = createOpponentRead(opponentId, biasRng)
    reads.opponents.set(opponentId, read)
  }

  const alpha = 0.25
  read.sizing.count++
  read.sizing.average = read.sizing.average * (1 - alpha) + potFraction * alpha
}

export function getSizingTell(
  read: OpponentRead,
  currentPotFraction: number,
): { deviation: number; label: string } | null {
  if (read.sizing.count < 3) return null

  const avg = read.sizing.average
  if (avg <= 0) return null

  const deviation = currentPotFraction / avg

  if (deviation > 2.0) return { deviation, label: 'Massive overbet vs typical sizing' }
  if (deviation > 1.5) return { deviation, label: 'Overbet vs typical sizing' }
  if (deviation < 0.4) return { deviation, label: 'Unusually small bet vs typical sizing' }

  return null
}

export function shouldActOnRead(
  read: OpponentRead,
  mentalState: MentalState,
  archetypeId: BotArchetypeId,
): boolean {
  const profile = OBSERVATION_PROFILES[archetypeId]

  if (profile.hurriesReads && mentalState.patience < 50) {
    return read.handsSampled >= 2
  }

  if (mentalState.tilt > 60) {
    return read.handsSampled >= 1
  }

  return read.handsSampled >= 5
}

export function getReadConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'high'
  if (confidence >= 0.5) return 'moderate'
  if (confidence >= 0.3) return 'low'
  return 'very low'
}

export function readConfidence(read: OpponentRead): number {
  const effectiveObs = Math.max(0.1, read.effectiveObservations)

  const vpipStrength = read.vpipEstimate.successes + read.vpipEstimate.failures
  const betaVariance = vpipStrength > 0
    ? (read.vpipEstimate.successes * read.vpipEstimate.failures)
    / (vpipStrength * vpipStrength * (vpipStrength + 1))
    : 0

  const sampleConfidence = Math.min(1, effectiveObs / 15)
  const stabilityBonus = Math.max(0, 1 - Math.sqrt(betaVariance) * 5)

  return sampleConfidence * (0.3 + 0.7 * stabilityBonus)
}

export function createOpponentRead(opponentId: string, biasRng: number): OpponentRead {
  const vpipBias = 0.85 + biasRng * 0.3
  const aggressionBias = 0.85 + ((biasRng * 1.7) % 1) * 0.3
  const foldBias = 0.85 + ((biasRng * 3.1) % 1) * 0.3

  const sizingBias = 0.85 + ((biasRng * 2.3) % 1) * 0.3

  return {
    playerId: opponentId,
    vpipEstimate: {
      successes: PRIOR_VPIP.successes * vpipBias,
      failures: PRIOR_VPIP.failures / vpipBias,
    },
    aggressionEstimate: {
      successes: PRIOR_AGGRESSION.successes * aggressionBias,
      failures: PRIOR_AGGRESSION.failures / aggressionBias,
    },
    foldToBetEstimate: {
      successes: PRIOR_FOLD_TO_BET.successes * foldBias,
      failures: PRIOR_FOLD_TO_BET.failures / foldBias,
    },
    handsSampled: 0,
    effectiveObservations: 0,
    sizing: {
      average: 0.6 * sizingBias,
      count: 0,
    },
  }
}

function betaMean(estimate: { successes: number; failures: number }): number {
  const total = estimate.successes + estimate.failures
  return total > 0 ? estimate.successes / total : 0.5
}

function hashToNumber(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash) / 2147483648
}
