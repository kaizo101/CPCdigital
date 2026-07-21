import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import type { Card, Player } from '@cpc/shared'
import type { HandReplay, ReplayFrame } from '../session/hand-replay'
import { formatHandHistory } from '../session/hand-replay'
import { PokerTable, TablePot, CommunityCards, BetStack, TablePositionButtons } from './PokerTable'
import { PlayerSeat } from './PlayerSeat'
import { formatChips, type DisplayCurrency } from '../utils/format'
import { rotatePlayersForTable } from '../utils/positions'
import type { TableButtonLabel } from '../utils/positions'

interface Props {
  replays: HandReplay[]
  startIndex?: number
  currency: DisplayCurrency
  debugMode?: boolean
  onClose: () => void
}

function formatChipSimple(amount: number): string {
  return formatChips(amount, 'EUR')
}

export function HandReplayer({ replays, startIndex, currency, debugMode, onClose }: Props) {
  const [handIdx, setHandIdx] = useState(startIndex ?? replays.length - 1)
  const [step, setStep] = useState(0)
  const [autoPlay, setAutoPlay] = useState(false)
  const [showAllCards, setShowAllCards] = useState(false)
  const [minPotBb, setMinPotBb] = useState(0)
  const replay = replays[Math.max(0, Math.min(handIdx, replays.length - 1))]
  if (!replay) return null

  const bb = replay.blinds.big > 0 ? replay.blinds.big : 1
  const filteredReplays = minPotBb > 0
    ? replays.filter(r => (r.totalPot / bb) >= minPotBb)
    : replays

  // Reset step when hand changes
  useEffect(() => { setStep(0); setAutoPlay(false) }, [handIdx])
  const autoPlayRef = useRef(autoPlay)
  autoPlayRef.current = autoPlay
  const [showHistory, setShowHistory] = useState(false)

  const frames = replay.frames
  const currentFrame = frames[step]
  const maxStep = frames.length - 1

  const boardCards: Card[] = []
  const playerStatus: Record<string, 'active' | 'folded' | 'all-in'> = {}
  const playerBets: Record<string, number> = {}
  const playerChips: Record<string, number> = {}
  let wonBy: string | null = null
  let wonAmount = 0
  const revealedCards: Record<string, [Card, Card]> = {}

  for (const p of replay.players) {
    playerStatus[p.id] = 'active'
    playerBets[p.id] = 0
    playerChips[p.id] = p.chips
  }

  for (let i = 0; i <= step; i++) {
    const f = frames[i]
    if (f.type === 'community') {
      boardCards.push(...f.communityCards)
      // Betting round ended — clear round bets
      for (const id of Object.keys(playerBets)) playerBets[id] = 0
    }
    if (f.type === 'action') {
      if (f.action === 'fold') playerStatus[f.actorId!] = 'folded'
      if (f.action === 'all-in') playerStatus[f.actorId!] = 'all-in'
      if (f.amount && f.actorId) {
        playerBets[f.actorId] = (playerBets[f.actorId] ?? 0) + f.amount
      }
    }
    if (f.type === 'showdown' && f.actorId && f.actorCards) {
      revealedCards[f.actorId] = f.actorCards
    }
    if (f.type === 'result' && f.actorId && f.amount) {
      wonBy = f.actorId
      wonAmount = f.amount
    }
  }

  const pot = wonBy ? 0 : (currentFrame?.pot ?? replay.totalPot)
  const currentActorId = currentFrame?.type === 'action' ? currentFrame.actorId : null
  const phase = currentFrame?.phase ?? 'preflop'
  const isActive = phase !== 'waiting' && phase !== 'showdown' && !wonBy

  const players: Player[] = replay.players.map(p => ({
    id: p.id,
    name: p.name,
    role: 'player' as const,
    chips: playerChips[p.id] ?? p.chips,
    seatIndex: p.seat,
    status: playerStatus[p.id],
    isConnected: true,
    isSittingOut: false,
    roundBet: playerBets[p.id] ?? 0,
  }))

  const orderedPlayers = rotatePlayersForTable(players, 'hero')
  const buttonAssignments = getTableButtonAssignmentsForReplay(players, replay.dealerId)
  const startingChips = replay.players[0]?.chips ?? 2000

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setStep(s => Math.min(s + 1, maxStep)) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setStep(s => Math.max(s - 1, 0)) }
    if (e.key === 'Escape') onClose()
  }, [maxStep, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (!autoPlay) return
    if (step >= maxStep) { setAutoPlay(false); return }
    const delay = currentFrame?.type === 'community' ? 800 : 500
    const timer = setTimeout(() => setStep(s => s + 1), delay)
    return () => clearTimeout(timer)
  }, [autoPlay, step, maxStep, currentFrame?.type])

  function actionLabel(frame: ReplayFrame): string {
    if (frame.type === 'community') return `*** ${frame.phase.toUpperCase()} ***`
    if (frame.type === 'showdown') return `${frame.actorName ?? '?'} zeigt Karten`
    if (frame.type === 'action' && frame.action) {
      const name = frame.actorName ?? '?'
      switch (frame.action) {
        case 'fold': return `${name} foldet`
        case 'check': return `${name} checkt`
        case 'call': return `${name} callt ${formatChipSimple(frame.amount ?? 0)}`
        case 'raise': return `${name} raist ${formatChipSimple(frame.amount ?? 0)}`
        case 'all-in': return `${name} all-in ${formatChipSimple(frame.amount ?? 0)}`
        default: return `${name} ${frame.action}`
      }
    }
    return ''
  }

  const [showExportMenu, setShowExportMenu] = useState(false)

  function exportText(text: string, filename: string): void {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function exportCurrentHand(withDecisions: boolean): void {
    let text = formatHandHistory(replay)
    if (withDecisions && replay.botDecisions?.length) {
      text += '\n\n=== BOT DECISIONS ===\n'
      for (const d of replay.botDecisions) {
        text += `\n${d.playerId} (${d.handCategory}): ${d.action}\n`
        text += `  Scores: ${d.scores.map(s => `${s.action}:${s.utility.toFixed(0)}`).join(' | ')}\n`
        text += `  Beiträge: ${d.topContributions.join(', ')}\n`
      }
    }
    exportText(text, `hand-${replay.handNumber}.txt`)
  }

  function exportSession(withDecisions: boolean): void {
    const all = replays.sort((a, b) => a.handNumber - b.handNumber)
    let text = `CPCdigital Session — ${all.length} hands\n${'='.repeat(50)}\n\n`
    for (const r of all) {
      text += formatHandHistory(r)
      if (withDecisions && r.botDecisions?.length) {
        text += '\n--- Bot Decisions ---\n'
        for (const d of r.botDecisions) {
          text += `${d.playerId} (${d.handCategory}): ${d.action} | ${d.topContributions.slice(0, 3).join(' | ')}\n`
        }
      }
      text += '\n'
    }
    exportText(text, `session-hands-${replays.length}.txt`)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'monospace', color: '#e5e7eb',
      background: 'radial-gradient(circle at 50% 0%, #2a2d34 0%, #17191d 35%, #0a0b0d 100%)',
    }}>
      <style>{`
        .replay-table-main {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 50px 20px 110px;
          box-sizing: border-box;
        }
        .replay-table-stage {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .replay-table-shell {
          width: min(100%, calc((100vh - 260px) * 2.38));
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.4)', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {filteredReplays.length > 1 && (
            <>
              <button onClick={() => { const ci = filteredReplays.findIndex(r => r.handNumber === replay.handNumber); if (ci > 0) setHandIdx(replays.indexOf(filteredReplays[ci - 1])) }} disabled={filteredReplays[0]?.handNumber === replay.handNumber} style={navHandBtnStyle}>◀</button>
              <span style={{ fontSize: 12, color: '#9ca3af', minWidth: 60, textAlign: 'center' }}>
                {filteredReplays.findIndex(r => r.handNumber === replay.handNumber) + 1}/{filteredReplays.length}
              </span>
              <button onClick={() => { const ci = filteredReplays.findIndex(r => r.handNumber === replay.handNumber); if (ci < filteredReplays.length - 1) setHandIdx(replays.indexOf(filteredReplays[ci + 1])) }} disabled={filteredReplays[filteredReplays.length - 1]?.handNumber === replay.handNumber} style={navHandBtnStyle}>▶</button>
            </>
          )}
          <span style={{ fontSize: 15, fontWeight: 700 }}>Hand #{replay.handNumber}</span>
          <span style={{ fontSize: 11, color: '#6b7280' }}>
            {replay.variant} · {formatChipSimple(replay.blinds.small)}/{formatChipSimple(replay.blinds.big)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12 }}>
            <span style={{ fontSize: 10, color: '#6b7280' }}>Pot ≥</span>
            <input
              type="number"
              value={minPotBb || ''}
              placeholder="BB"
              onChange={e => {
                const v = parseInt(e.target.value) || 0
                setMinPotBb(Math.max(0, v))
                if (v > 0) {
                  const first = replays.find(r => (r.totalPot / bb) >= v)
                  if (first) setHandIdx(replays.indexOf(first))
                } else {
                  setHandIdx(replays.length - 1)
                }
              }}
              style={{
                width: 40, padding: '2px 4px', borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.15)', background: '#111318',
                color: '#e5e7eb', fontSize: 11, fontFamily: 'monospace',
              }}
            />
            <span style={{ fontSize: 10, color: '#6b7280' }}>BB</span>
            {minPotBb > 0 && <span style={{ fontSize: 10, color: '#6b7280' }}>({filteredReplays.length} Hände)</span>}
          </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowExportMenu(m => !m)} style={smallBtnStyle}>Export ▾</button>
            {showExportMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 50,
                background: '#1a1d23', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6, padding: 4, minWidth: 220, marginTop: 4,
              }}>
                <button onClick={() => { exportCurrentHand(false); setShowExportMenu(false) }} style={menuItemStyle}>Diese Hand (Text)</button>
                {debugMode && <button onClick={() => { exportCurrentHand(true); setShowExportMenu(false) }} style={menuItemStyle}>Diese Hand (Text + Entscheidungen)</button>}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '2px 0' }} />
                <button onClick={() => { exportSession(false); setShowExportMenu(false) }} style={menuItemStyle}>Ganze Session (Text)</button>
                {debugMode && <button onClick={() => { exportSession(true); setShowExportMenu(false) }} style={menuItemStyle}>Ganze Session (Text + Entscheidungen)</button>}
              </div>
            )}
          </div>
          <button onClick={() => setShowHistory(h => !h)} style={smallBtnStyle}>
            {showHistory ? 'Tisch' : 'History'}
          </button>
          {debugMode && (
            <button
              onClick={() => setShowAllCards(c => !c)}
              style={{ ...smallBtnStyle, background: showAllCards ? 'rgba(251,191,36,0.15)' : undefined, color: showAllCards ? '#fbbf24' : undefined }}
            >
              {showAllCards ? 'Cards off' : 'Cards on'}
            </button>
          )}
          <button onClick={onClose} style={{...smallBtnStyle, fontSize: 16}}>✕</button>
        </div>
      </div>

      {/* Body */}
      {showHistory ? (
        <pre style={{
          flex: 1, padding: 20, margin: 0, overflow: 'auto',
          fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap',
          background: '#0a0b0d', color: '#e5e7eb',
          fontFamily: 'monospace', border: 'none',
        }}>
          {formatHandHistory(replay)}
        </pre>
      ) : (
        <div className="replay-table-main">
          <div className="replay-table-stage">
            <div className="replay-table-shell" style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(44,49,58,0.62) 0%, rgba(17,18,21,0.62) 56%, rgba(10,10,12,0.2) 100%)',
              borderRadius: 24, padding: '8px 10px 0',
            }}>
              <PokerTable>
                <TablePot pot={pot} sidePots={[]} currency={currency} />
                <CommunityCards cards={boardCards} phase={phase} />
                {orderedPlayers.map((player, index) => (
                  <Fragment key={player.id}>
                    <BetStack amount={player.roundBet + (player.id === wonBy ? wonAmount : 0)} seatIndex={index} seatCount={orderedPlayers.length} currency={currency} />
                    <TablePositionButtons
                      labels={buttonAssignments[player.id] ?? []}
                      seatIndex={index}
                      seatCount={orderedPlayers.length}
                      isHero={player.id === 'hero'}
                    />
                    <PlayerSeat
                      player={player}
                      seatIndex={index}
                      seatCount={orderedPlayers.length}
                      isMe={player.id === 'hero'}
                      isCurrent={player.id === currentActorId}
                      revealedCards={showAllCards ? (replay.holeCards[player.id] ?? revealedCards[player.id]) : revealedCards[player.id]}
                      myCards={currentFrame?.type === 'action' && currentFrame.actorId === player.id ? currentFrame.actorCards ?? null : null}
                      showCards={showAllCards || !!revealedCards[player.id] || (isActive && player.status !== 'folded')}
                      currency={currency}
                      startingChips={startingChips}
                      rebuyPending={false}
                      onRebuy={() => {}}
                    />
                  </Fragment>
                ))}
              </PokerTable>
            </div>
          </div>
        </div>
      )}

      {/* Footer: Step controls */}
      <div style={{
        padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(0,0,0,0.5)', zIndex: 10,
      }}>
        <button onClick={() => setStep(0)} disabled={step === 0} style={navBtnStyle}>⏮</button>
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={navBtnStyle}>◀</button>
        <span style={{ fontSize: 13, color: '#9ca3af', minWidth: 72, textAlign: 'center' }}>
          {step + 1}/{maxStep + 1}
        </span>
        <button onClick={() => setStep(s => Math.min(maxStep, s + 1))} disabled={step === maxStep} style={navBtnStyle}>▶</button>
        <button onClick={() => setStep(maxStep)} disabled={step === maxStep} style={navBtnStyle}>⏭</button>
        <button
          onClick={() => setAutoPlay(a => !a)}
          style={{
            ...navBtnStyle,
            color: autoPlay ? '#fbbf24' : '#9ca3af',
            borderColor: autoPlay ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.12)',
            fontSize: 14, fontWeight: 700,
          }}
        >
          {autoPlay ? '⏸' : '▶▶'}
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#6b7280', maxWidth: 360, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentFrame ? actionLabel(currentFrame) : ''}
        </span>
      </div>
    </div>
  )
}

function getTableButtonAssignmentsForReplay(players: Player[], dealerId: string): Record<string, TableButtonLabel[]> {
  const dealerPlayer = players.find(p => p.id === dealerId)
  if (!dealerPlayer) return {}
  return { [dealerId]: ['D'] }
}

const smallBtnStyle: React.CSSProperties = {
  padding: '5px 12px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)', color: '#9ca3af', cursor: 'pointer',
  fontFamily: 'monospace', fontSize: 12,
}

const navHandBtnStyle: React.CSSProperties = {
  padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)', color: '#9ca3af', cursor: 'pointer',
  fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5,
}

const navBtnStyle: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)', color: '#e5e7eb', cursor: 'pointer',
  fontFamily: 'monospace', fontSize: 15, minWidth: 38,
}

const menuItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '6px 10px', border: 'none',
  background: 'transparent', color: '#e5e7eb', cursor: 'pointer',
  fontFamily: 'monospace', fontSize: 11, textAlign: 'left',
  borderRadius: 3,
}
