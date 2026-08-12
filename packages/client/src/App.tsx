import { useEffect, useState } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import type { PlayerAction, TableOptions } from '@cpc/shared'
import { LocalGameRunner } from './session/LocalGameRunner'
import { SetupScreen } from './screens/SetupScreen'
import { TableScreen } from './screens/TableScreen'
import type { DisplayCurrency } from './utils/format'
import { APP_VERSION } from './app-version'
import { downloadSessionDebugExport } from './session/session-debug-record'
import { HandReplayer } from './components/HandReplayer'
import { createSessionHandHistoryFilename, type HandReplay } from './session/hand-replay'
import { applyAndroidSystemUi, isAndroidRuntime } from './native-runtime'
import { requestTextFileExport } from './utils/file-export'

type Screen = 'setup' | 'table'

const DEBUG_MODE_STORAGE_KEY = 'cpcdigital:debug-mode'

function readStoredDebugMode(): boolean {
  try {
    return localStorage.getItem(DEBUG_MODE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export default function App() {
  const [runner] = useState(() => new LocalGameRunner())
  const [, forceRender] = useState(0)

  const [screen, setScreen] = useState<Screen>('setup')
  const [options, setOptions] = useState<TableOptions>({
    bigBlind: 20, smallBlind: 10, maxPlayers: 6, startingChips: 2000,
  })
  const [botCount, setBotCount] = useState(5)
  const [raiseAmount, setRaiseAmount] = useState(0)
  const [currency, setCurrency] = useState<DisplayCurrency>('EUR')
  const [rebuyEnabled, setRebuyEnabled] = useState(true)
  const [variantId, setVariantId] = useState('texas-holdem')
  const [debugMode, setDebugModeState] = useState(readStoredDebugMode)
  const [debugExporting, setDebugExporting] = useState(false)

  function setDebugMode(enabled: boolean) {
    setDebugModeState(enabled)
    try {
      localStorage.setItem(DEBUG_MODE_STORAGE_KEY, enabled ? '1' : '0')
    } catch { /* localStorage can be unavailable in hardened browser contexts */ }
  }

  // Replay mode: read from #replay/N hash (set by Electron or browser fallback)
  const [replayMode] = useState<{ replays: HandReplay[]; startIndex: number; debugMode: boolean } | null>(() => {
    const hash = window.location.hash
    let handNum: number | null = null

    const hashMatch = /^#replay\/(\d+)$/.exec(hash) || /^#replay=(\d+)$/.exec(hash)
    if (hashMatch) {
      handNum = parseInt(hashMatch[1])
    } else {
      const nameMatch = /^replay-(\d+)$/.exec(window.name)
      if (nameMatch) handNum = parseInt(nameMatch[1])
    }

    if (handNum) {
      const debugMode = localStorage.getItem('replay-debug') === '1'
      // Try session-level first
      const session = localStorage.getItem('replay-session')
      if (session) {
        try {
          const all: HandReplay[] = JSON.parse(session)
          const storedIndex = Number(localStorage.getItem('replay-start-index'))
          const idx = Number.isInteger(storedIndex) && storedIndex >= 0 && storedIndex < all.length
            ? storedIndex
            : all.findIndex(r => r.handNumber === handNum)
          return { replays: all, startIndex: idx >= 0 ? idx : all.length - 1, debugMode }
        } catch { /* ignore */ }
      }
      // Fallback: single hand
      const stored = localStorage.getItem(`replay-${handNum}`)
      if (stored) {
        try { return { replays: [JSON.parse(stored) as HandReplay], startIndex: 0, debugMode } } catch { /* ignore */ }
      }
    }

    window.name = ''
    return null
  })

  useEffect(() => {
    const unsub = runner.subscribe(() => forceRender(n => n + 1))
    return () => { unsub(); runner.cleanup() }
  }, [runner])

  const localState = runner.state
  const gameState = localState.gameState
  const bettingContext = gameState?.bettingContext

  useEffect(() => {
    if (gameState?.phase !== 'waiting' && bettingContext?.playerId === 'hero') {
      const raise = bettingContext.legalActions.raise
      setRaiseAmount(raise?.minAmount ?? bettingContext.legalActions.allInAmount ?? 0)
    }
  }, [
    gameState?.phase,
    gameState?.currentPlayerId,
    gameState?.currentBet,
    bettingContext?.totalPot,
    bettingContext?.toCall,
    bettingContext?.minRaiseTo,
    bettingContext?.maxRaiseTo,
    bettingContext?.playerStack,
  ])

  function handleStartGame() {
    const tableOptions = { ...options, maxPlayers: botCount + 1 }
    setOptions(tableOptions)
    runner.setupTable(tableOptions, botCount, rebuyEnabled, variantId)
    runner.startHand()
    setScreen('table')
  }

  function handleBackToSetup() {
    runner.cleanup()
    setScreen('setup')
  }

  useEffect(() => {
    if (!isAndroidRuntime()) return

    let disposed = false
    let removeResumeListener: (() => Promise<void>) | undefined
    let removeBackListener: (() => Promise<void>) | undefined

    void CapacitorApp.addListener('resume', () => {
      void applyAndroidSystemUi()
    }).then(handle => {
      if (disposed) void handle.remove()
      else removeResumeListener = handle.remove
    })

    void CapacitorApp.addListener('backButton', () => {
      const replayOverlay = document.getElementById('replay-overlay')
      if (replayOverlay) {
        replayOverlay.dispatchEvent(new Event('cpc-request-close'))
        return
      }
      if (screen === 'table') {
        handleBackToSetup()
        return
      }
      void CapacitorApp.exitApp()
    }).then(handle => {
      if (disposed) void handle.remove()
      else removeBackListener = handle.remove
    })

    return () => {
      disposed = true
      if (removeResumeListener) void removeResumeListener()
      if (removeBackListener) void removeBackListener()
    }
  }, [screen])

  async function handleExportDebugRecord() {
    if (debugExporting) return
    setDebugExporting(true)
    try {
      await downloadSessionDebugExport(runner.createSessionDebugRecord(APP_VERSION, currency))
    } finally {
      setDebugExporting(false)
    }
  }

  if (replayMode) {
    return (
      <HandReplayer
        replays={replayMode.replays}
        startIndex={replayMode.startIndex}
        debugMode={replayMode.debugMode}
        currency={currency}
        onClose={() => {
          const hn = replayMode.replays[replayMode.startIndex]?.handNumber
          if (hn) localStorage.removeItem(`replay-${hn}`)
          localStorage.removeItem('replay-session')
          localStorage.removeItem('replay-start-index')
          window.close()
        }}
      />
    )
  }

  if (screen === 'setup') {
    return (
      <SetupScreen
        options={options}
        setOptions={setOptions}
        botCount={botCount}
        setBotCount={setBotCount}
        onStart={handleStartGame}
        currency={currency}
        setCurrency={setCurrency}
        rebuyEnabled={rebuyEnabled}
        setRebuyEnabled={setRebuyEnabled}
        variantId={variantId}
        setVariantId={setVariantId}
        debugMode={debugMode}
        setDebugMode={setDebugMode}
      />
    )
  }

  const playerNames = new Map(
    localState.gameState?.players.map(p => [p.id, p.name]) ?? []
  )

  return (
    <TableScreen
      gameState={gameState}
      myCards={localState.myCards}
      lastResults={localState.lastResults}
      isMyTurn={localState.isMyTurn}
      playerAvatarKeys={localState.playerAvatarKeys}
      playerActionLabels={localState.playerActionLabels}
      showdownCards={localState.showdownCards}
      botDebugDecisions={runner.getBotDebugDecisions()}
      pendingRebuyPlayerIds={localState.pendingRebuyPlayerIds}
      raiseAmount={raiseAmount}
      setRaiseAmount={setRaiseAmount}
      onAction={(action: PlayerAction) => runner.playerAction(action)}
      onBack={handleBackToSetup}
      options={options}
      currency={currency}
      onRebuy={playerId => runner.requestRebuy(playerId)}
      onExportDebugRecord={handleExportDebugRecord}
      debugExporting={debugExporting}
      handReplays={localState.handReplays}
      archivedHandReplays={localState.archivedHandReplays}
      sessionStats={localState.sessionStats}
      playerNames={playerNames}
      debugMode={debugMode}
      setDebugMode={setDebugMode}
      onExportSessionLog={() => {
        const log = runner.exportSessionLog()
        requestTextFileExport({
          data: log,
          filename: createSessionHandHistoryFilename(localState.handReplays),
          mimeType: 'text/plain',
          title: 'CPCdigital Session',
          dialogTitle: 'Session exportieren',
        })
      }}
    />
  )
}
