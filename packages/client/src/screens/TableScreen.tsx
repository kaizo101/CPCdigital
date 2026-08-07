import { Fragment, useEffect } from 'react'
import type { Card, HandResult, Player, PlayerAction, PublicGameState, TableOptions } from '@cpc/shared'
import { createRoot } from 'react-dom/client'
import { SessionStats } from '../components/SessionStats'
import { PortraitGuard } from '../components/PortraitGuard'
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
import { useResponsiveLayout } from '../utils/responsive-layout'
import { getAppRuntime, isAndroidRuntime } from '../native-runtime'

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
  archivedHandReplays,
  sessionStats,
  playerNames,
  debugMode,
  setDebugMode,
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
  archivedHandReplays: readonly HandReplay[]
  sessionStats: any
  playerNames: Map<string, string>
  debugMode: boolean
  setDebugMode: (enabled: boolean) => void
  onExportSessionLog: () => void
}) {
  const showDebug = debugMode
  const layout = useResponsiveLayout()
  const runtime = getAppRuntime()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault()
        setDebugMode(!showDebug)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setDebugMode, showDebug])

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
    <div className="table-screen-root" data-layout={layout} data-runtime={runtime} style={{
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
        .table-screen-root {
          min-height: 100dvh;
        }
        .landscape-game {
          display: flex;
          flex: 1;
          min-height: 0;
          flex-direction: column;
        }
        .portrait-guard {
          display: none;
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
          padding: 100px 20px 260px;
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
          width: min(100%, calc((100dvh - 472px) * 2.38));
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
        .table-screen-root[data-layout="phonePortrait"] {
          height: 100dvh !important;
        }
        .table-screen-root[data-layout="phonePortrait"] .landscape-game {
          display: none;
        }
        .table-screen-root[data-layout="phonePortrait"] .portrait-guard {
          display: grid;
          flex: 1;
          min-height: 0;
          place-items: center;
          padding: 24px;
        }
        .compact-toolbar {
          display: none;
        }
        .table-screen-root[data-layout="compactLandscape"] {
          height: 100dvh !important;
          min-height: 0;
          padding: 4px 6px 5px !important;
        }
        .table-screen-root[data-runtime="android"][data-layout="compactLandscape"] {
          height: 100% !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .landscape-game {
          gap: 4px;
        }
        .table-screen-root[data-layout="compactLandscape"] .desktop-toolbar {
          display: none !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .compact-toolbar {
          position: relative;
          z-index: 60;
          height: 34px;
          flex: 0 0 34px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 6px;
          padding: 2px 4px;
          box-sizing: border-box;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          background: linear-gradient(180deg, rgba(22,24,28,0.96) 0%, rgba(10,11,13,0.96) 100%);
        }
        .compact-toolbar-meta {
          grid-column: 2;
          overflow: hidden;
          color: #9ca3af;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.55px;
          text-align: center;
          text-overflow: ellipsis;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .compact-toolbar-actions {
          grid-column: 3;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .compact-toolbar .session-stats[data-compact="true"] {
          position: static !important;
        }
        .compact-toolbar .session-stats[data-compact="true"] .session-stats-summary {
          position: absolute !important;
          inset: 2px 104px 2px 62px !important;
          z-index: 65 !important;
          width: auto !important;
          max-width: none !important;
          min-width: 0;
          justify-content: center;
          flex-wrap: nowrap !important;
          gap: 6px !important;
          overflow: hidden;
          padding: 3px 8px !important;
          box-sizing: border-box;
          border-radius: 6px !important;
          box-shadow: none !important;
        }
        .compact-toolbar button {
          min-width: 29px;
          min-height: 28px;
          padding: 3px 7px !important;
          border-radius: 6px !important;
          font-size: 11px !important;
          line-height: 1 !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .game-layout {
          position: relative;
          display: grid;
          grid-template-rows: minmax(0, 1fr) clamp(56px, 20dvh, 72px);
          gap: 4px;
          min-height: 0;
          overflow: hidden;
        }
        .table-screen-root[data-layout="compactLandscape"] .table-main {
          position: relative;
          min-width: 0;
          min-height: 0;
          padding: 20px 48px 18px;
        }
        .table-screen-root[data-layout="compactLandscape"] .table-screen,
        .table-screen-root[data-layout="compactLandscape"] .table-stage {
          min-width: 0;
          height: 100%;
        }
        .table-screen-root[data-layout="compactLandscape"] .table-stage {
          padding: 0;
        }
        .table-screen-root[data-layout="compactLandscape"] .table-shell {
          height: 100%;
          width: auto;
          max-width: 100%;
          min-width: 0;
          padding: 0 !important;
          aspect-ratio: 3.18 / 1;
          border-radius: 999px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .poker-table {
          width: 100% !important;
          height: 100% !important;
          aspect-ratio: auto !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .bottom-dock {
          position: relative;
          display: flex;
          min-width: 0;
          min-height: 0;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 0;
          border-radius: 8px;
          background: transparent;
          box-sizing: border-box;
        }
        .table-screen-root[data-layout="compactLandscape"] .bottom-dock:empty::after {
          content: "Warte auf Gegner …";
          color: #515862;
          font-size: 8px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat {
          width: 92px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat--dense {
          width: 78px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat-panel {
          min-width: 74px !important;
          min-height: 36px !important;
          padding: 3px 6px !important;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat--with-avatar .player-seat-panel {
          padding-left: 30px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat--dense .player-seat-panel {
          min-width: 64px !important;
          min-height: 32px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat--dense.player-seat--with-avatar .player-seat-panel {
          padding-left: 26px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat-avatar {
          left: -1px !important;
          width: 32px !important;
          height: 32px !important;
          font-size: 10px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat--dense .player-seat-avatar {
          width: 28px !important;
          height: 28px !important;
          font-size: 9px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat-name,
        .table-screen-root[data-layout="compactLandscape"] .player-seat-chips {
          font-size: 9px !important;
          line-height: 1.05;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat--dense .player-seat-name,
        .table-screen-root[data-layout="compactLandscape"] .player-seat--dense .player-seat-chips {
          font-size: 8px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat-status {
          margin-top: 0 !important;
          font-size: 6px !important;
          line-height: 1;
          letter-spacing: 0.35px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat-turn {
          display: none !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat-cards {
          bottom: 28px !important;
          gap: 1px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat--with-avatar .player-seat-cards {
          left: calc(50% + 12px) !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat--dense.player-seat--with-avatar .player-seat-cards {
          left: calc(50% + 10px) !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .playing-card,
        .table-screen-root[data-layout="compactLandscape"] .playing-card-back {
          width: 18px !important;
          height: 26px !important;
          padding: 1px !important;
          border-radius: 2px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .playing-card--large {
          width: 24px !important;
          height: 34px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat--hero .playing-card {
          width: 26px !important;
          height: 36px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .playing-card-rank {
          font-size: 6px !important;
          line-height: 1 !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .playing-card-suit {
          font-size: 9px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .playing-card--large .playing-card-rank {
          font-size: 8px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .playing-card--large .playing-card-suit {
          font-size: 12px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat--hero .playing-card-rank {
          font-size: 8px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat--hero .playing-card-suit {
          font-size: 12px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .playing-card-corner--bottom {
          right: 1px !important;
          bottom: 1px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat-cards[data-card-count="4"] > .player-seat-card {
          margin-left: -7px !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .player-seat-cards[data-card-count="4"] > .player-seat-card:first-child {
          margin-left: 0 !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .community-cards {
          min-height: 34px !important;
          gap: 3px !important;
          padding: 3px 5px !important;
          border-radius: 8px !important;
        }
        .table-screen-root[data-runtime="android"][data-layout="compactLandscape"] .playing-card--large,
        .table-screen-root[data-runtime="android"][data-layout="compactLandscape"] .player-seat--hero .playing-card {
          width: 30px !important;
          height: 42px !important;
          padding: 2px !important;
          border-radius: 3px !important;
        }
        .table-screen-root[data-runtime="android"][data-layout="compactLandscape"] .playing-card--large .playing-card-rank,
        .table-screen-root[data-runtime="android"][data-layout="compactLandscape"] .player-seat--hero .playing-card-rank {
          font-size: 10px !important;
        }
        .table-screen-root[data-runtime="android"][data-layout="compactLandscape"] .playing-card--large .playing-card-suit,
        .table-screen-root[data-runtime="android"][data-layout="compactLandscape"] .player-seat--hero .playing-card-suit {
          font-size: 14px !important;
        }
        .table-screen-root[data-runtime="android"][data-layout="compactLandscape"] .community-cards {
          min-height: 48px !important;
          gap: 4px !important;
          padding: 3px 6px !important;
        }
        .table-screen-root[data-runtime="android"][data-layout="compactLandscape"] .player-seat--hero .player-seat-cards[data-card-count="4"] > .player-seat-card {
          margin-left: -9px !important;
        }
        .table-screen-root[data-runtime="android"][data-layout="compactLandscape"] .player-seat--hero .player-seat-cards[data-card-count="4"] > .player-seat-card:first-child {
          margin-left: 0 !important;
        }
        .table-screen-root[data-runtime="android"][data-layout="compactLandscape"] .player-seat--upper-edge {
          transform: translate(-50%, -50%) translateY(16px) !important;
        }
        .table-screen-root[data-runtime="android"][data-layout="compactLandscape"] .player-seat--upper-edge.player-seat--opposite {
          transform: translate(-50%, -50%) translateY(20px) !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .table-pot {
          transform: translate(-50%, -50%) scale(0.82) !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .bet-stack,
        .table-screen-root[data-layout="compactLandscape"] .table-position-buttons {
          transform: translate(-50%, -50%) scale(0.72) !important;
        }
        .table-screen-root[data-runtime="android"][data-layout="compactLandscape"] .bet-stack--hero {
          transform: translate(-50%, -50%) translateX(64px) scale(0.72) !important;
        }
        .table-screen-root[data-runtime="android"][data-layout="compactLandscape"] .table-position-buttons--hero {
          transform: translate(-50%, -50%) translateX(-64px) scale(0.72) !important;
        }
        .table-screen-root[data-runtime="android"][data-layout="compactLandscape"] .table-position-buttons--opposite {
          transform: translate(-50%, -50%) translateX(64px) scale(0.72) !important;
        }
        .table-screen-root[data-layout="compactLandscape"] .debug-dock {
          display: none;
        }
        @media (orientation: landscape) and (max-height: 320px) and (max-width: 1000px) {
          .table-screen-root[data-layout="compactLandscape"] .landscape-game {
            position: relative;
            gap: 0;
          }
          .table-screen-root[data-layout="compactLandscape"] .compact-toolbar {
            position: absolute;
            inset: 0 0 auto;
            border-color: transparent;
            background: transparent;
          }
          .table-screen-root[data-layout="compactLandscape"] .compact-toolbar-meta {
            display: none;
          }
          .table-screen-root[data-layout="compactLandscape"] .game-layout {
            flex: 1;
            width: 100%;
          }
          .table-screen-root[data-layout="compactLandscape"] .table-main {
            padding: 28px 44px 18px;
          }
        }
        @media (orientation: portrait) and (max-width: 599px) {
          .landscape-game {
            display: none;
          }
          .portrait-guard {
            display: grid;
            flex: 1;
            min-height: 0;
            place-items: center;
            padding: 24px;
          }
        }
        @media (orientation: landscape) and (max-height: 500px) and (max-width: 1000px) {
          html, body, #root {
            overflow: hidden;
            height: 100dvh;
          }
          .table-screen-root:not([data-layout="compactLandscape"]) {
            padding: 6px 8px 8px !important;
          }
          .game-toolbar {
            flex-wrap: nowrap !important;
            gap: 8px !important;
            margin-bottom: 4px !important;
            padding: 6px 8px !important;
          }
          .game-toolbar-title {
            font-size: 18px !important;
            margin-bottom: 0 !important;
          }
          .game-toolbar-meta {
            font-size: 8px !important;
            white-space: nowrap;
          }
          .game-toolbar-actions {
            gap: 5px !important;
          }
          .game-toolbar-actions button {
            min-height: 34px;
            padding: 6px 9px !important;
            font-size: 10px !important;
          }
          .table-screen-root:not([data-layout="compactLandscape"]) .game-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(286px, 35vw);
            gap: 6px;
            overflow: hidden;
          }
          .table-screen-root:not([data-layout="compactLandscape"]) .table-main {
            position: static;
            min-width: 0;
            padding: 64px 58px 68px;
          }
          .table-screen-root:not([data-layout="compactLandscape"]) .table-screen,
          .table-screen-root:not([data-layout="compactLandscape"]) .table-stage {
            min-width: 0;
            height: 100%;
          }
          .table-screen-root:not([data-layout="compactLandscape"]) .table-stage {
            padding: 0;
          }
          .table-screen-root:not([data-layout="compactLandscape"]) .table-shell {
            width: 100%;
            min-width: 0;
          }
          .table-screen-root:not([data-layout="compactLandscape"]) .bottom-dock {
            position: static;
            min-width: 0;
            padding: 0;
            align-items: center;
          }
          .bottom-dock > div {
            width: 100% !important;
            box-sizing: border-box;
            gap: 4px !important;
            padding: 4px 6px !important;
            margin-top: 0 !important;
          }
          .bottom-dock button {
            min-height: 38px !important;
            font-size: 11px !important;
            padding: 5px 6px !important;
          }
          .bottom-dock input[type="text"] {
            width: 52px !important;
            font-size: 11px !important;
          }
          .bottom-dock input[type="range"] {
            min-width: 0;
          }
          .player-seat {
            width: 116px !important;
          }
          .player-seat-panel {
            min-width: 96px !important;
            min-height: 42px !important;
            padding: 4px 8px 4px 38px !important;
          }
          .player-seat-avatar {
            left: -2px !important;
            width: 40px !important;
            height: 40px !important;
          }
          .player-seat-name,
          .player-seat-chips {
            font-size: 10px !important;
          }
          .player-seat-status {
            font-size: 7px !important;
          }
          .player-seat-turn {
            margin-top: 2px !important;
            padding: 2px 5px !important;
            font-size: 7px !important;
          }
          .player-seat-cards {
            bottom: 36px !important;
          }
          .playing-card,
          .playing-card-back {
            width: 24px !important;
            height: 34px !important;
          }
          .playing-card--large {
            width: 30px !important;
            height: 42px !important;
          }
          .debug-dock {
            position: fixed;
            padding: 0 0 6px 6px;
          }
        }
      `}</style>

      <PortraitGuard onBack={onBack} />

      <div className="landscape-game" data-testid="landscape-game">
      <div className="compact-toolbar" data-testid="compact-toolbar">
        <button
          type="button"
          onClick={onBack}
          aria-label="Zurück zum Setup"
          style={actionButtonStyle('#30343c', false)}
        >
          ‹ Setup
        </button>
        <div className="compact-toolbar-meta">
          {gameState?.variantId === 'omaha-high' ? 'PLO' : 'NLHE'}
          {' · '}
          {options.smallBlind}/{options.bigBlind}
          {' · '}
          {players.length === 2 ? 'Heads-up' : players.length <= 6 ? '6-max' : 'Full Ring'}
        </div>
        <div className="compact-toolbar-actions">
          <SessionStats
            stats={sessionStats}
            playerNames={playerNames}
            heroId="hero"
            onExport={onExportSessionLog}
            showDebug={showDebug}
            compact
          />
          <button
            type="button"
            onClick={() => {
              if (handReplays.length === 0) return
              openReplayWindow(handReplays, handReplays.length - 1, currency, showDebug)
            }}
            disabled={handReplays.length === 0}
            aria-label="Letzte Hand wiederholen"
            title={handReplays.length > 0 ? 'Letzte Hand wiederholen' : 'Keine Hand verfügbar'}
            style={actionButtonStyle('#30343c', handReplays.length === 0)}
          >
            ↻
          </button>
          <button
            type="button"
            onClick={() => {
              if (archivedHandReplays.length === 0) return
              openReplayWindow(
                archivedHandReplays,
                archivedHandReplays.length - 1,
                currency,
                showDebug,
              )
            }}
            disabled={archivedHandReplays.length === 0}
            aria-label="Hand-Archiv öffnen"
            title={archivedHandReplays.length > 0
              ? `Hand-Archiv öffnen (${archivedHandReplays.length})`
              : 'Noch keine archivierten Hände'}
            style={actionButtonStyle('#30343c', archivedHandReplays.length === 0)}
          >
            ▤
          </button>
        </div>
      </div>

      <div className="game-toolbar desktop-toolbar" style={{
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
          <div className="game-toolbar-title" style={{ fontSize: 24, fontWeight: 700, marginBottom: 2, letterSpacing: 0.3, color: '#f3f4f6' }}>CPCdigital</div>
          <div className="game-toolbar-meta" style={{ color: '#8f98a4', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
            v{APP_VERSION} · {gameState?.variantId === 'omaha-high' ? 'PLO' : 'NLHE'} · Blinds {options.smallBlind}/{options.bigBlind} · {players.length === 2 ? 'Heads-up' : players.length <= 6 ? '6-max' : 'Full Ring'}
          </div>
        </div>
        <div className="game-toolbar-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
          <button
            onClick={() => {
              if (archivedHandReplays.length === 0) return
              openReplayWindow(
                archivedHandReplays,
                archivedHandReplays.length - 1,
                currency,
                showDebug,
              )
            }}
            disabled={archivedHandReplays.length === 0}
            title={archivedHandReplays.length > 0
              ? `Hand-Archiv öffnen (${archivedHandReplays.length})`
              : 'Noch keine archivierten Hände'}
            style={{
              padding: '10px 12px', borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.15)',
              background: archivedHandReplays.length > 0
                ? 'linear-gradient(180deg, #30343c 0%, rgba(25,25,25,0.98) 100%)'
                : '#1f2228',
              color: archivedHandReplays.length > 0 ? '#9ca3af' : '#4b5563',
              cursor: archivedHandReplays.length > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'monospace', fontSize: 15,
              opacity: archivedHandReplays.length > 0 ? 1 : 0.5,
            }}
          >
            Archiv
          </button>
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
                      <BetStack
                        amount={player.roundBet + (wonByPlayer[player.id] ?? 0)}
                        seatIndex={index}
                        seatCount={orderedPlayers.length}
                        currency={currency}
                        isHero={player.id === heroId}
                      />
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
            variant={layout === 'compactLandscape'
              ? runtime === 'android' ? 'androidCompact' : 'webCompact'
              : 'desktop'}
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
    </div>
  )
}

function openReplayWindow(replays: readonly HandReplay[], startIndex: number, currency: DisplayCurrency, debugMode: boolean): void {
  // Keep archive insertion order: hand numbers restart with every session.
  const allReplays = [...replays]

  const sessionKey = 'replay-session'
  localStorage.setItem(sessionKey, JSON.stringify(allReplays))
  localStorage.setItem('replay-start-index', String(startIndex))
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

  if (isAndroidRuntime()) {
    openOverlay(allReplays, startIndex, currency, debugMode)
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
  const close = () => {
    container.removeEventListener('cpc-request-close', close)
    root.unmount()
    container.remove()
  }
  container.addEventListener('cpc-request-close', close, { once: true })
  root.render(
    <HandReplayer replays={[...replays]} startIndex={startIndex} currency={currency} debugMode={debugMode} onClose={close} />
  )
}
