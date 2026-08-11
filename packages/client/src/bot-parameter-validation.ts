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

  const implied = candidate.betting.callImpliedOdds
  const impliedNumbers = [
    implied.maxEffectiveStackBb,
    implied.maxStackScale,
    implied.multiwayStep,
    implied.maxMultiwayAdjustment,
    implied.minimumBonus,
    implied.maximumBonus,
    ...Object.values(implied.nutPotentialScale),
  ]
  if (impliedNumbers.some(value => !Number.isFinite(value))) {
    violations.push('betting.callImpliedOdds values must be finite')
  }
  if (implied.maxEffectiveStackBb <= candidate.betting.stackDeep || implied.maxStackScale < 1) {
    violations.push('betting.callImpliedOdds stack range and scale must increase beyond stackDeep')
  }
  if (
    implied.multiwayStep < 0
    || implied.maxMultiwayAdjustment < 0
    || implied.maxMultiwayAdjustment >= 1
  ) {
    violations.push('betting.callImpliedOdds multiway adjustment must stay within 0..<1')
  }
  if (implied.minimumBonus < 0 || implied.minimumBonus > implied.maximumBonus) {
    violations.push('betting.callImpliedOdds bonus bounds must be non-negative and ascending')
  }
  const nutScales = [
    implied.nutPotentialScale.nuts,
    implied.nutPotentialScale['near-nuts'],
    implied.nutPotentialScale['second-nuts'],
    implied.nutPotentialScale.strong,
    implied.nutPotentialScale.medium,
    implied.nutPotentialScale.weak,
  ]
  if (
    nutScales.some(value => value <= 0)
    || nutScales.some((value, index) => index > 0 && value > nutScales[index - 1])
  ) {
    violations.push('betting.callImpliedOdds nut-potential scales must be positive and descending')
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

  const calibrationFormats = ['full-ring', 'six-max', 'heads-up'] as const
  for (const variant of ['nlhe', 'plo'] as const) {
    for (const archetype of ARCHETYPES) {
      for (const format of calibrationFormats) {
        const defense = candidate.scoring.cbetDefenseCallBonus[variant][archetype][format]
        if (!Number.isFinite(defense) || defense < -20 || defense > 80) {
          violations.push(
            `scoring.cbetDefenseCallBonus.${variant}.${archetype}.${format} must stay within -20..80`,
          )
        }
        const defenseRaise = candidate.scoring.cbetDefenseRaiseBase[variant][archetype][format]
        if (!Number.isFinite(defenseRaise) || defenseRaise < 0 || defenseRaise > 120) {
          violations.push(
            `scoring.cbetDefenseRaiseBase.${variant}.${archetype}.${format} must stay within 0..120`,
          )
        }
        const barrel = candidate.scoring.turnBarrelMods[variant][archetype][format]
        if (
          !Number.isFinite(barrel.nonAir)
          || !Number.isFinite(barrel.air)
          || barrel.nonAir < -200 || barrel.nonAir > 200
          || barrel.air < -200 || barrel.air > 200
        ) {
          violations.push(
            `scoring.turnBarrelMods.${variant}.${archetype}.${format} values must stay within -200..200`,
          )
        }
      }
    }
  }
  for (const archetype of ARCHETYPES) {
    for (const format of calibrationFormats) {
      const probe = candidate.scoring.ploProbeBetMods[archetype][format]
      const thinValue = candidate.scoring.ploThinValuePotControlMods[archetype][format]
      if (
        !Number.isFinite(probe.turn) || !Number.isFinite(probe.river)
        || probe.turn < -100 || probe.turn > 100
        || probe.river < -100 || probe.river > 100
      ) {
        violations.push(
          `scoring.ploProbeBetMods.${archetype}.${format} values must stay within -100..100`,
        )
      }
      if (
        !Number.isFinite(thinValue.turn) || !Number.isFinite(thinValue.river)
        || thinValue.turn < -100 || thinValue.turn > 100
        || thinValue.river < -100 || thinValue.river > 100
      ) {
        violations.push(
          `scoring.ploThinValuePotControlMods.${archetype}.${format} values must stay within -100..100`,
        )
      }
      const lateCall = candidate.scoring.ploLateCallMods[archetype][format]
      if (!Number.isFinite(lateCall) || lateCall < 0 || lateCall > 100) {
        violations.push(
          `scoring.ploLateCallMods.${archetype}.${format} must stay within 0..100`,
        )
      }
      const flopDefense = candidate.scoring.nlheFlopDefenseMods[archetype][format]
      if (!Number.isFinite(flopDefense) || flopDefense < 0 || flopDefense > 100) {
        violations.push(
          `scoring.nlheFlopDefenseMods.${archetype}.${format} must stay within 0..100`,
        )
      }
    }
  }

  const escalation = candidate.scoring.preflopEscalationMods
  const escalationNumbers = [
    escalation.skillGate,
    escalation.aggressionGate,
    escalation.maxPolarizedStackBb,
    escalation.commitmentGate,
    escalation.shortValueStackBb,
    ...Object.values(escalation.fourBet),
    ...Object.values(escalation.fiveBet),
    ...Object.values(escalation.facingFiveBet),
  ]
  if (escalationNumbers.some(value => !Number.isFinite(value))) {
    violations.push('scoring.preflopEscalationMods values must be finite')
  }
  if (
    escalation.skillGate < 0 || escalation.skillGate > 100
    || escalation.aggressionGate < 0 || escalation.aggressionGate > 100
  ) {
    violations.push('scoring.preflopEscalationMods skill/aggression gates must be within 0..100')
  }
  if (
    escalation.commitmentGate < 0 || escalation.commitmentGate > 1
    || escalation.shortValueStackBb <= 0
    || escalation.maxPolarizedStackBb < escalation.shortValueStackBb
  ) {
    violations.push('scoring.preflopEscalationMods stack and commitment boundaries are invalid')
  }
  if (
    escalation.fourBet.valueFold >= 0
    || escalation.fourBet.valueRaise <= 0
    || escalation.fourBet.polarizedRaise <= 0
    || escalation.fourBet.defaultRaise >= 0
    || escalation.fiveBet.valueFold >= 0
    || escalation.fiveBet.defaultFold <= 0
    || escalation.fiveBet.valueRaise <= 0
    || escalation.fiveBet.polarizedRaise <= 0
    || escalation.fiveBet.defaultRaise >= 0
    || escalation.facingFiveBet.valueFold >= 0
    || escalation.facingFiveBet.defaultFold <= 0
    || escalation.facingFiveBet.valueCall <= 0
    || escalation.facingFiveBet.defaultCall >= 0
    || escalation.facingFiveBet.defaultRaise >= 0
    || escalation.facingFiveBet.defaultAllIn >= 0
  ) {
    violations.push('scoring.preflopEscalationMods action factors have invalid directions')
  }

  const commitment = candidate.scoring.commitmentBehavior
  const commitmentNumbers = [
    commitment.minimumPotCommitment,
    commitment.maximumCallBonus,
    commitment.skillFullAt,
    commitment.skillZeroAt,
    commitment.maximumMentalMultiplier,
    commitment.forcedAllInStart,
    commitment.forcedAllInFull,
    commitment.freePriceThreshold,
    commitment.fullPriceThreshold,
    commitment.minimumRiskScale,
    commitment.maximumRiskScale,
    ...Object.values(commitment.archetypeMultiplier),
    ...Object.values(commitment.forcedCategoryPenalty),
  ]
  if (commitmentNumbers.some(value => !Number.isFinite(value))) {
    violations.push('scoring.commitmentBehavior values must be finite')
  }
  if (
    commitment.minimumPotCommitment < 0 || commitment.minimumPotCommitment >= 1
    || commitment.maximumCallBonus < 0
    || commitment.skillFullAt < 0
    || commitment.skillZeroAt > 100
    || commitment.skillFullAt >= commitment.skillZeroAt
    || commitment.maximumMentalMultiplier < 1
    || Object.values(commitment.archetypeMultiplier).some(value => value <= 0)
  ) {
    violations.push('scoring.commitmentBehavior sunk-cost boundaries are invalid')
  }
  if (
    commitment.forcedAllInStart < 0
    || commitment.forcedAllInStart >= commitment.forcedAllInFull
    || commitment.forcedAllInFull > 1
    || commitment.freePriceThreshold < 0
    || commitment.freePriceThreshold >= commitment.fullPriceThreshold
    || commitment.fullPriceThreshold > 1
    || commitment.minimumRiskScale <= 0
    || commitment.minimumRiskScale > commitment.maximumRiskScale
    || Object.values(commitment.forcedCategoryPenalty).some(value => value > 0)
    || commitment.forcedCategoryPenalty.air >= 0
    || commitment.forcedCategoryPenalty.weak >= 0
    || commitment.forcedCategoryPenalty.marginal >= 0
    || commitment.forcedCategoryPenalty.medium >= 0
    || commitment.forcedCategoryPenalty.good !== 0
    || commitment.forcedCategoryPenalty.strong !== 0
    || commitment.forcedCategoryPenalty.premium !== 0
  ) {
    violations.push('scoring.commitmentBehavior forced-all-in boundaries are invalid')
  }

  const spr = candidate.scoring.ploSprZones
  for (const [name, value] of Object.entries(spr)) {
    if (!Number.isFinite(value)) violations.push(`scoring.ploSprZones.${name} must be finite`)
  }
  const sprBoundaries = [
    spr.commitmentStart,
    spr.commitmentEnd,
    spr.protectionStart,
    spr.protectionPeak,
    spr.protectionEnd,
    spr.drawStart,
    spr.drawFull,
    spr.drawFade,
    spr.drawEnd,
  ]
  if (sprBoundaries.some(value => !Number.isFinite(value) || value < 0)) {
    violations.push('scoring.ploSprZones boundaries must be finite and non-negative')
  }
  if (spr.commitmentStart >= spr.commitmentEnd) {
    violations.push('scoring.ploSprZones commitment boundaries must be ascending')
  }
  if (!(spr.protectionStart < spr.protectionPeak && spr.protectionPeak < spr.protectionEnd)) {
    violations.push('scoring.ploSprZones protection boundaries must be strictly ascending')
  }
  if (!(spr.drawStart < spr.drawFull && spr.drawFull <= spr.drawFade && spr.drawFade < spr.drawEnd)) {
    violations.push('scoring.ploSprZones draw boundaries must be ascending with a valid plateau')
  }
  if (spr.commitmentRiskReduction < 0 || spr.commitmentRiskReduction > 1) {
    violations.push('scoring.ploSprZones.commitmentRiskReduction must stay within 0..1')
  }

  const negativeSprFactors: (keyof typeof spr)[] = [
    'commitmentContinueNonStrong',
    'commitmentFoldStrong',
    'protectionFoldVulnerable',
    'protectionFoldEquity',
    'protectionPassiveVulnerable',
    'drawFoldStrong',
  ]
  const positiveSprFactors: (keyof typeof spr)[] = [
    'commitmentFoldNonStrong',
    'commitmentCallStrong',
    'commitmentRaiseStrong',
    'commitmentAllInStrong',
    'commitmentRiskRaise',
    'protectionRaiseVulnerable',
    'protectionAllInVulnerable',
    'drawCheckStrong',
    'drawCallStrong',
    'drawRaiseStrong',
  ]
  for (const key of negativeSprFactors) {
    if (spr[key] >= 0) violations.push(`scoring.ploSprZones.${key} must be negative`)
  }
  for (const key of positiveSprFactors) {
    if (spr[key] <= 0) violations.push(`scoring.ploSprZones.${key} must be positive`)
  }

  const collapse = candidate.scoring.equityCollapseMods
  for (const [name, value] of Object.entries(collapse)) {
    if (!Number.isFinite(value)) violations.push(`scoring.equityCollapseMods.${name} must be finite`)
  }
  if (collapse.fold <= 0 || collapse.check <= 0) {
    violations.push('scoring.equityCollapseMods fold/check factors must be positive')
  }
  if (collapse.call >= 0 || collapse.raise >= 0 || collapse.allIn >= 0) {
    violations.push('scoring.equityCollapseMods call/raise/all-in factors must be negative')
  }
  if (collapse.openActionScale < 0 || collapse.openActionScale > 1) {
    violations.push('scoring.equityCollapseMods.openActionScale must be between 0 and 1')
  }
  if (collapse.minimumArchetypeScale < 0 || collapse.minimumArchetypeScale > 1) {
    violations.push('scoring.equityCollapseMods.minimumArchetypeScale must be between 0 and 1')
  }

  const river = candidate.scoring.ploRiverDisciplineMods
  for (const [name, value] of Object.entries(river)) {
    if (!Number.isFinite(value)) violations.push(`scoring.ploRiverDisciplineMods.${name} must be finite`)
  }
  if (river.fold <= 0 || river.call >= 0 || river.raise >= 0 || river.allIn >= 0) {
    violations.push('scoring.ploRiverDisciplineMods requires positive fold and negative continuation factors')
  }
  if (river.blockerThreshold <= 0) {
    violations.push('scoring.ploRiverDisciplineMods.blockerThreshold must be positive')
  }
  if (river.pressureStep < 0) {
    violations.push('scoring.ploRiverDisciplineMods.pressureStep must not be negative')
  }
  if (river.collapseOverlapScale < 0 || river.collapseOverlapScale > 1) {
    violations.push('scoring.ploRiverDisciplineMods.collapseOverlapScale must be between 0 and 1')
  }
  if (river.minimumArchetypeScale < 0 || river.minimumArchetypeScale > 1) {
    violations.push('scoring.ploRiverDisciplineMods.minimumArchetypeScale must be between 0 and 1')
  }

  const position = candidate.scoring.ploPositionMods
  for (const [name, value] of Object.entries(position)) {
    if (!Number.isFinite(value)) violations.push(`scoring.ploPositionMods.${name} must be finite`)
  }
  if (position.ipCheckEquity <= 0 || position.oopFoldEquity >= 0) {
    violations.push('scoring.ploPositionMods requires positive IP check and negative OOP fold factors')
  }
  if (
    position.freerollFold >= 0
    || position.freerollCheck >= 0
    || position.freerollCall <= 0
    || position.freerollRaise <= 0
    || position.freerollAllIn <= 0
  ) {
    violations.push('scoring.ploPositionMods freeroll action factors have invalid directions')
  }
  if (position.freerollMinCleanOuts < 1) {
    violations.push('scoring.ploPositionMods.freerollMinCleanOuts must be at least 1')
  }

  const gates = candidate.scoring.analysisSkillGates
  for (const [name, value] of Object.entries(gates)) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      violations.push(`scoring.analysisSkillGates.${name} must be between 0 and 100`)
    }
  }
  const orderedGates = [
    gates.boardDynamics,
    gates.riverDiscipline,
    gates.nutPotential,
    gates.freeroll,
    gates.blocker,
    gates.wrapDominance,
  ]
  if (orderedGates.some((value, index) => index > 0 && value < orderedGates[index - 1])) {
    violations.push('scoring.analysisSkillGates must be ascending by analysis depth')
  }
  const contextualGates = [
    gates.aggressionDepth,
    gates.positionAwareRanges,
    gates.rangeBoardInteraction,
    gates.cardRemoval,
  ]
  if (
    gates.pairedBoardHierarchy > gates.positionAwareRanges
    || contextualGates.some((value, index) => index > 0 && value < contextualGates[index - 1])
  ) {
    violations.push('scoring.analysisSkillGates contextual analysis gates must be ascending')
  }

  const wrap = candidate.scoring.ploWrapQualityMods
  if (
    !Number.isFinite(wrap.minimumDisciplineScale)
    || wrap.minimumDisciplineScale < 0
    || wrap.minimumDisciplineScale > 1
  ) {
    violations.push('scoring.ploWrapQualityMods.minimumDisciplineScale must be between 0 and 1')
  }
  for (const quality of ['nut', 'mixed', 'second', 'bottom'] as const) {
    for (const [action, value] of Object.entries(wrap[quality])) {
      if (!Number.isFinite(value)) {
        violations.push(`scoring.ploWrapQualityMods.${quality}.${action} must be finite`)
      }
    }
  }
  if (
    wrap.nut.fold >= 0 || wrap.nut.check >= 0 || wrap.nut.call <= 0 || wrap.nut.raise <= 0 || wrap.nut.allIn <= 0
    || wrap.bottom.fold <= 0 || wrap.bottom.check <= 0 || wrap.bottom.call >= 0 || wrap.bottom.raise >= 0 || wrap.bottom.allIn >= 0
  ) {
    violations.push('scoring.ploWrapQualityMods nut/bottom action factors have invalid directions')
  }

  const blocker = candidate.scoring.ploBlockerMods
  for (const [name, value] of Object.entries(blocker)) {
    if (!Number.isFinite(value)) violations.push(`scoring.ploBlockerMods.${name} must be finite`)
  }
  if (blocker.nutThreshold <= 0) {
    violations.push('scoring.ploBlockerMods.nutThreshold must be positive')
  }
  if (
    blocker.foldDefense >= 0
    || blocker.callDefense <= 0
    || blocker.bluffCheck >= 0
    || blocker.bluffRaise <= 0
    || blocker.bluffAllIn <= 0
    || blocker.valueCheck >= 0
    || blocker.valueRaise <= 0
    || blocker.valueAllIn <= 0
  ) {
    violations.push('scoring.ploBlockerMods action factors have invalid directions')
  }

  const checkRaise = candidate.scoring.checkRaiseMods
  for (const [name, value] of Object.entries(checkRaise)) {
    if (!Number.isFinite(value)) violations.push(`scoring.checkRaiseMods.${name} must be finite`)
  }
  if (
    checkRaise.respectSkillGate < 0
    || checkRaise.respectSkillGate > 100
    || checkRaise.planningSkillGate < 0
    || checkRaise.planningSkillGate > 100
    || checkRaise.planningSkillGate < checkRaise.respectSkillGate
  ) {
    violations.push('scoring.checkRaiseMods skill gates must be ordered within 0..100')
  }
  if (
    checkRaise.foldRespect <= 0
    || checkRaise.foldProtected >= 0
    || checkRaise.callRespect >= 0
    || checkRaise.callProtected <= 0
    || checkRaise.reraiseRespect >= 0
    || checkRaise.allInRespect >= 0
  ) {
    violations.push('scoring.checkRaiseMods respect factors have invalid directions')
  }
  if (
    checkRaise.planCheckValue <= 0
    || checkRaise.planCheckDraw <= 0
    || checkRaise.executeCallValue >= 0
    || checkRaise.executeCallDraw >= 0
    || checkRaise.executeRaiseValue <= 0
    || checkRaise.executeRaiseDraw <= 0
    || checkRaise.executeAllInValue <= 0
    || checkRaise.executeAllInDraw <= 0
  ) {
    violations.push('scoring.checkRaiseMods planning factors have invalid directions')
  }
  if (checkRaise.ploRespectScale < 1 || checkRaise.maxPressureScale < 1) {
    violations.push('scoring.checkRaiseMods respect scales must be at least 1')
  }

  const floatDefense = candidate.scoring.floatDefenseMods
  for (const [name, value] of Object.entries(floatDefense)) {
    if (!Number.isFinite(value)) violations.push(`scoring.floatDefenseMods.${name} must be finite`)
  }
  if (floatDefense.skillGate < 0 || floatDefense.skillGate > 100) {
    violations.push('scoring.floatDefenseMods.skillGate must be within 0..100')
  }
  if (
    floatDefense.foldCandidate >= 0
    || floatDefense.callCandidate <= 0
    || floatDefense.callValue <= 0
    || floatDefense.raiseCandidate <= 0
    || floatDefense.raiseValue <= 0
    || floatDefense.raiseBlockerBluff <= 0
    || floatDefense.allInValue <= 0
  ) {
    violations.push('scoring.floatDefenseMods action factors have invalid directions')
  }
  if (
    floatDefense.worseBoardScale < 0
    || floatDefense.worseBoardScale > 1
    || floatDefense.largeBetFloor < 0
    || floatDefense.largeBetFloor > 1
    || floatDefense.aggressiveReadBoost < 0
  ) {
    violations.push('scoring.floatDefenseMods scales must stay in their valid ranges')
  }

  const betFold = candidate.scoring.betFoldMods
  for (const [name, value] of Object.entries(betFold)) {
    if (!Number.isFinite(value)) violations.push(`scoring.betFoldMods.${name} must be finite`)
  }
  if (
    betFold.skillGate < 0 || betFold.skillGate > 100
    || betFold.minimumShowdownValue < 0 || betFold.minimumShowdownValue > 100
    || betFold.minimumRelativeStrength < 0 || betFold.minimumRelativeStrength > 100
  ) {
    violations.push('scoring.betFoldMods gates and hand thresholds must be within 0..100')
  }
  if (
    betFold.openBet <= 0
    || betFold.openCheck >= 0
    || betFold.openAllIn >= 0
    || betFold.responseFold <= 0
    || betFold.responseCall >= 0
    || betFold.responseRaise >= 0
    || betFold.responseAllIn >= 0
  ) {
    violations.push('scoring.betFoldMods action factors have invalid directions')
  }
  if (
    betFold.minimumDisciplineScale < 0 || betFold.minimumDisciplineScale > 1
    || betFold.maxPressureScale < 1
  ) {
    violations.push('scoring.betFoldMods scales must stay in their valid ranges')
  }

  return violations
}
