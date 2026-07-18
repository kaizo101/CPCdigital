import type { Card, PlayerAction } from '@cpc/shared'
import type { BotState, Position } from './bot-types'
import type { HandAssessment } from './bot-hand-evaluation'
import { analyzeBoardTexture } from './bot-hand-evaluation'
import { roundToCents } from './utils/format'

// Score contribution with category and value
export interface ScoreContribution {
  category: 'base' | 'hand-strength' | 'position' | 'board-texture' | 'personality' | 'mental-state' | 'opponent-read' | 'skill-noise'
  label: string
  value: number  // -50 to +50
}

// Scored action with utility and structured contributions
export interface ScoredAction {
  action: PlayerAction
  utility: number  // 0-100, higher = more preferred
  contributions: ScoreContribution[]
}

// What the bot can see (fair poker information)
export interface BotGameView {
  myCards: [Card, Card]
  board: Card[]
  pot: number
  currentBet: number
  minRaiseTo: number
  maxRaiseTo: number
  canRaise: boolean
  bigBlind: number
  smallBlind: number
  phase: 'preflop' | 'flop' | 'turn' | 'river'
  players: Array<{
    id: string
    chips: number
    roundBet: number
    status: 'active' | 'folded' | 'all-in' | 'waiting'
    isDealer: boolean
  }>
  dealerIndex: number
  potOdds: number
  toCallPotRatio: number
  effectiveStack: number
  spr: number
}

// Decision context with all relevant information
export interface DecisionContext {
  gameView: BotGameView
  botId: string
  botState: BotState
  position: Position
  toCall: number
  canCheck: boolean
  playerCount: number
  boardTexture: 'dry' | 'wet' | 'neutral'
  handAssessment: HandAssessment
  opponentStats?: { vpip: number; aggression: number; foldToBet: number; confidence: number }
}

// Score all legal actions
export function scoreActions(context: DecisionContext): ScoredAction[] {
  const actions: ScoredAction[] = []
  const { gameView, canCheck, toCall, handAssessment, boardTexture, playerCount } = context
  const { potOdds } = gameView

  // CHECK (if possible - must be evaluated before fold)
  if (canCheck) {
    const checkUtility = scoreCheck(context)
    actions.push({
      action: { type: 'check' },
      utility: checkUtility,
      contributions: [
        { category: 'base', label: 'Base check utility', value: checkUtility - 50 }
      ]
    })
  }

  // FOLD (only if we can't check - i.e., there's a bet to call)
  if (toCall > 0) {
    const foldUtility = scoreFold(context)
    actions.push({
      action: { type: 'fold' },
      utility: foldUtility,
      contributions: [
        { category: 'base', label: 'Base fold utility', value: foldUtility - 50 }
      ]
    })
  }

  // CALL (if there's a bet to call)
  if (toCall > 0) {
    const callUtility = scoreCall(context)
    actions.push({
      action: { type: 'call' },
      utility: callUtility,
      contributions: [
        { category: 'base', label: 'Base call utility', value: callUtility - 50 }
      ]
    })
  }

  if (gameView.canRaise) {
    const raiseUtility = scoreRaise(context)
    const raiseAmount = calculateStandardRaise(context)
    actions.push({
      action: { type: 'raise', amount: raiseAmount },
      utility: raiseUtility,
      contributions: [
        { category: 'base', label: 'Base raise utility', value: raiseUtility - 50 }
      ]
    })
  }

  return actions
}

// Score fold action
function scoreFold(context: DecisionContext): number {
  const { gameView, handAssessment, toCall, playerCount, opponentStats } = context
  const { potOdds } = gameView

  let utility = 0

  // Air hands: fold is good
  if (handAssessment.category === 'air') {
    utility = 60
  }
  // Weak hands: fold is okay
  else if (handAssessment.category === 'weak') {
    utility = 40
  }
  // Medium hands: fold is less attractive
  else if (handAssessment.category === 'medium') {
    utility = 20
  }
  // Strong/Nuts: fold is very bad
  else {
    utility = 0
  }

  // If we're getting good pot odds, fold is less attractive
  if (toCall > 0 && potOdds < 0.3) {
    utility -= 20
  }

  // Multi-way pots: fold weak hands more often
  if (playerCount > 3 && handAssessment.category === 'weak') {
    utility += 15
  }

  // Use opponentStats if available
  if (opponentStats && opponentStats.confidence > 0.5) {
    // Against aggressive opponents (high aggression), fold weak hands more
    if (opponentStats.aggression > 60 && handAssessment.category === 'weak') {
      utility += 10
    }
    // Against passive opponents (low aggression), fold less with medium hands
    if (opponentStats.aggression < 40 && handAssessment.category === 'medium') {
      utility -= 10
    }
  }

  return Math.max(0, Math.min(100, utility))
}

