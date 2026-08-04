import type { BotArchetypeId } from './bot-archetypes'
import type { CategoryScoreTable, HandStrengthCategory } from './bot-variant-evaluation'
import type { PreflopSituation } from './preflop-ranges'

export const NLHE_CATEGORY_SCORES: CategoryScoreTable = {
  fold: { air: 10, weak: 5, marginal: -5, medium: -30, good: -42, strong: -50, premium: -50 },
  check: { air: 10, weak: 10, marginal: 8, medium: 5, good: -15, strong: -30, premium: -30 },
  call: { air: -25, weak: -5, marginal: 5, medium: 20, good: -5, strong: -10, premium: -10 },
  raise: { air: -25, 'weak-draw': 15, 'weak-no-draw': -25, weak: -20, marginal: -10, medium: 5, good: 20, strong: 30, premium: 40 },
  allIn: { air: -42, 'weak-draw': -18, 'weak-no-draw': -42, weak: -35, marginal: -25, medium: -15, good: 10, strong: 28, premium: 42 },
}

/* ------------------------------------------------------------------ */
/*  PLO archetype-specific score tables (delta-over-TAG pattern)      */
/*  Only values that differ from TAG are listed per archetype.         */
/*  Each archetype has separate preflop and postflop tables.           */
/*  Postflop scores are more extreme to reduce called-down WTSD       */
/*  while keeping preflop VPIP intact.                                */
/* ------------------------------------------------------------------ */

const PLO_TAG_SCORES: CategoryScoreTable = {
  fold: { air: 10, weak: 8, marginal: 2, medium: -16, good: -38, strong: -48, premium: -50 },
  check: { air: 10, weak: 10, marginal: 8, medium: 5, good: -12, strong: -28, premium: -30 },
  call: { air: -30, weak: -8, marginal: -5, medium: 3, good: -8, strong: -8, premium: -10 },
  raise: { air: -25, 'weak-draw': 18, 'weak-no-draw': -25, weak: -18, marginal: -8, medium: 0, good: 6, strong: 12, premium: 24 },
  allIn: { air: -42, 'weak-draw': -15, 'weak-no-draw': -42, weak: -35, marginal: -25, medium: -18, good: 8, strong: 25, premium: 40 },
}

function plo(overrides: Partial<CategoryScoreTable>, base: CategoryScoreTable = PLO_TAG_SCORES): CategoryScoreTable {
  return {
    fold: { ...base.fold, ...overrides.fold } as Record<string, number>,
    check: { ...base.check, ...overrides.check } as Record<string, number>,
    call: { ...base.call, ...overrides.call } as Record<string, number>,
    raise: { ...base.raise, ...overrides.raise } as Record<string, number>,
    allIn: { ...base.allIn, ...overrides.allIn } as Record<string, number>,
  }
}

const PLO_ARCHETYPE_PREFLOP: Record<BotArchetypeId, CategoryScoreTable> = {
  tag: PLO_TAG_SCORES,

  nit: plo({
    fold: { marginal: -6, medium: -2, good: -24, strong: -42 },
    check: { marginal: 0, medium: -1 },
    call: { marginal: 4, medium: 4, good: -12, strong: -8, premium: -10 },
    raise: { marginal: -8, medium: 0, good: 4, strong: 10 },
    allIn: { good: 5, strong: 22 },
  }),

  lag: plo({
    fold: { marginal: -3, medium: -20, good: -42 },
    check: { marginal: 3, medium: 1 },
    call: { marginal: -1, medium: 6, good: -3 },
    raise: { marginal: -3, medium: 3, good: 14, strong: 22, premium: 32 },
    allIn: { good: 14, strong: 30, premium: 44 },
  }),

  'calling-station': plo({
    fold: { weak: 10, marginal: 8, medium: 0, good: -32, strong: -44 },
    check: { weak: 6, marginal: 2, medium: 2, good: -16 },
    call: { weak: -4, marginal: -8, medium: -3, good: -10, strong: -10, premium: -12 },
    raise: { 'weak-draw': 14, marginal: -12, medium: -2, good: 4, strong: 10, premium: 18 },
    allIn: { 'weak-draw': -16, marginal: -26, medium: -20, good: 6, strong: 18, premium: 34 },
  }),
}

const PLO_ARCHETYPE_PREFLOP_SIX_MAX: Partial<Record<BotArchetypeId, CategoryScoreTable>> = {
  nit: plo(
    {
      call: { good: -8 },
      raise: { good: -12 },
    },
    PLO_ARCHETYPE_PREFLOP.nit,
  ),
}

