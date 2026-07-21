import type { BotArchetypeId } from './bot-archetypes'
import type { PreflopSituation } from './preflop-ranges'
import type { Position } from './bot-types'

export interface TraitParams {
  mean: number
  stddev: number
}

export interface ArchetypeParams {
  preflopLooseness: TraitParams
  aggression: TraitParams
  bluffFrequency: TraitParams
  riskTolerance: TraitParams
  patience: TraitParams
  observationSkill: TraitParams
  tiltSensitivity: TraitParams
  tiltRecovery: TraitParams
  emotionality: TraitParams
}

export interface ScoringParams {
  handStrength: {
    fold: Record<string, number>
    check: Record<string, number>
    call: Record<string, number>
    raise: Record<string, number>
    allIn: Record<string, number>
  }
  streetInitiative: {
    cbetOpportunity: number
    delayedCbet: number
    weaknessSteal: number
    weaknessTrap: number
    checkRaiseCaution: number
    multiwayWeak: number
    multiwayMedium: number
    opponentStrength: number
    passiveTableValue: number
    flushDangerPerCard: number
    reraiseBase: number
    reraisePerLevel: number
  }
  boardDangers: {
    connected: number
    trips: number
    paired: number
    twoPair: number
    broadway: number
  }
  raiseBonus: {
    highRelStrength: number
    lowRelStrength: number
    nutPotential: number
    nearNutPotential: number
    vulnerability: number
    drawQuality: number
    cleanOuts: number
    latePosition: number
    dryBoardBluff: number
  }
  allInMods: {
    lowSpr: number
    highSpr: number
    deepStack: number
    exceedsEffectiveStack: number
    blockerValue: number
  }
  utilityBaseline: number
  skillTiers: { threshold: number; factor: number }[]
}

export interface BettingParams {
  priceMultiplier: number
  priceClampMin: number
  priceClampMax: number
  sizingMultiplier: number
  sizingClampMin: number
  sizingClampMax: number
  foldCommitmentPenalty: number
  foldCapMin: number
  foldCapMax: number
  callDeepDrawBonus: number
  callShortDrawPenalty: number
  callLowSprBonus: number
  callCommitmentPenalty: number
  callCapMin: number
  callCapMax: number
  raiseSprBonus: number
  raiseSprPenalty: number
  raiseDeepDrawBonus: number
  raiseLargeBetPenalty: number
  raiseReraiseMedium: number
  raiseReraiseWeak: number
  raiseReraiseBigBet: number
  raiseReraiseGoodOdds: number
  raiseCapMin: number
  raiseCapMax: number
  raisePotFraction: {
    premium: number
    strong: number
    good: number
    draw: number
    medium: number
    default: number
  }
  raiseSizingMods: {
    wetBoard: number
    dryBoard: number
    latePosition: number
    lowSprStrong: number
    cbetDry: number
    multiway: number
    weaknessBluff: number
    checkRaiseCaution: number
  }
  raiseFractionMin: number
  raiseFractionMax: number
  stackShort: number
  stackDeep: number
}

export interface MentalParams {
  severityPotDivisor: number
  events: Record<string, Record<string, number>>
  decay: {
    tiltPerDecision: number
    frustrationPerDecision: number
    momentumRegression: number
  }
  tiltThreshold: number
  confidenceThreshold: number
  patienceThreshold: number
}

export interface CoverageEntry {
  raise: number
  vpip: number
}

export type CoverageTable = Record<PreflopSituation, Partial<Record<Position, CoverageEntry>>>

