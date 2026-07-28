import type { BotArchetypeId } from './bot-archetypes'
import type { DecisionContext, ScoredAction, ScoreContribution } from './bot-decision-types'
import { isAtLeast } from './bot-variant-evaluation'
import { determineLineCommitment, lineCommitmentModifiers } from './bot-line-planning'

function personalityDivisor(base: number, context: DecisionContext): number {
  return context.variantId === 'omaha-high' ? base * 1.3 : base
}

export function applyPersonalityModifiers(
  actions: ScoredAction[],
  context: DecisionContext,
): ScoredAction[] {
  const { botState } = context
  const { aggression, bluffFrequency, riskTolerance } = botState.personality
  const { tilt, confidence, patience } = botState.mentalState
  const marginalHand = !isAtLeast(context.handAssessment.category, 'strong')

  return actions.map(scored => {
    const contributions: ScoreContribution[] = []
    const aggressiveAction = scored.action.type === 'raise'
      || (scored.action.type === 'all-in' && ['value', 'protection', 'semi-bluff', 'bluff'].includes(scored.intent))

    if (aggressiveAction) {
      contributions.push({
        category: 'personality',
        label: 'Aggression',
        value: (aggression - 50) / personalityDivisor(3.5, context),
      })
      if (aggression < 30) {
        contributions.push({
          category: 'personality',
          label: 'Passive style avoids initiative',
          value: -((30 - aggression) * 1.1),
        })
      }
    }
    if (scored.action.type === 'fold') {
      contributions.push({
        category: 'personality',
        label: 'Aggression reduces folding',
        value: -(aggression - 50) / personalityDivisor(10, context),
      })
      if (marginalHand) {
        contributions.push({
          category: 'personality',
          label: 'Risk tolerance affects folding',
          value: -(riskTolerance - 50) / personalityDivisor(6, context),
        })
        contributions.push({
          category: 'personality',
          label: 'Patience supports folding',
          value: (patience - 50) / personalityDivisor(8, context),
        })
      }
    }
    if (scored.action.type === 'call' && marginalHand) {
      const hand = context.handAssessment
      const isDeadAir = hand.category === 'air' && hand.drawTypes.length === 0
      const callModScale = isDeadAir ? 0.5 : 1.0
      const ploCallDampener = context.variantId === 'omaha-high' ? 2.0 : 1.0
      contributions.push({
        category: 'personality',
        label: 'Risk tolerance affects calling',
        value: (riskTolerance - 50) / personalityDivisor(8, context) * callModScale / ploCallDampener,
      })
      contributions.push({
        category: 'personality',
        label: 'Patience reduces marginal calls',
        value: -(patience - 50) / personalityDivisor(12, context) * callModScale / ploCallDampener,
      })
    }
    if (aggressiveAction && scored.intent === 'bluff') {
      contributions.push({
        category: 'personality',
        label: 'Bluff frequency',
        value: (bluffFrequency - 50) / personalityDivisor(10, context),
      })
    }
    if (aggressiveAction && marginalHand) {
      contributions.push({
        category: 'personality',
        label: 'Risk tolerance affects aggression',
        value: (riskTolerance - 50) / personalityDivisor(5, context),
      })
      contributions.push({
        category: 'personality',
        label: 'Patience reduces marginal aggression',
        value: -(patience - 50) / 12,
      })
    }

    if (tilt > 50) {
      const intensity = (tilt - 50) / 50
      const archetypeName = botState.personality.archetype.name
      const archetypeId = mapArchetypeName(archetypeName)
      const tiltMods = TILT_BEHAVIOR_MODIFIERS[archetypeId]
      if (tiltMods) applyMentalTiltModifiers(scored, intensity, tiltMods, contributions)
    }

    if (confidence < 40) {
      const intensity = (40 - confidence) / 40
      const archetypeName = botState.personality.archetype.name
      const archetypeId = mapArchetypeName(archetypeName)
      const confMods = CONFIDENCE_BEHAVIOR_MODIFIERS[archetypeId]
      if (confMods) applyMentalConfidenceModifiers(scored, intensity, confMods, contributions)
    }

    if (patience < 40 && (scored.action.type === 'call' || aggressiveAction)) {
      const intensity = (40 - patience) / 40
      const archetypeName = botState.personality.archetype.name
      const archetypeId = mapArchetypeName(archetypeName)
      const patMods = PATIENCE_BEHAVIOR_MODIFIERS[archetypeId]
      if (patMods) {
        const ploCallScale = (context.variantId === 'omaha-high' && scored.action.type === 'call') ? 0.15 : 1.0
        if (ploCallScale !== 1.0) {
          const scaledMods: PatienceModifiers = { ...patMods, call: Math.round(patMods.call * ploCallScale) }
          applyMentalPatienceModifiers(scored, intensity, scaledMods, contributions)
        } else {
          applyMentalPatienceModifiers(scored, intensity, patMods, contributions)
        }
      }
    }

    if (context.botHabits) {
      for (const habit of context.botHabits) {
        contributions.push(...habit.modifier(scored, context))
      }
    }

    if (context.metrics) {
      contributions.push(...stackDepthFactors(scored, context))
    }

    if (context.streetAnalysis && context.gameView.phase !== 'preflop') {
      const commitment = determineLineCommitment(
        context.streetAnalysis,
        context.handAssessment.category,
        context.boardTexture,
        context.streetAnalysis.iAmPreflopAggressor,
      )
      contributions.push(...lineCommitmentModifiers(commitment, context.gameView.phase, scored))
    }

    return addContributions(scored, contributions)
  })
}

