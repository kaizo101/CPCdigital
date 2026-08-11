import { describe, expect, it } from 'vitest'
import {
  calculateForcedAllInSeverity,
  calculateInverseSeverity,
  calculateLinearSeverity,
} from './bot-commitment'
import { params } from './bot-params'

const config = params.scoring.commitmentBehavior
const epsilon = 1e-6

describe('commitment boundaries', () => {
  it('starts pot-commitment severity strictly above 25%', () => {
    const severity = (value: number) => calculateLinearSeverity(
      value,
      config.minimumPotCommitment,
      1,
    )

    expect(severity(0.25 - epsilon)).toBe(0)
    expect(severity(0.25)).toBe(0)
    expect(severity(0.25 + epsilon)).toBeGreaterThan(0)
    expect(severity(1)).toBe(1)
  })

  it('uses exact full and zero skill susceptibility at skill 20 and 70', () => {
    const susceptibility = (skill: number) => calculateInverseSeverity(
      skill,
      config.skillFullAt,
      config.skillZeroAt,
    )

    expect(susceptibility(20 - epsilon)).toBe(1)
    expect(susceptibility(20)).toBe(1)
    expect(susceptibility(20 + epsilon)).toBeLessThan(1)
    expect(susceptibility(70 - epsilon)).toBeGreaterThan(0)
    expect(susceptibility(70)).toBe(0)
    expect(susceptibility(70 + epsilon)).toBe(0)
  })

  it('starts stack severity strictly above 40% and reaches full at 100%', () => {
    const severity = (value: number) => calculateForcedAllInSeverity(
      value,
      config.fullPriceThreshold,
      config,
    ).stack

    expect(severity(0.4 - epsilon)).toBe(0)
    expect(severity(0.4)).toBe(0)
    expect(severity(0.4 + epsilon)).toBeGreaterThan(0)
    expect(severity(1 - epsilon)).toBeLessThan(1)
    expect(severity(1)).toBe(1)
    expect(severity(1 + epsilon)).toBe(1)
  })

  it('starts price severity strictly above 10% and reaches full at 40%', () => {
    const severity = (value: number) => calculateForcedAllInSeverity(
      config.forcedAllInFull,
      value,
      config,
    ).price

    expect(severity(0.1 - epsilon)).toBe(0)
    expect(severity(0.1)).toBe(0)
    expect(severity(0.1 + epsilon)).toBeGreaterThan(0)
    expect(severity(0.4 - epsilon)).toBeLessThan(1)
    expect(severity(0.4)).toBe(1)
    expect(severity(0.4 + epsilon)).toBe(1)
  })

  it('combines price and stack axes multiplicatively', () => {
    const midpoint = calculateForcedAllInSeverity(0.7, 0.25, config)
    expect(midpoint.stack).toBeCloseTo(0.5)
    expect(midpoint.price).toBeCloseTo(0.5)
    expect(midpoint.combined).toBeCloseTo(0.25)

    const cheapFullStackCall = calculateForcedAllInSeverity(1, 0.048, config)
    expect(cheapFullStackCall.stack).toBe(1)
    expect(cheapFullStackCall.price).toBe(0)
    expect(cheapFullStackCall.combined).toBe(0)
  })
})
