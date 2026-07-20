// Bot balance simulation: mixed tables, extended metrics, mental state drift
// Run with: npx tsx packages/client/src/balance-sim.ts

import { createSeededRandom, PokerGame } from '@cpc/poker-engine'
import type { Player, PlayerAction, PublicGameState } from '@cpc/shared'
import {
  CALLING_STATION_PERSONALITY,
  createBotStateFromIdentity,
  decideBotAction,
  LAG_PERSONALITY,
  NIT_PERSONALITY,
  TAG_PERSONALITY,
  updateMentalState,
  type MentalEvent,
} from './bot-tag'
import type { BotPersonality, BotState, Position } from './bot-tag'
import type { BotArchetypeId } from './bot-archetypes'
import { createBotContext, getPositionCategory } from './bot-context'
import { resetHandMemory } from './bot-memory'
import { DEFAULT_BOT_ROSTER } from './bot-identities'

const HANDS_PER_TABLE = 5_000
const HANDS_PER_SESSION = 200
const BIG_BLIND = 20
const SMALL_BLIND = 10
const STARTING_CHIPS = 2_000

const ARCHETYPES: { id: BotArchetypeId; personality: BotPersonality }[] = [
  { id: 'tag', personality: TAG_PERSONALITY },
  { id: 'nit', personality: NIT_PERSONALITY },
  { id: 'lag', personality: LAG_PERSONALITY },
  { id: 'calling-station', personality: CALLING_STATION_PERSONALITY },
]

interface TableConfig {
  name: string
  playerCount: number
  composition: BotArchetypeId[]
}

interface PerArchetypeStats {
  hands: number
  vpipHands: number
  pfrHands: number
  threeBets: number
  threeBetOpps: number
  showDowns: number
  wonAtShowdown: number
  chipsWon: number
  chipsLost: number
  aggressionByStreet: { preflop: number; flop: number; turn: number; river: number }
  opportunitiesByStreet: { preflop: number; flop: number; turn: number; river: number }
  finalTilt: number[]
  finalConfidence: number[]
  finalMomentum: number[]
  actionCounts: Record<PlayerAction['type'], number>
}

interface BalanceResult {
  tableName: string
  perArchetype: Map<BotArchetypeId, PerArchetypeStats>
  durationMs: number
}

function createPerArchetypeStats(): PerArchetypeStats {
  return {
    hands: 0,
    vpipHands: 0,
    pfrHands: 0,
    threeBets: 0,
    threeBetOpps: 0,
    showDowns: 0,
    wonAtShowdown: 0,
    chipsWon: 0,
    chipsLost: 0,
    aggressionByStreet: { preflop: 0, flop: 0, turn: 0, river: 0 },
    opportunitiesByStreet: { preflop: 0, flop: 0, turn: 0, river: 0 },
    finalTilt: [],
    finalConfidence: [],
    finalMomentum: [],
    actionCounts: { fold: 0, check: 0, call: 0, raise: 0, 'all-in': 0 },
  }
}

function getArchetypeIdentities(archetypeId: BotArchetypeId) {
  return DEFAULT_BOT_ROSTER.identities.filter(
    i => i.archetypeId === archetypeId && !i.maniac,
  )
}

function buildTableConfigs(): TableConfig[] {
  const configs: TableConfig[] = []

  for (const [compositionId, composition] of COMPOSITIONS.entries()) {
    for (const size of [2, 6, 9]) {
      if (composition.length > size) continue
      const ids = [...composition]
      while (ids.length < size) {
        ids.push(composition[ids.length % composition.length])
      }
      configs.push({
        name: `${size}-max ${compositionId + 1}`,
        playerCount: size,
        composition: ids.slice(0, size),
      })
    }
  }

  return configs
}

const COMPOSITIONS: BotArchetypeId[][] = [
  ['tag', 'nit', 'lag', 'calling-station'],
  ['tag', 'tag', 'nit', 'lag', 'calling-station'],
  ['lag', 'calling-station', 'tag'],
  ['tag', 'tag', 'lag'],
  ['tag', 'nit'],
  ['nit', 'nit', 'calling-station', 'calling-station', 'lag'],
  ['lag', 'lag', 'tag'],
]

