// Session pattern evaluator: comprehensive behavioral analysis
// Run with: npx tsx packages/client/src/session-evaluator.ts

import { createSeededRandom, PokerGame } from '@cpc/poker-engine'
import type { Player, PlayerAction, PublicGameState } from '@cpc/shared'
import {
  CALLING_STATION_PERSONALITY,
  createBotStateFromIdentity,
  decideBotDecision,
  LAG_PERSONALITY,
  NIT_PERSONALITY,
  TAG_PERSONALITY,
} from './bot-tag'
import type { BotPersonality, BotState } from './bot-tag'
import type { BotArchetypeId } from './bot-archetypes'
import { createBotContext } from './bot-context'
import { resetHandMemory } from './bot-memory'
import { DEFAULT_BOT_ROSTER } from './bot-identities'

const HANDS_PER_TABLE = 5_000
const BIG_BLIND = 20
const SMALL_BLIND = 10
const STARTING_CHIPS = 2_000

const ARCHETYPES: { id: BotArchetypeId; personality: BotPersonality }[] = [
  { id: 'tag', personality: TAG_PERSONALITY },
  { id: 'nit', personality: NIT_PERSONALITY },
  { id: 'lag', personality: LAG_PERSONALITY },
  { id: 'calling-station', personality: CALLING_STATION_PERSONALITY },
]

const COMPOSITIONS: BotArchetypeId[][] = [
  ['tag', 'nit', 'lag', 'calling-station'],
  ['tag', 'tag', 'lag', 'lag'],
  ['nit', 'nit', 'calling-station', 'calling-station'],
  ['tag', 'lag'],
]

interface TrackedDecision {
  handNumber: number
  archetypeId: BotArchetypeId
  botName: string
  phase: string
  action: string
  amount: number
  handCategory: string
  relativeStrength: number
  board: string
  potOdds: number
  spr: number
  tilt: number
  isPFA: boolean
  inPosition: boolean
  activeOpponents: number
  hasDraw: boolean
  drawTypes: string
  topContributions: string[]
}

interface PatternFlag {
  archetypeId: BotArchetypeId
  botName: string
  handNumber: number
  pattern: string
  details: string
  severity: 'critical' | 'warning' | 'info'
  rootCause: 'structural' | 'personality' | 'habit' | 'mental-state' | 'skill' | 'plausible'
}

const patterns: PatternFlag[] = []
const tracked: TrackedDecision[] = []

