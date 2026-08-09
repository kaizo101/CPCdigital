import type { BotArchetypeId } from './bot-archetypes'
import { getNlheScores, getPloScores, type PloStreet } from './bot-category-scores'
import { params, type BotParams } from './bot-params'
import type { CategoryScoreTable } from './bot-variant-evaluation'

const ARCHETYPES: BotArchetypeId[] = ['tag', 'nit', 'lag', 'calling-station']
const TABLE_SIZES = [9, 6, 2] as const
const PLO_STREETS: PloStreet[] = ['preflop', 'flop', 'turn', 'river']
const ACTIONS = ['fold', 'check', 'call', 'raise', 'allIn'] as const
const HAND_CATEGORIES = ['air', 'weak', 'marginal', 'medium', 'good', 'strong', 'premium'] as const
const DRAW_CATEGORIES = ['weak-draw', 'weak-no-draw'] as const

interface NamedScoreTable {
  name: string
  table: CategoryScoreTable
}

function resolvedScoreTables(): NamedScoreTable[] {
  const result: NamedScoreTable[] = ARCHETYPES.map(archetype => ({
    name: `nlhe/${archetype}`,
    table: getNlheScores(archetype),
  }))
  for (const archetype of ARCHETYPES) {
    for (const street of PLO_STREETS) {
      for (const tableSize of TABLE_SIZES) {
        result.push({
          name: `plo/${archetype}/${street}/${tableSize}`,
          table: getPloScores(archetype, street, tableSize),
        })
      }
    }
  }
  return result
}

function validateScoreTable(name: string, table: CategoryScoreTable): string[] {
  const violations: string[] = []
  for (const action of ACTIONS) {
    const scores = table[action]
    const required = action === 'raise' || action === 'allIn'
      ? [...HAND_CATEGORIES, ...DRAW_CATEGORIES]
      : HAND_CATEGORIES
    for (const category of required) {
      if (!Number.isFinite(scores[category])) {
        violations.push(`${name}.${action}.${category} must be finite`)
      }
    }
    for (const [category, score] of Object.entries(scores)) {
      if (!Number.isFinite(score)) violations.push(`${name}.${action}.${category} must be finite`)
      if (Math.abs(score) > 100) violations.push(`${name}.${action}.${category} must stay within -100..100`)
    }
  }

  for (let index = 1; index < HAND_CATEGORIES.length; index++) {
    const weaker = HAND_CATEGORIES[index - 1]
    const stronger = HAND_CATEGORIES[index]
    if (table.allIn[stronger] < table.allIn[weaker]) {
      violations.push(`${name}.allIn must not decrease from ${weaker} to ${stronger}`)
    }
  }
  return violations
}

function validateClamp(
  violations: string[],
  name: string,
  minimum: number,
  maximum: number,
): void {
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    violations.push(`${name} clamp bounds must be finite`)
  } else if (minimum > maximum) {
    violations.push(`${name} clamp minimum must not exceed maximum`)
  }
}

/** Validate score tables and parameters before calibration-sensitive changes run. */
export function validateBotParameters(candidate: BotParams = params): string[] {
  const violations = resolvedScoreTables().flatMap(({ name, table }) => (
    validateScoreTable(name, table)
  ))

  for (const action of ACTIONS) {
    const defaults = candidate.scoring.handStrength[action]
    const nlheTag = getNlheScores('tag')[action]
    for (const [category, score] of Object.entries(nlheTag)) {
      if (defaults[category] !== score) {
        violations.push(`params.scoring.handStrength.${action}.${category} must match NLHE TAG score table`)
      }
    }
  }

  validateClamp(
    violations,
    'betting.price',
    candidate.betting.priceClampMin,
    candidate.betting.priceClampMax,
  )
  validateClamp(
    violations,
    'betting.sizing',
    candidate.betting.sizingClampMin,
    candidate.betting.sizingClampMax,
  )
  validateClamp(
    violations,
    'betting.fold',
    candidate.betting.foldCapMin,
    candidate.betting.foldCapMax,
  )
  validateClamp(
    violations,
    'betting.call',
    candidate.betting.callCapMin,
    candidate.betting.callCapMax,
  )
  validateClamp(
    violations,
    'betting.raise',
    candidate.betting.raiseCapMin,
    candidate.betting.raiseCapMax,
  )
  validateClamp(
    violations,
    'betting.raiseFraction',
    candidate.betting.raiseFractionMin,
    candidate.betting.raiseFractionMax,
  )
  if (candidate.betting.raiseFractionMin < 0 || candidate.betting.raiseFractionMax > 1) {
    violations.push('betting.raiseFraction clamp must stay within 0..1 pot fractions')
  }

  const tiers = candidate.scoring.skillTiers
  if (tiers.length === 0) violations.push('scoring.skillTiers must not be empty')
  for (let index = 0; index < tiers.length; index++) {
    const tier = tiers[index]
    if (!Number.isFinite(tier.threshold) || tier.threshold < 0 || tier.threshold > 100) {
      violations.push(`scoring.skillTiers[${index}].threshold must stay within 0..100`)
    }
    if (!Number.isFinite(tier.factor) || tier.factor < 0 || tier.factor > 1) {
      violations.push(`scoring.skillTiers[${index}].factor must stay within 0..1`)
    }
    if (index > 0) {
      const previous = tiers[index - 1]
      if (tier.threshold >= previous.threshold) {
        violations.push('scoring.skillTiers thresholds must be strictly descending')
      }
      if (tier.factor > previous.factor) {
        violations.push('scoring.skillTiers factors must not increase as thresholds decrease')
      }
    }
  }
  if (tiers.length > 0 && tiers[tiers.length - 1].threshold !== 0) {
    violations.push('scoring.skillTiers must cover skill level 0')
  }

  const allInPenaltyKeys: (keyof BotParams['scoring']['allInMods'])[] = [
    'highSpr',
    'deepStack',
    'exceedsEffectiveStack',
    'deepOpenShove',
    'uncommittedStrong',
    'uncommittedDeep',
    'uncommittedPostflop',
  ]
  for (const [name, value] of Object.entries(candidate.scoring.allInMods)) {
    if (!Number.isFinite(value)) violations.push(`scoring.allInMods.${name} must be finite`)
  }
  for (const key of allInPenaltyKeys) {
    if (candidate.scoring.allInMods[key] >= 0) {
      violations.push(`scoring.allInMods.${key} must be negative`)
    }
  }

  return violations
}
