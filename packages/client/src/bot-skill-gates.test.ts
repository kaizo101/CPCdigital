import { describe, expect, it } from 'vitest'
import { params } from './bot-params'
import { analysisSkillThreshold, hasAnalysisSkill } from './bot-skill-gates'

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
})
