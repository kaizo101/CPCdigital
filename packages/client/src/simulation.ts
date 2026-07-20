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

const HANDS_PER_FORMAT = 10_000
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
    target: { vpip: [15, 21], pfr: [12, 18], threeBet: [6, 13] },
  },
  {
    name: '6-max',
    playerCount: 6,
    target: { vpip: [22, 29], pfr: [18, 25], threeBet: [8, 15] },
  },
  {
    name: 'Heads-up',
    playerCount: 2,
    target: { vpip: [45, 65], pfr: [35, 55], threeBet: [12, 22] },
  },
]

const NIT_FORMATS: FormatConfig[] = [
  {
    name: 'Full Ring (9-max)',
    playerCount: 9,
    target: { vpip: [9, 15], pfr: [7, 12], threeBet: [3, 9] },
  },
  {
    name: '6-max',
    playerCount: 6,
    target: { vpip: [13, 19], pfr: [10, 15], threeBet: [4, 10] },
  },
  {
    name: 'Heads-up',
    playerCount: 2,
    target: { vpip: [30, 45], pfr: [16, 35], threeBet: [6, 13] },
  },
]

const LAG_FORMATS: FormatConfig[] = [
  {
    name: 'Full Ring (9-max)',
    playerCount: 9,
    target: { vpip: [22, 31], pfr: [17, 26], threeBet: [8, 18] },
  },
  {
    name: '6-max',
    playerCount: 6,
    target: { vpip: [28, 40], pfr: [22, 33], threeBet: [10, 20] },
  },
  {
    name: 'Heads-up',
    playerCount: 2,
    target: { vpip: [65, 87], pfr: [45, 68], threeBet: [14, 28] },
  },
]

const CALLING_STATION_FORMATS: FormatConfig[] = [
  {
    name: 'Full Ring (9-max)',
    playerCount: 9,
    target: { vpip: [28, 43], pfr: [5, 14], threeBet: [1, 8] },
  },
  {
    name: '6-max',
    playerCount: 6,
    target: { vpip: [38, 56], pfr: [7, 17], threeBet: [2, 9] },
  },
  {
    name: 'Heads-up',
    playerCount: 2,
    target: { vpip: [62, 85], pfr: [15, 36], threeBet: [2, 13] },
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
}

interface SimulationStats {
  handsPlayed: number
  playerHands: number
  vpipHands: number
  pfrHands: number
  threeBets: number
  threeBetOpportunities: number
  positions: Record<Position, PositionStats>
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
      early: { hands: 0, vpipHands: 0, pfrHands: 0 },
      middle: { hands: 0, vpipHands: 0, pfrHands: 0 },
      late: { hands: 0, vpipHands: 0, pfrHands: 0 },
      blinds: { hands: 0, vpipHands: 0, pfrHands: 0 },
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
    let preflopRaiseCount = 0
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
  console.log(`Invalid-action fallbacks: ${stats.actionErrors}`)
  return isWithinTarget(vpip, format.target.vpip)
    && isWithinTarget(pfr, format.target.pfr)
    && isWithinTarget(threeBet, format.target.threeBet)
    && stats.actionErrors === 0
}

let calibrationFailed = false
for (const profile of CALIBRATION_PROFILES) {
  console.log(`\n${profile.name} simulation · ${HANDS_PER_FORMAT.toLocaleString('en-US')} hands per format`)
  for (const format of profile.formats) {
    if (!printStats(format, simulateFormat(profile, format))) calibrationFailed = true
  }
}

if (calibrationFailed) throw new Error('Bot calibration missed at least one target range')

function isWithinTarget(value: number, target: [number, number]): boolean {
  return value >= target[0] && value <= target[1]
}
