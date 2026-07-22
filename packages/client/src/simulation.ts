// Bot archetype calibration across common table formats.
// Run with: npx tsx packages/client/src/simulation.ts

import { createSeededRandom, PokerGame } from '@cpc/poker-engine'
import type { Player, PlayerAction, PublicGameState } from '@cpc/shared'
import {
  CALLING_STATION_PERSONALITY,
  createBotStateFromIdentity,
  decideBotAction,
  LAG_PERSONALITY,
  NIT_PERSONALITY,
  TAG_PERSONALITY,
} from './bot-tag'
import type { BotPersonality, BotState, Position } from './bot-tag'
import type { BotArchetypeId } from './bot-archetypes'
import { createBotContext, getPositionCategory } from './bot-context'
import { resetHandMemory } from './bot-memory'
import { DEFAULT_BOT_ROSTER } from './bot-identities'

const HANDS_PER_FORMAT = Number(process.env.CALIB_HANDS) || 10_000
const EXIT_ON_FAIL = !process.env.CALIB_NO_EXIT
const BIG_BLIND = 20
const SMALL_BLIND = 10
const STARTING_CHIPS = 2_000

interface FormatConfig {
  name: string
  playerCount: number
  target: {
    vpip: [number, number]
    pfr: [number, number]
    threeBet: [number, number]
    cBet?: [number, number]
    aggressionFactor?: [number, number]
    wtsd?: [number, number]
  }
}

interface CalibrationProfile {
  name: string
  seed: string
  archetypeId: BotArchetypeId
  personality: BotPersonality
  formats: FormatConfig[]
}

const TAG_FORMATS: FormatConfig[] = [
  {
    name: 'Full Ring (9-max)',
    playerCount: 9,
    target: { vpip: [15, 21], pfr: [12, 18], threeBet: [6, 13], cBet: [35, 55], aggressionFactor: [2.0, 5.0] },
  },
  {
    name: '6-max',
    playerCount: 6,
    target: { vpip: [22, 29], pfr: [18, 25], threeBet: [8, 15], cBet: [35, 55], aggressionFactor: [2.0, 5.0] },
  },
  {
    name: 'Heads-up',
    playerCount: 2,
    target: { vpip: [45, 65], pfr: [35, 55], threeBet: [12, 22], cBet: [40, 65], aggressionFactor: [2.5, 10.0] },
  },
]

const NIT_FORMATS: FormatConfig[] = [
  {
    name: 'Full Ring (9-max)',
    playerCount: 9,
    target: { vpip: [9, 15], pfr: [7, 12], threeBet: [3, 9], cBet: [33, 55], aggressionFactor: [2.0, 5.5] },
  },
  {
    name: '6-max',
    playerCount: 6,
    target: { vpip: [13, 19], pfr: [10, 15], threeBet: [4, 10], cBet: [35, 55], aggressionFactor: [2.0, 5.5] },
  },
  {
    name: 'Heads-up',
    playerCount: 2,
    target: { vpip: [30, 45], pfr: [16, 35], threeBet: [6, 13], cBet: [40, 60], aggressionFactor: [2.5, 8.0] },
  },
]

const LAG_FORMATS: FormatConfig[] = [
  {
    name: 'Full Ring (9-max)',
    playerCount: 9,
    target: { vpip: [22, 31], pfr: [17, 26], threeBet: [8, 18], cBet: [45, 70], aggressionFactor: [1.8, 6.0] },
  },
  {
    name: '6-max',
    playerCount: 6,
    target: { vpip: [28, 40], pfr: [22, 33], threeBet: [10, 20], cBet: [45, 70], aggressionFactor: [2.0, 6.0] },
  },
  {
    name: 'Heads-up',
    playerCount: 2,
    target: { vpip: [65, 87], pfr: [45, 68], threeBet: [14, 28], cBet: [50, 75], aggressionFactor: [3.0, 10.0] },
  },
]

