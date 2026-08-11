import { describe, expect, it } from 'vitest'
import { params } from './bot-params'
import { analysisSkillThreshold, analysisSkillWeight, hasAnalysisSkill } from './bot-skill-gates'

describe('analysis skill gates', () => {
  it('opens every feature exactly at its configured threshold', () => {
    for (const feature of Object.keys(params.scoring.analysisSkillGates) as Array<keyof typeof params.scoring.analysisSkillGates>) {
      const threshold = analysisSkillThreshold(feature)
      expect(hasAnalysisSkill(threshold - 1, feature)).toBe(false)
      expect(hasAnalysisSkill(threshold, feature)).toBe(true)
    }
  })

  it('keeps skill 20 on basic signals and skill 90 on every analysis layer', () => {
    const features = Object.keys(params.scoring.analysisSkillGates) as Array<keyof typeof params.scoring.analysisSkillGates>
    expect(features.every(feature => !hasAnalysisSkill(20, feature))).toBe(true)
    expect(features.every(feature => hasAnalysisSkill(90, feature))).toBe(true)
  })

  it('starts new skill influence continuously at zero and reaches one at skill 100', () => {
    const features = [
      'aggressionDepth',
      'pairedBoardHierarchy',
      'positionAwareRanges',
      'rangeBoardInteraction',
      'cardRemoval',
    ] as const

    for (const feature of features) {
      const threshold = analysisSkillThreshold(feature)
      expect(analysisSkillWeight(threshold - 1, feature)).toBe(0)
      expect(analysisSkillWeight(threshold, feature)).toBe(0)
      expect(analysisSkillWeight(threshold + 1, feature)).toBeCloseTo(1 / (100 - threshold), 12)
      expect(analysisSkillWeight(100, feature)).toBe(1)
      let previous = 0
      for (let skill = threshold; skill <= 100; skill++) {
        const current = analysisSkillWeight(skill, feature)
        expect(current).toBeGreaterThanOrEqual(previous)
        previous = current
      }
    }
  })
})
