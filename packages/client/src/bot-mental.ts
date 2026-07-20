import type { BotArchetypeId } from './bot-archetypes'
import type { BotPersonalityState, MentalEvent, MentalState } from './bot-types'

const ARCHETYPE_MENTAL_MULTIPLIERS: Record<BotArchetypeId, Partial<Record<MentalEvent['type'], number>>> = {
  tag: {},
  nit: {
    'lost-small-pot': 0.7,
    'lost-big-pot': 1.2,
    'bad-beat': 1.4,
    'bluff-caught': 0.5,
    'successful-bluff': 0.6,
    'coolered': 1.3,
  },
  lag: {
    'won-small-pot': 1.3,
    'lost-small-pot': 0.6,
    'lost-big-pot': 1.3,
    'bad-beat': 1.1,
    'bluff-caught': 1.3,
    'successful-bluff': 1.3,
    'coolered': 1.2,
  },
  'calling-station': {
    'lost-small-pot': 0.5,
    'lost-big-pot': 0.7,
    'bad-beat': 0.6,
    'bluff-caught': 0.4,
    'successful-bluff': 0.7,
    'coolered': 0.8,
  },
}

export function updateMentalState(
  state: MentalState,
  personality: Readonly<BotPersonalityState>,
  event: MentalEvent,
  _bigBlind: number,
): void {
  const { tiltSensitivity, tiltRecovery, emotionality } = personality
  const archetypeName = personality.archetype.name
  const archetypeId = (
    archetypeName === 'TAG' ? 'tag' :
    archetypeName === 'Nit' ? 'nit' :
    archetypeName === 'LAG' ? 'lag' :
    archetypeName === 'Calling Station' ? 'calling-station' :
    'tag'
  ) as BotArchetypeId
  const archetypeMultiplier = ARCHETYPE_MENTAL_MULTIPLIERS[archetypeId]?.[event.type] ?? 1
  const ms = state

  // Calculate event severity (0-1)
  const severity = Math.min(1, event.potBb / 20)  // 20BB = max severity

  // Calculate emotional impact
  const emotionalImpact = severity * (emotionality / 100)

  switch (event.type) {
    case 'won-small-pot':
      ms.confidence = Math.min(100, ms.confidence + 3 * emotionalImpact * archetypeMultiplier)
      ms.momentum = Math.min(100, ms.momentum + 5 * emotionalImpact * archetypeMultiplier)
      ms.tilt = Math.max(0, ms.tilt - 2 * (tiltRecovery / 100) * archetypeMultiplier)
      ms.patience = Math.min(100, ms.patience + 2 * archetypeMultiplier)
      break

    case 'lost-small-pot':
      ms.confidence = Math.max(0, ms.confidence - 2 * emotionalImpact * archetypeMultiplier)
      ms.momentum = Math.max(-100, ms.momentum - 3 * emotionalImpact * archetypeMultiplier)
      ms.tilt = Math.min(100, ms.tilt + 3 * (tiltSensitivity / 100) * archetypeMultiplier)
      ms.patience = Math.max(0, ms.patience - 2 * archetypeMultiplier)
      break

    case 'lost-big-pot':
      ms.confidence = Math.max(0, ms.confidence - 5 * emotionalImpact * archetypeMultiplier)
      ms.momentum = Math.max(-100, ms.momentum - 8 * emotionalImpact * archetypeMultiplier)
      ms.tilt = Math.min(100, ms.tilt + 8 * (tiltSensitivity / 100) * archetypeMultiplier)
      ms.patience = Math.max(0, ms.patience - 5 * archetypeMultiplier)
      break

    case 'bad-beat':
      const badBeatSeverity = (1 - event.equityBeforeRiver) * 2
      ms.confidence = Math.max(0, ms.confidence - 8 * badBeatSeverity * emotionalImpact * archetypeMultiplier)
      ms.momentum = Math.max(-100, ms.momentum - 15 * badBeatSeverity * emotionalImpact * archetypeMultiplier)
      ms.tilt = Math.min(100, ms.tilt + 15 * badBeatSeverity * (tiltSensitivity / 100) * archetypeMultiplier)
      if (event.opponentId) {
        const currentFrustration = ms.frustration.get(event.opponentId) ?? 0
        ms.frustration.set(event.opponentId, Math.min(100, currentFrustration + 10 * emotionalImpact * archetypeMultiplier))
      }
      ms.patience = Math.max(0, ms.patience - 10 * archetypeMultiplier)
      break

    case 'bluff-caught':
      ms.confidence = Math.max(0, ms.confidence - 6 * emotionalImpact * archetypeMultiplier)
      ms.momentum = Math.max(-100, ms.momentum - 10 * emotionalImpact * archetypeMultiplier)
      ms.tilt = Math.min(100, ms.tilt + 5 * (tiltSensitivity / 100) * archetypeMultiplier)
      ms.patience = Math.max(0, ms.patience - 3 * archetypeMultiplier)
      break

    case 'successful-bluff':
      ms.confidence = Math.min(100, ms.confidence + 7 * emotionalImpact * archetypeMultiplier)
      ms.momentum = Math.min(100, ms.momentum + 10 * emotionalImpact * archetypeMultiplier)
      ms.tilt = Math.max(0, ms.tilt - 3 * (tiltRecovery / 100) * archetypeMultiplier)
      ms.patience = Math.min(100, ms.patience + 3 * archetypeMultiplier)
      break

    case 'suckout-win':
      ms.confidence = Math.min(100, ms.confidence + 5 * emotionalImpact * archetypeMultiplier)
      ms.momentum = Math.min(100, ms.momentum + 12 * emotionalImpact * archetypeMultiplier)
      ms.tilt = Math.max(0, ms.tilt - 2 * (tiltRecovery / 100) * archetypeMultiplier)
      ms.patience = Math.min(100, ms.patience + 2 * archetypeMultiplier)
      break

    case 'coolered':
      ms.confidence = Math.max(0, ms.confidence - 7 * emotionalImpact * archetypeMultiplier)
      ms.momentum = Math.max(-100, ms.momentum - 12 * emotionalImpact * archetypeMultiplier)
      ms.tilt = Math.min(100, ms.tilt + 10 * (tiltSensitivity / 100) * archetypeMultiplier)
      if (event.opponentId) {
        const currentFrustration = ms.frustration.get(event.opponentId) ?? 0
        ms.frustration.set(event.opponentId, Math.min(100, currentFrustration + 8 * emotionalImpact * archetypeMultiplier))
      }
      ms.patience = Math.max(0, ms.patience - 5 * archetypeMultiplier)
      break
  }

  // Natural decay: tilt decreases over time, momentum regresses to 0
  ms.tilt = Math.max(0, ms.tilt - 1 * (tiltRecovery / 100))
  // Decay all frustrations
  for (const [opponentId, frustration] of ms.frustration.entries()) {
    const decayed = Math.max(0, frustration - 2)
    if (decayed === 0) {
      ms.frustration.delete(opponentId)
    } else {
      ms.frustration.set(opponentId, decayed)
    }
  }
  ms.momentum = ms.momentum * 0.95  // Regress to 0

}