const PLO_ARCHETYPE_POSTFLOP: Record<BotArchetypeId, CategoryScoreTable> = {
  tag: plo({
    call: { marginal: 4, medium: 10, good: -2 },
  }),

  nit: plo({
    fold: { marginal: -10, medium: 4, good: -25, strong: -36 },
    check: { marginal: -8, medium: -2 },
    call: { marginal: 50, medium: 36, good: -8, strong: -10 },
    raise: { marginal: -12, medium: -10, good: -4, strong: 6 },
    allIn: { good: 2, strong: 18 },
  }),

  lag: plo({
    fold: { marginal: -5, medium: -22, good: -44 },
    check: { marginal: 0, medium: -1 },
    call: { marginal: -7, medium: -1, good: -5 },
    raise: { marginal: 4, medium: 15, good: 24, strong: 32, premium: 44 },
    allIn: { good: 24, strong: 40, premium: 54 },
  }),

  'calling-station': plo({
    fold: { weak: 14, marginal: 18, medium: 12, good: -25, strong: -38 },
    check: { weak: 2, marginal: -6, medium: -8, good: -22 },
    call: { weak: -8, marginal: -28, medium: -18, good: -20, strong: -20, premium: -22 },
    raise: { 'weak-draw': 8, marginal: -22, medium: -12, good: -8, strong: -6, premium: 10 },
    allIn: { 'weak-draw': -22, marginal: -32, medium: -26, good: 0, strong: 10, premium: 24 },
  }),
}

/* ------------------------------------------------------------------ */
/*  PLO turn/river score tables                                        */
/*  Same delta-over-TAG pattern, but for turn/river only. Used to      */
/*  separate "call cheap flop" from "fold expensive turn/river" so     */
/*  AF (needs calls) and WTSD (needs late folds) can be tuned          */
/*  independently. Entries default to the flop (postflop) table.       */
/* ------------------------------------------------------------------ */

const PLO_ARCHETYPE_TURN_RIVER: Record<BotArchetypeId, CategoryScoreTable> = {
  tag: plo({
    call: { medium: 6, good: 0 },
  }),
  lag: plo({
    call: { marginal: -10, medium: -3 },
    raise: { medium: 24, good: 34 },
  }),
  'calling-station': plo({
    fold: { weak: 14, marginal: 18, medium: 12, good: -25, strong: -38 },
    check: { weak: 2, marginal: -6, medium: -8, good: -22 },
    call: { weak: -8, marginal: -28, medium: -18, good: -20, strong: -20, premium: -22 },
    raise: { 'weak-draw': 8, marginal: -18, medium: -8, good: -2, strong: 2, premium: 10 },
    allIn: { 'weak-draw': -22, marginal: -32, medium: -26, good: 0, strong: 10, premium: 24 },
  }),

  nit: plo({
    fold: { marginal: 10, medium: 22, good: -25, strong: -36 },
    check: { marginal: 0, medium: -18, good: -28 },
    call: { marginal: -18, medium: -2, good: 4, strong: -4 },
    raise: { marginal: -16, medium: -16, good: 12, strong: 4 },
    allIn: { good: 2, strong: 18 },
  }),
}

export type PloStreet = 'preflop' | 'flop' | 'turn-river'

/* ------------------------------------------------------------------ */
/*  PLO six-max postflop score overrides                               */
/*  Tables for short-handed play (tableSize ≤ 6). Entries merge over   */
/*  the archetype's full-ring table; missing archetypes fall back.     */
/* ------------------------------------------------------------------ */

const PLO_ARCHETYPE_POSTFLOP_SIX_MAX: Partial<Record<BotArchetypeId, CategoryScoreTable>> = {
  'calling-station': plo(
    {
      raise: { marginal: -22, medium: -12, good: -2, strong: 2, premium: 10 },
      call: { weak: -6, marginal: -12, medium: 2, good: 2 },
    },
    PLO_ARCHETYPE_POSTFLOP['calling-station'],
  ),
}

const PLO_ARCHETYPE_TURN_RIVER_SIX_MAX: Partial<Record<BotArchetypeId, CategoryScoreTable>> = {
  lag: plo(
    {
      fold: { marginal: -12, medium: -28 },
      call: { marginal: -8, medium: -6 },
    },
    PLO_ARCHETYPE_TURN_RIVER.lag,
  ),
  'calling-station': plo(
    {
      fold: { weak: 20, marginal: 22, medium: 24 },
      call: { weak: -14, medium: -6, good: -8, strong: -14, premium: -16 },
    },
    PLO_ARCHETYPE_TURN_RIVER['calling-station'],
  ),
}

