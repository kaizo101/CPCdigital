import { useEffect, useRef, useState } from 'react'
import type { PlayerAction } from '@cpc/shared'
import {
  clamp,
  calculateThreeXRaise,
  formatChipInput,
  formatChips,
  isMaximumChipAmount,
  parseChipInput,
  roundToCents,
  sanitizeChipInput,
  snapToChipUnit,
  type DisplayCurrency,
} from '../utils/format'
import { getAggressiveActionLabel } from '../action-display'

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
  minHeight: 56,
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.18)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  background: disabled ? '#4a5568' : 'linear-gradient(180deg, #cf2d20 0%, #8e1d15 58%, #62100c 100%)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 16,
  lineHeight: 1.15,
  whiteSpace: 'pre-line',
  boxShadow: disabled ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.18), 0 10px 22px rgba(0,0,0,0.28)',
  opacity: disabled ? 0.55 : 1,
})

export function ActionButtons({
  isMyTurn, canCheck, canRaise, canFold, canAct, toCall, currentBet, minRaise, maxRaise, potRaiseTo, stepSize, bigBlind, raiseAmount, setRaiseAmount, onAction, currency, variant = 'desktop',
}: {
  isMyTurn: boolean
  canCheck: boolean
  canRaise: boolean
  canFold: boolean
  canAct: boolean
  toCall: number
  currentBet: number
  minRaise: number
  maxRaise: number
  potRaiseTo: number
  stepSize: number
  bigBlind: number
  raiseAmount: number
  setRaiseAmount: (n: number) => void
  onAction: (a: PlayerAction) => void
  currency: DisplayCurrency
  variant?: 'desktop' | 'androidCompact' | 'webCompact'
}) {
  const normalizedStep = Math.max(roundToCents(stepSize), 0.01)
  const sliderMax = Math.max(minRaise, maxRaise)
  const canMakeFullRaise = canRaise && maxRaise >= minRaise
  const [raiseInput, setRaiseInput] = useState(() => formatChipInput(raiseAmount || minRaise))
  const [isEditingRaise, setIsEditingRaise] = useState(false)
  const [showRaisePresets, setShowRaisePresets] = useState(false)
  const compactRaiseRef = useRef<HTMLDivElement>(null)
  const snapRaise = (amount: number, mode: 'nearest' | 'up' | 'down' = 'nearest') => {
    const bounded = clamp(roundToCents(amount), minRaise, sliderMax)
    return clamp(snapToChipUnit(bounded, minRaise, normalizedStep, mode), minRaise, sliderMax)
  }
  const sliderValue = snapRaise(raiseAmount || minRaise)
  const applyRaise = (amount: number, mode: 'nearest' | 'up' | 'down' = 'nearest') => {
    const nextAmount = snapRaise(amount, mode)
    setRaiseAmount(nextAmount)
    setRaiseInput(formatChipInput(nextAmount))
  }
  const setPotRaise = () => applyRaise(potRaiseTo, 'up')
  const setThreeXRaise = () => applyRaise(calculateThreeXRaise(currentBet, bigBlind), 'up')
  const threeXLabel = currentBet > bigBlind ? '3×' : '3 BB'
  const setMaxRaise = () => applyRaise(sliderMax, 'up')
  const isAllInSelected = !canMakeFullRaise || (isMaximumChipAmount(sliderValue, maxRaise) && !canRaise)
  const aggressiveActionLabel = getAggressiveActionLabel(currentBet)
  const actionForAmount = (amount: number): PlayerAction =>
    getAggressiveActionForAmount(amount, canMakeFullRaise)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isEditingRaise) setRaiseInput(formatChipInput(sliderValue))
  }, [sliderValue, isEditingRaise])

  const commitRaiseInput = (): number | null => {
    const parsed = parseChipInput(raiseInput)
    if (parsed == null) {
      setRaiseInput(formatChipInput(sliderValue))
      setIsEditingRaise(false)
      return null
    }

    const committedAmount = snapRaise(parsed)
    setRaiseAmount(committedAmount)
    setRaiseInput(formatChipInput(committedAmount))
    setIsEditingRaise(false)
    return committedAmount
  }

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

  useEffect(() => {
    if (!showRaisePresets) return
    const closePresets = (event: PointerEvent) => {
      if (!compactRaiseRef.current?.contains(event.target as Node)) {
        setShowRaisePresets(false)
      }
    }
    document.addEventListener('pointerdown', closePresets)
    return () => document.removeEventListener('pointerdown', closePresets)
  }, [showRaisePresets])

  if (!isMyTurn) return null

  if (variant !== 'desktop') {
    const isAndroidCompact = variant === 'androidCompact'
    const compactPrimaryButton = (disabled = false): React.CSSProperties => ({
      height: '100%',
      minHeight: 44,
      minWidth: 0,
      padding: '5px 7px',
      overflow: 'hidden',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.16)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      background: disabled ? '#353a43' : 'linear-gradient(180deg, #cf2d20 0%, #8e1d15 58%, #62100c 100%)',
      color: '#fff',
      fontFamily: 'inherit',
      fontSize: isAndroidCompact ? 13 : 11,
      fontWeight: 800,
      lineHeight: 1.1,
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      boxShadow: disabled ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.16), 0 5px 12px rgba(0,0,0,0.3)',
      opacity: disabled ? 0.52 : 1,
    })
    const adjustRaise = (direction: 'up' | 'down') => {
      applyRaise(
        sliderValue + (direction === 'up' ? normalizedStep : -normalizedStep),
        direction,
      )
    }
    const selectPreset = (applyPreset: () => void) => {
      applyPreset()
      setShowRaisePresets(false)
    }
    const startFreeRaiseInput = () => {
      setShowRaisePresets(false)
      setIsEditingRaise(true)
      requestAnimationFrame(() => inputRef.current?.focus())
    }

    return (
      <div
        className="compact-action-bar"
        data-variant={variant}
        data-testid="compact-action-bar"
      >
        <style>{`
          .compact-action-bar {
            position: relative;
            z-index: 70;
            width: 100%;
            height: 100%;
            min-width: 0;
            display: grid;
            grid-template-columns:
              repeat(3, minmax(82px, 1fr))
              76px
              42px
              minmax(112px, 1.35fr)
              42px;
            align-items: stretch;
            gap: 6px;
            padding: 6px;
            box-sizing: border-box;
            border: 1px solid rgba(255,255,255,0.09);
            border-radius: 9px;
            background: linear-gradient(180deg, rgba(24,24,27,0.99) 0%, rgba(9,10,12,0.99) 100%);
            box-shadow: 0 -8px 24px rgba(0,0,0,0.24);
          }
          .compact-action-bar[data-variant="webCompact"] {
            grid-template-columns:
              minmax(58px, 0.8fr)
              minmax(74px, 1fr)
              minmax(74px, 1fr)
              72px;
            gap: 4px;
            padding: 5px;
          }
          .compact-raise-field {
            position: relative;
            min-width: 0;
          }
          .compact-raise-input {
            width: 100%;
            height: 100%;
            min-height: 44px;
            padding: 5px 6px;
            box-sizing: border-box;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 7px;
            background: #f4f4f4;
            color: #111;
            font-family: inherit;
            font-size: 13px;
            font-weight: 800;
            text-align: center;
          }
          button.compact-raise-input {
            cursor: pointer;
          }
          .compact-raise-input:disabled {
            background: #aeb3ba;
            opacity: 0.58;
          }
          .compact-raise-presets {
            position: absolute;
            left: 50%;
            bottom: calc(100% + 8px);
            z-index: 90;
            width: min(304px, calc(100vw - 24px));
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 5px;
            padding: 7px;
            box-sizing: border-box;
            transform: translateX(-50%);
            border: 1px solid rgba(255,255,255,0.14);
            border-radius: 9px;
            background: rgba(12,13,16,0.98);
            box-shadow: 0 12px 28px rgba(0,0,0,0.46);
          }
          .compact-raise-presets[data-android="true"] {
            width: min(360px, calc(100vw - 24px));
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }
          .compact-raise-presets button {
            min-height: 36px;
            padding: 5px;
          }
          .compact-adjust-button {
            min-width: 42px;
            min-height: 44px;
            padding: 0;
            border: 1px solid rgba(255,255,255,0.14);
            border-radius: 8px;
            background: linear-gradient(180deg, #343941 0%, #1b1e23 100%);
            color: #fff;
            font-family: inherit;
            font-size: 22px;
            font-weight: 800;
          }
          .compact-adjust-button:disabled {
            opacity: 0.45;
          }
          .compact-preset-dock {
            position: absolute;
            left: 6px;
            bottom: calc(100% + 5px);
            z-index: 92;
            display: grid;
            grid-template-columns: repeat(3, minmax(58px, 1fr));
            gap: 5px;
            padding: 5px;
            border: 1px solid rgba(255,255,255,0.13);
            border-radius: 8px;
            background: linear-gradient(180deg, rgba(24,26,30,0.98) 0%, rgba(10,11,13,0.98) 100%);
            box-shadow: 0 8px 20px rgba(0,0,0,0.4);
          }
          .compact-preset-dock button {
            min-height: 30px !important;
            padding: 4px 9px !important;
            white-space: nowrap;
          }
          .compact-slider-shell {
            position: relative;
            width: 100%;
            max-width: 220px;
            min-width: 0;
            height: 44px;
            display: flex;
            align-items: center;
            justify-self: center;
            transform: translateY(5px);
          }
          .compact-raise-slider {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            min-width: 0;
            height: 44px;
            margin: 0;
            padding: 0;
            align-self: center;
            background: transparent;
            accent-color: #cf2d20;
          }
          .compact-raise-slider::-webkit-slider-runnable-track {
            height: 10px;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 999px;
            background: linear-gradient(180deg, #4b515b 0%, #25292f 100%);
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.55);
          }
          .compact-raise-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 28px;
            height: 28px;
            margin-top: -10px;
            border: 2px solid #f5d0cc;
            border-radius: 50%;
            background: linear-gradient(180deg, #df3b2d 0%, #8e1d15 100%);
            box-shadow: 0 3px 8px rgba(0,0,0,0.48);
          }
          .compact-slider-scale {
            position: absolute;
            left: 14px;
            right: 14px;
            top: 50%;
            z-index: 3;
            display: flex;
            justify-content: space-between;
            pointer-events: none;
            transform: translateY(-50%);
          }
          .compact-slider-scale > span {
            width: 2px;
            height: 6px;
            border-radius: 999px;
            background: rgba(255,255,255,0.42);
            box-shadow: 0 1px 1px rgba(0,0,0,0.45);
          }
        `}</style>

        {isAndroidCompact && (
          <div className="compact-preset-dock" role="group" aria-label="Einsatz-Presets">
            <button
              type="button"
              onClick={setThreeXRaise}
              disabled={!canAct || !canMakeFullRaise}
              style={miniControlButton(!canAct || !canMakeFullRaise)}
            >
              {threeXLabel}
            </button>
            <button
              type="button"
              onClick={setPotRaise}
              disabled={!canAct || !canMakeFullRaise}
              style={miniControlButton(!canAct || !canMakeFullRaise)}
            >
              Pot
            </button>
            <button
              type="button"
              onClick={setMaxRaise}
              disabled={!canAct || !canRaise}
              style={miniControlButton(!canAct || !canRaise)}
            >
              Max
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => onAction({ type: 'fold' })}
          disabled={!canAct || !canFold}
          style={compactPrimaryButton(!canAct || !canFold)}
        >
          Fold
        </button>
        <button
          type="button"
          onClick={() => onAction({ type: canCheck ? 'check' : 'call' })}
          disabled={!canAct}
          style={compactPrimaryButton(!canAct)}
        >
          {canCheck ? 'Check' : `Call ${formatChips(toCall, currency)}`}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowRaisePresets(false)
            onAction(isAllInSelected ? { type: 'all-in' } : { type: 'raise', amount: sliderValue })
          }}
          disabled={!canAct || !canRaise}
          style={compactPrimaryButton(!canAct || !canRaise)}
        >
          {isAllInSelected ? 'All-in' : aggressiveActionLabel}
        </button>

        <div className="compact-raise-field" ref={compactRaiseRef}>
          {isAndroidCompact && !isEditingRaise ? (
            <button
              type="button"
              className="compact-raise-input compact-raise-trigger"
              aria-label="Freie Einsatzhöhe eingeben"
              onClick={startFreeRaiseInput}
              disabled={!canAct || !canMakeFullRaise}
            >
              {raiseInput}
            </button>
          ) : (
            <input
              ref={inputRef}
              className="compact-raise-input"
              aria-label="Einsatzhöhe"
              type="text"
              inputMode="decimal"
              value={raiseInput}
              onFocus={event => {
                setIsEditingRaise(true)
                if (!isAndroidCompact) setShowRaisePresets(true)
                event.currentTarget.select()
              }}
              onClick={() => {
                if (!isAndroidCompact) setShowRaisePresets(true)
              }}
              onChange={event => setRaiseInput(sanitizeChipInput(event.target.value))}
              onBlur={commitRaiseInput}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  const committedAmount = commitRaiseInput()
                  setShowRaisePresets(false)
                  if (committedAmount != null && canAct && canMakeFullRaise) {
                    onAction(actionForAmount(committedAmount))
                  }
                } else if (event.key === 'Escape') {
                  setRaiseInput(formatChipInput(sliderValue))
                  setIsEditingRaise(false)
                  setShowRaisePresets(false)
                  event.currentTarget.blur()
                }
              }}
              disabled={!canAct || !canMakeFullRaise}
            />
          )}
          {showRaisePresets && (
            <div
              className="compact-raise-presets"
              data-android="false"
              role="group"
              aria-label="Einsatz-Presets"
            >
              <button type="button" onClick={() => selectPreset(() => applyRaise(minRaise))} style={miniControlButton(false)}>Min</button>
              <button type="button" onClick={() => selectPreset(setThreeXRaise)} style={miniControlButton(false)}>{threeXLabel}</button>
              <button type="button" onClick={() => selectPreset(setPotRaise)} style={miniControlButton(false)}>Pot</button>
              <button type="button" onClick={() => selectPreset(setMaxRaise)} style={miniControlButton(false)}>Max</button>
            </div>
          )}
        </div>

        {isAndroidCompact && (
          <>
            <button
              type="button"
              className="compact-adjust-button"
              aria-label="Einsatz verringern"
              onClick={() => adjustRaise('down')}
              disabled={!canAct || !canMakeFullRaise || sliderValue <= minRaise}
            >
              −
            </button>
            <div className="compact-slider-shell">
              <input
                className="compact-raise-slider"
                aria-label="Einsatzhöhe"
                type="range"
                min={minRaise}
                max={sliderMax}
                step={normalizedStep}
                value={sliderValue}
                disabled={!canAct || !canMakeFullRaise}
                onChange={event => applyRaise(Number(event.target.value))}
              />
              <div className="compact-slider-scale" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
            <button
              type="button"
              className="compact-adjust-button"
              aria-label="Einsatz erhöhen"
              onClick={() => adjustRaise('up')}
              disabled={!canAct || !canMakeFullRaise || sliderValue >= sliderMax}
            >
              +
            </button>
          </>
        )}
      </div>
    )
  }

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
        <button onClick={setThreeXRaise} disabled={!canAct || !canMakeFullRaise} style={miniControlButton(!canAct || !canMakeFullRaise)}>{threeXLabel}</button>
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
          value={raiseInput}
          onFocus={e => {
            setIsEditingRaise(true)
            e.currentTarget.select()
          }}
          onChange={e => {
            setRaiseInput(sanitizeChipInput(e.target.value))
          }}
          onBlur={commitRaiseInput}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              const committedAmount = commitRaiseInput()
              if (committedAmount != null && canAct && canMakeFullRaise) {
                onAction(actionForAmount(committedAmount))
              }
            } else if (e.key === 'Escape') {
              setRaiseInput(formatChipInput(sliderValue))
              setIsEditingRaise(false)
              e.currentTarget.blur()
            }
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
          onKeyDown={e => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (!canAct || !canMakeFullRaise) return
            const keyboardAmount = snapRaise(Number(e.currentTarget.value))
            onAction(actionForAmount(keyboardAmount))
          }}
          style={{ width: '100%' }}
        />
        <div style={{ color: '#8f98a4', fontSize: 10, minWidth: 74, textAlign: 'right' }}>
          {formatChips(sliderValue, currency)}
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
          {canCheck ? 'Check' : `Call ${formatChips(toCall, currency)}`}
        </button>
        <button
          onClick={() => onAction(isAllInSelected ? { type: 'all-in' } : { type: 'raise', amount: sliderValue })}
          disabled={!canAct || !canRaise}
          style={primaryActionButton(!canAct || !canRaise)}
        >
          {isAllInSelected
            ? `All-in ${formatChips(maxRaise, currency)}`
            : `${aggressiveActionLabel} ${formatChips(sliderValue, currency)}`}
        </button>
      </div>
    </div>
  )
}

export function getAggressiveActionForAmount(
  amount: number,
  canMakeFullRaise: boolean,
): PlayerAction {
  return canMakeFullRaise ? { type: 'raise', amount } : { type: 'all-in' }
}
