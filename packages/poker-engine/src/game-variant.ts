import type { BettingStructure } from './betting'

export type { BettingStructure }

export interface CommunityDealDefinition {
  readonly target: 'community'
  readonly count: number
}

export interface BettingPhaseDefinition {
  readonly id: string
  readonly kind: 'betting'
  /** Cards dealt immediately before this betting phase; null for the opening phase. */
  readonly dealBefore: CommunityDealDefinition | null
  readonly actionOrder: 'after-big-blind' | 'left-of-dealer'
  /** Minimum full bet/raise unit expressed in big blinds. */
  readonly minimumBetBigBlinds: number
}

/** Reserved by the phase model for draw variants; PokerGame does not execute it yet. */
export interface DrawPhaseDefinition {
  readonly id: string
  readonly kind: 'draw'
  readonly maximumCards: number
}

export type VariantPhaseDefinition = BettingPhaseDefinition | DrawPhaseDefinition

export interface GameVariant {
  readonly id: string
  readonly name: string
  readonly holeCardsPerPlayer: number
  readonly bettingStructure: BettingStructure
  readonly phases: readonly [VariantPhaseDefinition, ...VariantPhaseDefinition[]]
}

export function cloneGameVariant(variant: GameVariant): GameVariant {
  const phases = variant.phases.map(phase => phase.kind === 'betting'
    ? {
        ...phase,
        dealBefore: phase.dealBefore ? { ...phase.dealBefore } : null,
      }
    : { ...phase })
  return {
    ...variant,
    bettingStructure: { ...variant.bettingStructure },
    phases: [phases[0], ...phases.slice(1)],
  }
}

export function validateGameVariant(variant: GameVariant): void {
  if (!variant.id.trim()) throw new Error('Variant id must not be empty')
  if (!variant.name.trim()) throw new Error('Variant name must not be empty')
  if (!Number.isInteger(variant.holeCardsPerPlayer) || variant.holeCardsPerPlayer <= 0) {
    throw new Error('Variant hole-card count must be a positive integer')
  }
  if (variant.phases.length === 0) throw new Error('Variant requires at least one phase')

  const phaseIds = new Set<string>()
  for (const [phaseIndex, phase] of variant.phases.entries()) {
    if (!phase.id.trim()) throw new Error('Variant phase id must not be empty')
    if (phase.id === 'waiting' || phase.id === 'showdown' || phase.id === 'complete') {
      throw new Error(`Variant phase id ${phase.id} is reserved`)
    }
    if (phaseIds.has(phase.id)) throw new Error(`Duplicate variant phase id ${phase.id}`)
    phaseIds.add(phase.id)

    if (phase.kind === 'betting') {
      if (!Number.isFinite(phase.minimumBetBigBlinds) || phase.minimumBetBigBlinds <= 0) {
        throw new Error(`Betting phase ${phase.id} requires a positive minimum bet`)
      }
      if (phase.dealBefore && (!Number.isInteger(phase.dealBefore.count) || phase.dealBefore.count <= 0)) {
        throw new Error(`Betting phase ${phase.id} requires a positive community-card count`)
      }
      if (phaseIndex > 0 && phase.actionOrder !== 'left-of-dealer') {
        throw new Error(`Betting phase ${phase.id} must act left of the dealer`)
      }
    } else if (!Number.isInteger(phase.maximumCards) || phase.maximumCards <= 0) {
      throw new Error(`Draw phase ${phase.id} requires a positive maximum-card count`)
    }
  }

  const openingPhase = variant.phases[0]
  if (openingPhase.kind !== 'betting' || openingPhase.dealBefore !== null) {
    throw new Error('Variant opening phase must be a betting phase without a preceding deal')
  }
  if (openingPhase.actionOrder !== 'after-big-blind') {
    throw new Error('Variant opening betting phase must act after the big blind')
  }

  if (variant.bettingStructure.type === 'fixed-limit') {
    if (!Number.isInteger(variant.bettingStructure.maxRaisesPerRound)
      || variant.bettingStructure.maxRaisesPerRound <= 0) {
      throw new Error('Fixed-limit variants require a positive raise cap')
    }
  }
}
