import type { BotArchetypeId } from './bot-archetypes'
import type { CategoryScoreTable, HandStrengthCategory } from './bot-variant-evaluation'
import type { PreflopSituation } from './preflop-ranges'
import { resolveTableFormat } from './bot-table-format'

export const NLHE_CATEGORY_SCORES: CategoryScoreTable = {
  fold: { air: 10, weak: 5, marginal: -5, medium: -30, good: -42, strong: -50, premium: -50 },
  check: { air: 10, weak: 10, marginal: 8, medium: 5, good: -15, strong: -30, premium: -30 },
  call: { air: -25, weak: -5, marginal: 5, medium: 20, good: -5, strong: -10, premium: -10 },
  raise: { air: -25, 'weak-draw': 15, 'weak-no-draw': -25, weak: -20, marginal: -10, medium: 5, good: 20, strong: 30, premium: 40 },
  allIn: { air: -42, 'weak-draw': -18, 'weak-no-draw': -42, weak: -35, marginal: -25, medium: -15, good: 10, strong: 28, premium: 42 },
}

/* ------------------------------------------------------------------ */
/*  NLHE archetype-specific score tables (delta-over-TAG pattern)      */
/*  Same pattern as PLO — only values differing from TAG are listed.   */
/* ------------------------------------------------------------------ */

function nlhe(overrides: Partial<CategoryScoreTable>): CategoryScoreTable {
  return {
    fold: { ...NLHE_CATEGORY_SCORES.fold, ...overrides.fold },
    check: { ...NLHE_CATEGORY_SCORES.check, ...overrides.check },
    call: { ...NLHE_CATEGORY_SCORES.call, ...overrides.call },
    raise: { ...NLHE_CATEGORY_SCORES.raise, ...overrides.raise },
    allIn: { ...NLHE_CATEGORY_SCORES.allIn, ...overrides.allIn },
  }
}

const NLHE_ARCHETYPE_SCORES: Record<BotArchetypeId, CategoryScoreTable> = {
  tag: NLHE_CATEGORY_SCORES,

  nit: nlhe({
    raise: { marginal: 2, medium: 24, good: 36 },
    call: { medium: 10 },
    fold: { marginal: -14 },
  }),

  lag: nlhe({
    raise: { marginal: -18, medium: -12, good: 8, strong: 24 },
    call: { air: -18, marginal: 15, medium: 28, good: 5 },
  }),

  'calling-station': nlhe({
    fold: { weak: -5, marginal: -15, medium: -42 },
    call: { weak: 0, medium: 24 },
    raise: { medium: 2 },
  }),
}

export function getNlheScores(archetypeId?: BotArchetypeId): CategoryScoreTable {
  return NLHE_ARCHETYPE_SCORES[archetypeId ?? 'tag'] ?? NLHE_CATEGORY_SCORES
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
  tag: plo({
    raise: { good: 2 },
  }),

  nit: plo({
    fold: { marginal: -8, medium: -4, good: -24, strong: -42 },
    check: { marginal: 0, medium: -1 },
    call: { marginal: 6, medium: 12, good: -12, strong: -8, premium: -10 },
    raise: { marginal: -8, medium: 0, good: 4, strong: 10 },
    allIn: { good: 5, strong: 22 },
  }),

  lag: plo({
    fold: { marginal: -3, medium: -20, good: -42 },
    check: { marginal: 3, medium: 1 },
    call: { marginal: -1, medium: 4, good: -3 },
    raise: { marginal: -1, medium: 6, good: 18, strong: 26, premium: 36 },
    allIn: { good: -4, strong: 12, premium: 28 },
  }),

  'calling-station': plo({
    fold: { weak: 10, marginal: 8, medium: 0, good: -32, strong: -44 },
    check: { weak: 6, marginal: 2, medium: 2, good: -16 },
    call: { weak: -4, marginal: -8, medium: -3, good: -10, strong: -10, premium: -12 },
    raise: { 'weak-draw': 14, marginal: -12, medium: -2, good: 6, strong: 10, premium: 18 },
    allIn: { 'weak-draw': -16, marginal: -26, medium: -20, good: 6, strong: 18, premium: 34 },
  }),
}