export interface BotParams {
  archetypes: Record<BotArchetypeId, ArchetypeParams>
  scoring: ScoringParams
  betting: BettingParams
  mental: MentalParams
  coverage: {
    fullRing: CoverageTable
    sixMax: CoverageTable
    headsUp: CoverageTable
  }
  preflop: {
    rangeFactorBase: number
    rangeFactorLoosenessMul: number
    rangeFactorTableExpansionNear: number
    rangeFactorTableExpansionFar: number
    raiseRangeLowAggCutoff: number
    raiseRangeLowAggCompress: number
    pressureExponent: Record<PreflopSituation, number>
  }
  stack: {
    shortBb: number
    veryShortBb: number
    moderateBb: number
    shortFoldWeak: number
    shortCallNonStrong: number
    veryShortPush: number
    veryShortAvoidCall: number
    moderateCallAir: number
  }
  sizingTell: {
    alpha: number
    minSamples: number
    massiveOverbet: number
    overbet: number
    smallBet: number
    overbetPenalty: number
    moderatePenalty: number
    skillGate: number
  }
}

export const DEFAULT_PARAMS: BotParams = {
  archetypes: {
    tag: {
      preflopLooseness: { mean: 50, stddev: 5 },
      aggression: { mean: 65, stddev: 10 },
      bluffFrequency: { mean: 25, stddev: 8 },
      riskTolerance: { mean: 50, stddev: 12 },
      patience: { mean: 70, stddev: 10 },
      observationSkill: { mean: 60, stddev: 15 },
      tiltSensitivity: { mean: 40, stddev: 15 },
      tiltRecovery: { mean: 60, stddev: 15 },
      emotionality: { mean: 50, stddev: 10 },
    },
    nit: {
      preflopLooseness: { mean: 12, stddev: 4 },
      aggression: { mean: 38, stddev: 7 },
      bluffFrequency: { mean: 8, stddev: 4 },
      riskTolerance: { mean: 25, stddev: 7 },
      patience: { mean: 88, stddev: 6 },
      observationSkill: { mean: 62, stddev: 12 },
      tiltSensitivity: { mean: 24, stddev: 8 },
      tiltRecovery: { mean: 72, stddev: 10 },
      emotionality: { mean: 28, stddev: 8 },
    },
    lag: {
      preflopLooseness: { mean: 76, stddev: 7 },
      aggression: { mean: 80, stddev: 8 },
      bluffFrequency: { mean: 48, stddev: 10 },
      riskTolerance: { mean: 68, stddev: 10 },
      patience: { mean: 45, stddev: 10 },
      observationSkill: { mean: 60, stddev: 15 },
      tiltSensitivity: { mean: 45, stddev: 12 },
      tiltRecovery: { mean: 55, stddev: 12 },
      emotionality: { mean: 50, stddev: 10 },
    },
    'calling-station': {
      preflopLooseness: { mean: 82, stddev: 7 },
      aggression: { mean: 22, stddev: 6 },
      bluffFrequency: { mean: 8, stddev: 4 },
      riskTolerance: { mean: 88, stddev: 7 },
      patience: { mean: 25, stddev: 8 },
      observationSkill: { mean: 50, stddev: 15 },
      tiltSensitivity: { mean: 35, stddev: 10 },
      tiltRecovery: { mean: 60, stddev: 12 },
      emotionality: { mean: 35, stddev: 10 },
    },
  },
  scoring: {
    handStrength: {
      fold: { air: 10, weak: 5, marginal: -5, medium: -30, good: -42, strong: -50, premium: -50 },
      check: { air: 20, weak: 20, marginal: 15, medium: 10, good: -15, strong: -30, premium: -30 },
      call: { air: -25, weak: -5, marginal: 5, medium: 20, good: -5, strong: -10, premium: -10 },
      raise: { air: -25, 'weak-draw': 15, 'weak-no-draw': -25, weak: -20, marginal: -10, medium: 5, good: 20, strong: 30, premium: 40 },
      allIn: { air: -42, 'weak-draw': -18, 'weak-no-draw': -42, weak: -35, marginal: -25, medium: -15, good: 10, strong: 28, premium: 42 },
    },
    streetInitiative: {
      cbetOpportunity: 12,
      delayedCbet: 8,
      weaknessSteal: 10,
      weaknessTrap: -5,
      checkRaiseCaution: -8,
      multiwayWeak: -10,
      multiwayMedium: -5,
      opponentStrength: -7,
      passiveTableValue: 8,
      flushDangerPerCard: -6,
      reraiseBase: -5,
      reraisePerLevel: -3,
    },
    boardDangers: {
      connected: -5,
      trips: -8,
      paired: -4,
      twoPair: -8,
      broadway: -3,
    },
    raiseBonus: {
      highRelStrength: 10,
      lowRelStrength: -10,
      nutPotential: 15,
      nearNutPotential: 8,
      vulnerability: 5,
      drawQuality: 8,
      cleanOuts: 10,
      latePosition: 15,
      dryBoardBluff: 10,
    },
    allInMods: {
      lowSpr: 12,
      highSpr: -42,
      deepStack: -10,
      exceedsEffectiveStack: -35,
      blockerValue: 5,
    },
    utilityBaseline: 50,
    skillTiers: [
      { threshold: 90, factor: 1 },
      { threshold: 70, factor: 0.85 },
      { threshold: 50, factor: 0.65 },
      { threshold: 30, factor: 0.4 },
      { threshold: 0, factor: 0.2 },
    ],
  },
  betting: {
    priceMultiplier: 70,
    priceClampMin: -18,
    priceClampMax: 16,
    sizingMultiplier: 18,
    sizingClampMin: -14,
    sizingClampMax: 8,
    foldCommitmentPenalty: -14,
    foldCapMin: -25,
    foldCapMax: 25,
    callDeepDrawBonus: 7,
    callShortDrawPenalty: -7,
    callLowSprBonus: 10,
    callCommitmentPenalty: -10,
    callCapMin: -25,
    callCapMax: 25,
    raiseSprBonus: 12,
    raiseSprPenalty: -8,
    raiseDeepDrawBonus: 5,
    raiseLargeBetPenalty: -8,
    raiseReraiseMedium: -12,
    raiseReraiseWeak: -18,
    raiseReraiseBigBet: -10,
    raiseReraiseGoodOdds: -8,
    raiseCapMin: -30,
    raiseCapMax: 20,
    raisePotFraction: {
      premium: 0.9,
      strong: 0.75,
      good: 0.65,
      draw: 0.65,
      medium: 0.55,
      default: 0.45,
    },
    raiseSizingMods: {
      wetBoard: 0.1,
      dryBoard: -0.1,
      latePosition: -0.05,
      lowSprStrong: 0.15,
      cbetDry: -0.05,
      multiway: 0.1,
      weaknessBluff: -0.1,
      checkRaiseCaution: -0.15,
    },
    raiseFractionMin: 0.33,
    raiseFractionMax: 1,
    stackShort: 25,
    stackDeep: 100,
  },
  mental: {
    severityPotDivisor: 20,
    events: {
      'won-small-pot': { confidence: 3, momentum: 5, tilt: -2, patience: 2 },
      'lost-small-pot': { confidence: -2, momentum: -3, tilt: 3, patience: -2 },
      'lost-big-pot': { confidence: -5, momentum: -8, tilt: 8, patience: -5 },
      'bad-beat': { confidence: -8, momentum: -15, tilt: 15, patience: -10, frustration: 10, badBeatMul: 2 },
      'bluff-caught': { confidence: -6, momentum: -10, tilt: 5, patience: -3 },
      'successful-bluff': { confidence: 7, momentum: 10, tilt: -3, patience: 3 },
      'suckout-win': { confidence: 5, momentum: 12, tilt: -2, patience: 2 },
      coolered: { confidence: -7, momentum: -12, tilt: 10, patience: -5, frustration: 8 },
    },
    decay: {
      tiltPerDecision: 1,
      frustrationPerDecision: 2,
      momentumRegression: 0.95,
    },
    tiltThreshold: 50,
    confidenceThreshold: 40,
    patienceThreshold: 40,
  },
  coverage: {
    fullRing: {
      unopened: { early: { raise: 14, vpip: 18 }, middle: { raise: 16, vpip: 22 }, late: { raise: 23, vpip: 30 }, blinds: { raise: 18, vpip: 28 } },
      'facing-open': { early: { raise: 3, vpip: 7 }, middle: { raise: 4, vpip: 10 }, late: { raise: 5, vpip: 13 }, blinds: { raise: 6, vpip: 18 } },
      'facing-3bet': { early: { raise: 1.5, vpip: 4 }, middle: { raise: 2, vpip: 5 }, late: { raise: 2.5, vpip: 7 }, blinds: { raise: 2.5, vpip: 8 } },
    },
    sixMax: {
      unopened: { early: { raise: 18, vpip: 22 }, middle: { raise: 22, vpip: 27 }, late: { raise: 32, vpip: 40 }, blinds: { raise: 25, vpip: 35 } },
      'facing-open': { early: { raise: 4, vpip: 9 }, middle: { raise: 6, vpip: 13 }, late: { raise: 8, vpip: 18 }, blinds: { raise: 10, vpip: 24 } },
      'facing-3bet': { early: { raise: 2, vpip: 5 }, middle: { raise: 2.5, vpip: 6 }, late: { raise: 3.5, vpip: 9 }, blinds: { raise: 4, vpip: 10 } },
    },
    headsUp: {
      unopened: { early: { raise: 68, vpip: 80 }, middle: { raise: 68, vpip: 80 }, late: { raise: 68, vpip: 80 }, blinds: { raise: 30, vpip: 70 } },
      'facing-open': { early: { raise: 12, vpip: 50 }, middle: { raise: 12, vpip: 50 }, late: { raise: 12, vpip: 50 }, blinds: { raise: 16, vpip: 58 } },
      'facing-3bet': { early: { raise: 7, vpip: 32 }, middle: { raise: 7, vpip: 32 }, late: { raise: 7, vpip: 32 }, blinds: { raise: 8, vpip: 36 } },
    },
  },
  preflop: {
    rangeFactorBase: 0.55,
    rangeFactorLoosenessMul: 0.009,
    rangeFactorTableExpansionNear: 0.025,
    rangeFactorTableExpansionFar: 0.005,
    raiseRangeLowAggCutoff: 30,
    raiseRangeLowAggCompress: 0.15,
    pressureExponent: {
      unopened: 1,
      'facing-open': 1.35,
      'facing-3bet': 1.7,
    },
  },
  stack: {
    shortBb: 25,
    veryShortBb: 12,
    moderateBb: 40,
    shortFoldWeak: 8,
    shortCallNonStrong: -10,
    veryShortPush: 5,
    veryShortAvoidCall: -8,
    moderateCallAir: -5,
  },
  sizingTell: {
    alpha: 0.25,
    minSamples: 3,
    massiveOverbet: 2.0,
    overbet: 1.5,
    smallBet: 0.4,
    overbetPenalty: -8,
    moderatePenalty: -5,
    skillGate: 30,
  },
}

export let params: BotParams = structuredClone(DEFAULT_PARAMS)

export function resetParams(): void {
  params = structuredClone(DEFAULT_PARAMS)
}

export function loadOverrides(overrides: Record<string, number>): void {
  for (const [key, value] of Object.entries(overrides)) {
    const parts = key.split('.')
    if (parts.length === 3 && parts[0] === 'archetypes') {
      const arch = parts[1] as BotArchetypeId
      const field = parts[2] as keyof ArchetypeParams
      if (params.archetypes[arch] && field in params.archetypes[arch]) {
        params.archetypes[arch][field].mean = value
      }
    }
  }
}

// Auto-load overrides from JSON file (used by calibrator, no-op in browser)
try {
  if (typeof process !== 'undefined' && process.env.PARAMS_OVERRIDES) {
    loadOverrides(JSON.parse(process.env.PARAMS_OVERRIDES))
  }
} catch { /* ignore */ }
