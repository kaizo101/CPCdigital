import { Fragment, useEffect, useState } from 'react'
import type { Card, HandResult, Player, PlayerAction, PublicGameState, TableOptions } from '@cpc/shared'
import { createRoot } from 'react-dom/client'
import { SessionStats } from '../components/SessionStats'
import { PokerTable, TablePot, CommunityCards, BetStack, TablePositionButtons } from '../components/PokerTable'
import { PlayerSeat } from '../components/PlayerSeat'
import { ActionButtons } from '../components/ActionButtons'
import { calculateChipUnit, formatChips, type DisplayCurrency } from '../utils/format'
import { getTableButtonAssignments, rotatePlayersForTable } from '../utils/positions'
import type { PlayerActionLabel } from '../action-display'
import type { BotDebugDecision } from '../bot-debug'
import { BotDebugInspector } from '../components/BotDebugInspector'
import { HandReplayer } from '../components/HandReplayer'
import type { HandReplay } from '../session/hand-replay'
import { APP_VERSION } from '../app-version'

const actionButtonStyle = (bg: string, disabled = false): React.CSSProperties => ({
  padding: '10px 18px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.18)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  background: disabled ? '#4a5568' : `linear-gradient(180deg, ${bg} 0%, rgba(25,25,25,0.98) 100%)`,
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  boxShadow: disabled ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 18px rgba(0,0,0,0.22)',
  opacity: disabled ? 0.55 : 1,
})

function HandResultOverlay({ results, players, currency }: { results: HandResult[]; players: Player[]; currency: DisplayCurrency }) {
  if (!results || results.length === 0) return null

  const grouped = results
    .filter(r => r.amount > 0)
    .reduce((acc, r) => {
      const existing = acc.find(g => g.playerId === r.playerId)
      if (existing) {
        existing.amount += r.amount
        if (!existing.handName && r.handName) existing.handName = r.handName
      } else {
        acc.push({ ...r })
      }
      return acc
    }, [] as HandResult[])

  return (
    <div style={{
      position: 'absolute', left: '50%', top: '30%', transform: 'translate(-50%, -50%)',
      background: 'rgba(0,0,0,0.85)', padding: '12px 20px', borderRadius: 8, zIndex: 50,
      border: '2px solid #f0c040',
    }}>
      <div style={{ color: '#f0c040', fontWeight: 'bold', marginBottom: 4 }}>Hand Complete</div>
      {grouped.map((r, i) => {
        const p = players.find(pl => pl.id === r.playerId)
        return (
          <div key={i} style={{ color: '#fff', fontSize: 14 }}>
            {p?.name === 'You' ? 'You win' : `${p?.name} wins`} {formatChips(r.amount, currency)} {r.handName && `(${r.handName})`}
          </div>
        )
      })}
    </div>
  )
}

