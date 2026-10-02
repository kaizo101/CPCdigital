/** Read-only, reproducible PLO4 preflop decision diagnostic; does not change bot policy. */
import { createSeededRandom, OMAHA_HIGH, PokerGame } from '@cpc/poker-engine'
import type { Card, Player, PlayerAction } from '@cpc/shared'
import { createBotContext } from '../packages/client/src/bot-context'
import { BOT_ARCHETYPE_IDS, getBotArchetype } from '../packages/client/src/bot-archetypes'
import { createBotState, decideBotDecision } from '../packages/client/src/bot-tag'
import type { BotArchetypeId } from '../packages/client/src/bot-archetypes'
import type { BotDecision } from '../packages/client/src/bot-tag'

const BLIND = 0.02
const seedArgument = process.argv.find(argument => argument.startsWith('--seed='))
const seedSuffix = seedArgument ? `:${seedArgument.slice('--seed='.length)}` : ''
type TableFormat = 'full-ring' | 'six-max' | 'heads-up'
const formatArgument = process.argv.find(argument => argument.startsWith('--format='))
const tableFormat = (formatArgument?.slice('--format='.length) ?? 'six-max') as TableFormat
if (!['full-ring', 'six-max', 'heads-up'].includes(tableFormat)) {
  throw new Error(`Unsupported format: ${tableFormat}`)
}
const seatCount = tableFormat === 'full-ring' ? 9 : tableFormat === 'heads-up' ? 2 : 6
const buttonSeat = tableFormat === 'heads-up' ? 0 : seatCount - 3
const bigBlindSeat = tableFormat === 'heads-up' ? 1 : seatCount - 1
const HANDS = {
  AA72r: 'As Ah 7d 2c',
  AA72ssNut: 'As Ah 7s 2c',
  AA72ssLow: 'As Ah 7d 2d',
  AA72ds: 'As Ah 7s 2h',
  KQJTr: 'Ks Qh Jd Tc',
  KQJ2r: 'Ks Qh Jd 2c',
  T987r: 'Ts 9h 8d 7c',
  AAA2r: 'As Ah Ad 2c',
  AKQJr: 'As Kh Qd Jc',
  AKQJssNut: 'As Ks Qh Jd',
  AKQJssKing: 'As Kh Qh Jd',
  AKQJds: 'As Ks Qh Jh',
  AKQJdsIso: 'Ah Kh Qs Js',
  AKQJtriple: 'As Ks Qs Jh',
  AKQJmono: 'As Ks Qs Js',
  AKQ2ds: 'As Ks Qh 2h',
  A234ds: 'As 2s 3h 4h',
  AAJJds: 'As Ah Js Jh',
  K832mono: 'Ks 8s 3s 2s',
  A732r: 'As 7h 3d 2c',
} as const
type HandName = keyof typeof HANDS

const CONTRASTS: readonly [HandName, HandName][] = [
  ['AA72r', 'KQJTr'],
  ['AA72r', 'AA72ssNut'],
  ['AA72ssNut', 'AA72ssLow'],
  ['AA72ssNut', 'AA72ds'],
  ['AA72r', 'AAA2r'],
  ['AKQJr', 'AKQJssNut'],
  ['AKQJssNut', 'AKQJssKing'],
  ['AKQJssNut', 'AKQJds'],
  ['AKQJds', 'AKQJdsIso'],
  ['AKQJssNut', 'AKQJtriple'],
  ['AKQJtriple', 'AKQJmono'],
  ['AKQJds', 'AKQ2ds'],
  ['KQJTr', 'KQJ2r'],
  ['AKQJds', 'A234ds'],
  ['AA72r', 'AAJJds'],
  ['A732r', 'K832mono'],
]

type Situation =
  | 'unopened-utg'
  | 'unopened-button'
  | 'facing-open-button'
  | 'facing-open-big-blind'
  | 'facing-3bet-utg'
  | 'facing-3bet-button'
const SITUATIONS: Situation[] = tableFormat === 'heads-up'
  ? ['unopened-button', 'facing-open-big-blind', 'facing-3bet-button']
  : ['unopened-utg', 'unopened-button', 'facing-open-button',
      'facing-open-big-blind', 'facing-3bet-utg']

