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

type CalibrationFormatMap<T> = Record<'full-ring' | 'six-max' | 'heads-up', T>
type CalibrationArchetypeFormatMap<T> = Record<BotArchetypeId, CalibrationFormatMap<T>>

export interface ScoringParams {
  handStrength: {
    fold: Record<string, number>
    check: Record<string, number>
    call: Record<string, number>
    raise: Record<string, number>
    allIn: Record<string, number>
  }
  strengthWeights: {
    foldNeutral: number
    checkNeutral: number
    callNeutral: number
    raiseNeutral: number
    allInNeutral: number
  }
  streetInitiative: {
    cbetOpportunity: number
    delayedCbet: number
    weaknessSteal: number
    weaknessTrap: number
    multiwayWeak: number
    multiwayMedium: number
    opponentStrength: number
    passiveTableValue: number
    flushDangerPerCard: number
    reraiseBase: number
    reraisePerLevel: number
  }
  cbetDefenseCallBonus: {
    nlhe: CalibrationArchetypeFormatMap<number>
    plo: CalibrationArchetypeFormatMap<number>
  }
  cbetDefenseRaiseBase: {
    nlhe: CalibrationArchetypeFormatMap<number>
    plo: CalibrationArchetypeFormatMap<number>
  }
  turnBarrelMods: {
    nlhe: CalibrationArchetypeFormatMap<{ nonAir: number; air: number }>
    plo: CalibrationArchetypeFormatMap<{ nonAir: number; air: number }>
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
    secondNutPotential: number
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
    deepOpenShove: number
    uncommittedStrong: number
    uncommittedDeep: number
    uncommittedPostflop: number
  }
  preflopEscalationMods: {
    skillGate: number
    aggressionGate: number
    maxPolarizedStackBb: number
    commitmentGate: number
    shortValueStackBb: number
    fourBet: {
      valueFold: number
      polarizedFold: number
      defaultFold: number
      valueCall: number
      polarizedCall: number
      defaultCall: number
      valueRaise: number
      polarizedRaise: number
      defaultRaise: number
      valueAllIn: number
      defaultAllIn: number
    }
    fiveBet: {
      valueFold: number
      polarizedFold: number
      defaultFold: number
      valueCall: number
      defaultCall: number
      valueRaise: number
      polarizedRaise: number
      defaultRaise: number
      valueAllIn: number
      polarizedAllIn: number
      defaultAllIn: number
    }
    facingFiveBet: {
      valueFold: number
      defaultFold: number
      valueCall: number
      defaultCall: number
      valueRaiseCommitted: number
      valueRaiseUncommitted: number
      defaultRaise: number
      valueAllIn: number
      defaultAllIn: number
    }
  }
  commitmentBehavior: {
    minimumPotCommitment: number
    maximumCallBonus: number
    skillFullAt: number
    skillZeroAt: number
    maximumMentalMultiplier: number
    archetypeMultiplier: Record<BotArchetypeId, number>
    forcedAllInStart: number
    forcedAllInFull: number
    freePriceThreshold: number
    fullPriceThreshold: number
    forcedCategoryPenalty: {
      air: number
      weak: number
      marginal: number
      medium: number
      good: number
      strong: number
      premium: number
    }
    minimumRiskScale: number
    maximumRiskScale: number
  }
  callDownMods: {
    weakTurnPressure: number
    weakRiverPressure: number
    riverNoMadeHand: number
  }
  ploSprZones: {
    commitmentStart: number
    commitmentEnd: number
    protectionStart: number
    protectionPeak: number
    protectionEnd: number
    drawStart: number
    drawFull: number
    drawFade: number
    drawEnd: number
    commitmentFoldNonStrong: number
    commitmentContinueNonStrong: number
    commitmentRiskReduction: number
    commitmentRiskRaise: number
    commitmentFoldStrong: number
    commitmentCallStrong: number
    commitmentRaiseStrong: number
    commitmentAllInStrong: number
    protectionFoldVulnerable: number
    protectionFoldEquity: number
    protectionPassiveVulnerable: number
    protectionRaiseVulnerable: number
    protectionAllInVulnerable: number
    drawFoldStrong: number
    drawCheckStrong: number
    drawCallStrong: number
    drawRaiseStrong: number
  }
  equityCollapseMods: {
    fold: number
    check: number
    call: number
    raise: number
    allIn: number
    openActionScale: number
    minimumArchetypeScale: number
  }
  ploRiverDisciplineMods: {
    fold: number
    call: number
    raise: number
    allIn: number
    blockerThreshold: number
    pressureStep: number
    collapseOverlapScale: number
    minimumArchetypeScale: number
  }
  ploPositionMods: {
    ipCheckEquity: number
    oopFoldEquity: number
    freerollFold: number
    freerollCheck: number
    freerollCall: number
    freerollRaise: number
    freerollAllIn: number
    freerollMinCleanOuts: number
  }
  analysisSkillGates: {
    boardDynamics: number
    riverDiscipline: number
    nutPotential: number
    freeroll: number
    blocker: number
    wrapDominance: number
  }
  ploWrapQualityMods: {
    minimumDisciplineScale: number
    nut: { fold: number; check: number; call: number; raise: number; allIn: number }
    mixed: { fold: number; check: number; call: number; raise: number; allIn: number }
    second: { fold: number; check: number; call: number; raise: number; allIn: number }
    bottom: { fold: number; check: number; call: number; raise: number; allIn: number }
  }
  ploBlockerMods: {
    nutThreshold: number
    foldDefense: number
    callDefense: number
    bluffCheck: number
    bluffRaise: number
    bluffAllIn: number
    valueCheck: number
    valueRaise: number
    valueAllIn: number
  }
  checkRaiseMods: {
    respectSkillGate: number
    planningSkillGate: number
    foldRespect: number
    foldProtected: number
    callRespect: number
    callProtected: number
    reraiseRespect: number
    allInRespect: number
    planCheckValue: number
    planCheckDraw: number
    executeCallValue: number
    executeCallDraw: number
    executeRaiseValue: number
    executeRaiseDraw: number
    executeAllInValue: number
    executeAllInDraw: number
    ploRespectScale: number
    maxPressureScale: number
  }
  floatDefenseMods: {
    skillGate: number
    foldCandidate: number
    callCandidate: number
    callValue: number
    raiseCandidate: number
    raiseValue: number
    raiseBlockerBluff: number
    allInValue: number
    worseBoardScale: number
    largeBetFloor: number
    aggressiveReadBoost: number
  }
  betFoldMods: {
    skillGate: number
    minimumShowdownValue: number
    minimumRelativeStrength: number
    openBet: number
    openCheck: number
    openAllIn: number
    responseFold: number
    responseCall: number
    responseRaise: number
    responseAllIn: number
    minimumDisciplineScale: number
    maxPressureScale: number
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
  foldCapMin: number
  foldCapMax: number
  callDeepDrawBonus: number
  callImpliedOdds: {
    maxEffectiveStackBb: number
    maxStackScale: number
    multiwayStep: number
    maxMultiwayAdjustment: number
    minimumBonus: number
    maximumBonus: number
    nutPotentialScale: {
      nuts: number
      'near-nuts': number
      'second-nuts': number
      strong: number
      medium: number
      weak: number
    }
  }
  callShortDrawPenalty: number
  callLowSprBonus: number
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
      preflopLooseness: { mean: 14, stddev: 4 },
      aggression: { mean: 52, stddev: 7 },
      bluffFrequency: { mean: 8, stddev: 4 },
      riskTolerance: { mean: 28, stddev: 7 },
      patience: { mean: 76, stddev: 6 },
      observationSkill: { mean: 62, stddev: 12 },
      tiltSensitivity: { mean: 24, stddev: 8 },
      tiltRecovery: { mean: 72, stddev: 10 },
      emotionality: { mean: 28, stddev: 8 },
    },
    lag: {
      preflopLooseness: { mean: 76, stddev: 7 },
      aggression: { mean: 72, stddev: 8 },
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
      check: { air: 10, weak: 10, marginal: 8, medium: 5, good: -15, strong: -30, premium: -30 },
      call: { air: -25, weak: -5, marginal: 5, medium: 20, good: -5, strong: -10, premium: -10 },
      raise: { air: -25, 'weak-draw': 15, 'weak-no-draw': -25, weak: -20, marginal: -10, medium: 5, good: 20, strong: 30, premium: 40 },
      allIn: { air: -42, 'weak-draw': -18, 'weak-no-draw': -42, weak: -35, marginal: -25, medium: -15, good: 10, strong: 28, premium: 42 },
    },
    strengthWeights: {
      foldNeutral: 42,
      checkNeutral: 30,
      callNeutral: 42,
      raiseNeutral: 38,
      allInNeutral: 52,
    },
    streetInitiative: {
      cbetOpportunity: 16,
      delayedCbet: 8,
      weaknessSteal: 10,
      weaknessTrap: -5,
      multiwayWeak: -10,
      multiwayMedium: -5,
      opponentStrength: -7,
      passiveTableValue: 8,
      flushDangerPerCard: -6,
      reraiseBase: -5,
      reraisePerLevel: -3,
    },
    cbetDefenseCallBonus: {
      nlhe: {
        tag: { 'full-ring': 9, 'six-max': 12, 'heads-up': 40 },
        nit: { 'full-ring': 8, 'six-max': -4, 'heads-up': 4 },
        lag: { 'full-ring': 0, 'six-max': 0, 'heads-up': 8 },
        'calling-station': { 'full-ring': 4, 'six-max': 55, 'heads-up': 70 },
      },
      plo: {
        tag: { 'full-ring': 13, 'six-max': 7, 'heads-up': 12 },
        nit: { 'full-ring': 2, 'six-max': -3, 'heads-up': 2 },
        lag: { 'full-ring': 8, 'six-max': 2, 'heads-up': 4 },
        'calling-station': { 'full-ring': 22, 'six-max': 15, 'heads-up': 20 },
      },
    },
    cbetDefenseRaiseBase: {
      nlhe: {
        tag: { 'full-ring': 30, 'six-max': 30, 'heads-up': 30 },
        nit: { 'full-ring': 30, 'six-max': 30, 'heads-up': 30 },
        lag: { 'full-ring': 80, 'six-max': 95, 'heads-up': 120 },
        'calling-station': { 'full-ring': 30, 'six-max': 30, 'heads-up': 30 },
      },
      plo: {
        tag: { 'full-ring': 30, 'six-max': 30, 'heads-up': 30 },
        nit: { 'full-ring': 30, 'six-max': 30, 'heads-up': 30 },
        lag: { 'full-ring': 120, 'six-max': 110, 'heads-up': 110 },
        'calling-station': { 'full-ring': 30, 'six-max': 30, 'heads-up': 30 },
      },
    },
    turnBarrelMods: {
      nlhe: {
        tag: {
          'full-ring': { nonAir: 5, air: 5 },
          'six-max': { nonAir: 7, air: 7 },
          'heads-up': { nonAir: 6, air: 6 },
        },
        nit: {
          'full-ring': { nonAir: 0, air: 0 },
          'six-max': { nonAir: 0, air: -1 },
          'heads-up': { nonAir: -12, air: -12 },
        },
        lag: {
          'full-ring': { nonAir: 5, air: 5 },
          'six-max': { nonAir: 10, air: 10 },
          'heads-up': { nonAir: 15, air: 15 },
        },
        'calling-station': {
          'full-ring': { nonAir: -15, air: -15 },
          'six-max': { nonAir: -12, air: -12 },
          'heads-up': { nonAir: -15, air: -15 },
        },
      },
      plo: {
        tag: {
          'full-ring': { nonAir: -1, air: -1 },
          'six-max': { nonAir: -1, air: -1 },
          'heads-up': { nonAir: 1, air: 1 },
        },
        nit: {
          'full-ring': { nonAir: -15, air: -15 },
          'six-max': { nonAir: -14, air: -14 },
          'heads-up': { nonAir: -2, air: -2 },
        },
        lag: {
          'full-ring': { nonAir: -16, air: -16 },
          'six-max': { nonAir: -3, air: -3 },
          'heads-up': { nonAir: 0, air: 0 },
        },
        'calling-station': {
          'full-ring': { nonAir: -16, air: -16 },
          'six-max': { nonAir: -15, air: -15 },
          'heads-up': { nonAir: -12, air: -12 },
        },
      },
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
      secondNutPotential: 4,
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
      deepOpenShove: -120,
      uncommittedStrong: -60,
      uncommittedDeep: -90,
      uncommittedPostflop: -80,
    },
    preflopEscalationMods: {
      skillGate: 70,
      aggressionGate: 65,
      maxPolarizedStackBb: 100,
      commitmentGate: 0.25,
      shortValueStackBb: 60,
      fourBet: {
        valueFold: -12,
        polarizedFold: 2,
        defaultFold: 7,
        valueCall: 5,
        polarizedCall: -5,
        defaultCall: 2,
        valueRaise: 12,
        polarizedRaise: 8,
        defaultRaise: -14,
        valueAllIn: 8,
        defaultAllIn: -16,
      },
      fiveBet: {
        valueFold: -16,
        polarizedFold: -3,
        defaultFold: 16,
        valueCall: 8,
        defaultCall: -14,
        valueRaise: 14,
        polarizedRaise: 5,
        defaultRaise: -28,
        valueAllIn: 12,
        polarizedAllIn: 4,
        defaultAllIn: -32,
      },
      facingFiveBet: {
        valueFold: -20,
        defaultFold: 22,
        valueCall: 10,
        defaultCall: -22,
        valueRaiseCommitted: 6,
        valueRaiseUncommitted: -8,
        defaultRaise: -36,
        valueAllIn: 8,
        defaultAllIn: -40,
      },
    },
    commitmentBehavior: {
      minimumPotCommitment: 0.25,
      maximumCallBonus: 8,
      skillFullAt: 20,
      skillZeroAt: 70,
      maximumMentalMultiplier: 1.5,
      archetypeMultiplier: {
        nit: 0.5,
        tag: 0.7,
        lag: 1,
        'calling-station': 1.25,
      },
      forcedAllInStart: 0.4,
      forcedAllInFull: 1,
      freePriceThreshold: 0.1,
      fullPriceThreshold: 0.4,
      forcedCategoryPenalty: {
        air: -10,
        weak: -8,
        marginal: -6,
        medium: -3,
        good: 0,
        strong: 0,
        premium: 0,
      },
      minimumRiskScale: 0.75,
      maximumRiskScale: 1.25,
    },
    callDownMods: {
      weakTurnPressure: -10,
      weakRiverPressure: -18,
      riverNoMadeHand: -8,
    },
    ploSprZones: {
      commitmentStart: 1,
      commitmentEnd: 4,
      protectionStart: 3,
      protectionPeak: 5.5,
      protectionEnd: 10,
      drawStart: 3,
      drawFull: 8,
      drawFade: 15,
      drawEnd: 18,
      commitmentFoldNonStrong: 6,
      commitmentContinueNonStrong: -8,
      commitmentRiskReduction: 0.65,
      commitmentRiskRaise: 10,
      commitmentFoldStrong: -12,
      commitmentCallStrong: 6,
      commitmentRaiseStrong: 10,
      commitmentAllInStrong: 12,
      protectionFoldVulnerable: -6,
      protectionFoldEquity: -10,
      protectionPassiveVulnerable: -6,
      protectionRaiseVulnerable: 12,
      protectionAllInVulnerable: 4,
      drawFoldStrong: -10,
      drawCheckStrong: 4,
      drawCallStrong: 10,
      drawRaiseStrong: 6,
    },
    equityCollapseMods: {
      fold: 14,
      check: 8,
      call: -14,
      raise: -18,
      allIn: -24,
      openActionScale: 0.15,
      minimumArchetypeScale: 0.15,
    },
    ploRiverDisciplineMods: {
      fold: 12,
      call: -16,
      raise: -18,
      allIn: -24,
      blockerThreshold: 30,
      pressureStep: 0.25,
      collapseOverlapScale: 0.5,
      minimumArchetypeScale: 0.15,
    },
    ploPositionMods: {
      ipCheckEquity: 5,
      oopFoldEquity: -8,
      freerollFold: -14,
      freerollCheck: -4,
      freerollCall: 6,
      freerollRaise: 12,
      freerollAllIn: 6,
      freerollMinCleanOuts: 4,
    },
    analysisSkillGates: {
      boardDynamics: 30,
      riverDiscipline: 40,
      nutPotential: 50,
      freeroll: 60,
      blocker: 65,
      wrapDominance: 70,
    },
    ploWrapQualityMods: {
      minimumDisciplineScale: 0.2,
      nut: { fold: -10, check: -4, call: 8, raise: 10, allIn: 6 },
      mixed: { fold: -3, check: 2, call: 3, raise: 2, allIn: -2 },
      second: { fold: 8, check: 4, call: -6, raise: -10, allIn: -14 },
      bottom: { fold: 12, check: 6, call: -10, raise: -16, allIn: -22 },
    },
    ploBlockerMods: {
      nutThreshold: 30,
      foldDefense: -8,
      callDefense: 6,
      bluffCheck: -4,
      bluffRaise: 12,
      bluffAllIn: 5,
      valueCheck: -3,
      valueRaise: 7,
      valueAllIn: 5,
    },
    checkRaiseMods: {
      respectSkillGate: 30,
      planningSkillGate: 50,
      foldRespect: 10,
      foldProtected: -10,
      callRespect: -9,
      callProtected: 5,
      reraiseRespect: -12,
      allInRespect: -15,
      planCheckValue: 8,
      planCheckDraw: 5,
      executeCallValue: -4,
      executeCallDraw: -3,
      executeRaiseValue: 12,
      executeRaiseDraw: 8,
      executeAllInValue: 5,
      executeAllInDraw: 3,
      ploRespectScale: 1.2,
      maxPressureScale: 1.5,
    },
    floatDefenseMods: {
      skillGate: 40,
      foldCandidate: -8,
      callCandidate: 7,
      callValue: 5,
      raiseCandidate: 5,
      raiseValue: 10,
      raiseBlockerBluff: 7,
      allInValue: 4,
      worseBoardScale: 0.4,
      largeBetFloor: 0.35,
      aggressiveReadBoost: 0.25,
    },
    betFoldMods: {
      skillGate: 50,
      minimumShowdownValue: 40,
      minimumRelativeStrength: 50,
      openBet: 10,
      openCheck: -5,
      openAllIn: -20,
      responseFold: 40,
      responseCall: -40,
      responseRaise: -45,
      responseAllIn: -60,
      minimumDisciplineScale: 0.55,
      maxPressureScale: 1.4,
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
    foldCapMin: -25,
    foldCapMax: 25,
    callDeepDrawBonus: 7,
    callImpliedOdds: {
      maxEffectiveStackBb: 200,
      maxStackScale: 1.25,
      multiwayStep: 0.1,
      maxMultiwayAdjustment: 0.3,
      minimumBonus: 1,
      maximumBonus: 12,
      nutPotentialScale: {
        nuts: 1.15,
        'near-nuts': 1.05,
        'second-nuts': 1,
        strong: 0.85,
        medium: 0.6,
        weak: 0.35,
      },
    },
    callShortDrawPenalty: -7,
    callLowSprBonus: 10,
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
  params.scoring.skillTiers.sort((a, b) => b.threshold - a.threshold)
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