// Score check action
function scoreCheck(context: DecisionContext): number {
  const { handAssessment, boardTexture, position } = context

  let utility = 50  // Neutral baseline

  // Strong hands: checking is bad (missing value)
  if (handAssessment.category === 'strong' || handAssessment.category === 'nuts') {
    utility = 20
  }
  // Medium hands: checking is okay
  else if (handAssessment.category === 'medium') {
    utility = 60
  }
  // Weak/Air: checking is good (free card)
  else {
    utility = 70
  }

  // Draws: checking is okay (want to see next card)
  if (handAssessment.drawTypes.length > 0) {
    utility += 10
  }

  // Late position: checking is more attractive (more info)
  if (position === 'late') {
    utility += 10
  }

  return Math.max(0, Math.min(100, utility))
}

// Score call action
function scoreCall(context: DecisionContext): number {
  const { gameView, handAssessment, toCall, playerCount, opponentStats } = context
  const { potOdds } = gameView

  let utility = 50  // Neutral baseline

  // Strong hands: calling is okay but raising is better
  if (handAssessment.category === 'strong' || handAssessment.category === 'nuts') {
    utility = 40  // Prefer raising
  }
  // Medium hands: calling is good
  else if (handAssessment.category === 'medium') {
    utility = 70
  }
  // Weak hands with good pot odds: calling is okay
  else if (handAssessment.category === 'weak' && potOdds < 0.25) {
    utility = 60
  }
  // Draws with good pot odds: calling is good
  else if (handAssessment.drawTypes.length > 0 && potOdds < 0.3) {
    utility = 65
  }
  // Air: calling is bad
  else {
    utility = 10
  }

  // Multi-way: need stronger hands to call
  if (playerCount > 3) {
    if (handAssessment.category === 'weak') {
      utility -= 20
    }
  }

  // Use opponentStats if available
  if (opponentStats && opponentStats.confidence > 0.5) {
    // Against passive opponents (low aggression), calling is more attractive
    if (opponentStats.aggression < 40) {
      utility += 10
    }
    // Against aggressive opponents, calling with medium hands is riskier
    if (opponentStats.aggression > 60 && handAssessment.category === 'medium') {
      utility -= 5
    }
    // Against loose opponents (high VPIP), calling with strong hands is good
    if (opponentStats.vpip > 40 && handAssessment.category === 'strong') {
      utility += 10
    }
  }

  return Math.max(0, Math.min(100, utility))
}

// Score raise action
function scoreRaise(context: DecisionContext): number {
  const { handAssessment, position, boardTexture } = context

  let utility = 50  // Neutral baseline

  // Strong hands: raising is very good (value)
  if (handAssessment.category === 'nuts') {
    utility = 90
  } else if (handAssessment.category === 'strong') {
    utility = 80
  }
  // Medium hands: raising is okay for protection
  else if (handAssessment.category === 'medium') {
    utility = 55
  }
  // Draws: semi-bluff raising is good
  else if (handAssessment.drawTypes.length > 0) {
    utility = 65
  }
  // Weak/Air: raising is bluffing (situational)
  else {
    utility = 25
  }

  // Use relativeStrength for fine-tuning
  if (handAssessment.relativeStrength > 70) {
    utility += 10
  } else if (handAssessment.relativeStrength < 30) {
    utility -= 10
  }

  // Use nutPotential
  if (handAssessment.nutPotential === 'nuts') {
    utility += 15
  } else if (handAssessment.nutPotential === 'near-nuts') {
    utility += 8
  }

  // Use vulnerability (high vulnerability = raise for protection)
  if (handAssessment.vulnerability > 60) {
    utility += 5
  }

  // Late position: raising is more effective
  if (position === 'late') {
    utility += 15
  }

  // Dry boards: bluffing is more effective
  if (boardTexture === 'dry' && handAssessment.category === 'air') {
    utility += 10
  }

  return Math.max(0, Math.min(100, utility))
}