export function TableScreen({
  gameState,
  myCards,
  lastResults,
  isMyTurn,
  playerAvatarKeys,
  playerActionLabels,
  showdownCards,
  botDebugDecisions,
  pendingRebuyPlayerIds,
  raiseAmount,
  setRaiseAmount,
  onAction,
  onBack,
  options,
  currency,
  onRebuy,
  onExportDebugRecord,
  handReplays,
  sessionStats,
  playerNames,
  onExportSessionLog,
}: {
  gameState: Readonly<PublicGameState> | null
  myCards: Card[] | null
  lastResults: HandResult[] | null
  isMyTurn: boolean
  playerAvatarKeys: Readonly<Record<string, string>>
  playerActionLabels: Readonly<Record<string, PlayerActionLabel>>
  showdownCards: Readonly<Record<string, Card[]>>
  botDebugDecisions: readonly BotDebugDecision[]
  pendingRebuyPlayerIds: readonly string[]
  raiseAmount: number
  setRaiseAmount: (n: number) => void
  onAction: (a: PlayerAction) => void
  onBack: () => void
  options: TableOptions
  currency: DisplayCurrency
  onRebuy: (playerId: string) => void
  onExportDebugRecord: () => void
  handReplays: readonly HandReplay[]
  sessionStats: any
  playerNames: Map<string, string>
  onExportSessionLog: () => void
}) {
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault()
        setShowDebug(d => !d)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const players = gameState?.players ?? []
  const heroId = 'hero'
  const orderedPlayers = rotatePlayersForTable(players, heroId)
  const tableButtonAssignments = gameState ? getTableButtonAssignments(gameState) : {}
  const phase = gameState?.phase ?? 'waiting'
  const pot = gameState?.pot ?? 0
  const isHandOver = lastResults && lastResults.length > 0
  const displayPot = isHandOver ? 0 : pot
  const wonByPlayer: Record<string, number> = {}
  if (isHandOver) {
    for (const r of lastResults!) {
      if (r.amount > 0) wonByPlayer[r.playerId] = (wonByPlayer[r.playerId] ?? 0) + r.amount
    }
  }
  const community = gameState?.communityCards ?? []
  const inActiveHand = gameState != null && gameState.phase !== 'waiting'
  const bettingContext = gameState?.bettingContext
  const legalActions = bettingContext?.legalActions

  const toCall = legalActions?.callAmount ?? 0
  const canCheck = legalActions?.check ?? false
  const minRaise = bettingContext?.minRaiseTo ?? 0
  const maxRaise = bettingContext?.maxRaiseTo ?? 0
  const canFold = legalActions?.fold ?? false
  const canRaise = !!(
    legalActions?.raise
    || (legalActions?.allInAmount != null && legalActions.allInAmount > (gameState?.currentBet ?? 0))
  )
  const raiseStepSize = calculateChipUnit(
    gameState?.smallBlind ?? options.smallBlind,
    gameState?.bigBlind ?? options.bigBlind,
  )
  const canAct = !!(isMyTurn && inActiveHand && bettingContext?.playerId === heroId)

  return (
    <div style={{
      maxWidth: '100%',
      width: '100%',
      margin: 0,
      padding: '12px 16px 16px',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'monospace',
      color: '#e5e7eb',
      background: 'radial-gradient(circle at 50% 0%, #2a2d34 0%, #17191d 35%, #0a0b0d 100%)',
      height: '100vh',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      <style>{`
        html, body, #root {
          margin: 0;
          min-height: 100%;
          width: 100%;
          background: #0a0b0d;
          overflow-x: hidden;
        }
        .game-layout {
          position: relative;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
        .table-main {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 140px 20px 210px;
          box-sizing: border-box;
        }
        .table-screen {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 0;
        }
        .table-stage {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 14px;
          box-sizing: border-box;
        }
        .table-shell {
          width: min(100%, calc((100vh - 320px) * 2.38));
        }
        .bottom-dock {
          position: absolute;
          bottom: 0;
          right: 0;
          display: flex;
          justify-content: flex-end;
          align-items: flex-end;
          padding: 0 16px 16px;
          z-index: 35;
        }
        .debug-dock {
          position: absolute;
          left: 0;
          bottom: 0;
          z-index: 45;
          padding: 0 0 16px 16px;
        }
        @media (max-width: 860px) {
          .game-layout {
            height: auto;
            overflow: auto;
            display: flex;
            flex-direction: column;
          }
          .table-main,
          .table-screen {
            display: flex;
            flex-direction: column;
            gap: 10px;
            height: auto;
            padding: 0;
          }
          .table-stage {
            position: static;
            min-height: auto;
            padding: 0;
          }
          .table-shell {
            width: 100%;
            min-width: 0;
          }
          .bottom-dock {
            display: flex;
            flex-direction: column;
            padding: 0;
          }
          .debug-dock {
            position: fixed;
            padding: 0 0 10px 10px;
          }
        }
        @media (max-height: 450px) {
          html, body, #root {
            overflow: hidden;
            height: 100dvh;
          }
          .game-layout {
            overflow: hidden;
          }
          .table-main {
            padding: 8px 6px 80px;
          }
          .table-stage {
            padding: 0 2px;
          }
          .bottom-dock {
            padding: 0 4px 2px;
            gap: 4px;
          }
          .bottom-dock > div {
            gap: 4px !important;
            padding: 4px 6px !important;
            margin-top: 4px !important;
          }
          .bottom-dock > div > div:nth-child(2) {
            display: none;
          }
          .bottom-dock button {
            min-height: 44px !important;
            font-size: 14px !important;
            padding: 6px 8px !important;
          }
          .bottom-dock input[type="text"] {
            width: 60px !important;
            font-size: 11px !important;
          }
        }
      `}</style>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        marginBottom: 10,
        flexWrap: 'wrap',
        background: 'linear-gradient(180deg, rgba(22,24,28,0.92) 0%, rgba(10,11,13,0.92) 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '10px 12px',
      }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 2, letterSpacing: 0.3, color: '#f3f4f6' }}>CPCdigital</div>
          <div style={{ color: '#8f98a4', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
            v{APP_VERSION} · {gameState?.variantId === 'omaha-high' ? 'PLO' : 'NLHE'} · Blinds {options.smallBlind}/{options.bigBlind} · {players.length} Spieler
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <SessionStats
            stats={sessionStats}
            playerNames={playerNames}
            heroId="hero"
            onExport={onExportSessionLog}
            showDebug={showDebug}
          />
          {(() => {
            const hasReplay = handReplays.length > 0
            return (
              <button
                onClick={() => {
                  if (!hasReplay) return
                  openReplayWindow(handReplays, handReplays.length - 1, currency, showDebug)
                }}
                disabled={!hasReplay}
                title={hasReplay ? 'Letzte Hand wiederholen' : 'Keine Hand verfügbar'}
                style={{
                  padding: '10px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)',
                  background: hasReplay
                    ? 'linear-gradient(180deg, #30343c 0%, rgba(25,25,25,0.98) 100%)'
                    : '#1f2228',
                  color: hasReplay ? '#9ca3af' : '#4b5563', cursor: hasReplay ? 'pointer' : 'not-allowed',
                  fontFamily: 'monospace', fontSize: 18, lineHeight: 1,
                  boxShadow: hasReplay ? 'inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 18px rgba(0,0,0,0.22)' : 'none',
                  opacity: hasReplay ? 1 : 0.5,
                }}
              >
                ↻
              </button>
            )
          })()}
          <button onClick={onBack} style={actionButtonStyle('#30343c', false)}>Zurück zum Setup</button>
        </div>
      </div>

      <div className="game-layout">
        <div className="table-main">
          <div className="table-screen">
            <div className="table-stage">
              <div className="table-shell" style={{
                background: 'radial-gradient(circle at 50% 0%, rgba(44,49,58,0.62) 0%, rgba(17,18,21,0.62) 56%, rgba(10,10,12,0.2) 100%)',
                borderRadius: 24,
                padding: '8px 10px 0',
              }}>
                <PokerTable>
                  <TablePot pot={displayPot} sidePots={gameState?.sidePots} currency={currency} />
                  <CommunityCards cards={community} phase={phase} />
                  <HandResultOverlay results={lastResults ?? []} players={players} currency={currency} />
                  {orderedPlayers.map((player: Player, index: number) => (
                    <Fragment key={player.id}>
                      <BetStack amount={player.roundBet + (wonByPlayer[player.id] ?? 0)} seatIndex={index} seatCount={orderedPlayers.length} currency={currency} />
                      <TablePositionButtons
                        labels={tableButtonAssignments[player.id] ?? []}
                        seatIndex={index}
                        seatCount={orderedPlayers.length}
                        isHero={player.id === heroId}
                      />
                      <PlayerSeat
                        player={player}
                        seatIndex={index}
                        seatCount={orderedPlayers.length}
                        isMe={player.id === heroId}
                        isCurrent={gameState?.currentPlayerId === player.id}
                        avatarKey={playerAvatarKeys[player.id]}
                        actionLabel={playerActionLabels[player.id]}
                        revealedCards={showdownCards[player.id]}
                        myCards={player.id === heroId ? myCards : null}
                        holeCardCount={gameState?.variantId === 'omaha-high' ? 4 : 2}
                        showCards={!!(
                          showdownCards[player.id]
                          || (inActiveHand && player.status !== 'folded' && player.status !== 'waiting')
                        )}
                        currency={currency}
                        startingChips={options.startingChips}
                        rebuyPending={pendingRebuyPlayerIds.includes(player.id)}
                        onRebuy={() => onRebuy(player.id)}
                      />
                    </Fragment>
                  ))}
                </PokerTable>
              </div>
            </div>
          </div>
        </div>

        <div className="bottom-dock">
          <ActionButtons
            isMyTurn={!!isMyTurn}
            canAct={canAct}
            canFold={canFold}
            toCall={toCall}
            currentBet={gameState?.currentBet ?? 0}
            canCheck={canCheck}
            canRaise={canRaise}
            minRaise={minRaise}
            maxRaise={maxRaise}
            potRaiseTo={bettingContext?.potRaiseTo ?? minRaise}
            stepSize={raiseStepSize}
            bigBlind={gameState?.bigBlind ?? options.bigBlind}
            raiseAmount={raiseAmount}
            setRaiseAmount={setRaiseAmount}
            onAction={onAction}
            currency={currency}
          />
        </div>
        {showDebug && (
        <div className="debug-dock">
          <BotDebugInspector
            decisions={botDebugDecisions}
            currency={currency}
            onExportDebugRecord={onExportDebugRecord}
          />
        </div>
        )}
      </div>
    </div>
  )
}

function openReplayWindow(replays: readonly HandReplay[], startIndex: number, currency: DisplayCurrency, debugMode: boolean): void {
  const allReplays = [...replays].sort((a, b) => a.handNumber - b.handNumber)

  const sessionKey = 'replay-session'
  localStorage.setItem(sessionKey, JSON.stringify(allReplays))
  localStorage.setItem('replay-debug', debugMode ? '1' : '0')

  // Try Electron IPC first
  const api = (window as any).electronAPI
  if (api?.openReplay) {
    const latest = allReplays[startIndex < allReplays.length ? startIndex : allReplays.length - 1]
    api.openReplay(latest.handNumber, latest).catch(() => {
      openOverlay(allReplays, startIndex, currency, debugMode)
    })
    return
  }

  // Browser fallback
  const latest = allReplays[startIndex < allReplays.length ? startIndex : allReplays.length - 1]
  const base = window.location.href.split('#')[0]
  const w = window.open(`${base}#replay/${latest.handNumber}`, `replay-${latest.handNumber}`, 'width=1100,height=800')
  if (!w) {
    openOverlay(allReplays, startIndex, currency, debugMode)
  }
}

function openOverlay(replays: readonly HandReplay[], startIndex: number, currency: DisplayCurrency, debugMode: boolean): void {
  const container = document.createElement('div')
  container.id = 'replay-overlay'
  document.body.appendChild(container)
  const root = createRoot(container)
  root.render(
    <HandReplayer replays={[...replays]} startIndex={startIndex} currency={currency} debugMode={debugMode} onClose={() => { root.unmount(); container.remove() }} />
  )
}