function addContributions(scored: ScoredAction, additions: ScoreContribution[]): ScoredAction {
  const adjustment = additions.reduce((sum, contribution) => sum + contribution.value, 0)
  const rawUtility = scored.utility + adjustment
  const utility = clampUtility(rawUtility)
  if (utility !== rawUtility) {
    additions.push({ category: 'base', label: 'Modifier utility cap', value: utility - rawUtility })
  }
  return {
    ...scored,
    utility,
    contributions: [...scored.contributions, ...additions],
  }
}

function clampUtility(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function stackDepthFactors(
  scored: ScoredAction,
  context: DecisionContext,
): ScoreContribution[] {
  const effBb = context.metrics.effectiveStackBb
  if (!effBb || effBb >= 50) return []

  const contributions: ScoreContribution[] = []
  const hand = context.handAssessment

  if (effBb <= 25) {
    if (scored.action.type === 'fold' && hand.category === 'weak') {
      contributions.push({ category: 'betting-context', label: `Short stack ${Math.round(effBb)} BB — fold marginal`, value: 8 })
    }
    if (scored.action.type === 'call' && hand.category !== 'strong' && hand.category !== 'premium') {
      contributions.push({ category: 'betting-context', label: `Short stack ${Math.round(effBb)} BB — preserve chips`, value: -10 })
    }
    if (effBb <= 12) {
      if (scored.action.type === 'raise' && (isAtLeast(hand.category, 'strong'))) {
        contributions.push({ category: 'betting-context', label: 'Very short stack — push or fold', value: 5 })
      }
      if (scored.action.type === 'call') {
        contributions.push({ category: 'betting-context', label: 'Very short stack — avoid calling', value: -8 })
      }
    }
    // Discourage non-all-in raises at ≤20 BB with non-premium hands
    if (effBb <= 20 && scored.action.type === 'raise' && hand.category !== 'premium') {
      const canShove = !!context.legalActions.allInAmount
      if (canShove && hand.category !== 'strong') {
        contributions.push({ category: 'betting-context', label: `Short stack ${Math.round(effBb)} BB — avoid raising non-premium`, value: -10 })
      }
    }
  } else if (effBb <= 40) {
    if (scored.action.type === 'call' && hand.category === 'air') {
      contributions.push({ category: 'betting-context', label: `Moderate stack ${Math.round(effBb)} BB — don\'t bleed`, value: -5 })
    }
  }

  return contributions
}

interface TiltModifiers {
  aggression: number
  fold: number
  call: number
}

interface ConfidenceModifiers {
  fold: number
  aggression: number
}

interface PatienceModifiers {
  call: number
  aggression: number
}

const TILT_BEHAVIOR_MODIFIERS: Record<BotArchetypeId, TiltModifiers> = {
  tag: { aggression: 15, fold: -10, call: 5 },
  nit: { aggression: -12, fold: 15, call: -5 },
  lag: { aggression: 20, fold: -18, call: 4 },
  'calling-station': { aggression: 4, fold: -8, call: 18 },
}

const CONFIDENCE_BEHAVIOR_MODIFIERS: Record<BotArchetypeId, ConfidenceModifiers> = {
  tag: { fold: 10, aggression: -8 },
  nit: { fold: 6, aggression: -3 },
  lag: { fold: 4, aggression: -5 },
  'calling-station': { fold: 8, aggression: -12 },
}

const PATIENCE_BEHAVIOR_MODIFIERS: Record<BotArchetypeId, PatienceModifiers> = {
  tag: { call: 8, aggression: 8 },
  nit: { call: 2, aggression: -5 },
  lag: { call: 8, aggression: 12 },
  'calling-station': { call: 18, aggression: -8 },
}

function mapArchetypeName(name: string): BotArchetypeId {
  switch (name) {
    case 'Nit': return 'nit'
    case 'LAG': return 'lag'
    case 'Calling Station': return 'calling-station'
    default: return 'tag'
  }
}

function applyMentalTiltModifiers(
  scored: ScoredAction,
  intensity: number,
  mods: TiltModifiers,
  contributions: ScoreContribution[],
): void {
  const aggressiveAction = scored.action.type === 'raise'
    || (scored.action.type === 'all-in' && ['value', 'protection', 'semi-bluff', 'bluff'].includes(scored.intent))

  if (aggressiveAction) {
    contributions.push({ category: 'mental-state', label: 'Tilt aggression', value: intensity * mods.aggression })
  }
  if (scored.action.type === 'fold') {
    contributions.push({ category: 'mental-state', label: 'Tilt affects folding', value: intensity * mods.fold })
  }
  if (scored.action.type === 'call') {
    contributions.push({ category: 'mental-state', label: 'Tilt affects calling', value: intensity * mods.call })
  }
}

function applyMentalConfidenceModifiers(
  scored: ScoredAction,
  intensity: number,
  mods: ConfidenceModifiers,
  contributions: ScoreContribution[],
): void {
  const aggressiveAction = scored.action.type === 'raise'
    || (scored.action.type === 'all-in' && ['value', 'protection', 'semi-bluff', 'bluff'].includes(scored.intent))

  if (scored.action.type === 'fold') {
    contributions.push({ category: 'mental-state', label: 'Low confidence caution', value: intensity * mods.fold })
  }
  if (aggressiveAction) {
    contributions.push({ category: 'mental-state', label: 'Low confidence reduces aggression', value: intensity * mods.aggression })
  }
}

function applyMentalPatienceModifiers(
  scored: ScoredAction,
  intensity: number,
  mods: PatienceModifiers,
  contributions: ScoreContribution[],
): void {
  const aggressiveAction = scored.action.type === 'raise'
    || (scored.action.type === 'all-in' && ['value', 'protection', 'semi-bluff', 'bluff'].includes(scored.intent))

  if (scored.action.type === 'call') {
    contributions.push({ category: 'mental-state', label: 'Low patience calls', value: intensity * mods.call })
  }
  if (aggressiveAction) {
    contributions.push({ category: 'mental-state', label: 'Low patience aggression', value: intensity * mods.aggression })
  }
}
