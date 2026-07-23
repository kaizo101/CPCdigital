import { useEffect, useState } from 'react'
import type { PlayerAction, TableOptions } from '@cpc/shared'
import { LocalGameRunner } from './session/LocalGameRunner'
import { SetupScreen } from './screens/SetupScreen'
import { TableScreen } from './screens/TableScreen'
import type { DisplayCurrency } from './utils/format'
import { APP_VERSION } from './app-version'
import { downloadSessionDebugRecord } from './session/session-debug-record'
import { HandReplayer } from './components/HandReplayer'
import type { HandReplay } from './session/hand-replay'

type Screen = 'setup' | 'table'

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
          const idx = all.findIndex(r => r.handNumber === handNum)
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

  function handleExportDebugRecord() {
    downloadSessionDebugRecord(runner.createSessionDebugRecord(APP_VERSION, currency))
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
      />
    )
  }

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
      handReplays={localState.handReplays}
    />
  )
}
