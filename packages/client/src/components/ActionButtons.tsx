import { useEffect, useRef } from 'react'
import type { PlayerAction } from '@cpc/shared'
import { clamp, roundToCents, formatChips, snapToChipUnit } from '../utils/format'

const miniControlButton = (disabled = false): React.CSSProperties => ({
  padding: '7px 14px',
  borderRadius: 6,
  border: '1px solid rgba(120, 33, 28, 0.55)',
  background: disabled ? '#4a5568' : 'linear-gradient(180deg, #c92a1c 0%, #871911 100%)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.55 : 1,
})

const primaryActionButton = (disabled = false): React.CSSProperties => ({
  minHeight: 74,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.18)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  background: disabled ? '#4a5568' : 'linear-gradient(180deg, #cf2d20 0%, #8e1d15 58%, #62100c 100%)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 18,
  lineHeight: 1.15,
  whiteSpace: 'pre-line',
  boxShadow: disabled ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 22px rgba(0,0,0,0.28)',
  opacity: disabled ? 0.55 : 1,
})

export function ActionButtons({
  isMyTurn, canCheck, canRaise, canFold, canAct, toCall, minRaise, maxRaise, potRaiseTo, stepSize, bigBlind, raiseAmount, setRaiseAmount, onAction,
}: {
  isMyTurn: boolean
  canCheck: boolean
  canRaise: boolean
  canFold: boolean
  canAct: boolean
  toCall: number
  minRaise: number
  maxRaise: number
  potRaiseTo: number
  stepSize: number
  bigBlind: number
  raiseAmount: number
  setRaiseAmount: (n: number) => void
  onAction: (a: PlayerAction) => void
}) {
  const normalizedStep = Math.max(roundToCents(stepSize), 0.01)
  const sliderMax = Math.max(minRaise, maxRaise)
  const canMakeFullRaise = canRaise && maxRaise >= minRaise
  const snapRaise = (amount: number, mode: 'nearest' | 'up' | 'down' = 'nearest') => {
    const bounded = clamp(roundToCents(amount), minRaise, sliderMax)
    return clamp(snapToChipUnit(bounded, minRaise, normalizedStep, mode), minRaise, sliderMax)
  }
  const sliderValue = snapRaise(raiseAmount || minRaise)
  const applyRaise = (amount: number, mode: 'nearest' | 'up' | 'down' = 'nearest') => setRaiseAmount(snapRaise(amount, mode))
  const setPotRaise = () => applyRaise(potRaiseTo, 'up')
  const setThreeBlindRaise = () => applyRaise(bigBlind * 3, 'up')
  const setMaxRaise = () => applyRaise(sliderMax, 'up')

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isMyTurn || !canAct) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const direction = e.deltaY > 0 ? 'down' : 'up'
      applyRaise(sliderValue + (direction === 'up' ? normalizedStep : -normalizedStep), direction)
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [isMyTurn, canAct, sliderValue, normalizedStep])

  if (!isMyTurn) return null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: 10,
      width: 'min(720px, calc(100vw - 36px))',
      padding: '10px 12px 12px',
      background: 'linear-gradient(180deg, rgba(24,24,27,0.98) 0%, rgba(10,10,12,0.98) 100%)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      marginTop: 12,
      boxShadow: '0 18px 34px rgba(0,0,0,0.3)',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto auto auto auto',
        alignItems: 'center',
        gap: 8,
      }}>
        <button onClick={() => applyRaise(minRaise)} disabled={!canAct || !canMakeFullRaise} style={miniControlButton(!canAct || !canMakeFullRaise)}>Min</button>
        <button onClick={setThreeBlindRaise} disabled={!canAct || !canMakeFullRaise} style={miniControlButton(!canAct || !canMakeFullRaise)}>3 BB</button>
        <button onClick={setPotRaise} disabled={!canAct || !canMakeFullRaise} style={miniControlButton(!canAct || !canMakeFullRaise)}>Pot</button>
        <button onClick={setMaxRaise} disabled={!canAct || !canRaise} style={miniControlButton(!canAct || !canRaise)}>Max</button>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 8,
        background: 'rgba(34,34,36,0.78)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={raiseAmount.toFixed(2)}
          onChange={e => {
            let raw = e.target.value.replace(/[^\d,.]/g, '')
            raw = raw.replaceAll(',', '.')
            const parts = raw.split('.')
            let sanitized = raw
            if (parts.length > 2) {
              sanitized = parts[0] + '.' + parts.slice(1).join('')
            } else if (parts.length === 2 && parts[1].length > 2) {
              sanitized = parts[0] + '.' + parts[1].slice(0, 2)
            }
            const num = Number(sanitized)
            if (!Number.isNaN(num) && sanitized !== '') setRaiseAmount(num)
          }}
          onBlur={e => {
            const raw = e.target.value.replaceAll(',', '.')
            const num = Number(raw)
            if (!Number.isNaN(num)) applyRaise(num)
          }}
          disabled={!canAct || !canMakeFullRaise}
          style={{
            width: 88,
            padding: '7px 8px',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.12)',
            background: canAct ? '#f4f4f4' : '#cfcfcf',
            color: '#111',
            fontSize: 13,
            textAlign: 'center',
          }}
        />
        <input
          type="range"
          min={minRaise}
          max={sliderMax}
          step={normalizedStep}
          value={sliderValue}
          disabled={!canAct || !canMakeFullRaise}
          onChange={e => applyRaise(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ color: '#8f98a4', fontSize: 10, minWidth: 74, textAlign: 'right' }}>
          {formatChips(sliderValue)}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 10,
      }}>
        <button onClick={() => onAction({ type: 'fold' })} disabled={!canAct || !canFold} style={primaryActionButton(!canAct || !canFold)}>
          Fold
        </button>
        <button
          onClick={() => onAction({ type: canCheck ? 'check' : 'call' })}
          disabled={!canAct}
          style={primaryActionButton(!canAct)}
        >
          {canCheck ? 'Check' : `Call ${formatChips(toCall)}`}
        </button>
        <button
          onClick={() => onAction(canMakeFullRaise ? { type: 'raise', amount: sliderValue } : { type: 'all-in' })}
          disabled={!canAct || !canRaise}
          style={primaryActionButton(!canAct || !canRaise)}
        >
          {canMakeFullRaise ? `Raise ${formatChips(sliderValue)}` : `All-in ${formatChips(maxRaise)}`}
        </button>
      </div>
    </div>
  )
}
