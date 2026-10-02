import type { DecisionContext, ScoredAction, ScoreContribution } from './bot-decision-types'
import type { BotHandMemory } from './bot-types'
import { params } from './bot-params'
import { analysisSkillWeight } from './bot-skill-gates'
import type { StreetAnalysis } from './bot-street-analysis'

export interface FlopTurnLineReview {
  intent: 'bluff' | 'semi-bluff'
  status: 'continue' | 'replan' | 'abort' | 'unrecognized'
  reason: string
}

/** Remember only an opening flop bet actually selected as bluff/semi-bluff. */
export function chosenFlopLine(
  context: DecisionContext,
  chosen: ScoredAction,
): BotHandMemory['flopLine'] {
  if (
    context.gameView.phase !== 'flop'
    || chosen.action.type !== 'raise'
    || context.metrics.callAmount > 0
    || (chosen.intent !== 'bluff' && chosen.intent !== 'semi-bluff')
  ) return null
  return {
    intent: chosen.intent,
    opponentsAtBet: context.streetAnalysis?.activeOpponents
      ?? Math.max(0, context.activePlayerCount - 1),
  }
}

/** Reconsider a chosen flop bluff from perceived, public turn information. */
export function reviewFlopTurnLine(context: DecisionContext): FlopTurnLineReview | null {
  const line = context.botState.memory.hand.flopLine
  if (context.gameView.phase !== 'turn' || !line) return null
  const review = (status: FlopTurnLineReview['status'], reason: string): FlopTurnLineReview => ({
    intent: line.intent, status, reason,
  })
  const hand = context.handAssessment
  const analysis = context.streetAnalysis
  if (analysisSkillWeight(context.botState.skill.level, 'boardDynamics') === 0) {
    return review('unrecognized', 'Skill does not support a reliable multi-street plan')
  }
  if (hand.made && (hand.category === 'good' || hand.category === 'strong' || hand.category === 'premium')) {
    return review('replan', 'Turn hand improved; reassess as value, not a bluff')
  }
  if (line.opponentsAtBet !== 1 || analysis?.activeOpponents !== 1) {
    return review('abort', 'Multiway pressure makes the flop bluff plan unreliable')
  }
  if (
    analysis.streetAggressor.flop !== context.botId
    || analysis.streetAggression?.flop.orderedAggressors.some(id => id !== context.botId)
  ) return review('abort', 'Opponent raised the flop bluff')
  if (context.metrics.callAmount > 0) return review('abort', 'Opponent took the turn initiative')
  const collapseLimit = context.variantId === 'omaha-high' ? 0.12 : 0.2
  if (hand.boardGotWorse || hand.equityCollapse >= collapseLimit) {
    return review('abort', 'Turn card worsened the perceived hand or board')
  }

  if (context.variantId === 'omaha-high') {
    const nutDraw = hand.drawTypes.includes('nut-flush-draw')
      || hand.drawTypes.includes('nut-wrap')
    if (
      line.intent === 'semi-bluff'
      && nutDraw
      && hand.cleanOuts >= 4
    ) return review('continue', 'PLO nut-relevant draw still supports a selective barrel')
    return review('abort', 'PLO bluff lacks a nut-relevant continuation')
  }
  if (line.intent === 'semi-bluff' && hand.drawTypes.length > 0 && hand.cleanOuts >= 4) {
    return review('continue', 'NLHE draw still has clean outs')
  }
  if (line.intent === 'bluff' && (context.boardTexture === 'dry' || hand.blockerValue >= 20)) {
    return review('continue', 'NLHE dry runout or relevant blocker supports pressure')
  }
  return review('abort', 'NLHE bluff lost its turn continuation')
}

export function flopTurnLineModifiers(
  context: DecisionContext,
  scored: ScoredAction,
): ScoreContribution[] {
  const review = reviewFlopTurnLine(context)
  if (!review || review.status === 'replan' || review.status === 'unrecognized') return []
  const weight = analysisSkillWeight(context.botState.skill.level, 'boardDynamics')
  const type = scored.action.type
  const value = review.status === 'continue'
    ? type === 'raise' ? 2 * weight : type === 'check' ? -1 * weight : 0
    : context.metrics.callAmount <= 0
      ? type === 'raise' ? -2 * weight : type === 'check' ? 1 * weight : 0
      : type === 'raise' ? -2 * weight : 0
  return value === 0 ? [] : [{
    category: 'strategy',
    label: `Flop ${review.intent} line: ${review.status} — ${review.reason}`,
    value,
  }]
}

export interface LineCommitment {
  /** The hand plan: bet, check-call, check-fold, bluff */
  plan: 'aggressive' | 'passive-call' | 'give-up' | null
  /** How many streets the plan spans */
  plannedStreets: number
}

function isNlheRiverThinValue(context: DecisionContext): boolean {
  const config = params.scoring.betFoldMods
  const hand = context.handAssessment
  return context.variantId === 'texas-holdem'
    && context.gameView.phase === 'river'
    && context.botState.skill.level >= config.skillGate
    && (context.streetAnalysis?.activeOpponents ?? Math.max(1, context.activePlayerCount - 1)) === 1
    && hand.made
    && (hand.category === 'medium' || hand.category === 'good')
    && hand.showdownValue >= config.minimumShowdownValue
    && hand.relativeStrength >= config.minimumRelativeStrength
    && hand.nutPotential !== 'nuts'
    && hand.nutPotential !== 'near-nuts'
    && hand.nutPotential !== 'second-nuts'
}

/** True before a thin river value-bet that should not stack off to a raise. */
export function isNlheRiverBetFoldOpening(context: DecisionContext): boolean {
  return isNlheRiverThinValue(context)
    && context.metrics.callAmount <= 0
    && context.legalActions.check
    && context.legalActions.raise !== null
}