// Calculate standard raise amount
function calculateStandardRaise(context: DecisionContext): number {
  const { gameView, handAssessment, position } = context

  // Base raise: 2.5x current bet
  let raiseMultiplier = 2.5

  // Strong hands: raise bigger for value
  if (handAssessment.category === 'nuts') {
    raiseMultiplier = 3.5
  } else if (handAssessment.category === 'strong') {
    raiseMultiplier = 3.0
  }

  // Late position: can raise smaller
  if (position === 'late') {
    raiseMultiplier -= 0.3
  }

  const raiseAmount = roundToCents(gameView.currentBet * raiseMultiplier)
  return Math.max(raiseAmount, gameView.minRaiseTo)
}

// Apply personality and mental state modifiers
export function applyPersonalityModifiers(
  actions: ScoredAction[],
  botState: BotState
): ScoredAction[] {
  const { aggression, bluffFrequency } = botState
  const { tilt, confidence, patience } = botState.mentalState

  return actions.map(scored => {
    let modifiedUtility = scored.utility
    const modifiedContributions = [...scored.contributions]

    // Aggression: increases raise utility, decreases fold utility
    if (scored.action.type === 'raise') {
      const aggressionBonus = (aggression - 50) / 5  // -10 to +10
      modifiedUtility += aggressionBonus
      modifiedContributions.push({ category: 'personality', label: 'Aggression (raise)', value: aggressionBonus })
    }
    if (scored.action.type === 'fold') {
      const aggressionPenalty = (aggression - 50) / 10  // -5 to +5 (reverse)
      modifiedUtility -= aggressionPenalty
      modifiedContributions.push({ category: 'personality', label: 'Aggression (fold)', value: -aggressionPenalty })
    }

    // Bluff frequency: increases raise utility with air
    if (scored.action.type === 'raise' && scored.utility < 40) {
      const bluffBonus = (bluffFrequency - 50) / 10  // -5 to +5
      modifiedUtility += bluffBonus
      modifiedContributions.push({ category: 'personality', label: 'Bluff frequency', value: bluffBonus })
    }

    // Tilt: increases aggression (more raises, fewer folds)
    if (tilt > 50) {
      const tiltIntensity = (tilt - 50) / 50  // 0 to 1
      if (scored.action.type === 'raise') {
        const tiltBonus = tiltIntensity * 15
        modifiedUtility += tiltBonus
        modifiedContributions.push({ category: 'mental-state', label: 'Tilt (raise)', value: tiltBonus })
      }
      if (scored.action.type === 'fold') {
        const tiltPenalty = tiltIntensity * 10
        modifiedUtility -= tiltPenalty
        modifiedContributions.push({ category: 'mental-state', label: 'Tilt (fold)', value: -tiltPenalty })
      }
    }

    // Low confidence: more cautious (more folds, fewer raises)
    if (confidence < 40) {
      const cautionIntensity = (40 - confidence) / 40  // 0 to 1
      if (scored.action.type === 'fold') {
        const cautionBonus = cautionIntensity * 10
        modifiedUtility += cautionBonus
        modifiedContributions.push({ category: 'mental-state', label: 'Low confidence (fold)', value: cautionBonus })
      }
      if (scored.action.type === 'raise') {
        const cautionPenalty = cautionIntensity * 8
        modifiedUtility -= cautionPenalty
        modifiedContributions.push({ category: 'mental-state', label: 'Low confidence (raise)', value: -cautionPenalty })
      }
    }

    // Low patience: more impatient (more calls/raises with marginal hands)
    if (patience < 40) {
      const impatienceIntensity = (40 - patience) / 40  // 0 to 1
      if (scored.action.type === 'call' || scored.action.type === 'raise') {
        const impatienceBonus = impatienceIntensity * 8
        modifiedUtility += impatienceBonus
        modifiedContributions.push({ category: 'mental-state', label: 'Low patience', value: impatienceBonus })
      }
    }

    return {
      ...scored,
      utility: Math.max(0, Math.min(100, modifiedUtility)),
      contributions: modifiedContributions
    }
  })
}

