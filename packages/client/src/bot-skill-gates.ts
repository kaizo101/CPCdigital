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