interface Snapshot {
  format: TableFormat
  archetype: BotArchetypeId
  skill: number
  depthBb: number
  situation: Situation
  hand: HandName
  category: string
  strength: number
  nutPotential: string
  drawQuality: number
  blockerValue: number
  perceivedCategory: string
  chosenType: string
  chosen: string
  utilities: Record<string, number>
  intents: Record<string, string>
  eligible: Record<string, boolean>
  amounts: Record<string, number | null>
}

function parseCards(specification: string): Card[] {
  const suits: Record<string, Card['suit']> = {
    s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs',
  }
  return specification.split(' ').map(token => ({
    rank: token[0] as Card['rank'],
    suit: suits[token[1]],
  }))
}

function makePlayers(depthBb: number): Player[] {
  return Array.from({ length: seatCount }, (_, seatIndex) => ({
    id: `seat-${seatIndex}`,
    name: `Seat ${seatIndex}`,
    role: 'player' as const,
    chips: Number((depthBb * BLIND).toFixed(2)),
    seatIndex,
    isConnected: true,
    isSittingOut: false,
    status: 'waiting' as const,
    roundBet: 0,
  }))
}

function makeGame(situation: Situation, depthBb: number): PokerGame {
  const game = new PokerGame(makePlayers(depthBb), {
    smallBlind: 0.01,
    bigBlind: BLIND,
    initialDealerIndex: buttonSeat,
    variant: OMAHA_HIGH,
    seed: `plo-preflop-contrast:${tableFormat}:${situation}:${depthBb}${seedSuffix}`,
  })
  game.startHand()
  const act = (seat: number, action: PlayerAction) => {
    const playerId = `seat-${seat}`
    if (game.getPublicState().currentPlayerId !== playerId) {
      throw new Error(`Expected ${playerId} to act in ${situation}`)
    }
    game.applyAction(playerId, action)
  }

  if (situation === 'unopened-utg' || (tableFormat === 'heads-up' && situation === 'unopened-button')) {
    return game
  }
  if (situation === 'unopened-button') {
    for (let seat = 0; seat < buttonSeat; seat++) act(seat, { type: 'fold' })
    return game
  }
  if (situation === 'facing-open-button') {
    act(0, { type: 'raise', amount: 0.06 })
    for (let seat = 1; seat < buttonSeat; seat++) act(seat, { type: 'fold' })
    return game
  }
  if (situation === 'facing-open-big-blind') {
    act(0, { type: 'raise', amount: 0.06 })
    for (let seat = 1; seat < bigBlindSeat; seat++) act(seat, { type: 'fold' })
    return game
  }
  if (situation === 'facing-3bet-button') {
    act(0, { type: 'raise', amount: 0.06 })
    act(1, { type: 'raise', amount: 0.18 })
    return game
  }
  act(0, { type: 'raise', amount: 0.06 })
  const cutoffSeat = buttonSeat - 1
  for (let seat = 1; seat < cutoffSeat; seat++) act(seat, { type: 'fold' })
  act(cutoffSeat, { type: 'raise', amount: 0.20 })
  for (let seat = cutoffSeat + 1; seat <= bigBlindSeat; seat++) act(seat, { type: 'fold' })
  return game
}