const PLO_ARCHETYPE_PREFLOP_SIX_MAX: Partial<Record<BotArchetypeId, CategoryScoreTable>> = {
  tag: plo(
    {
      raise: { good: 6 },
    },
    PLO_ARCHETYPE_PREFLOP.tag,
  ),
  nit: plo(
    {
      fold: { medium: -4 },
      call: { medium: 8, good: -8 },
      raise: { good: -12 },
    },
    PLO_ARCHETYPE_PREFLOP.nit,
  ),
  'calling-station': plo(
    {
      fold: { medium: -8 },
      call: { medium: 5 },
    },
    PLO_ARCHETYPE_PREFLOP['calling-station'],
  ),
}

const PLO_ARCHETYPE_PREFLOP_FULL_RING: Partial<Record<BotArchetypeId, CategoryScoreTable>> = {
  nit: plo(
    {
      fold: { marginal: -7, medium: -2 },
      call: { marginal: 5, medium: 10 },
    },
    PLO_ARCHETYPE_PREFLOP.nit,
  ),
}

const PLO_ARCHETYPE_POSTFLOP: Record<BotArchetypeId, CategoryScoreTable> = {
  tag: plo({
    call: { marginal: 4, medium: 10, good: 6 },
    raise: { marginal: -6, medium: 4, good: 14, strong: 20, premium: 28 },
  }),

  nit: plo({
    fold: { marginal: 5, medium: 22, good: -14, strong: -38 },
    check: { marginal: 0, medium: 4 },
    call: { marginal: 20, medium: 8, good: -16, strong: -16 },
    raise: { marginal: -12, medium: -10, good: -6, strong: 2 },
    allIn: { good: 0, strong: 14 },
  }),

  lag: plo({
    fold: { marginal: 10, medium: -30, good: -55 },
    check: { marginal: 0, medium: -1 },
    call: { marginal: 10, medium: 22, good: 14 },
    raise: { marginal: 0, medium: 8, good: 14, strong: 22, premium: 36 },
    allIn: { good: 0, strong: 12, premium: 26 },
  }),

  'calling-station': plo({
    fold: { weak: 10, marginal: 14, medium: 10, good: -25, strong: -38 },
    check: { weak: 2, marginal: -6, medium: -8, good: -22 },
    call: { weak: 0, marginal: -12, medium: -8, good: -10, strong: -20, premium: -22 },
    raise: { 'weak-draw': 10, marginal: -26, medium: -16, good: -10, strong: -4, premium: 10 },
    allIn: { 'weak-draw': -22, marginal: -32, medium: -26, good: 0, strong: 10, premium: 24 },
  }),
}

/* ------------------------------------------------------------------ */
/*  PLO turn score tables                                              */
/*  Same delta-over-TAG pattern, but for the turn. Used to             */
/*  separate "call cheap flop" from "fold expensive turn" so           */
/*  AF (needs calls) and WTSD (needs late folds) can be tuned          */
/*  independently. Entries default to the flop (postflop) table.       */
/* ------------------------------------------------------------------ */

const PLO_ARCHETYPE_TURN_RIVER: Record<BotArchetypeId, CategoryScoreTable> = {
  tag: plo({
    call: { medium: 6, good: 4 },
    raise: { medium: 4, good: 12 },
  }),
  lag: plo({
    fold: { marginal: 10, medium: -6 },
    check: { air: -8, weak: -8, marginal: -8 },
    call: { marginal: -8, medium: 0 },
    raise: {
      air: 12, 'weak-draw': 22, 'weak-no-draw': 2, marginal: 18, medium: 24, good: 34,
    },
    allIn: { good: -10, strong: 5, premium: 24 },
  }),
  'calling-station': plo({
    fold: { weak: 10, marginal: 14, medium: 10, good: -25, strong: -38 },
    check: { weak: 2, marginal: -6, medium: -8, good: -22 },
    call: { weak: -2, marginal: -16, medium: -10, good: -20, strong: -20, premium: -22 },
    raise: { 'weak-draw': 10, marginal: -16, medium: -6, good: 0, strong: 4, premium: 10 },
    allIn: { 'weak-draw': -22, marginal: -32, medium: -26, good: 0, strong: 10, premium: 24 },
  }),

  nit: plo({
    fold: { marginal: 20, medium: 34, good: -22, strong: -34 },
    check: { marginal: 0, medium: -16, good: -26 },
    call: { marginal: -20, medium: -6, good: 4, strong: -6 },
    raise: { marginal: -14, medium: -14, good: 2, strong: 2 },
    allIn: { good: 2, strong: 14 },
  }),
}