function runSession(): void {
  console.log('Session Pattern Evaluator — 5,000 hands per table\n')

  for (const [compIdx, composition] of COMPOSITIONS.entries()) {
    const playerCount = composition.length
    process.stdout.write(`Table ${compIdx + 1}: ${playerCount}-max (${composition.join(', ')}) `)

    const players = composition.map((archetypeId, index) => ({
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

    const seedNamespace = `evaluator:${compIdx}`
    const decisionRandom = createSeededRandom(`${seedNamespace}:decisions`)

    const botArchetypes = new Map<string, BotArchetypeId>()
    const botNames = new Map<string, string>()
    const botStates = new Map<string, BotState>()

    for (let i = 0; i < composition.length; i++) {
      const archetypeId = composition[i]
      const identities = DEFAULT_BOT_ROSTER.identities.filter(
        i => i.archetypeId === archetypeId && !i.maniac,
      )
      const identity = identities[i % identities.length]
      botArchetypes.set(players[i].id, archetypeId)
      botNames.set(players[i].id, identity.name)
      botStates.set(
        players[i].id,
        createBotStateFromIdentity(
          identity,
          ARCHETYPES.find(a => a.id === archetypeId)!.personality,
          createSeededRandom(`${seedNamespace}:session:${players[i].id}`),
        ),
      )
    }

    const game = new PokerGame(players, {
      bigBlind: BIG_BLIND,
      smallBlind: SMALL_BLIND,
      seed: `${seedNamespace}:deck`,
    })

    for (let handNumber = 0; handNumber < HANDS_PER_TABLE; handNumber++) {
      for (const player of players) {
        game.setPlayerChips(player.id, STARTING_CHIPS)
        game.setPlayerSittingOut(player.id, false)
        resetHandMemory(botStates.get(player.id)!.memory)
      }
      game.startHand()

      let state = game.getPublicState()
      while (state.phase !== 'waiting') {
        if (!state.currentPlayerId) break
        const botId = state.currentPlayerId
        const botView = game.getPlayerView(botId)
        const botState = botStates.get(botId)
        if (!botView.ownCards || !botState) break

        const archetypeId = botArchetypes.get(botId)!
        const botName = botNames.get(botId)!

        try {
          const botContext = createBotContext(botId, botView, game.getPublicHandHistory())
          const decision = decideBotDecision(botContext, botState, decisionRandom)

          game.applyAction(botId, decision.action)

          const handAssess = decision.evaluation.handAssessment
          const sa = decision.decisionResult
          const topContribs = sa.allActions
            .filter(a => a.action.type === decision.action.type)
            .flatMap(a => a.contributions)
            .filter(c => Math.abs(c.value) >= 5)
            .map(c => `${c.label} (${c.value >= 0 ? '+' : ''}${Math.round(c.value)})`)
            .slice(0, 5)

          tracked.push({
            handNumber: handNumber + 1,
            archetypeId,
            botName,
            phase: state.phase,
            action: decision.action.type,
            amount: decision.action.type === 'raise' ? (decision.action as any).amount ?? 0 : 0,
            handCategory: handAssess.category,
            relativeStrength: handAssess.relativeStrength,
            board: state.communityCards.map(c => `${c.rank}${c.suit[0]}`).join(' ') || '-',
            potOdds: state.bettingContext?.potOdds ?? 0,
            spr: state.bettingContext?.spr ?? 0,
            tilt: botState.mentalState.tilt,
            isPFA: botState.memory.hand.raisedPreflop,
            inPosition: botContext.position.category === 'late',
            activeOpponents: state.players.filter(p => p.status === 'active').length - 1,
            hasDraw: handAssess.drawTypes.length > 0,
            drawTypes: handAssess.drawTypes.join(',') || 'none',
            topContributions: topContribs,
          })
        } catch {
          game.applyAction(botId, { type: 'fold' })
        }

        state = game.getPublicState()
      }
    }

    console.log('done')
  }

  console.log(`\n${tracked.length.toLocaleString('en-US')} decisions analyzed\n`)
  analyzePatterns()
  printReport()
}

interface StreetDecisions {
  actions: TrackedDecision[]
  phases: Set<string>
}

function classifyRootCause(
  archetypeId: BotArchetypeId,
  handCategory: string,
  action: string,
  phase: string,
  contributions: string[],
): PatternFlag['rootCause'] {
  const contribStr = contributions.join(' ')

  if (contribStr.includes('habit') || contribStr.includes('Habit')) {
    return 'habit'
  }

  if (contribStr.includes('Tilt') || contribStr.includes('tilt') || contribStr.includes('momentum') || contribStr.includes('confidence')) {
    return 'mental-state'
  }

  if (contribStr.includes('skill-perception') || contribStr.includes('Missed') || contribStr.includes('perceived')) {
    return 'skill'
  }

  if (contribStr.includes('Aggression') || contribStr.includes('Risk tolerance') || contribStr.includes('Bluff') || contribStr.includes('Patience')) {
    return 'personality'
  }

  if (handCategory === 'air' && action === 'call' && phase !== 'preflop') {
    if (archetypeId === 'calling-station') return 'plausible'
    return 'structural'
  }

  if ((handCategory === 'strong' || handCategory === 'nuts') && action === 'check' && phase === 'river') {
    return 'structural'
  }

  if (handCategory === 'air' && action === 'call' && archetypeId === 'nit') {
    return 'structural'
  }

  return 'plausible'
}

function analyzePatterns(): void {
  const byHand = new Map<number, Map<string, StreetDecisions>>()
  for (const d of tracked) {
    let hand = byHand.get(d.handNumber)
    if (!hand) { hand = new Map(); byHand.set(d.handNumber, hand) }
    let bot = hand.get(d.botName)
    if (!bot) { bot = { actions: [], phases: new Set() }; hand.set(d.botName, bot) }
    bot.actions.push(d)
    bot.phases.add(d.phase)
  }

  for (const [, handMap] of byHand) {
    for (const [botName, streetDec] of handMap) {
      const actions = streetDec.actions
      if (actions.length === 0) continue
      const archetypeId = actions[0].archetypeId

      const calls = actions.filter(a => a.action === 'call')
      const riverCalls = actions.filter(a => a.action === 'call' && a.phase === 'river')
      const folds = actions.filter(a => a.action === 'fold')
      const raises = actions.filter(a => a.action === 'raise')
      const checks = actions.filter(a => a.action === 'check' && a.phase === 'river')

      for (const d of actions) {
        if (d.action === 'call' && d.phase === 'river' && (d.handCategory === 'air' || d.handCategory === 'weak')) {
          const airNoDraws = d.handCategory === 'air' && !d.hasDraw
          patterns.push({
            archetypeId, botName, handNumber: d.handNumber,
            pattern: `Called river with ${airNoDraws ? 'air (no draws)' : d.handCategory + (d.hasDraw ? ' (has draws: ' + d.drawTypes + ')' : '')}`,
            details: `${d.handCategory} on ${d.board} | ${(d.potOdds * 100).toFixed(0)}% pot odds | contributions: ${d.topContributions.join('; ') || 'none'}`,
            severity: airNoDraws && archetypeId !== 'calling-station' ? 'critical'
              : d.handCategory === 'air' ? 'warning'
              : archetypeId === 'calling-station' ? 'info' : 'warning',
            rootCause: classifyRootCause(archetypeId, d.handCategory, d.action, d.phase, d.topContributions),
          })
        }

        if (d.action === 'check' && d.phase === 'river' && (d.handCategory === 'strong' || d.handCategory === 'nuts') && d.inPosition && d.activeOpponents <= 1) {
          patterns.push({
            archetypeId, botName, handNumber: d.handNumber,
            pattern: 'Checked strong hand on river in position',
            details: `${d.handCategory} (${d.relativeStrength}%) on ${d.board} | SPR ${d.spr.toFixed(1)} | contributions: ${d.topContributions.join('; ') || 'none'}`,
            severity: 'warning',
            rootCause: classifyRootCause(archetypeId, d.handCategory, d.action, d.phase, d.topContributions),
          })
        }

        if (d.action === 'call' && d.handCategory === 'air' && !d.hasDraw && d.phase !== 'preflop' && d.potOdds > 0.1 && d.activeOpponents === 1) {
          patterns.push({
            archetypeId, botName, handNumber: d.handNumber,
            pattern: 'Called postflop with dead air (no draws, no pair)',
            details: `${d.phase} on ${d.board} | ${(d.potOdds * 100).toFixed(0)}% pot odds | draws: ${d.drawTypes} | contributions: ${d.topContributions.join('; ') || 'none'}`,
            severity: archetypeId === 'calling-station' ? 'warning' : 'critical',
            rootCause: classifyRootCause(archetypeId, d.handCategory, d.action, d.phase, d.topContributions),
          })
        }

        if (d.action === 'fold' && d.phase === 'flop' && d.isPFA && (d.handCategory === 'medium' || d.handCategory === 'strong')) {
          patterns.push({
            archetypeId, botName, handNumber: d.handNumber,
            pattern: 'PFA folded to single flop bet with made hand',
            details: `${d.handCategory} on ${d.board} | contributions: ${d.topContributions.join('; ') || 'none'}`,
            severity: 'warning',
            rootCause: classifyRootCause(archetypeId, d.handCategory, d.action, d.phase, d.topContributions),
          })
        }
      }

      if (calls.length >= 3 && calls.every(a => (a.handCategory === 'air' || a.handCategory === 'weak') && !a.hasDraw)) {
        const archetypeId2 = calls[0].archetypeId
        if (archetypeId2 !== 'calling-station') {
          patterns.push({
            archetypeId: archetypeId2, botName, handNumber: calls[0].handNumber,
            pattern: 'Called down multiple streets with air/weak',
            details: `${calls.length} calls across ${[...streetDec.phases].join(', ')} | hand: ${calls[0].handCategory}`,
            severity: 'critical',
            rootCause: classifyRootCause(archetypeId2, calls[0].handCategory, 'call', calls[0].phase, calls[0].topContributions),
          })
        }
      }

      if (raises.length === 0 && checks.length === 0 && folds.length >= 2 && archetypeId !== 'nit') {
        const hasStrong = actions.some(a => a.handCategory === 'strong')
        if (hasStrong) {
          patterns.push({
            archetypeId, botName, handNumber: actions[0].handNumber,
            pattern: 'Passively folded strong hand',
            details: `Folded ${actions[0].handCategory} without any aggression`,
            severity: 'warning',
            rootCause: classifyRootCause(archetypeId, actions[0].handCategory, 'fold', actions[0].phase, actions[0].topContributions),
          })
        }
      }
    }
  }
}

function printReport(): void {
  console.log('=== Pattern Summary ===\n')

  const critical = patterns.filter(p => p.severity === 'critical')
  const warnings = patterns.filter(p => p.severity === 'warning')
  const infos = patterns.filter(p => p.severity === 'info')

  console.log(`${patterns.length} total: ${critical.length} critical, ${warnings.length} warning, ${infos.length} info\n`)

  const byCause = new Map<string, PatternFlag[]>()
  for (const p of patterns) {
    const key = p.rootCause
    if (!byCause.has(key)) byCause.set(key, [])
    byCause.get(key)!.push(p)
  }

  console.log('=== Root Cause Analysis ===\n')
  for (const [cause, flags] of byCause) {
    const icon = cause === 'structural' ? '🔴' : cause === 'personality' ? '🟡' : cause === 'habit' ? '🟢' : cause === 'mental-state' ? '🟣' : '🔵'
    console.log(`${icon} ${cause}: ${flags.length} flags`)
  }
  console.log()

  const showTop = 8

  for (const sev of ['critical', 'warning', 'info'] as const) {
    const filtered = patterns.filter(p => p.severity === sev)
    if (filtered.length === 0) continue

    const patternCounts = new Map<string, number>()
    for (const p of filtered) patternCounts.set(p.pattern, (patternCounts.get(p.pattern) ?? 0) + 1)

    const sortedPatterns = [...patternCounts.entries()].sort((a, b) => b[1] - a[1])

    console.log(`${sev.toUpperCase()}:`)
    for (const [pattern, count] of sortedPatterns.slice(0, showTop)) {
      const examples = filtered.filter(p => p.pattern === pattern).slice(0, 1)
      const archetypeCounts = countArchetypes(filtered.filter(p => p.pattern === pattern))
      const causes = new Set(filtered.filter(p => p.pattern === pattern).map(p => p.rootCause))
      console.log(`  ${count}× ${pattern} ${formatArchetypeCounts(archetypeCounts)} [${[...causes].join(', ')}]`)
      for (const ex of examples) {
        console.log(`    → ${ex.botName} (${ex.archetypeId}) Hand ${ex.handNumber}: ${ex.details}`)
      }
    }
    console.log()
  }

  console.log('=== Per-Archetype Behavioral Stats ===\n')

  const stats = new Map<BotArchetypeId, {
    decisions: TrackedDecision[]
    callsWithWeak: number
    checksRiverStrong: number
    foldsAsPFA: number
    airCallsPostflop: number
    multiStreetCalls: number
  }>()

  for (const id of ['tag', 'nit', 'lag', 'calling-station'] as BotArchetypeId[]) {
    const archDecisions = tracked.filter(d => d.archetypeId === id)

    const callsWithWeak = archDecisions.filter(d =>
      d.action === 'call' && d.phase === 'river' && (d.handCategory === 'air' || d.handCategory === 'weak'),
    ).length

    const checksRiverStrong = archDecisions.filter(d =>
      d.action === 'check' && d.phase === 'river' && (d.handCategory === 'strong' || d.handCategory === 'nuts') && d.inPosition,
    ).length

    const foldsAsPFA = archDecisions.filter(d =>
      d.action === 'fold' && d.phase === 'flop' && d.isPFA,
    ).length

    const airCallsPostflop = archDecisions.filter(d =>
      d.action === 'call' && d.phase !== 'preflop' && d.handCategory === 'air' && !d.hasDraw,
    ).length

    const multiStreetCalls = 0

    const cbetOpps = archDecisions.filter(d => d.phase === 'flop' && d.isPFA)
    const cbets = cbetOpps.filter(d => d.action === 'raise')

    const riverDecisions = archDecisions.filter(d => d.phase === 'river')
    const riverChecks = riverDecisions.filter(d => d.action === 'check')
    const riverBets = riverDecisions.filter(d => d.action === 'raise')

    console.log(
      `${id.padEnd(16)} `
      + `decisions: ${archDecisions.length.toLocaleString('en-US').padStart(10)} | `
      + `C-bet: ${cbetOpps.length > 0 ? (cbets.length / cbetOpps.length * 100).toFixed(0) + '%' : 'n/a'} | `
      + `Riv calls weak: ${callsWithWeak} | `
      + `Riv check strong: ${checksRiverStrong} | `
      + `Air calls post: ${airCallsPostflop} | `
      + `PFA folds: ${foldsAsPFA} | `
      + `Riv bet: ${riverBets.length}/${riverDecisions.length}`,
    )
  }

  console.log()
}

function countArchetypes(flags: PatternFlag[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const f of flags) m.set(f.archetypeId, (m.get(f.archetypeId) ?? 0) + 1)
  return m
}

function formatArchetypeCounts(map: Map<string, number>): string {
  return [...map.entries()].map(([id, c]) => `${id}:${c}`).join(' ')
}

runSession()