// Apply skill-based noise to utilities
export function applySkillNoise(
  actions: ScoredAction[],
  skill: number,
  rng: RandomSource = defaultRandom
): ScoredAction[] {
  // Lower skill = more noise (less accurate perception)
  // Reduced noise range for more consistent decisions
  const standardDeviation = (100 - skill) / 5  // Was /2, now /5

  return actions.map(scored => {
    // Gaussian noise based on skill
    const u1 = Math.max(rng.random(), Number.EPSILON)
    const u2 = rng.random()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    const noise = z0 * standardDeviation

    const noisyUtility = scored.utility + noise

    return {
      ...scored,
      utility: Math.max(0, Math.min(100, noisyUtility)),
      contributions: [...scored.contributions, { category: 'skill-noise', label: 'Skill noise', value: noise }]
    }
  })
}

// Random source interface for testability
export interface RandomSource {
  random(): number
}

// Default random source (Math.random)
const defaultRandom: RandomSource = {
  random: () => Math.random()
}

// Choose action based on utilities (weighted random with top-window)
export function weightedChoice(actions: ScoredAction[], rng: RandomSource = defaultRandom): PlayerAction {
  // Filter out illegal actions (utility = 0)
  const legalActions = actions.filter(a => a.utility > 0)

  if (legalActions.length === 0) {
    // Fallback: fold
    return { type: 'fold' }
  }

  // Sort by utility (descending)
  const sorted = [...legalActions].sort((a, b) => b.utility - a.utility)
  const bestUtility = sorted[0].utility

  // Top window: consider actions within 15% of best utility
  // This prevents choosing clearly inferior actions due to randomness
  const threshold = bestUtility * 0.85
  const plausible = sorted.filter(a => a.utility >= threshold)

  // If only one action is plausible, choose it
  if (plausible.length === 1) {
    return plausible[0].action
  }

  // Otherwise, weighted choice among plausible actions
  const totalUtility = plausible.reduce((sum, a) => sum + a.utility, 0)
  let random = rng.random() * totalUtility
  for (const action of plausible) {
    random -= action.utility
    if (random <= 0) {
      return action.action
    }
  }

  // Fallback (shouldn't reach here)
  return plausible[0].action
}

// Decision result with full context and state updates
export interface DecisionResult {
  action: PlayerAction
  allActions: ScoredAction[]
  chosenUtility: number
  // State updates that should be applied AFTER the decision
  // (separated to keep decision pure)
  stateUpdates: {
    raisedPreflop?: boolean
    lastAction?: 'bet' | 'check' | 'call' | 'fold' | null
    lastStreet?: string | null
  }
}

// Main decision pipeline (pure function - no state mutation)
export function decideAction(context: DecisionContext, rng: RandomSource = defaultRandom): DecisionResult {
  // Step 1: Score all actions
  const actions = scoreActions(context)

  // Step 2: Apply personality/mental state modifiers
  const modifiedActions = applyPersonalityModifiers(actions, context.botState)

  // Step 3: Apply skill noise
  const noisyActions = applySkillNoise(modifiedActions, context.botState.skill, rng)

  // Step 4: Choose action
  const chosenAction = weightedChoice(noisyActions, rng)
  const chosenScored = noisyActions.find(a =>
    a.action.type === chosenAction.type &&
    (a.action.type !== 'raise' || (a.action as any).amount === (chosenAction as any).amount)
  )

  // Step 5: Prepare state updates (but don't apply them yet)
  const stateUpdates: DecisionResult['stateUpdates'] = {}

  if (chosenAction.type === 'raise') {
    stateUpdates.lastAction = 'bet'
    if (context.gameView.phase === 'preflop') {
      stateUpdates.raisedPreflop = true
    }
  } else {
    stateUpdates.lastAction = chosenAction.type as any
  }
  stateUpdates.lastStreet = context.gameView.phase as any

  return {
    action: chosenAction,
    allActions: noisyActions,
    chosenUtility: chosenScored?.utility ?? 0,
    stateUpdates
  }
}
