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
})