const PLO_ARCHETYPE_RIVER: Record<BotArchetypeId, CategoryScoreTable> = {
  tag: PLO_ARCHETYPE_TURN_RIVER.tag,
  nit: PLO_ARCHETYPE_TURN_RIVER.nit,
  'calling-station': PLO_ARCHETYPE_TURN_RIVER['calling-station'],
  lag: plo(
    {
      check: { air: -20, weak: -20, marginal: -20 },
      raise: {
        air: 25, 'weak-draw': 30, 'weak-no-draw': 18, marginal: 30, medium: 24, good: 34,
      },
    },
    PLO_ARCHETYPE_TURN_RIVER.lag,
  ),
}

export type PloStreet = 'preflop' | 'flop' | 'turn' | 'river' | 'turn-river'

/* ------------------------------------------------------------------ */
/*  PLO six-max postflop score overrides                               */
/*  Tables for the resolved six-max format (3-6 seats, excluding HU).  */
/*  the archetype's full-ring table; missing archetypes fall back.     */
/* ------------------------------------------------------------------ */

const PLO_ARCHETYPE_POSTFLOP_SIX_MAX: Partial<Record<BotArchetypeId, CategoryScoreTable>> = {
  tag: plo(
    {
      call: { good: 10 },
    },
    PLO_ARCHETYPE_POSTFLOP.tag,
  ),
  lag: plo(
    {
      fold: { marginal: -5, medium: -22 },
      call: { marginal: -7 },
      raise: { marginal: 4, medium: 15, good: 24, strong: 32, premium: 44 },
    },
    PLO_ARCHETYPE_POSTFLOP.lag,
  ),
  'calling-station': plo(
    {
      fold: { weak: 8, marginal: 10, medium: 8 },
      raise: { marginal: -20, medium: -10, good: -2, strong: 2, premium: 10 },
      call: { weak: 4, marginal: 4, medium: 6, good: 4 },
    },
    PLO_ARCHETYPE_POSTFLOP['calling-station'],
  ),
}

const PLO_ARCHETYPE_TURN_RIVER_SIX_MAX: Partial<Record<BotArchetypeId, CategoryScoreTable>> = {
  tag: plo(
    {
      call: { medium: 8, good: 4 },
      raise: { good: 8 },
    },
    PLO_ARCHETYPE_TURN_RIVER.tag,
  ),
  lag: plo(
    {
      fold: { marginal: 0, medium: -16 },
      check: { air: 10, weak: 10, marginal: 8 },
      call: { marginal: -8, medium: -6 },
      raise: {
        air: -15, 'weak-draw': 8, 'weak-no-draw': -18, marginal: 2, medium: 24, good: 34,
      },
    },
    PLO_ARCHETYPE_TURN_RIVER.lag,
  ),
  nit: plo(
    {
      fold: { marginal: 12, medium: 24 },
    },
    PLO_ARCHETYPE_TURN_RIVER.nit,
  ),
  'calling-station': plo(
    {
      fold: { weak: 20, marginal: 22, medium: 24 },
      call: { weak: -14, marginal: -28, medium: -6, good: -8, strong: -14, premium: -16 },
    },
    PLO_ARCHETYPE_TURN_RIVER['calling-station'],
  ),
}

