import type { BotReadsState, OpponentRead } from './bot-types'

const PRIOR_VPIP = { successes: 2.5, failures: 7.5 }
const PRIOR_AGGRESSION = { successes: 3, failures: 7 }
const PRIOR_FOLD_TO_BET = { successes: 5, failures: 5 }

export function getOpponentStats(read: OpponentRead): {
  vpip: number
  aggression: number
  foldToBet: number
  confidence: number
} {
  const totalSamples = read.vpipEstimate.successes + read.vpipEstimate.failures
  return {
    vpip: betaMean(read.vpipEstimate) * 100,
    aggression: betaMean(read.aggressionEstimate) * 100,
    foldToBet: betaMean(read.foldToBetEstimate) * 100,
    confidence: Math.min(1, totalSamples / 20),
  }
}

export function updateOpponentRead(
  reads: BotReadsState,
  opponentId: string,
  action: 'vpip' | 'aggression' | 'foldToBet' | 'no-vpip' | 'no-aggression' | 'no-fold',
  observationSkill: number,
): void {
  let read = reads.opponents.get(opponentId)
  if (!read) {
    read = {
      playerId: opponentId,
      vpipEstimate: { ...PRIOR_VPIP },
      aggressionEstimate: { ...PRIOR_AGGRESSION },
      foldToBetEstimate: { ...PRIOR_FOLD_TO_BET },
      handsSampled: 0,
    }
    reads.opponents.set(opponentId, read)
  }

  const learningMultiplier = 0.5 + (observationSkill / 100) * 1.5
  switch (action) {
    case 'vpip':
      read.vpipEstimate.successes += learningMultiplier
      read.handsSampled++
      break
    case 'no-vpip':
      read.vpipEstimate.failures += learningMultiplier
      read.handsSampled++
      break
    case 'aggression':
      read.aggressionEstimate.successes += learningMultiplier
      break
    case 'no-aggression':
      read.aggressionEstimate.failures += learningMultiplier
      break
    case 'foldToBet':
      read.foldToBetEstimate.successes += learningMultiplier
      break
    case 'no-fold':
      read.foldToBetEstimate.failures += learningMultiplier
      break
  }
}

function betaMean(estimate: { successes: number; failures: number }): number {
  const total = estimate.successes + estimate.failures
  return total > 0 ? estimate.successes / total : 0.5
}