function snapshot(
  game: PokerGame,
  situation: Situation,
  depthBb: number,
  archetype: BotArchetypeId,
  skill: number,
  hand: HandName,
): Snapshot {
  const playerId = game.getPublicState().currentPlayerId
  if (!playerId) throw new Error(`No actor in ${situation}`)
  const context = createBotContext(
    playerId,
    game.getPlayerView(playerId),
    game.getPublicHandHistory(),
    archetype,
  )
  // Counterfactual own cards only. The engine-generated public state, history,
  // pot, legal actions and positions are otherwise unchanged across hands.
  context.ownCards = parseCards(HANDS[hand])
  const stateRandom = createSeededRandom(`traits:${archetype}${seedSuffix}`)
  const botState = createBotState(getBotArchetype(archetype), skill, stateRandom)
  const decisionRandom = createSeededRandom(`plo-preflop-contrast:choice${seedSuffix}`)
  const decision: BotDecision = decideBotDecision(context, botState, decisionRandom)
  const utilities = Object.fromEntries(decision.decisionResult.allActions.map(candidate =>
    [candidate.action.type, candidate.utility],
  ))
  const intents = Object.fromEntries(decision.decisionResult.allActions.map(candidate =>
    [candidate.action.type, candidate.intent],
  ))
  const eligible = Object.fromEntries(decision.decisionResult.allActions.map(candidate =>
    [candidate.action.type, candidate.selectionEligible !== false],
  ))
  const amounts = Object.fromEntries(decision.decisionResult.allActions.map(candidate =>
    [candidate.action.type, candidate.action.type === 'raise' ? candidate.action.amount : null],
  ))
  return {
    format: tableFormat,
    archetype,
    skill,
    depthBb,
    situation,
    hand,
    category: decision.evaluation.handAssessment.category,
    strength: decision.evaluation.handAssessment.strength,
    nutPotential: decision.evaluation.handAssessment.nutPotential,
    drawQuality: decision.evaluation.handAssessment.drawQuality,
    blockerValue: decision.evaluation.handAssessment.blockerValue,
    perceivedCategory: decision.decisionResult.perceivedHandAssessment.category,
    chosenType: decision.action.type,
    chosen: decision.action.type === 'raise'
      ? `raise ${decision.action.amount.toFixed(2)}`
      : decision.action.type,
    utilities,
    intents,
    eligible,
    amounts,
  }
}

function sameUtilities(left: Snapshot, right: Snapshot): boolean {
  return JSON.stringify(left.utilities) === JSON.stringify(right.utilities)
    && JSON.stringify(left.eligible) === JSON.stringify(right.eligible)
    && JSON.stringify(left.intents) === JSON.stringify(right.intents)
    && JSON.stringify(left.amounts) === JSON.stringify(right.amounts)
}

const results: Snapshot[] = []
for (const depthBb of [40, 100]) {
  for (const situation of SITUATIONS) {
    const game = makeGame(situation, depthBb)
    for (const archetype of BOT_ARCHETYPE_IDS) {
      for (const skill of [20, 50, 100]) {
        for (const hand of Object.keys(HANDS) as HandName[]) {
          results.push(snapshot(game, situation, depthBb, archetype, skill, hand))
        }
      }
    }
  }
}

if (process.argv.includes('--jsonl')) {
  for (const row of results) console.log(JSON.stringify(row))
} else {
  console.log(`PLO4 ${tableFormat} controlled decisions: ${results.length}; seed: ${seedSuffix || 'base'}`)
  for (const [leftHand, rightHand] of CONTRASTS) {
    const leftRows = results.filter(row => row.hand === leftHand)
    const pairs = leftRows.map(left => ({
      left,
      right: results.find(row =>
        row.hand === rightHand
        && row.archetype === left.archetype
        && row.skill === left.skill
        && row.depthBb === left.depthBb
        && row.situation === left.situation
      )!,
    }))
    const differingUtilities = pairs.filter(({ left, right }) => !sameUtilities(left, right)).length
    const differingTypes = pairs.filter(({ left, right }) => left.chosenType !== right.chosenType).length
    const differingChoices = pairs.filter(({ left, right }) => left.chosen !== right.chosen).length
    console.log(`${leftHand} vs ${rightHand}: ${pairs.length} matched contexts; vectors differ ${differingUtilities}; action types differ ${differingTypes}; action or size differs ${differingChoices}`)
  }
  for (const situation of SITUATIONS) {
    const rows = results.filter(row => row.archetype === 'tag'
      && row.skill === 100 && row.depthBb === 100 && row.situation === situation
      && (row.hand === 'AA72r' || row.hand === 'KQJTr'))
    for (const row of rows) {
      console.log(`TAG 100 / 100BB / ${situation} / ${row.hand}: ${row.category} ${row.strength}; ${row.chosen}; ${JSON.stringify(row.utilities)}`)
    }
  }
}