const PLO_ARCHETYPE_RIVER_SIX_MAX: Partial<Record<BotArchetypeId, CategoryScoreTable>> = {
  tag: plo(
    {
      call: { medium: 8, good: 4 },
      raise: { good: 2 },
    },
    PLO_ARCHETYPE_RIVER.tag,
  ),
  lag: plo(
    {
      fold: { marginal: 0, medium: -16 },
      check: { air: 4, weak: 4, marginal: 0 },
      call: { marginal: -8, medium: -6 },
      raise: {
        air: 0, 'weak-draw': 18, 'weak-no-draw': -10, marginal: 12, medium: 24, good: 34,
      },
    },
    PLO_ARCHETYPE_RIVER.lag,
  ),
  nit: plo(
    {
      fold: { marginal: 12, medium: 24 },
    },
    PLO_ARCHETYPE_RIVER.nit,
  ),
  'calling-station': plo(
    {
      fold: { weak: 20, marginal: 22, medium: 24 },
      call: { weak: -14, marginal: -28, medium: -6, good: -8, strong: -14, premium: -16 },
    },
    PLO_ARCHETYPE_RIVER['calling-station'],
  ),
}

/* ------------------------------------------------------------------ */
/*  PLO heads-up score tables                                          */
/*  These intentionally start with the values HU previously inherited */
/*  through `tableSize <= 6`, but are independent six-max snapshots.   */
/* ------------------------------------------------------------------ */

const PLO_ARCHETYPE_PREFLOP_HEADS_UP: Record<BotArchetypeId, CategoryScoreTable> = {
  tag: plo({
    raise: { good: 6 },
  }, PLO_ARCHETYPE_PREFLOP.tag),
  nit: plo({
    fold: { medium: -4 },
    call: { medium: 8, good: -8 },
    raise: { good: -12 },
  }, PLO_ARCHETYPE_PREFLOP.nit),
  lag: plo({}, PLO_ARCHETYPE_PREFLOP.lag),
  'calling-station': plo({
    fold: { medium: -8 },
    call: { medium: 5 },
  }, PLO_ARCHETYPE_PREFLOP['calling-station']),
}

const PLO_ARCHETYPE_POSTFLOP_HEADS_UP: Record<BotArchetypeId, CategoryScoreTable> = {
  tag: plo({
    call: { good: 10 },
  }, PLO_ARCHETYPE_POSTFLOP.tag),
  nit: plo({}, PLO_ARCHETYPE_POSTFLOP.nit),
  lag: plo({
    fold: { marginal: -5, medium: -22 },
    call: { marginal: -7 },
    raise: { marginal: 4, medium: 15, good: 24, strong: 32, premium: 44 },
  }, PLO_ARCHETYPE_POSTFLOP.lag),
  'calling-station': plo({
    fold: { weak: 8, marginal: 10, medium: 8 },
    raise: { marginal: -20, medium: -10, good: -2, strong: 2, premium: 10 },
    call: { weak: 4, marginal: 4, medium: 6, good: 4 },
  }, PLO_ARCHETYPE_POSTFLOP['calling-station']),
}

const PLO_ARCHETYPE_TURN_RIVER_HEADS_UP: Record<BotArchetypeId, CategoryScoreTable> = {
  tag: plo({
    call: { medium: 8, good: 4 },
    raise: { good: 8 },
  }, PLO_ARCHETYPE_TURN_RIVER.tag),
  nit: plo({
    fold: { marginal: 12, medium: 24 },
  }, PLO_ARCHETYPE_TURN_RIVER.nit),
  lag: plo({
    fold: { marginal: 0, medium: -16 },
    check: { air: 10, weak: 10, marginal: 8 },
    call: { marginal: -8, medium: -6 },
    raise: {
      air: -15, 'weak-draw': 8, 'weak-no-draw': -18, marginal: 2, medium: 24, good: 34,
    },
  }, PLO_ARCHETYPE_TURN_RIVER.lag),
  'calling-station': plo({
    fold: { weak: 20, marginal: 22, medium: 24 },
    call: { weak: -14, marginal: -28, medium: -6, good: -8, strong: -14, premium: -16 },
  }, PLO_ARCHETYPE_TURN_RIVER['calling-station']),
}

