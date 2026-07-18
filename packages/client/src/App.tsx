import { useEffect, useState } from 'react'
import type { PlayerAction, TableOptions } from '@cpc/shared'
import { LocalGameRunner } from './LocalGameRunner'
import { SetupScreen } from './screens/SetupScreen'
import { TableScreen } from './screens/TableScreen'

type Screen = 'setup' | 'table'

export default function App() {
  const [runner] = useState(() => new LocalGameRunner())
  const [, forceRender] = useState(0)

  const [screen, setScreen] = useState<Screen>('setup')
  const [options, setOptions] = useState<TableOptions>({
    bigBlind: 20, smallBlind: 10, maxPlayers: 6, startingChips: 1000,
  })
  const [botCount, setBotCount] = useState(5)
  const [raiseAmount, setRaiseAmount] = useState(0)

  useEffect(() => {
    const unsub = runner.subscribe(() => forceRender(n => n + 1))
    return () => { unsub(); runner.cleanup() }
  }, [runner])

  const localState = runner.state

  useEffect(() => {
    const gs = localState.gameState
    if (!gs) return
    const context = gs.bettingContext
    if (gs.phase !== 'waiting' && context?.playerId === 'hero') {
      const raise = context.legalActions.raise
      setRaiseAmount(raise?.minAmount ?? context.legalActions.allInAmount ?? 0)
    }
  }, [localState.gameState])

  function handleStartGame() {
    runner.setupTable(options, botCount)
    runner.startHand()
    setScreen('table')
  }

  function handleBackToSetup() {
    runner.cleanup()
    setScreen('setup')
  }

  if (screen === 'setup') {
    return (
      <SetupScreen
        options={options}
        setOptions={setOptions}
        botCount={botCount}
        setBotCount={setBotCount}
        onStart={handleStartGame}
      />
    )
  }

  return (
    <TableScreen
      gameState={localState.gameState}
      myCards={localState.myCards}
      lastResults={localState.lastResults}
      isMyTurn={localState.isMyTurn}
      playerActionLabels={localState.playerActionLabels}
      showdownCards={localState.showdownCards}
      raiseAmount={raiseAmount}
      setRaiseAmount={setRaiseAmount}
      onAction={(action: PlayerAction) => runner.playerAction(action)}
      onBack={handleBackToSetup}
      options={options}
    />
  )
}