const CALLING_STATION_FORMATS: FormatConfig[] = [
  {
    name: 'Full Ring (9-max)',
    playerCount: 9,
    target: { vpip: [28, 43], pfr: [5, 14], threeBet: [1, 8], cBet: [25, 45], aggressionFactor: [0.5, 2.0] },
  },
  {
    name: '6-max',
    playerCount: 6,
    target: { vpip: [38, 56], pfr: [7, 17], threeBet: [2, 9], cBet: [25, 45], aggressionFactor: [0.5, 2.0] },
  },
  {
    name: 'Heads-up',
    playerCount: 2,
    target: { vpip: [62, 85], pfr: [15, 36], threeBet: [2, 13], cBet: [30, 50], aggressionFactor: [1.0, 3.0] },
  },
]

const CALIBRATION_PROFILES: CalibrationProfile[] = [
  {
    name: 'TAG',
    seed: 'tag-calibration-v1',
    archetypeId: 'tag',
    personality: TAG_PERSONALITY,
    formats: TAG_FORMATS,
  },
  {
    name: 'Nit',
    seed: 'nit-calibration-v1',
    archetypeId: 'nit',
    personality: NIT_PERSONALITY,
    formats: NIT_FORMATS,
  },
  {
    name: 'LAG',
    seed: 'lag-calibration-v1',
    archetypeId: 'lag',
    personality: LAG_PERSONALITY,
    formats: LAG_FORMATS,
  },
  {
    name: 'Calling Station',
    seed: 'calling-station-calibration-v1',
    archetypeId: 'calling-station',
    personality: CALLING_STATION_PERSONALITY,
    formats: CALLING_STATION_FORMATS,
  },
]

interface PositionStats {
  hands: number
  vpipHands: number
  pfrHands: number
  cBetOpps: number
  cBets: number
}

interface PostflopStats {
  betsAndRaises: number
  calls: number
  wentToShowdown: number
  wonAtShowdown: number
  handsSeenFlop: number
  foldToCBetOpps: number
  foldToCBets: number
}

interface SimulationStats {
  handsPlayed: number
  playerHands: number
  vpipHands: number
  pfrHands: number
  threeBets: number
  threeBetOpportunities: number
  positions: Record<Position, PositionStats>
  postflop: PostflopStats
  actions: Record<PlayerAction['type'], number>
  actionErrors: number
  durationMs: number
}

function createPlayers(playerCount: number): Player[] {
  return Array.from({ length: playerCount }, (_, index) => ({
    id: `bot-${index}`,
    name: `Bot ${index + 1}`,
    role: 'player',
    chips: STARTING_CHIPS,
    seatIndex: index,
    isConnected: true,
    isSittingOut: false,
    status: 'waiting',
    roundBet: 0,
  }))
}

function createStats(): SimulationStats {
  return {
    handsPlayed: 0,
    playerHands: 0,
    vpipHands: 0,
    pfrHands: 0,
    threeBets: 0,
    threeBetOpportunities: 0,
    positions: {
      early: { hands: 0, vpipHands: 0, pfrHands: 0, cBetOpps: 0, cBets: 0 },
      middle: { hands: 0, vpipHands: 0, pfrHands: 0, cBetOpps: 0, cBets: 0 },
      late: { hands: 0, vpipHands: 0, pfrHands: 0, cBetOpps: 0, cBets: 0 },
      blinds: { hands: 0, vpipHands: 0, pfrHands: 0, cBetOpps: 0, cBets: 0 },
    },
    postflop: {
      betsAndRaises: 0,
      calls: 0,
      wentToShowdown: 0,
      wonAtShowdown: 0,
      handsSeenFlop: 0,
      foldToCBetOpps: 0,
      foldToCBets: 0,
    },
    actions: { fold: 0, check: 0, call: 0, raise: 0, 'all-in': 0 },
    actionErrors: 0,
    durationMs: 0,
  }
}

function resetBotForHand(botState: BotState): void {
  resetHandMemory(botState.memory)
}

function isAggressiveAction(state: Readonly<PublicGameState>, action: PlayerAction): boolean {
  if (action.type === 'raise') return true
  return action.type === 'all-in'
    && (state.bettingContext?.legalActions.allInAmount ?? 0) > state.currentBet
}