const PLO_ARCHETYPE_RIVER_HEADS_UP: Record<BotArchetypeId, CategoryScoreTable> = {
  tag: plo({
    call: { medium: 8, good: 4 },
    raise: { good: 2 },
  }, PLO_ARCHETYPE_RIVER.tag),
  nit: plo({
    fold: { marginal: 12, medium: 24 },
  }, PLO_ARCHETYPE_RIVER.nit),
  lag: plo({
    fold: { marginal: 0, medium: -16 },
    check: { air: 4, weak: 4, marginal: 0 },
    call: { marginal: -8, medium: -6 },
    raise: {
      air: 0, 'weak-draw': 18, 'weak-no-draw': -10, marginal: 12, medium: 24, good: 34,
    },
  }, PLO_ARCHETYPE_RIVER.lag),
  'calling-station': plo({
    fold: { weak: 20, marginal: 22, medium: 24 },
    call: { weak: -14, marginal: -28, medium: -6, good: -8, strong: -14, premium: -16 },
  }, PLO_ARCHETYPE_RIVER['calling-station']),
}

export function getPloScores(
  archetypeId: BotArchetypeId | undefined,
  street: PloStreet,
  tableSize: number = 9,
): CategoryScoreTable {
  const archetype = archetypeId ?? 'tag'
  const format = resolveTableFormat(tableSize)
  const table = street === 'preflop'
    ? PLO_ARCHETYPE_PREFLOP
    : street === 'river'
      ? PLO_ARCHETYPE_RIVER
      : street === 'turn' || street === 'turn-river'
      ? PLO_ARCHETYPE_TURN_RIVER
      : PLO_ARCHETYPE_POSTFLOP
  if (street === 'preflop' && format === 'heads-up') {
    return PLO_ARCHETYPE_PREFLOP_HEADS_UP[archetype] ?? table[archetype] ?? PLO_TAG_SCORES
  }
  if (street === 'preflop' && format === 'six-max') {
    return PLO_ARCHETYPE_PREFLOP_SIX_MAX[archetype] ?? table[archetype] ?? PLO_TAG_SCORES
  }
  if (street === 'preflop' && format === 'full-ring') {
    return PLO_ARCHETYPE_PREFLOP_FULL_RING[archetype] ?? table[archetype] ?? PLO_TAG_SCORES
  }
  if (street !== 'preflop' && format === 'heads-up') {
    const headsUp = street === 'river'
      ? PLO_ARCHETYPE_RIVER_HEADS_UP
      : street === 'turn' || street === 'turn-river'
        ? PLO_ARCHETYPE_TURN_RIVER_HEADS_UP
        : PLO_ARCHETYPE_POSTFLOP_HEADS_UP
    return headsUp[archetype] ?? table[archetype] ?? PLO_TAG_SCORES
  }
  if (street !== 'preflop' && format === 'six-max') {
    const sixMax = street === 'river'
      ? PLO_ARCHETYPE_RIVER_SIX_MAX
      : street === 'turn' || street === 'turn-river'
        ? PLO_ARCHETYPE_TURN_RIVER_SIX_MAX
        : PLO_ARCHETYPE_POSTFLOP_SIX_MAX
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
    unopened: { premium: 'raise', strong: 'raise', good: 'raise', medium: 'call-or-fold', marginal: 'fold' },
    'facing-open': { premium: 'raise', strong: 'raise', good: 'call', medium: 'call' },
    'facing-3bet': { premium: 'raise', strong: 'call', good: 'call' },
  },
  nit: {
    unopened: { premium: 'raise', strong: 'raise', good: 'raise', medium: 'call' },
    'facing-open': { premium: 'raise', strong: 'raise', good: 'call' },
    'facing-3bet': { premium: 'raise', strong: 'call' },
  },
  lag: {
    unopened: { premium: 'raise', strong: 'raise', good: 'raise', medium: 'call-or-fold', marginal: 'fold' },
    'facing-open': { premium: 'raise', strong: 'raise', good: 'call', medium: 'fold', marginal: 'fold' },
    'facing-3bet': { premium: 'raise', strong: 'raise', good: 'fold' },
  },
  'calling-station': {
    unopened: { premium: 'raise', strong: 'raise', good: 'call', medium: 'call', marginal: 'call-or-fold' },
    'facing-open': { premium: 'raise', strong: 'call', good: 'call', medium: 'call', marginal: 'call-or-fold' },
    'facing-3bet': { premium: 'call' },
  },
}