export function getPloScores(
  archetypeId: BotArchetypeId | undefined,
  street: PloStreet,
  tableSize: number = 9,
): CategoryScoreTable {
  const archetype = archetypeId ?? 'tag'
  const table = street === 'preflop'
    ? PLO_ARCHETYPE_PREFLOP
    : street === 'turn-river'
      ? PLO_ARCHETYPE_TURN_RIVER
      : PLO_ARCHETYPE_POSTFLOP
  if (street === 'preflop' && tableSize <= 6) {
    return PLO_ARCHETYPE_PREFLOP_SIX_MAX[archetype] ?? table[archetype] ?? PLO_TAG_SCORES
  }
  if (street !== 'preflop' && tableSize <= 6) {
    const sixMax = street === 'turn-river' ? PLO_ARCHETYPE_TURN_RIVER_SIX_MAX : PLO_ARCHETYPE_POSTFLOP_SIX_MAX
    return sixMax[archetype] ?? table[archetype] ?? PLO_TAG_SCORES
  }
  return table[archetype] ?? PLO_TAG_SCORES
}

/* ------------------------------------------------------------------ */
/*  PLO preflop strategy tables                                       */
/*  Maps (archetype, situation, hand-category) → preferred action.    */
/*  Used by preflopStrategyFactors to guide raise/call/fold decisions */
/*  — the same mechanism as NLHE's preflop-ranges.ts but for PLO.     */
/*  Missing entries default to 'fold'.                                */
/* ------------------------------------------------------------------ */

export type PreflopStrategyAction = 'raise' | 'raise-or-call' | 'call' | 'call-or-fold' | 'fold'

export type PloPreflopStrategyTable = Record<PreflopSituation, Partial<Record<HandStrengthCategory, PreflopStrategyAction>>>

export type PloPreflopStrategySixMaxTable = Partial<PloPreflopStrategyTable>

const PLO_PREFLOP_STRATEGY: Record<BotArchetypeId, PloPreflopStrategyTable> = {
  tag: {
    unopened: { premium: 'raise', strong: 'raise', good: 'raise', medium: 'raise', marginal: 'call' },
    'facing-open': { premium: 'raise', strong: 'raise', good: 'call', medium: 'call' },
    'facing-3bet': { premium: 'raise', strong: 'call', good: 'call' },
  },
  nit: {
    unopened: { premium: 'raise', strong: 'raise', good: 'raise', medium: 'call' },
    'facing-open': { premium: 'raise', strong: 'raise', good: 'call' },
    'facing-3bet': { premium: 'raise', strong: 'call' },
  },
  lag: {
    unopened: { premium: 'raise', strong: 'raise', good: 'raise', medium: 'raise', marginal: 'raise', weak: 'call' },
    'facing-open': { premium: 'raise', strong: 'raise', good: 'call', medium: 'call', marginal: 'call' },
    'facing-3bet': { premium: 'raise', strong: 'raise', good: 'fold' },
  },
  'calling-station': {
    unopened: { premium: 'raise', strong: 'raise', good: 'call' },
    'facing-open': { premium: 'raise', strong: 'call', good: 'call' },
    'facing-3bet': { premium: 'call' },
  },
}

/* ------------------------------------------------------------------ */
/*  PLO six-max preflop strategy overrides                             */
/*  Tables for short-handed play (tableSize ≤ 6). Missing archetypes   */
/*  and entries fall back to the full-ring strategy table above.       */
/* ------------------------------------------------------------------ */

const PLO_PREFLOP_STRATEGY_SIX_MAX: Partial<Record<BotArchetypeId, PloPreflopStrategySixMaxTable>> = {
  nit: {
    unopened: { premium: 'raise', strong: 'raise', good: 'raise', medium: 'fold', marginal: 'fold' },
    'facing-open': { premium: 'raise', strong: 'raise', good: 'raise-or-call', medium: 'call-or-fold' },
    'facing-3bet': { premium: 'raise', strong: 'raise' },
  },
  'calling-station': {
    'facing-open': { premium: 'raise', strong: 'raise', good: 'call' },
  },
}

export function getPloPreflopAction(
  archetypeId: BotArchetypeId | undefined,
  situation: PreflopSituation,
  category: HandStrengthCategory,
  tableSize: number = 9,
): PreflopStrategyAction {
  const archetype = archetypeId ?? 'tag'
  const table = PLO_PREFLOP_STRATEGY[archetype]
  const sixMax = tableSize <= 6 ? PLO_PREFLOP_STRATEGY_SIX_MAX[archetype] : undefined
  return (sixMax?.[situation] ?? table?.[situation])?.[category] ?? 'fold'
}

/* ------------------------------------------------------------------ */
/*  Archetype intention (kept as comment for reference)                */
/*  TAG  = baseline, balanced aggressive                              */
/*  Nit  = folds more marginal/medium, calls less, raises less        */
/*  LAG  = calls/stays more marginal, raises more good+               */
/*  CS   = folds much more marginal/medium, calls much less, raises   */
/*         very rarely, prefers check                                  */
/* ------------------------------------------------------------------ */
