export const PREFLOP_RUNOUT_STAGE_DELAY_MS = 1500
export const POSTFLOP_RUNOUT_STAGE_DELAY_MS = 1000

export function getRunoutStageDelay(startCardCount: number): number {
  return startCardCount === 0
    ? PREFLOP_RUNOUT_STAGE_DELAY_MS
    : POSTFLOP_RUNOUT_STAGE_DELAY_MS
}

/** Community-card counts shown one stage at a time after betting has ended. */
export function getRunoutRevealStages(startCount: number, finalCount: number): number[] {
  const start = Math.max(0, Math.min(5, Math.floor(startCount)))
  const final = Math.max(start, Math.min(5, Math.floor(finalCount)))
  const stages: number[] = []

  if (start < 3 && final >= 3) stages.push(3)
  if (start < 4 && final >= 4) stages.push(4)
  if (start < 5 && final >= 5) stages.push(5)
  return stages
}
