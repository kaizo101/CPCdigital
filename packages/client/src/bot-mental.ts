import type { BotPersonalityState, MentalEvent, MentalState } from './bot-types'

// Update mental state based on event
export function updateMentalState(
  state: MentalState,
  personality: Readonly<BotPersonalityState>,
  event: MentalEvent,
  _bigBlind: number,
): void {
  const { tiltSensitivity, tiltRecovery, emotionality } = personality
  const ms = state

  // Calculate event severity (0-1)
  const severity = Math.min(1, event.potBb / 20)  // 20BB = max severity

  // Calculate emotional impact
  const emotionalImpact = severity * (emotionality / 100)

  switch (event.type) {
    case 'won-small-pot':
      ms.confidence = Math.min(100, ms.confidence + 3 * emotionalImpact)
      ms.momentum = Math.min(100, ms.momentum + 5 * emotionalImpact)
      ms.tilt = Math.max(0, ms.tilt - 2 * (tiltRecovery / 100))
      ms.patience = Math.min(100, ms.patience + 2)
      break

    case 'lost-small-pot':
      ms.confidence = Math.max(0, ms.confidence - 2 * emotionalImpact)
      ms.momentum = Math.max(-100, ms.momentum - 3 * emotionalImpact)
      ms.tilt = Math.min(100, ms.tilt + 3 * (tiltSensitivity / 100))
      ms.patience = Math.max(0, ms.patience - 2)
      break

    case 'lost-big-pot':
      ms.confidence = Math.max(0, ms.confidence - 5 * emotionalImpact)
      ms.momentum = Math.max(-100, ms.momentum - 8 * emotionalImpact)
      ms.tilt = Math.min(100, ms.tilt + 8 * (tiltSensitivity / 100))
      ms.patience = Math.max(0, ms.patience - 5)
      break

    case 'bad-beat':
      // Bad beats cause significant tilt
      const badBeatSeverity = (1 - event.equityBeforeRiver) * 2  // Lower equity = worse beat
      ms.confidence = Math.max(0, ms.confidence - 8 * badBeatSeverity * emotionalImpact)
      ms.momentum = Math.max(-100, ms.momentum - 15 * badBeatSeverity * emotionalImpact)
      ms.tilt = Math.min(100, ms.tilt + 15 * badBeatSeverity * (tiltSensitivity / 100))
      // Frustration is opponent-specific
      if (event.opponentId) {
        const currentFrustration = ms.frustration.get(event.opponentId) ?? 0
        ms.frustration.set(event.opponentId, Math.min(100, currentFrustration + 10 * emotionalImpact))
      }
      ms.patience = Math.max(0, ms.patience - 10)
      break

    case 'bluff-caught':
      ms.confidence = Math.max(0, ms.confidence - 6 * emotionalImpact)
      ms.momentum = Math.max(-100, ms.momentum - 10 * emotionalImpact)
      ms.tilt = Math.min(100, ms.tilt + 5 * (tiltSensitivity / 100))
      ms.patience = Math.max(0, ms.patience - 3)
      break

    case 'successful-bluff':
      ms.confidence = Math.min(100, ms.confidence + 7 * emotionalImpact)
      ms.momentum = Math.min(100, ms.momentum + 10 * emotionalImpact)
      ms.tilt = Math.max(0, ms.tilt - 3 * (tiltRecovery / 100))
      ms.patience = Math.min(100, ms.patience + 3)
      break

    case 'suckout-win':
      // Winning with a lucky hit
      ms.confidence = Math.min(100, ms.confidence + 5 * emotionalImpact)
      ms.momentum = Math.min(100, ms.momentum + 12 * emotionalImpact)
      ms.tilt = Math.max(0, ms.tilt - 2 * (tiltRecovery / 100))
      ms.patience = Math.min(100, ms.patience + 2)
      break

    case 'coolered':
      // Losing with a very strong hand
      ms.confidence = Math.max(0, ms.confidence - 7 * emotionalImpact)
      ms.momentum = Math.max(-100, ms.momentum - 12 * emotionalImpact)
      ms.tilt = Math.min(100, ms.tilt + 10 * (tiltSensitivity / 100))
      // Frustration is opponent-specific
      if (event.opponentId) {
        const currentFrustration = ms.frustration.get(event.opponentId) ?? 0
        ms.frustration.set(event.opponentId, Math.min(100, currentFrustration + 8 * emotionalImpact))
      }
      ms.patience = Math.max(0, ms.patience - 5)
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