function simulateFormat(
  profile: CalibrationProfile,
  format: FormatConfig,
  numHands = HANDS_PER_FORMAT,
): SimulationStats {
  const players = createPlayers(format.playerCount)
  const seedNamespace = `${profile.seed}:${format.name}`
  const decisionRandom = createSeededRandom(`${seedNamespace}:decisions`)
  const identities = DEFAULT_BOT_ROSTER.identities
    .filter(identity => identity.archetypeId === profile.archetypeId && !identity.maniac)
  const botStates = new Map<string, BotState>(
    players.map((player, index) => {
      const identity = identities[index % identities.length]
      const sessionRandom = createSeededRandom(
        `${seedNamespace}:session:${player.id}:${identity.id}`,
      )
      return [
        player.id,
        createBotStateFromIdentity(identity, profile.personality, sessionRandom),
      ]
    })
  )
  const game = new PokerGame(players, {
    bigBlind: BIG_BLIND,
    smallBlind: SMALL_BLIND,
    seed: `${seedNamespace}:deck`,
  })
  const stats = createStats()
  const startedAt = Date.now()

  for (let handNumber = 0; handNumber < numHands; handNumber++) {
    for (const player of players) {
      game.setPlayerChips(player.id, STARTING_CHIPS)
      game.setPlayerSittingOut(player.id, false)
      resetBotForHand(botStates.get(player.id)!)
    }

    game.startHand()
    stats.handsPlayed++

    const initialState = game.getPublicState()
    const positions = new Map<string, Position>()
    for (const player of initialState.players.filter(candidate => candidate.status === 'active')) {
      const position = getPosition(initialState, player.id)
      positions.set(player.id, position)
      stats.positions[position].hands++
      stats.playerHands++
    }

    const vpipPlayers = new Set<string>()
    const pfrPlayers = new Set<string>()
    const threeBetOpportunityPlayers = new Set<string>()
    const threeBetPlayers = new Set<string>()
    const preflopActedPlayers = new Set<string>()
    const flopSeenPlayers = new Set<string>()
    let preflopRaiseCount = 0
    let pfa: string | null = null
    let actionCount = 0
    const maxActions = format.playerCount * 30

    let state = game.getPublicState()
    while (state.phase !== 'waiting') {
      if (!state.currentPlayerId) throw new Error(`${format.name}: hand ${handNumber + 1} has no current player`)
      if (++actionCount > maxActions) throw new Error(`${format.name}: hand ${handNumber + 1} exceeded ${maxActions} actions`)

      const botId = state.currentPlayerId
      const player = state.players.find(candidate => candidate.id === botId)
      const botView = game.getPlayerView(botId)
      const holeCards = botView.ownCards
      const botState = botStates.get(botId)
      if (!player || !holeCards || !botState) throw new Error(`${format.name}: missing state for ${botId}`)

      let action: PlayerAction
      try {
        const botContext = createBotContext(botId, botView, game.getPublicHandHistory())
        action = decideBotAction(botContext, botState, decisionRandom)
        game.applyAction(botId, action)
      } catch {
        stats.actionErrors++
        action = { type: 'fold' }
        game.applyAction(botId, action)
      }

      stats.actions[action.type]++

      if (state.phase === 'preflop') {
        const firstPreflopAction = !preflopActedPlayers.has(botId)
        if (firstPreflopAction && preflopRaiseCount === 1) {
          threeBetOpportunityPlayers.add(botId)
        }
        preflopActedPlayers.add(botId)

        if (action.type === 'call' || action.type === 'raise' || action.type === 'all-in') {
          vpipPlayers.add(botId)
        }

        if (isAggressiveAction(state, action)) {
          pfrPlayers.add(botId)
          if (preflopRaiseCount === 1) threeBetPlayers.add(botId)
          preflopRaiseCount++
          if (preflopRaiseCount === 1) pfa = botId
        }
      }

      // Postflop tracking
      if (state.phase !== 'preflop') {
        flopSeenPlayers.add(botId)

        // C-Bet: PFA acts on flop
        if (state.phase === 'flop' && botId === pfa) {
          const pos = positions.get(botId)
          if (pos) stats.positions[pos].cBetOpps++
          if (isAggressiveAction(state, action) && pos) stats.positions[pos].cBets++
        }

        // Fold-to-CBet: facing a bet on flop from PFA
        if (state.phase === 'flop' && botId !== pfa && pfa !== null &&
          state.currentBet > 0) {
          stats.postflop.foldToCBetOpps++
          if (action.type === 'fold') stats.postflop.foldToCBets++
        }

        // AF: postflop aggression
        if (action.type === 'raise' || action.type === 'all-in') {
          stats.postflop.betsAndRaises++
        }
        if (action.type === 'call') {
          stats.postflop.calls++
        }
      }

      state = game.getPublicState()
    }

    stats.vpipHands += vpipPlayers.size
    stats.pfrHands += pfrPlayers.size
    stats.threeBets += threeBetPlayers.size
    stats.threeBetOpportunities += threeBetOpportunityPlayers.size

    for (const playerId of vpipPlayers) {
      const position = positions.get(playerId)
      if (position) stats.positions[position].vpipHands++
    }
    for (const playerId of pfrPlayers) {
      const position = positions.get(playerId)
      if (position) stats.positions[position].pfrHands++
    }

    // C-Bet opportunities: PFA acted on flop (counted per-action now)

    // Showdown tracking: hand reached showdown
    const results = game.getLastHandResults()
    const history = game.getPublicHandHistory()
    const hadShowdown = history.some(e => e.type === 'CardsRevealed')
    if (hadShowdown) {
      // Count players who were still in hand at showdown (not folded)
      const finalState = history.length > 0 ? game.getPublicState() : null
      const showdownPlayers = finalState
        ? finalState.players.filter(p => (p.status === 'active' || p.status === 'all-in'))
        : []
      stats.postflop.wentToShowdown += showdownPlayers.length
      stats.postflop.wonAtShowdown += results.filter(r => r.amount > 0).length
      for (const playerId of showdownPlayers.map(p => p.id)) {
        stats.postflop.handsSeenFlop++
      }
    } else if (flopSeenPlayers.size > 0) {
      stats.postflop.handsSeenFlop += flopSeenPlayers.size
    }
  }

  stats.durationMs = Date.now() - startedAt
  return stats
}