function simulateTable(config: TableConfig): BalanceResult {
  const players = config.composition.map((archetypeId, index) => ({
    id: `bot-${index}`,
    name: `${archetypeId}-${index}`,
    role: 'player' as const,
    chips: STARTING_CHIPS,
    seatIndex: index,
    isConnected: true,
    isSittingOut: false,
    status: 'waiting' as const,
    roundBet: 0,
  }))

  const seedNamespace = `balance:${config.name}`
  const decisionRandom = createSeededRandom(`${seedNamespace}:decisions`)

  const botArchetypes = new Map<string, BotArchetypeId>()
  const botStates = new Map<string, BotState>()

  for (let i = 0; i < config.composition.length; i++) {
    const archetypeId = config.composition[i]
    const player = players[i]
    const identities = getArchetypeIdentities(archetypeId)
    const identity = identities[i % identities.length]
    const sessionRandom = createSeededRandom(`${seedNamespace}:session:${player.id}`)
    botArchetypes.set(player.id, archetypeId)
    botStates.set(
      player.id,
      createBotStateFromIdentity(
        identity,
        ARCHETYPES.find(a => a.id === archetypeId)!.personality,
        sessionRandom,
      ),
    )
  }

  const game = new PokerGame(players, {
    bigBlind: BIG_BLIND,
    smallBlind: SMALL_BLIND,
    seed: `${seedNamespace}:deck`,
  })

  const perArchetype = new Map<BotArchetypeId, PerArchetypeStats>()
  for (const a of ARCHETYPES) perArchetype.set(a.id, createPerArchetypeStats())

  const startedAt = Date.now()
  let actionErrors = 0

  for (let handNumber = 0; handNumber < HANDS_PER_TABLE; handNumber++) {
    for (const player of players) {
      game.setPlayerChips(player.id, STARTING_CHIPS)
      game.setPlayerSittingOut(player.id, false)
      resetHandMemory(botStates.get(player.id)!.memory)
    }

    game.startHand()

    const initialState = game.getPublicState()
    const positions = new Map<string, Position>()
    for (const p of initialState.players.filter(c => c.status === 'active')) {
      positions.set(p.id, getPositionCategory({ ...initialState, ...game.getPlayerView(p.id) }))
    }

    const vpipPlayers = new Set<string>()
    const pfrPlayers = new Set<string>()
    const threeBetOpp = new Set<string>()
    const threeBetters = new Set<string>()
    const preflopActed = new Set<string>()
    let preflopRaises = 0
    let actionCount = 0

    let state = game.getPublicState()
    while (state.phase !== 'waiting') {
      if (!state.currentPlayerId) throw new Error(`No current player in ${config.name} hand ${handNumber + 1}`)
      if (++actionCount > config.playerCount * 40) throw new Error('Action limit exceeded')

      const botId = state.currentPlayerId
      const botView = game.getPlayerView(botId)
      const botState = botStates.get(botId)
      if (!botView.ownCards || !botState) throw new Error(`Missing state for ${botId}`)

      const archetypeId = botArchetypes.get(botId)!
      const stats = perArchetype.get(archetypeId)!

      let action: PlayerAction
      try {
        const botContext = createBotContext(botId, botView, game.getPublicHandHistory())
        action = decideBotAction(botContext, botState, decisionRandom)
        game.applyAction(botId, action)
      } catch {
        actionErrors++
        action = { type: 'fold' }
        game.applyAction(botId, action)
      }

      stats.actionCounts[action.type]++

      if (state.phase !== 'waiting') {
        const isAggressive = action.type === 'raise'
          || action.type === 'all-in'

        stats.opportunitiesByStreet[state.phase as keyof typeof stats.opportunitiesByStreet]++
        if (isAggressive) {
          stats.aggressionByStreet[state.phase as keyof typeof stats.aggressionByStreet]++
        }
      }

      if (state.phase === 'preflop') {
        const first = !preflopActed.has(botId)
        if (first && preflopRaises === 1) threeBetOpp.add(botId)
        preflopActed.add(botId)

        if (action.type === 'call' || isAggressiveAction(state, action)) {
          vpipPlayers.add(botId)
        }
        if (isAggressiveAction(state, action)) {
          pfrPlayers.add(botId)
          if (preflopRaises === 1) threeBetters.add(botId)
          preflopRaises++
        }
      }

      state = game.getPublicState()
    }

    for (const botId of vpipPlayers) {
      const stats = perArchetype.get(botArchetypes.get(botId)!)!
      stats.vpipHands++
    }
    for (const botId of pfrPlayers) {
      const stats = perArchetype.get(botArchetypes.get(botId)!)!
      stats.pfrHands++
    }
    for (const botId of threeBetters) {
      const stats = perArchetype.get(botArchetypes.get(botId)!)!
      stats.threeBets++
    }
    for (const botId of threeBetOpp) {
      const stats = perArchetype.get(botArchetypes.get(botId)!)!
      stats.threeBetOpps++
    }

    const results = game.getLastHandResults()
    for (const r of results) {
      const archetypeId = botArchetypes.get(r.playerId)
      if (!archetypeId) continue
      const stats = perArchetype.get(archetypeId)!
      stats.chipsWon += r.amount
    }

    for (const player of players) {
      const archetypeId = botArchetypes.get(player.id)!
      const stats = perArchetype.get(archetypeId)!
      const statePlayer = game.getPublicState().players.find(p => p.id === player.id)
      const currentChips = statePlayer?.chips ?? STARTING_CHIPS
      if (currentChips < STARTING_CHIPS) {
        stats.chipsLost += (STARTING_CHIPS - currentChips)
      }
    }

    for (const [botId, botState] of botStates) {
      const won = results.some(r => r.playerId === botId && r.amount > 0)
      const potBb = results.reduce((s, r) => s + r.amount, 0) / BIG_BLIND
      const mentalEvent = detectMentalEvent(botId, won, potBb, results)
      if (mentalEvent) {
        updateMentalState(botState.mentalState, botState.personality, mentalEvent, BIG_BLIND)
      }
    }

    if ((handNumber + 1) % HANDS_PER_SESSION === 0) {
      for (const [botId, botState] of botStates) {
        const archetypeId = botArchetypes.get(botId)!
        const stats = perArchetype.get(archetypeId)!
        stats.finalTilt.push(botState.mentalState.tilt)
        stats.finalConfidence.push(botState.mentalState.confidence)
        stats.finalMomentum.push(botState.mentalState.momentum)
        botState.mentalState.tilt = 0
        botState.mentalState.confidence = 50
        botState.mentalState.momentum = 0
        botState.mentalState.patience = botState.personality.patience
      }
    }

    const stateFinal = game.getPublicState()
    if (stateFinal.phase === 'waiting') {
      let wentToShowdown = false
      for (const player of stateFinal.players) {
        const archetypeId = botArchetypes.get(player.id)
        if (!archetypeId) continue
        const stats = perArchetype.get(archetypeId)!
        stats.hands++
        if (player.status !== 'folded') wentToShowdown = true
      }
      if (wentToShowdown) {
        for (const player of stateFinal.players) {
          const archetypeId = botArchetypes.get(player.id)
          if (!archetypeId || player.status === 'folded') continue
          const stats = perArchetype.get(archetypeId)!
          stats.showDowns++
        }
        for (const r of results) {
          const archetypeId = botArchetypes.get(r.playerId)
          if (!archetypeId || r.amount <= 0) continue
          const stats = perArchetype.get(archetypeId)!
          stats.wonAtShowdown++
        }
      }
    }
  }

  for (const [botId, botState] of botStates) {
    const archetypeId = botArchetypes.get(botId)!
    const stats = perArchetype.get(archetypeId)!
    const ms = botState.mentalState
    stats.finalTilt.push(ms.tilt)
    stats.finalConfidence.push(ms.confidence)
    stats.finalMomentum.push(ms.momentum)
  }

  return {
    tableName: config.name,
    perArchetype,
    durationMs: Date.now() - startedAt,
  }
}

