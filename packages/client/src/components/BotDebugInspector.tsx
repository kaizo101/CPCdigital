import { useState } from 'react'
import type { Card, PlayerAction } from '@cpc/shared'
import type { BotDebugDecision } from '../bot-debug'
import { formatChips, type DisplayCurrency } from '../utils/format'

const panelColor = '#11151a'
const borderColor = 'rgba(255,255,255,0.12)'

const selectStyle: React.CSSProperties = {
  maxWidth: 130,
  padding: '6px 7px',
  borderRadius: 6,
  border: `1px solid ${borderColor}`,
  color: '#e6edf3',
  background: '#0b0f14',
  fontFamily: 'inherit',
  fontSize: 11,
}

export function BotDebugInspector({
  decisions,
  currency,
  onExportDebugRecord,
}: {
  decisions: readonly BotDebugDecision[]
  currency: DisplayCurrency
  onExportDebugRecord: () => void
}) {
  const [open, setOpen] = useState(false)
  const [selectedSequence, setSelectedSequence] = useState<number | null>(null)

  const latest = decisions.at(-1) ?? null
  const selected = selectedSequence == null
    ? latest
    : decisions.find(decision => decision.sequence === selectedSequence) ?? latest

  // Group decisions by hand
  const hands = new Map<number, BotDebugDecision[]>()
  for (const d of decisions) {
    const arr = hands.get(d.handNumber) ?? []
    arr.push(d)
    hands.set(d.handNumber, arr)
  }
  const handNumbers = [...hands.keys()].sort((a, b) => a - b)
  const activeHand = selected?.handNumber ?? handNumbers.at(-1) ?? 0
  const decisionsInHand = hands.get(activeHand) ?? []

  const [selectedHand, setSelectedHand] = useState<number>(activeHand)
  const [selectedBot, setSelectedBot] = useState<string>('latest')

  // Sync state when selection changes externally
  const effectiveHand = selected?.handNumber ?? selectedHand
  const decisionsForHand = hands.get(effectiveHand) ?? []
  const effectiveBot = selectedBot === 'latest' || !decisionsForHand.some(d => d.playerId === selectedBot)
    ? decisionsForHand.at(-1)
    : decisionsForHand.find(d => d.playerId === selectedBot)
  const displayDecision = selectedBot === 'latest' ? selected : effectiveBot ?? decisionsForHand.at(-1)

  return (
    <div className="bot-debug-inspector" style={{ pointerEvents: 'auto' }}>
      {open && (
        <div style={{
          width: 'min(460px, calc(100vw - 32px))',
          maxHeight: 'min(680px, calc(100vh - 155px))',
          marginBottom: 8,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          background: 'rgba(10,13,17,0.97)',
          boxShadow: '0 18px 48px rgba(0,0,0,0.58)',
          color: '#e6edf3',
          fontFamily: 'monospace',
        }}>
          <div style={{
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            borderBottom: `1px solid ${borderColor}`,
            background: '#171c22',
          }}>
            <div>
              <div style={{ fontWeight: 800, color: '#7dd3fc' }}>Bot Debug Inspector</div>
              <div style={{ marginTop: 2, color: '#89939e', fontSize: 10 }}>
                Lokal · enthält private Botkarten
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <button
                type="button"
                onClick={onExportDebugRecord}
                title="Enthält private Karten und vollständige Bot-Entscheidungen"
                style={{
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: `1px solid ${borderColor}`,
                  color: '#bae6fd',
                  background: '#102536',
                  fontFamily: 'inherit',
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Session-JSON
              </button>
              {decisions.length > 0 && (
                <>
                  <select
                    aria-label="Hand auswählen"
                    value={effectiveHand}
                    onChange={e => {
                      const hn = Number(e.target.value)
                      setSelectedHand(hn)
                      setSelectedBot('latest')
                      const firstInHand = hands.get(hn)?.at(-1)
                      if (firstInHand) setSelectedSequence(null)
                    }}
                    style={selectStyle}
                  >
                    {handNumbers.map(hn => (
                      <option key={hn} value={hn}>Hand {hn} ({hands.get(hn)?.length ?? 0})</option>
                    ))}
                  </select>
                  <select
                    aria-label="Bot auswählen"
                    value={selectedBot}
                    onChange={e => {
                      const bot = e.target.value
                      setSelectedBot(bot)
                      if (bot === 'latest') {
                        setSelectedSequence(null)
                      } else {
                        const d = decisionsForHand.find(d => d.playerId === bot)
                        if (d) setSelectedSequence(d.sequence)
                      }
                    }}
                    style={{ ...selectStyle, maxWidth: 120 }}
                  >
                    <option value="latest">Live</option>
                    {[...new Map(decisionsForHand.map(d => [d.playerId, d.playerName] as const)).entries()].map(([pid, name]) => (
                      <option key={pid} value={pid}>{name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>

          <div style={{ overflowY: 'auto', padding: 12 }}>
            {displayDecision ? <DecisionDetails debug={displayDecision} currency={currency} /> : (
              <div style={{ padding: '24px 8px', textAlign: 'center', color: '#89939e' }}>
                Noch keine Bot-Entscheidung in dieser Session.
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        style={{
          padding: '8px 12px',
          borderRadius: 7,
          border: `1px solid ${open ? '#38bdf8' : borderColor}`,
          background: open ? '#143044' : 'rgba(18,22,27,0.94)',
          color: open ? '#bae6fd' : '#aeb7c2',
          fontWeight: 800,
          fontFamily: 'monospace',
          fontSize: 11,
          cursor: 'pointer',
          boxShadow: '0 8px 20px rgba(0,0,0,0.28)',
        }}
      >
        {open ? 'Debug schließen' : 'Bot Debug'}
      </button>
    </div>
  )
}

function DecisionDetails({ debug, currency }: { debug: BotDebugDecision; currency: DisplayCurrency }) {
  const { context, evaluation, metrics, decision, complexity, timing, profile } = debug
  const chosenIndex = findChosenIndex(debug)

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <Section title="Entscheidung">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ color: '#f8fafc', fontSize: 14, fontWeight: 800 }}>
              {debug.playerName} · Hand {debug.handNumber}
            </div>
            <div style={{ marginTop: 3, color: '#9ca8b4', fontSize: 11 }}>
              {context.publicState.phase.toUpperCase()} · {context.position.category} · Sitz {context.position.seatIndex}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: 14 }}>
              {formatAction(decision.action, debug, currency)}
            </div>
            <div style={{ color: '#9ca8b4', fontSize: 10 }}>
              Utility {formatNumber(decision.chosenUtility)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 9, display: 'flex', gap: 12, color: '#dce5ed', fontSize: 12 }}>
          <span>Hole: <strong>{formatCards(context.ownCards)}</strong></span>
          <span>Board: <strong>{formatCards(context.publicState.communityCards) || '–'}</strong></span>
        </div>
      </Section>

      <Section title="Aktions-Scores">
        <div style={{ color: '#7f8b96', fontSize: 10, marginBottom: 7 }}>
          Utility = 50 Basis + Faktoren; Auswahl gewichtet zwischen plausiblen Aktionen.
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {decision.allActions.map((action, index) => (
            <details
              key={`${action.action.type}-${index}`}
              open={index === chosenIndex}
              style={{
                border: `1px solid ${index === chosenIndex ? 'rgba(251,191,36,0.55)' : borderColor}`,
                borderRadius: 7,
                background: index === chosenIndex ? 'rgba(92,62,11,0.22)' : '#0c1015',
              }}
            >
              <summary style={{
                padding: '7px 8px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                listStyle: 'none',
              }}>
                <span>
                  <strong style={{ color: index === chosenIndex ? '#fbbf24' : '#dce5ed' }}>
                    {formatAction(action.action, debug, currency)}
                  </strong>
                  <span style={{ marginLeft: 7, color: '#83909d', fontSize: 10 }}>{action.intent}</span>
                  {index === chosenIndex && <span style={{ marginLeft: 7, color: '#fbbf24', fontSize: 9 }}>GEWÄHLT</span>}
                </span>
                <strong style={{ color: utilityColor(action.utility) }}>{formatNumber(action.utility)}</strong>
              </summary>
              <div style={{ padding: '0 8px 7px', display: 'grid', gap: 3 }}>
                {action.contributions
                  .filter(contribution => contribution.category !== 'skill-perception')
                  .map((contribution, contributionIndex) => (
                    <div key={contributionIndex} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      color: '#9ca8b4',
                      fontSize: 10,
                    }}>
                      <span>{contribution.label} <span style={{ color: '#626d78' }}>({contribution.category})</span></span>
                      <span style={{ color: contribution.value > 0 ? '#86efac' : contribution.value < 0 ? '#fca5a5' : '#8b96a2' }}>
                        {formatSigned(contribution.value)}
                      </span>
                    </div>
                  ))}
              </div>
            </details>
          ))}
        </div>
      </Section>

      <Section title="Spiel- und Betting-Kontext">
        <MetricGrid entries={[
          ['Pot', formatChips(metrics.totalPot, currency)],
          ['Zu callen', formatChips(metrics.callAmount, currency)],
          ['Pot Odds', formatPercent(metrics.potOdds)],
          ['Bet / Pot', formatNumber(metrics.toCallPotRatio)],
          ['Eff. Stack', `${formatChips(metrics.effectiveStack, currency)} · ${formatNumber(metrics.effectiveStackBb)} BB`],
          ['SPR', formatNumber(metrics.spr)],
          ['Commitment', formatPercent(metrics.callCommitment)],
          ['Raise-Grenzen', `${formatChips(metrics.minRaiseTo, currency)} – ${formatChips(metrics.maxRaiseTo, currency)}`],
          ['Tischgröße', `${context.position.tableSize} Spieler`],
          ['Action History', `${context.actionHistory.length} Events`],
        ]} />
        <div style={{ marginTop: 7, color: '#93a0ac', fontSize: 10 }}>
          Legal: {formatLegalActions(debug, currency)}
        </div>
      </Section>

      <Section title="Hand- und Boardbewertung">
        <MetricGrid entries={[
          ['Variante', evaluation.variantId],
          ['Kategorie', evaluation.handAssessment.category],
          ['Board', evaluation.boardTexture],
          ['Relative Stärke', formatNumber(evaluation.handAssessment.relativeStrength)],
          ['Showdown Value', formatNumber(evaluation.handAssessment.showdownValue)],
          ['Verwundbarkeit', formatNumber(evaluation.handAssessment.vulnerability)],
          ['Draw-Qualität', formatNumber(evaluation.handAssessment.drawQuality)],
          ['Clean Outs', formatNumber(evaluation.handAssessment.cleanOuts)],
          ['Blocker', formatNumber(evaluation.handAssessment.blockerValue)],
          ['Draws', evaluation.handAssessment.drawTypes.join(', ') || 'keine'],
        ]} />
      </Section>

      <Section title="Bot-Zustand">
        <MetricGrid entries={[
          ['Archetyp', profile.archetype],
          ['Skill', formatNumber(profile.skill.level)],
          ['Beobachtung', formatNumber(profile.skill.observation)],
          ['Preflop-Looseness', formatNumber(profile.personality.preflopLooseness)],
          ['Aggression', formatNumber(profile.personality.aggression)],
          ['Bluff-Frequenz', formatNumber(profile.personality.bluffFrequency)],
          ['Risikotoleranz', formatNumber(profile.personality.riskTolerance)],
          ['Tilt', formatNumber(profile.mentalState.tilt)],
          ['Confidence', formatNumber(profile.mentalState.confidence)],
          ['Patience', formatNumber(profile.mentalState.patience)],
          ['Momentum', formatNumber(profile.mentalState.momentum)],
        ]} />
        <div style={{ marginTop: 7, color: '#93a0ac', fontSize: 10 }}>
          Reads: {profile.reads.length === 0
            ? 'noch keine belastbaren Beobachtungen'
            : profile.reads.map(read => `${read.playerId}: VPIP ${formatNumber(read.vpip)}, Agg ${formatNumber(read.aggression)} (${read.handsSampled} Hände)`).join(' · ')}
        </div>
      </Section>

      <Section title="Wahrnehmungsfehler">
        {decision.perceptionErrors.length === 0 ? (
          <div style={{ color: '#93a0ac', fontSize: 10 }}>Keine Abweichung in dieser Entscheidung.</div>
        ) : decision.perceptionErrors.map((error, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: index ? 4 : 0, fontSize: 10 }}>
            <span style={{ color: '#cbd5df' }}>{error.label}</span>
            <span style={{ color: '#c4b5fd', textAlign: 'right' }}>
              {formatDebugValue(error.actual)} → {formatDebugValue(error.perceived)}
            </span>
          </div>
        ))}
      </Section>

      <Section title="Denkzeit und Komplexität">
        <MetricGrid entries={[
          ['Komplexität', `${formatNumber(complexity.score)} / 100`],
          ['Utility-Abstand', complexity.utilityGap == null ? '–' : formatNumber(complexity.utilityGap)],
          ['Ziel-Reaktion', `${Math.round(timing.targetReactionMs)} ms`],
          ['Rechenzeit', `${formatNumber(timing.computationMs)} ms`],
          ['Künstliche Pause', `${Math.round(timing.remainingDelayMs)} ms`],
        ]} />
        {complexity.factors.length > 0 && (
          <div style={{ marginTop: 7, display: 'grid', gap: 3 }}>
            {complexity.factors.map((factor, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', color: '#93a0ac', fontSize: 10 }}>
                <span>{factor.label}</span><span>+{formatNumber(factor.value)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: 9, borderRadius: 8, border: `1px solid ${borderColor}`, background: panelColor }}>
      <div style={{ marginBottom: 7, color: '#7dd3fc', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7 }}>
        {title}
      </div>
      {children}
    </section>
  )
}

function MetricGrid({ entries }: { entries: Array<[string, string]> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '5px 12px' }}>
      {entries.map(([label, value]) => (
        <div key={label} style={{ minWidth: 0 }}>
          <div style={{ color: '#697581', fontSize: 9 }}>{label}</div>
          <div style={{ color: '#d3dce5', fontSize: 10, overflowWrap: 'anywhere' }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

function findChosenIndex(debug: BotDebugDecision): number {
  const { action, chosenUtility, allActions } = debug.decision
  const compatible = allActions.findIndex(candidate =>
    Math.abs(candidate.utility - chosenUtility) < 0.000_001
    && (candidate.action.type === action.type
      || (isAggressive(candidate.action) && isAggressive(action))),
  )
  return compatible >= 0
    ? compatible
    : allActions.findIndex(candidate => Math.abs(candidate.utility - chosenUtility) < 0.000_001)
}

function isAggressive(action: PlayerAction): boolean {
  return action.type === 'raise' || action.type === 'all-in'
}

function formatAction(action: PlayerAction, debug: BotDebugDecision, currency: DisplayCurrency): string {
  if (action.type === 'raise') {
    const verb = debug.context.publicState.currentBet > 0 ? 'Raise auf' : 'Bet'
    return `${verb} ${formatChips(action.amount, currency)}`
  }
  if (action.type === 'all-in') {
    const amount = debug.context.bettingContext.legalActions.allInAmount
    return amount == null ? 'All-in' : `All-in ${formatChips(amount, currency)}`
  }
  if (action.type === 'call') return `Call ${formatChips(debug.metrics.callAmount, currency)}`
  if (action.type === 'check') return 'Check'
  return 'Fold'
}

function formatLegalActions(debug: BotDebugDecision, currency: DisplayCurrency): string {
  const legal = debug.context.bettingContext.legalActions
  const actions: string[] = []
  if (legal.fold) actions.push('Fold')
  if (legal.check) actions.push('Check')
  if (legal.callAmount != null) actions.push(`Call ${formatChips(legal.callAmount, currency)}`)
  if (legal.raise) actions.push(`Raise ${formatChips(legal.raise.minAmount, currency)}–${formatChips(legal.raise.maxAmount, currency)}`)
  if (legal.allInAmount != null) actions.push(`All-in ${formatChips(legal.allInAmount, currency)}`)
  return actions.join(' · ') || 'keine'
}

function formatCards(cards: readonly Card[]): string {
  return cards.map(card => `${card.rank}${suitSymbol(card.suit)}`).join(' ')
}

function suitSymbol(suit: Card['suit']): string {
  return { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' }[suit]
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '–'
  return Number(value.toFixed(2)).toLocaleString('de-DE', { maximumFractionDigits: 2 })
}

function formatPercent(value: number): string {
  return `${formatNumber(value * 100)}%`
}

function formatSigned(value: number): string {
  if (Math.abs(value) < 0.000_001) return '0'
  return `${value > 0 ? '+' : ''}${formatNumber(value)}`
}

function formatDebugValue(value: number | string[]): string {
  return Array.isArray(value) ? value.join(', ') || 'keine' : formatNumber(value)
}

function utilityColor(utility: number): string {
  if (utility >= 70) return '#86efac'
  if (utility >= 45) return '#fde68a'
  return '#fca5a5'
}
