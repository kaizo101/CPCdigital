import { params } from './bot-params'

export type AnalysisSkillFeature = keyof typeof params.scoring.analysisSkillGates

/** Central feature gate for analysis depth; archetype and perception remain separate axes. */
export function hasAnalysisSkill(skill: number, feature: AnalysisSkillFeature): boolean {
  const boundedSkill = Math.max(0, Math.min(100, skill))
  return boundedSkill >= params.scoring.analysisSkillGates[feature]
}

export function analysisSkillThreshold(feature: AnalysisSkillFeature): number {
  return params.scoring.analysisSkillGates[feature]
}

/**
 * Continuous strategic influence for a gated analysis feature.
 * The configured threshold is an onset boundary: it is exactly zero there and
 * rises without a jump to exact full influence at skill 100.
 */
export function analysisSkillWeight(skill: number, feature: AnalysisSkillFeature): number {
  const boundedSkill = Math.max(0, Math.min(100, skill))
  const threshold = analysisSkillThreshold(feature)
  if (boundedSkill <= threshold || threshold >= 100) return 0
  return (boundedSkill - threshold) / (100 - threshold)
}