function isAggressiveAction(state: Readonly<PublicGameState>, action: PlayerAction): boolean {
  if (action.type === 'raise') return true
  return action.type === 'all-in'
    && (state.bettingContext?.legalActions.allInAmount ?? 0) > state.currentBet
}

function percentage(num: number, denom: number): number {
  return denom > 0 ? (num / denom) * 100 : 0
}

function avg(values: number[]): number {
  return values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0
}

function detectMentalEvent(
  botId: string,
  won: boolean,
  potBb: number,
  results: { playerId: string; amount: number }[],
): MentalEvent | null {
  const opponentWinner = results.find(r => r.playerId !== botId && r.amount > 0)
  const opponentId = opponentWinner?.playerId

  if (won) {
    if (potBb < 10) return null
    if (potBb > 30) return { type: 'suckout-win', potBb }
    return { type: 'won-small-pot', potBb }
  }

  if (potBb < 10) return null
  if (potBb > 30) return { type: 'lost-big-pot', potBb, opponentId }
  return { type: 'lost-small-pot', potBb, opponentId }
}

function printBalanceResults(results: BalanceResult[]): boolean {
  console.log('Mixed-table balance simulation')
  console.log(`${HANDS_PER_TABLE.toLocaleString('en-US')} hands per table\n`)

  const allArchetypes: BotArchetypeId[] = ['tag', 'nit', 'lag', 'calling-station']
  const overall = new Map<BotArchetypeId, PerArchetypeStats>()
  for (const a of allArchetypes) overall.set(a, createPerArchetypeStats())
  let totalDuration = 0

  for (const result of results) {
    console.log(`=== ${result.tableName} ===`)
    totalDuration += result.durationMs

    for (const archetypeId of allArchetypes) {
      const stats = result.perArchetype.get(archetypeId)!
      if (stats.hands === 0) continue

      const vpip = percentage(stats.vpipHands, stats.hands)
      const pfr = percentage(stats.pfrHands, stats.hands)
      const threeBet = percentage(stats.threeBets, stats.threeBetOpps)
      const wtsd = percentage(stats.showDowns, stats.hands)
      const wsd = percentage(stats.wonAtShowdown, stats.showDowns)
      const netChips = stats.chipsWon - stats.chipsLost
      const bb100 = stats.hands > 0 ? (netChips / BIG_BLIND) / (stats.hands / 100) : 0

      console.log(
        `  ${archetypeId.padEnd(16)} `
        + `VPIP ${vpip.toFixed(1)}%  PFR ${pfr.toFixed(1)}%  3b ${threeBet.toFixed(1)}%  `
        + `WTSD ${wtsd.toFixed(1)}%  W$SD ${wsd.toFixed(1)}%  `
        + `BB/100 ${bb100 >= 0 ? '+' : ''}${bb100.toFixed(2)}`
      )

      const agg = stats.aggressionByStreet
      const opps = stats.opportunitiesByStreet
      console.log(
        `                    `
        + `Agg/street: PF ${percentage(agg.preflop, opps.preflop).toFixed(0)}%  `
        + `F ${percentage(agg.flop, opps.flop).toFixed(0)}%  `
        + `T ${percentage(agg.turn, opps.turn).toFixed(0)}%  `
        + `R ${percentage(agg.river, opps.river).toFixed(0)}%`
      )

      const o = overall.get(archetypeId)!
      o.hands += stats.hands
      o.vpipHands += stats.vpipHands
      o.pfrHands += stats.pfrHands
      o.threeBets += stats.threeBets
      o.threeBetOpps += stats.threeBetOpps
      o.showDowns += stats.showDowns
      o.wonAtShowdown += stats.wonAtShowdown
      o.chipsWon += stats.chipsWon
      o.chipsLost += stats.chipsLost
      for (const s of ['preflop', 'flop', 'turn', 'river'] as const) {
        o.aggressionByStreet[s] += stats.aggressionByStreet[s]
        o.opportunitiesByStreet[s] += stats.opportunitiesByStreet[s]
      }
      o.finalTilt.push(...stats.finalTilt)
      o.finalConfidence.push(...stats.finalConfidence)
      o.finalMomentum.push(...stats.finalMomentum)
    }
    console.log()
  }

  console.log('=== Overall (all tables combined) ===')
  console.log(`Duration: ${(totalDuration / 1000).toFixed(1)}s\n`)

  let balanced = true

  for (const archetypeId of allArchetypes) {
    const stats = overall.get(archetypeId)!
    if (stats.hands === 0) continue

    const vpip = percentage(stats.vpipHands, stats.hands)
    const pfr = percentage(stats.pfrHands, stats.hands)
    const threeBet = percentage(stats.threeBets, stats.threeBetOpps)
    const wtsd = percentage(stats.showDowns, stats.hands)
    const wsd = percentage(stats.wonAtShowdown, stats.showDowns)
    const netChips = stats.chipsWon - stats.chipsLost
    const bb100 = stats.hands > 0 ? (netChips / BIG_BLIND) / (stats.hands / 100) : 0

    console.log(
      `${archetypeId.padEnd(16)} `
      + `${stats.hands.toLocaleString('en-US')} hands  `
      + `VPIP ${vpip.toFixed(1)}%  PFR ${pfr.toFixed(1)}%  3b ${threeBet.toFixed(1)}%  `
      + `WTSD ${wtsd.toFixed(1)}%  W$SD ${wsd.toFixed(1)}%  `
      + `BB/100 ${bb100 >= 0 ? '+' : ''}${bb100.toFixed(2)}`
    )

    const expectations: Record<BotArchetypeId, { vpip: [number, number] }> = {
      tag: { vpip: [18, 30] },
      nit: { vpip: [10, 20] },
      lag: { vpip: [25, 48] },
      'calling-station': { vpip: [28, 55] },
    }

    const exp = expectations[archetypeId]
    if (vpip < exp.vpip[0] || vpip > exp.vpip[1]) {
      console.log(`  ⚠ VPIP ${vpip.toFixed(1)}% outside expected ${exp.vpip[0]}–${exp.vpip[1]}%`)
      balanced = false
    }
  }

  console.log()
  if (balanced) {
    console.log('All archetypes within expected VPIP ranges across mixed tables.')
  } else {
    console.log('Some archetypes outside expected ranges — review needed.')
  }

  return balanced
}

const configs = buildTableConfigs()
const results = configs.map(config => {
  process.stdout.write(`  ${config.name}... `)
  const result = simulateTable(config)
  console.log(`${(result.durationMs / 1000).toFixed(1)}s`)
  return result
})

console.log()
const balanced = printBalanceResults(results)
if (!balanced) {
  throw new Error('Balance check outside expected ranges')
}
