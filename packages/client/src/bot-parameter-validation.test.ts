import { describe, expect, it } from 'vitest'
import { validateBotParameters } from './bot-parameter-validation'
import { DEFAULT_PARAMS, type BotParams } from './bot-params'

function cloneParams(): BotParams {
  return structuredClone(DEFAULT_PARAMS)
}

describe('validateBotParameters', () => {
  it('accepts all currently resolved score tables and default parameters', () => {
    expect(validateBotParameters(cloneParams())).toEqual([])
  })

  it('detects reversed and out-of-domain clamps', () => {
    const candidate = cloneParams()
    candidate.betting.callCapMin = 30
    candidate.betting.callCapMax = 20
    candidate.betting.raiseFractionMin = -0.1

    expect(validateBotParameters(candidate)).toEqual(expect.arrayContaining([
      'betting.call clamp minimum must not exceed maximum',
      'betting.raiseFraction clamp must stay within 0..1 pot fractions',
    ]))
  })

  it('detects invalid dynamic implied-odds parameters', () => {
    const candidate = cloneParams()
    candidate.betting.callImpliedOdds.maxEffectiveStackBb = candidate.betting.stackDeep
    candidate.betting.callImpliedOdds.maxStackScale = 0.9
    candidate.betting.callImpliedOdds.maxMultiwayAdjustment = 1
    candidate.betting.callImpliedOdds.minimumBonus = 13
    candidate.betting.callImpliedOdds.maximumBonus = 12
    candidate.betting.callImpliedOdds.nutPotentialScale.weak = 2

    expect(validateBotParameters(candidate)).toEqual(expect.arrayContaining([
      'betting.callImpliedOdds stack range and scale must increase beyond stackDeep',
      'betting.callImpliedOdds multiway adjustment must stay within 0..<1',
      'betting.callImpliedOdds bonus bounds must be non-negative and ascending',
      'betting.callImpliedOdds nut-potential scales must be positive and descending',
    ]))
  })

  it('detects unsorted, uncovered and invalid skill tiers', () => {
    const candidate = cloneParams()
    candidate.scoring.skillTiers = [
      { threshold: 70, factor: 0.7 },
      { threshold: 90, factor: 1.1 },
      { threshold: 10, factor: 0.2 },
    ]

    const violations = validateBotParameters(candidate)
    expect(violations).toEqual(expect.arrayContaining([
      'scoring.skillTiers thresholds must be strictly descending',
      'scoring.skillTiers factors must not increase as thresholds decrease',
      'scoring.skillTiers[1].factor must stay within 0..1',
      'scoring.skillTiers must cover skill level 0',
    ]))
  })

  it('detects neutral or positive all-in penalties', () => {
    const candidate = cloneParams()
    candidate.scoring.allInMods.deepOpenShove = 0
    candidate.scoring.allInMods.uncommittedDeep = 5

    expect(validateBotParameters(candidate)).toEqual(expect.arrayContaining([
      'scoring.allInMods.deepOpenShove must be negative',
      'scoring.allInMods.uncommittedDeep must be negative',
    ]))
  })

  it('detects invalid preflop escalation gates, boundaries and action directions', () => {
    const candidate = cloneParams()
    candidate.scoring.preflopEscalationMods.skillGate = 101
    candidate.scoring.preflopEscalationMods.commitmentGate = 1.1
    candidate.scoring.preflopEscalationMods.fourBet.polarizedRaise = -1
    candidate.scoring.preflopEscalationMods.fiveBet.defaultFold = -1

    expect(validateBotParameters(candidate)).toEqual(expect.arrayContaining([
      'scoring.preflopEscalationMods skill/aggression gates must be within 0..100',
      'scoring.preflopEscalationMods stack and commitment boundaries are invalid',
      'scoring.preflopEscalationMods action factors have invalid directions',
    ]))
  })

  it('detects invalid commitment and forced-all-in parameters', () => {
    const candidate = cloneParams()
    candidate.scoring.commitmentBehavior.skillFullAt = 80
    candidate.scoring.commitmentBehavior.skillZeroAt = 70
    candidate.scoring.commitmentBehavior.forcedAllInStart = 0.8
    candidate.scoring.commitmentBehavior.forcedAllInFull = 0.7

    expect(validateBotParameters(candidate)).toEqual(expect.arrayContaining([
      'scoring.commitmentBehavior sunk-cost boundaries are invalid',
      'scoring.commitmentBehavior forced-all-in boundaries are invalid',
    ]))
  })

  it('detects out-of-range C-Bet defense and turn-barrel calibration cells', () => {
    const candidate = cloneParams()
    candidate.scoring.cbetDefenseCallBonus.nlhe.tag['six-max'] = 81
    candidate.scoring.cbetDefenseRaiseBase.plo.lag['heads-up'] = 121
    candidate.scoring.turnBarrelMods.plo.lag['full-ring'].air = -201

    expect(validateBotParameters(candidate)).toEqual(expect.arrayContaining([
      'scoring.cbetDefenseCallBonus.nlhe.tag.six-max must stay within -20..80',
      'scoring.cbetDefenseRaiseBase.plo.lag.heads-up must stay within 0..120',
      'scoring.turnBarrelMods.plo.lag.full-ring values must stay within -200..200',
    ]))
  })

  it('detects invalid showdown-flow calibration cells', () => {
    const candidate = cloneParams()
    candidate.scoring.ploProbeBetMods.lag['full-ring'].river = -101
    candidate.scoring.ploThinValuePotControlMods.nit['heads-up'].turn = Number.NaN
    candidate.scoring.ploLateCallMods['calling-station']['heads-up'] = 101
    candidate.scoring.nlheFlopDefenseMods['calling-station']['six-max'] = -1

    expect(validateBotParameters(candidate)).toEqual(expect.arrayContaining([
      'scoring.ploProbeBetMods.lag.full-ring values must stay within -100..100',
      'scoring.ploThinValuePotControlMods.nit.heads-up values must stay within -100..100',
      'scoring.ploLateCallMods.calling-station.heads-up must stay within 0..100',
      'scoring.nlheFlopDefenseMods.calling-station.six-max must stay within 0..100',
    ]))
  })

  it('detects drift between parameter defaults and the NLHE TAG score table', () => {
    const candidate = cloneParams()
    candidate.scoring.handStrength.raise.premium = 39

    expect(validateBotParameters(candidate)).toContain(
      'params.scoring.handStrength.raise.premium must match NLHE TAG score table',
    )
  })

  it('detects invalid PLO SPR boundaries and factor directions', () => {
    const candidate = cloneParams()
    candidate.scoring.ploSprZones.commitmentEnd = 1
    candidate.scoring.ploSprZones.protectionPeak = 11
    candidate.scoring.ploSprZones.drawCallStrong = -2
    candidate.scoring.ploSprZones.commitmentContinueNonStrong = 2
    candidate.scoring.ploSprZones.commitmentRiskReduction = 1.2

    expect(validateBotParameters(candidate)).toEqual(expect.arrayContaining([
      'scoring.ploSprZones commitment boundaries must be ascending',
      'scoring.ploSprZones protection boundaries must be strictly ascending',
      'scoring.ploSprZones.drawCallStrong must be positive',
      'scoring.ploSprZones.commitmentContinueNonStrong must be negative',
      'scoring.ploSprZones.commitmentRiskReduction must stay within 0..1',
    ]))
  })

  it('detects inverted equity-collapse action factors', () => {
    const candidate = cloneParams()
    candidate.scoring.equityCollapseMods.check = -1
    candidate.scoring.equityCollapseMods.raise = 3
    candidate.scoring.equityCollapseMods.openActionScale = 1.1
    candidate.scoring.equityCollapseMods.minimumArchetypeScale = -0.1

    expect(validateBotParameters(candidate)).toEqual(expect.arrayContaining([
      'scoring.equityCollapseMods fold/check factors must be positive',
      'scoring.equityCollapseMods call/raise/all-in factors must be negative',
      'scoring.equityCollapseMods.openActionScale must be between 0 and 1',
      'scoring.equityCollapseMods.minimumArchetypeScale must be between 0 and 1',
    ]))
  })

  it('detects invalid PLO river-discipline factors', () => {
    const candidate = cloneParams()
    candidate.scoring.ploRiverDisciplineMods.fold = -1
    candidate.scoring.ploRiverDisciplineMods.blockerThreshold = 0
    candidate.scoring.ploRiverDisciplineMods.pressureStep = -0.1
    candidate.scoring.ploRiverDisciplineMods.collapseOverlapScale = 1.1
    candidate.scoring.ploRiverDisciplineMods.minimumArchetypeScale = -0.1

    expect(validateBotParameters(candidate)).toEqual(expect.arrayContaining([
      'scoring.ploRiverDisciplineMods requires positive fold and negative continuation factors',
      'scoring.ploRiverDisciplineMods.blockerThreshold must be positive',
      'scoring.ploRiverDisciplineMods.pressureStep must not be negative',
      'scoring.ploRiverDisciplineMods.collapseOverlapScale must be between 0 and 1',
      'scoring.ploRiverDisciplineMods.minimumArchetypeScale must be between 0 and 1',
    ]))
  })

  it('detects invalid PLO position factors', () => {
    const candidate = cloneParams()
    candidate.scoring.ploPositionMods.ipCheckEquity = -1
    candidate.scoring.ploPositionMods.oopFoldEquity = 1
    candidate.scoring.ploPositionMods.freerollRaise = -1
    candidate.scoring.ploPositionMods.freerollMinCleanOuts = 0

    expect(validateBotParameters(candidate)).toEqual(expect.arrayContaining([
      'scoring.ploPositionMods requires positive IP check and negative OOP fold factors',
      'scoring.ploPositionMods freeroll action factors have invalid directions',
      'scoring.ploPositionMods.freerollMinCleanOuts must be at least 1',
    ]))
  })

  it('detects invalid PLO wrap-quality factors', () => {
    const candidate = cloneParams()
    candidate.scoring.analysisSkillGates.boardDynamics = 101
    candidate.scoring.analysisSkillGates.wrapDominance = 20
    candidate.scoring.ploWrapQualityMods.minimumDisciplineScale = -0.1
    candidate.scoring.ploWrapQualityMods.nut.raise = -1
    candidate.scoring.ploWrapQualityMods.bottom.fold = -1

    expect(validateBotParameters(candidate)).toEqual(expect.arrayContaining([
      'scoring.analysisSkillGates.boardDynamics must be between 0 and 100',
      'scoring.analysisSkillGates must be ascending by analysis depth',
      'scoring.ploWrapQualityMods.minimumDisciplineScale must be between 0 and 1',
      'scoring.ploWrapQualityMods nut/bottom action factors have invalid directions',
    ]))
  })

  it('detects invalid PLO blocker factors', () => {
    const candidate = cloneParams()
    candidate.scoring.ploBlockerMods.nutThreshold = 0
    candidate.scoring.ploBlockerMods.foldDefense = 1
    candidate.scoring.ploBlockerMods.bluffRaise = -1

    expect(validateBotParameters(candidate)).toEqual(expect.arrayContaining([
      'scoring.ploBlockerMods.nutThreshold must be positive',
      'scoring.ploBlockerMods action factors have invalid directions',
    ]))
  })

  it('detects invalid check-raise respect and planning factors', () => {
    const candidate = cloneParams()
    candidate.scoring.checkRaiseMods.respectSkillGate = 70
    candidate.scoring.checkRaiseMods.planningSkillGate = 50
    candidate.scoring.checkRaiseMods.callRespect = 1
    candidate.scoring.checkRaiseMods.planCheckDraw = -1
    candidate.scoring.checkRaiseMods.ploRespectScale = 0.9

    expect(validateBotParameters(candidate)).toEqual(expect.arrayContaining([
      'scoring.checkRaiseMods skill gates must be ordered within 0..100',
      'scoring.checkRaiseMods respect factors have invalid directions',
      'scoring.checkRaiseMods planning factors have invalid directions',
      'scoring.checkRaiseMods respect scales must be at least 1',
    ]))
  })

  it('detects invalid float-defense factors', () => {
    const candidate = cloneParams()
    candidate.scoring.floatDefenseMods.skillGate = 101
    candidate.scoring.floatDefenseMods.foldCandidate = 1
    candidate.scoring.floatDefenseMods.worseBoardScale = 1.1

    expect(validateBotParameters(candidate)).toEqual(expect.arrayContaining([
      'scoring.floatDefenseMods.skillGate must be within 0..100',
      'scoring.floatDefenseMods action factors have invalid directions',
      'scoring.floatDefenseMods scales must stay in their valid ranges',
    ]))
  })

  it('detects invalid NLHE bet-fold thresholds, directions and scales', () => {
    const candidate = cloneParams()
    candidate.scoring.betFoldMods.skillGate = 101
    candidate.scoring.betFoldMods.openBet = -1
    candidate.scoring.betFoldMods.responseFold = -1
    candidate.scoring.betFoldMods.minimumDisciplineScale = 1.1

    expect(validateBotParameters(candidate)).toEqual(expect.arrayContaining([
      'scoring.betFoldMods gates and hand thresholds must be within 0..100',
      'scoring.betFoldMods action factors have invalid directions',
      'scoring.betFoldMods scales must stay in their valid ranges',
    ]))
  })
})