/* ------------------------------------------------------------------ */
/*  PLO six-max preflop strategy overrides                             */
/*  Tables for the resolved six-max format (3-6 seats, excluding HU).  */
/*  and entries fall back to the full-ring strategy table above.       */
/* ------------------------------------------------------------------ */

const PLO_PREFLOP_STRATEGY_SIX_MAX: Partial<Record<BotArchetypeId, PloPreflopStrategySixMaxTable>> = {
  lag: {
    unopened: { premium: 'raise', strong: 'raise', good: 'raise', medium: 'raise', marginal: 'fold' },
    'facing-open': {
      premium: 'raise', strong: 'raise', good: 'call', medium: 'call-or-fold', marginal: 'fold',
    },
  },
  nit: {
    unopened: { premium: 'raise', strong: 'raise', good: 'raise', medium: 'call', marginal: 'fold' },
    'facing-open': { premium: 'raise', strong: 'raise', good: 'raise-or-call', medium: 'call-or-fold' },
    'facing-3bet': { premium: 'raise', strong: 'raise' },
  },
  'calling-station': {
    'facing-open': {
      premium: 'raise', strong: 'raise', good: 'call', medium: 'call', marginal: 'call-or-fold',
    },
  },
}

const PLO_PREFLOP_STRATEGY_HEADS_UP: Partial<Record<BotArchetypeId, PloPreflopStrategySixMaxTable>> = {
  lag: {
    unopened: { premium: 'raise', strong: 'raise', good: 'raise', medium: 'raise', marginal: 'fold' },
    'facing-open': {
      premium: 'raise', strong: 'raise', good: 'call', medium: 'call-or-fold', marginal: 'fold',
    },
  },
  nit: {
    unopened: { premium: 'raise', strong: 'raise', good: 'raise', medium: 'call', marginal: 'fold' },
    'facing-open': { premium: 'raise', strong: 'raise', good: 'raise-or-call', medium: 'call-or-fold' },
    'facing-3bet': { premium: 'raise', strong: 'raise' },
  },
  'calling-station': {
    'facing-open': {
      premium: 'raise', strong: 'raise', good: 'call', medium: 'call', marginal: 'call-or-fold',
    },
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
  const format = resolveTableFormat(tableSize)
  const formatTable = format === 'heads-up'
    ? PLO_PREFLOP_STRATEGY_HEADS_UP[archetype]
    : format === 'six-max'
      ? PLO_PREFLOP_STRATEGY_SIX_MAX[archetype]
      : undefined
  const action = (formatTable?.[situation] ?? table?.[situation])?.[category]
  if (action) {
    // HU widening for specific archetype/category combos
    if (format === 'heads-up' && archetype === 'calling-station') {
      if (situation === 'unopened' && category === 'marginal') return 'call'
      if (situation === 'facing-open' && category === 'strong') return 'raise'
    }
    if (format === 'heads-up' && archetype === 'lag') {
      if (situation === 'facing-open' && category === 'strong') return 'raise'
    }
    return action
  }

  // HU defaults: wider ranges for unlisted categories
  if (format === 'heads-up' && category !== 'air') {
    if (archetype === 'calling-station') return 'call'
    if (archetype === 'lag' && situation !== 'facing-3bet') return 'call'
  }

  return 'fold'
}

/* ------------------------------------------------------------------ */
/*  Archetype intention (kept as comment for reference)                */
/*  TAG  = baseline, balanced aggressive                              */
/*  Nit  = folds more marginal/medium, calls less, raises less        */
/*  LAG  = calls/stays more marginal, raises more good+               */
/*  CS   = folds much more marginal/medium, calls much less, raises   */
/*         very rarely, prefers check                                  */
/* ------------------------------------------------------------------ */