/** True only for the second decision in an explicitly remembered bet → raise sequence. */
export function isNlheRiverBetFoldResponse(context: DecisionContext): boolean {
  return isNlheRiverThinValue(context)
    && context.metrics.callAmount > 0
    && context.botState.memory.hand.betFoldStreet === 'river'
    && context.streetAnalysis?.iBetCurrentStreet === true
    && context.streetAnalysis.opponentRaisedMyBetCurrentStreet === true
}

export function betFoldLineModifiers(
  context: DecisionContext,
  scored: ScoredAction,
): ScoreContribution[] {
  const config = params.scoring.betFoldMods
  if (isNlheRiverBetFoldOpening(context)) {
    const aggression = Math.max(0, Math.min(1, context.botState.personality.aggression / 100))
    const scale = 0.75 + aggression * 0.5
    const value = scored.action.type === 'raise'
      ? config.openBet
      : scored.action.type === 'check'
        ? config.openCheck
        : scored.action.type === 'all-in'
          ? config.openAllIn
          : 0
    if (value === 0) return []
    return [{
      category: 'strategy',
      label: 'NLHE river bet-fold plan — thin value',
      value: Math.round(value * scale),
    }]
  }

  if (!isNlheRiverBetFoldResponse(context)) return []
  const riskTolerance = Math.max(0, Math.min(1, context.botState.personality.riskTolerance / 100))
  const disciplineScale = config.minimumDisciplineScale
    + (1 - config.minimumDisciplineScale) * (1 - riskTolerance)
  const pressureScale = Math.min(
    config.maxPressureScale,
    0.75 + Math.max(0, context.metrics.toCallPotRatio),
  )
  const scale = disciplineScale * pressureScale
  const value = scored.action.type === 'fold'
    ? config.responseFold
    : scored.action.type === 'call'
      ? config.responseCall
      : scored.action.type === 'raise'
        ? config.responseRaise
        : scored.action.type === 'all-in'
          ? config.responseAllIn
          : 0
  if (value === 0) return []
  return [{
    category: 'strategy',
    label: 'NLHE river bet-fold plan — opponent raised thin value',
    value: Math.round(value * scale),
  }]
}

export function betFoldEscalationBlocked(
  context: DecisionContext,
  scored: ScoredAction,
): boolean {
  return isNlheRiverBetFoldResponse(context)
    && (scored.action.type === 'raise' || scored.action.type === 'all-in')
}

export function determineLineCommitment(
  analysis: StreetAnalysis,
  handCategory: string,
  boardTexture: string,
  iAmPreflopAggressor: boolean,
): LineCommitment {
  const plan: LineCommitment = { plan: null, plannedStreets: 0 }

  if (!iAmPreflopAggressor && handCategory === 'air') {
    return { plan: 'give-up', plannedStreets: 0 }
  }

  if (iAmPreflopAggressor) {
    if (handCategory === 'premium' || handCategory === 'strong') {
      return { plan: 'aggressive', plannedStreets: 3 }
    }
    if (handCategory === 'medium') {
      if (analysis.activeOpponents >= 3) {
        return { plan: 'passive-call', plannedStreets: 1 }
      }
      return { plan: 'aggressive', plannedStreets: 2 }
    }
    if (boardTexture === 'dry') {
      return { plan: 'aggressive', plannedStreets: 1 }
    }
    return { plan: 'give-up', plannedStreets: 0 }
  }

  if (handCategory === 'premium') {
    return { plan: 'aggressive', plannedStreets: 3 }
  }
  if (handCategory === 'strong') {
    return { plan: 'aggressive', plannedStreets: 2 }
  }
  if (handCategory === 'medium') {
    return { plan: 'passive-call', plannedStreets: 2 }
  }

  return { plan: 'give-up', plannedStreets: 0 }
}

export function lineCommitmentModifiers(
  commitment: LineCommitment,
  phase: string,
  scored: ScoredAction,
): ScoreContribution[] {
  if (!commitment.plan) return []

  const contributions: ScoreContribution[] = []

  if (commitment.plan === 'aggressive') {
    if (phase === 'flop' && commitment.plannedStreets >= 2) {
      if (scored.action.type === 'raise') {
        contributions.push({ category: 'position', label: 'Line: aggressive multi-street', value: 8 })
      }
      if (scored.action.type === 'check' || scored.action.type === 'fold') {
        contributions.push({ category: 'position', label: 'Line: abandons aggressive plan', value: -10 })
      }
    }
    if ((phase === 'turn' || phase === 'river') && commitment.plannedStreets >= 2) {
      const streetNum = phase === 'turn' ? 2 : 3
      if (commitment.plannedStreets >= streetNum) {
        if (scored.action.type === 'raise') {
          contributions.push({ category: 'position', label: `Line: continues ${streetNum}-street aggression`, value: 6 })
        }
        if (scored.action.type === 'fold') {
          contributions.push({ category: 'position', label: 'Line: breaks aggressive plan', value: -8 })
        }
      }
    }
  }

  if (commitment.plan === 'passive-call') {
    if (scored.action.type === 'call') {
      contributions.push({ category: 'position', label: 'Line: passive call-down', value: 6 })
    }
    if (scored.action.type === 'fold' && phase !== 'river') {
      contributions.push({ category: 'position', label: 'Line: folds marginal hand early', value: -5 })
    }
  }

  if (commitment.plan === 'give-up') {
    if (scored.action.type === 'fold' || scored.action.type === 'check') {
      contributions.push({ category: 'position', label: 'Line: gives up', value: 5 })
    }
    if (scored.action.type === 'raise') {
      contributions.push({ category: 'position', label: 'Line: bluffs after giving up', value: -6 })
    }
  }

  return contributions
}
