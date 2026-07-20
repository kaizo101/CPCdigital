import { useEffect, useState } from 'react'
import type { PlayerAction, TableOptions } from '@cpc/shared'
import { LocalGameRunner } from './LocalGameRunner'
import { SetupScreen } from './screens/SetupScreen'
import { TableScreen } from './screens/TableScreen'
import type { DisplayCurrency } from './utils/format'
import { APP_VERSION } from './app-version'
import { downloadSessionDebugRecord } from './session-debug-record'

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
    runner.setupTable(tableOptions, botCount)
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
    />
  )
}
