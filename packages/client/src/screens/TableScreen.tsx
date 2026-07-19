import { Fragment } from 'react'
import type { Card, HandResult, Player, PlayerAction, PublicGameState, TableOptions } from '@cpc/shared'
import { PokerTable, TablePot, CommunityCards, BetStack, TablePositionButtons } from '../components/PokerTable'
import { PlayerSeat } from '../components/PlayerSeat'
import { ActionButtons } from '../components/ActionButtons'
import { calculateChipUnit, formatChips } from '../utils/format'
import { getTableButtonAssignments, rotatePlayersForTable } from '../utils/positions'
import type { PlayerActionLabel } from '../action-display'

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

function HandResultOverlay({ results, players }: { results: HandResult[]; players: Player[] }) {
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
            {p?.name} wins {formatChips(r.amount)} {r.handName && `(${r.handName})`}
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
  playerActionLabels,
  showdownCards,
  raiseAmount,
  setRaiseAmount,
  onAction,
  onBack,
  options,
}: {
  gameState: Readonly<PublicGameState> | null
  myCards: [Card, Card] | null
  lastResults: HandResult[] | null
  isMyTurn: boolean
  playerActionLabels: Readonly<Record<string, PlayerActionLabel>>
  showdownCards: Readonly<Record<string, [Card, Card]>>
  raiseAmount: number
  setRaiseAmount: (n: number) => void
  onAction: (a: PlayerAction) => void
  onBack: () => void
  options: TableOptions
}) {
  const players = gameState?.players ?? []
  const heroId = 'hero'
  const orderedPlayers = rotatePlayersForTable(players, heroId)
  const tableButtonAssignments = gameState ? getTableButtonAssignments(gameState) : {}
  const phase = gameState?.phase ?? 'waiting'
  const pot = gameState?.pot ?? 0
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
          padding: 50px 20px 130px;
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
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 2, letterSpacing: 0.3, color: '#f3f4f6' }}>CPC-Offline</div>
          <div style={{ color: '#8f98a4', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
            NLHE · Blinds {options.smallBlind}/{options.bigBlind} · {players.length} Spieler
          </div>
        </div>
        <button onClick={onBack} style={actionButtonStyle('#30343c', false)}>Zurück zum Setup</button>
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
                  <TablePot pot={pot} sidePots={gameState?.sidePots} />
                  <CommunityCards cards={community} phase={phase} />
                  <HandResultOverlay results={lastResults ?? []} players={players} />
                  {orderedPlayers.map((player: Player, index: number) => (
                    <Fragment key={player.id}>
                      <BetStack amount={player.roundBet} seatIndex={index} seatCount={orderedPlayers.length} />
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
                        actionLabel={playerActionLabels[player.id]}
                        revealedCards={showdownCards[player.id]}
                        myCards={player.id === heroId ? myCards : null}
                        showCards={!!(
                          showdownCards[player.id]
                          || (inActiveHand && player.status !== 'folded' && player.status !== 'waiting')
                        )}
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
          />
        </div>
      </div>
    </div>
  )
}