function getPosition(state: Readonly<PublicGameState>, playerId: string): Position {
  const players = state.players.filter(player => player.status !== 'waiting')
  const playerIndex = players.findIndex(player => player.id === playerId)
  const dealer = state.players[state.dealerIndex]
  const dealerIndex = players.findIndex(player => player.id === dealer?.id)
  if (playerIndex < 0 || dealerIndex < 0) return 'middle'

  const playerCount = players.length
  const positionsFromDealer = (playerIndex - dealerIndex + playerCount) % playerCount
  return getPositionCategory(positionsFromDealer, playerCount)
}

function percentage(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0
}

function targetLabel(value: number, target: [number, number]): string {
  if (value < target[0]) return 'too tight'
  if (value > target[1]) return 'too loose'
  return 'in range'
}

function printStats(format: FormatConfig, stats: SimulationStats): boolean {
  const vpip = percentage(stats.vpipHands, stats.playerHands)
  const pfr = percentage(stats.pfrHands, stats.playerHands)
  const threeBet = percentage(stats.threeBets, stats.threeBetOpportunities)

  console.log(`\n=== ${format.name} ===`)
  console.log(`Hands: ${stats.handsPlayed.toLocaleString('en-US')} · Player-hands: ${stats.playerHands.toLocaleString('en-US')} · ${stats.durationMs}ms`)
  console.log(`VPIP: ${vpip.toFixed(2)}% (target ${format.target.vpip.join('–')}%, ${targetLabel(vpip, format.target.vpip)})`)
  console.log(`PFR:  ${pfr.toFixed(2)}% (target ${format.target.pfr.join('–')}%, ${targetLabel(pfr, format.target.pfr)})`)
  console.log(
    `3-bet: ${threeBet.toFixed(2)}% `
    + `(target ${format.target.threeBet.join('–')}%, ${targetLabel(threeBet, format.target.threeBet)}; `
    + `${stats.threeBets}/${stats.threeBetOpportunities} opportunities)`,
  )

  console.log('Positions:')
  for (const position of ['early', 'middle', 'late', 'blinds'] as const) {
    const positionStats = stats.positions[position]
    if (positionStats.hands === 0) continue
    console.log(
      `  ${position.padEnd(7)} ${positionStats.hands.toString().padStart(6)} hands · ` +
      `VPIP ${percentage(positionStats.vpipHands, positionStats.hands).toFixed(2).padStart(5)}% · ` +
      `PFR ${percentage(positionStats.pfrHands, positionStats.hands).toFixed(2).padStart(5)}%`
    )
  }

  const totalActions = Object.values(stats.actions).reduce((sum, count) => sum + count, 0)
  const actionSummary = Object.entries(stats.actions)
    .map(([action, count]) => `${action} ${percentage(count, totalActions).toFixed(1)}%`)
    .join(' · ')
  console.log(`Actions: ${actionSummary}`)

  // Postflop metrics
  const pf = stats.postflop
  let totalCBetOpps = 0
  let totalCBets = 0
  for (const pos of ['early', 'middle', 'late', 'blinds'] as const) {
    totalCBetOpps += stats.positions[pos].cBetOpps
    totalCBets += stats.positions[pos].cBets
  }
  const cBet = percentage(totalCBets, totalCBetOpps)
  const foldToCBet = percentage(pf.foldToCBets, pf.foldToCBetOpps)
  const af = pf.calls > 0 ? (pf.betsAndRaises / pf.calls) : 0
  const wtsd = percentage(pf.wentToShowdown, pf.handsSeenFlop)
  const wssd = percentage(pf.wonAtShowdown, pf.wentToShowdown)

  let allWithin = true
  console.log(`C-Bet: ${cBet.toFixed(1)}%` + (format.target.cBet ? ` (target ${format.target.cBet.join('–')}%, ${targetLabel(cBet, format.target.cBet)})` : ''))
  console.log(`Fold-to-CBet: ${foldToCBet.toFixed(1)}%`)
  console.log(`AF: ${af.toFixed(2)}` + (format.target.aggressionFactor ? ` (target ${format.target.aggressionFactor.join('–')}, ${targetLabel(af, format.target.aggressionFactor)})` : ''))
  console.log(`WTSD: ${wtsd.toFixed(1)}%` + (format.target.wtsd ? ` (target ${format.target.wtsd.join('–')}%, ${targetLabel(wtsd, format.target.wtsd)})` : ''))
  console.log(`W$SD: ${wssd.toFixed(1)}%`)
  console.log(`Invalid-action fallbacks: ${stats.actionErrors}`)

  if (format.target.cBet) allWithin = allWithin && isWithinTarget(cBet, format.target.cBet!)
  if (format.target.aggressionFactor) allWithin = allWithin && isWithinTarget(af, format.target.aggressionFactor!)
  if (format.target.wtsd) allWithin = allWithin && isWithinTarget(wtsd, format.target.wtsd!)
  return isWithinTarget(vpip, format.target.vpip)
    && isWithinTarget(pfr, format.target.pfr)
    && isWithinTarget(threeBet, format.target.threeBet)
    && allWithin
    && stats.actionErrors === 0
}

let calibrationFailed = false
for (const profile of CALIBRATION_PROFILES) {
  console.log(`\n${profile.name} simulation · ${HANDS_PER_FORMAT.toLocaleString('en-US')} hands per format`)
  for (const format of profile.formats) {
    if (!printStats(format, simulateFormat(profile, format))) calibrationFailed = true
  }
}

if (calibrationFailed && EXIT_ON_FAIL) throw new Error('Bot calibration missed at least one target range')

function isWithinTarget(value: number, target: [number, number]): boolean {
  return value >= target[0] && value <= target[1]
}
