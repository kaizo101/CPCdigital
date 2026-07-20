import type { ScoredAction, ScoreContribution } from './bot-decision-types'
import type { StreetAnalysis } from './bot-street-analysis'

export interface LineCommitment {
  /** The hand plan: bet, check-call, check-fold, bluff */
  plan: 'aggressive' | 'passive-call' | 'give-up' | null
  /** How many streets the plan spans */
  plannedStreets: number
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
    if (handCategory === 'nuts' || handCategory === 'strong') {
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

  if (handCategory === 'nuts') {
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
