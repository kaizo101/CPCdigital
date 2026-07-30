import { useEffect, useRef, useState } from 'react'
import type { TableOptions } from '@cpc/shared'
import { calculateStartingStack, clamp, type DisplayCurrency } from '../utils/format'
import { APP_SOURCE_URL, APP_VERSION } from '../app-version'
import { getAppRuntime, type AppRuntime } from '../native-runtime'

const BLIND_PRESETS = [
  { smallBlind: 0.01, bigBlind: 0.02 },
  { smallBlind: 0.02, bigBlind: 0.05 },
  { smallBlind: 0.05, bigBlind: 0.10 },
  { smallBlind: 0.10, bigBlind: 0.25 },
  { smallBlind: 0.25, bigBlind: 0.50 },
  { smallBlind: 0.50, bigBlind: 1 },
  { smallBlind: 1, bigBlind: 2 },
  { smallBlind: 2, bigBlind: 5 },
  { smallBlind: 5, bigBlind: 10 },
  { smallBlind: 10, bigBlind: 20 },
] as const

function blindPresetKey(smallBlind: number, bigBlind: number): string {
  return `${smallBlind}/${bigBlind}`
}

const inputStyle: React.CSSProperties = {
  padding: '9px 10px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#0e1116',
  color: '#fff',
  fontSize: 14,
}

export function SetupScreen({
  options,
  setOptions,
  botCount,
  setBotCount,
  onStart,
  currency,
  setCurrency,
  rebuyEnabled,
  setRebuyEnabled,
  variantId,
  setVariantId,
  runtime = getAppRuntime(),
}: {
  options: TableOptions
  setOptions: (options: TableOptions) => void
  botCount: number
  setBotCount: (count: number) => void
  onStart: () => void
  currency: DisplayCurrency
  setCurrency: (currency: DisplayCurrency) => void
  rebuyEnabled: boolean
  setRebuyEnabled: (enabled: boolean) => void
  variantId: string
  setVariantId: (id: string) => void
  runtime?: AppRuntime
}) {
  const maxBots = 8
  const [blindMenuOpen, setBlindMenuOpen] = useState(false)
  const blindPickerRef = useRef<HTMLDivElement>(null)
  const selectedBlindPreset = BLIND_PRESETS.find(preset =>
    preset.smallBlind === options.smallBlind && preset.bigBlind === options.bigBlind
  )
  const selectedBlindPresetKey = selectedBlindPreset
    ? blindPresetKey(selectedBlindPreset.smallBlind, selectedBlindPreset.bigBlind)
    : 'custom'
  const applyBlindPreset = (preset: (typeof BLIND_PRESETS)[number]) => {
    setOptions({
      ...options,
      smallBlind: preset.smallBlind,
      bigBlind: preset.bigBlind,
      startingChips: calculateStartingStack(preset.bigBlind),
    })
    setBlindMenuOpen(false)
  }

  useEffect(() => {
    if (!blindMenuOpen) return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!blindPickerRef.current?.contains(event.target as Node)) setBlindMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBlindMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [blindMenuOpen])

  const validationError = (() => {
    if (!Number.isFinite(options.smallBlind) || options.smallBlind <= 0) return 'Small Blind muss größer als 0 sein.'
    if (!Number.isFinite(options.bigBlind) || options.bigBlind <= 0) return 'Big Blind muss größer als 0 sein.'
    if (options.smallBlind > options.bigBlind) return 'Small Blind darf nicht größer als Big Blind sein.'
    if (!Number.isFinite(options.startingChips) || options.startingChips < options.bigBlind) return 'Starting Chips müssen mindestens einem Big Blind entsprechen.'
    if (!Number.isInteger(botCount) || botCount < 1 || botCount > maxBots) return `Für diesen Tisch sind 1–${maxBots} Bots möglich.`
    return null
  })()

  return (
    <div className="setup-screen-root" style={{
      minHeight: '100vh',
      width: '100%',
      display: 'grid',
      placeItems: 'center',
      padding: '32px',
      boxSizing: 'border-box',
      fontFamily: 'monospace',
      color: '#e5e7eb',
      background: 'radial-gradient(circle at 50% 0%, #292d34 0%, #15171b 42%, #090a0c 100%)',
    }}>
      <style>{`
        html, body, #root {
          margin: 0;
          min-height: 100%;
          width: 100%;
          background: #090a0c;
        }
        html[data-runtime="android"] .setup-screen-root {
          width: 100%;
          height: 100%;
          min-height: 100% !important;
          overflow: hidden;
          padding: 0 !important;
        }
        html[data-runtime="android"] .setup-shell {
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          padding: 10px 14px;
          border: 0;
          border-radius: 0;
          box-shadow: none;
        }
        html[data-runtime="android"] .setup-header {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          margin-bottom: 8px !important;
        }
        html[data-runtime="android"] .setup-title-row {
          flex: 0 0 auto;
          margin-bottom: 0 !important;
        }
        html[data-runtime="android"] .setup-title {
          font-size: 22px !important;
        }
        html[data-runtime="android"] .setup-subtitle {
          overflow: hidden;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        html[data-runtime="android"] .setup-license {
          display: none;
        }
        html[data-runtime="android"] .setup-grid {
          grid-template-columns: minmax(260px, 0.9fr) minmax(430px, 1.6fr);
          gap: 8px;
          min-height: 0;
        }
        html[data-runtime="android"] .setup-table-settings,
        html[data-runtime="android"] .setup-option-card {
          min-width: 0;
          padding: 9px !important;
        }
        html[data-runtime="android"] .setup-section-title {
          margin-bottom: 7px !important;
          font-size: 9px !important;
        }
        html[data-runtime="android"] .setup-settings-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 7px;
        }
        html[data-runtime="android"] .setup-settings-grid label {
          gap: 2px !important;
        }
        html[data-runtime="android"] .setup-settings-grid label > span {
          font-size: 9px !important;
          white-space: nowrap;
        }
        html[data-runtime="android"] .setup-settings-grid input,
        html[data-runtime="android"] .setup-settings-grid select {
          min-width: 0;
          padding: 7px 8px !important;
          font-size: 11px !important;
        }
        html[data-runtime="android"] .setup-sidebar {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          grid-template-rows: repeat(2, minmax(0, 1fr)) auto;
          gap: 8px;
          min-height: 0;
        }
        html[data-runtime="android"] .setup-option-card button {
          min-height: 32px;
          padding: 6px !important;
          font-size: 10px !important;
        }
        html[data-runtime="android"] .setup-rebuy-description {
          display: none;
        }
        html[data-runtime="android"] .setup-start-button {
          grid-column: 1 / -1;
          min-height: 42px;
          margin-top: 0 !important;
          padding: 9px 14px !important;
          font-size: 14px !important;
        }
        .setup-shell {
          width: min(880px, 100%);
          padding: 28px;
          box-sizing: border-box;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(22,24,28,0.97) 0%, rgba(10,11,13,0.98) 100%);
          box-shadow: 0 28px 70px rgba(0,0,0,0.38);
        }
        .setup-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(230px, 1fr);
          gap: 16px;
          align-items: stretch;
        }
        .setup-settings-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .setup-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .setup-blind-preset {
          color-scheme: dark;
        }
        .setup-blind-preset option {
          background: #16191e;
          color: #f3f4f6;
        }
        .setup-blind-picker {
          position: relative;
        }
        .setup-blind-trigger {
          width: 100%;
          min-height: 38px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          cursor: pointer;
          text-align: left;
        }
        .setup-blind-trigger::after {
          content: "▾";
          color: #8f98a4;
          font-size: 12px;
        }
        .setup-blind-trigger[aria-expanded="true"]::after {
          transform: rotate(180deg);
        }
        .setup-blind-menu {
          position: absolute;
          top: calc(100% + 5px);
          left: 0;
          z-index: 100;
          width: min(360px, calc(100vw - 36px));
          max-height: min(204px, 62dvh);
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 4px;
          overflow-y: auto;
          padding: 5px;
          box-sizing: border-box;
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 9px;
          background: #101318;
          box-shadow: 0 16px 34px rgba(0,0,0,0.55);
        }
        .setup-blind-option {
          min-height: 27px;
          padding: 4px 8px;
          border: 1px solid rgba(255,255,255,0.11);
          border-radius: 6px;
          background: #20242b;
          color: #f3f4f6;
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .setup-blind-option[aria-selected="true"] {
          border-color: rgba(125,211,252,0.72);
          background: #173447;
          color: #d9f3ff;
        }
        @media (max-width: 720px) {
          .setup-shell { padding: 20px; }
          .setup-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .setup-settings-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <main className="setup-shell">
        <header className="setup-header" style={{ marginBottom: 24 }}>
          <div className="setup-title-row" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 className="setup-title" style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>CPCdigital</h1>
            <span style={{
              padding: '3px 7px',
              borderRadius: 999,
              border: '1px solid rgba(125,211,252,0.3)',
              background: 'rgba(14,116,144,0.14)',
              color: '#a5dff5',
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.5,
            }}>
              v{APP_VERSION}
            </span>
          </div>
          <p className="setup-subtitle" style={{ color: '#8f98a4', margin: 0 }}>Texas Hold'em gegen Bots</p>
          <div className="setup-license" style={{ color: '#6f7884', fontSize: 10, marginTop: 7 }}>
            Freie Software ·{' '}
            <a
              href="https://www.gnu.org/licenses/agpl-3.0.html"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#8f98a4' }}
            >
              AGPL-3.0-only
            </a>
            {' '}· ohne Gewährleistung
            {APP_SOURCE_URL && (
              <>
                {' '}·{' '}
                <a
                  href={APP_SOURCE_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#a5dff5' }}
                >
                  Quellcode
                </a>
              </>
            )}
          </div>
        </header>

        <div className="setup-grid">
          <section className="setup-table-settings" style={{ background: 'rgba(255,255,255,0.04)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="setup-section-title" style={{ fontSize: 11, color: '#8f98a4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Tisch-Settings</div>
            <div className="setup-settings-grid">
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Blind-Preset</span>
                {runtime === 'android' ? (
                  <div className="setup-blind-picker" ref={blindPickerRef}>
                    <button
                      type="button"
                      className="setup-blind-trigger"
                      aria-haspopup="listbox"
                      aria-expanded={blindMenuOpen}
                      onClick={() => setBlindMenuOpen(open => !open)}
                      style={inputStyle}
                    >
                      {selectedBlindPreset
                        ? `${selectedBlindPreset.smallBlind} / ${selectedBlindPreset.bigBlind}`
                        : 'Freie Eingabe'}
                    </button>
                    {blindMenuOpen && (
                      <div className="setup-blind-menu" role="listbox" aria-label="Blind-Preset">
                        <button
                          type="button"
                          className="setup-blind-option"
                          role="option"
                          aria-selected={selectedBlindPresetKey === 'custom'}
                          onClick={() => setBlindMenuOpen(false)}
                        >
                          Freie Eingabe
                        </button>
                        {BLIND_PRESETS.map(preset => {
                          const key = blindPresetKey(preset.smallBlind, preset.bigBlind)
                          return (
                            <button
                              type="button"
                              className="setup-blind-option"
                              role="option"
                              aria-selected={selectedBlindPresetKey === key}
                              key={key}
                              onClick={() => applyBlindPreset(preset)}
                            >
                              {preset.smallBlind} / {preset.bigBlind}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <select
                    className="setup-blind-preset"
                    value={selectedBlindPresetKey}
                    onChange={event => {
                      const preset = BLIND_PRESETS.find(candidate =>
                        blindPresetKey(candidate.smallBlind, candidate.bigBlind) === event.target.value
                      )
                      if (preset) applyBlindPreset(preset)
                    }}
                    style={{ ...inputStyle, colorScheme: 'dark' }}
                  >
                    <option value="custom">Freie Eingabe</option>
                    {BLIND_PRESETS.map(preset => (
                      <option
                        key={blindPresetKey(preset.smallBlind, preset.bigBlind)}
                        value={blindPresetKey(preset.smallBlind, preset.bigBlind)}
                      >
                        {preset.smallBlind} / {preset.bigBlind}
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Small Blind</span>
                <input type="number" min={0.01} step={0.01} value={options.smallBlind} onChange={e => setOptions({ ...options, smallBlind: +e.target.value })} style={inputStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Big Blind</span>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={options.bigBlind}
                  onChange={e => {
                    const bigBlind = +e.target.value
                    setOptions({
                      ...options,
                      bigBlind,
                      startingChips: calculateStartingStack(bigBlind),
                    })
                  }}
                  style={inputStyle}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Starting Amount</span>
                <input type="number" min={options.bigBlind || 0.01} step={0.01} value={options.startingChips} onChange={e => setOptions({ ...options, startingChips: +e.target.value })} style={inputStyle} />
              </label>
            </div>
          </section>

          <div className="setup-sidebar">
            <section className="setup-option-card" style={{ background: 'rgba(255,255,255,0.04)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="setup-section-title" style={{ fontSize: 11, color: '#8f98a4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Tischgröße</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                {([
                  { count: 1, label: 'Heads-up', total: 2 },
                  { count: 5, label: '6-max', total: 6 },
                  { count: 8, label: 'Full Ring', total: 9 },
                ] as const).map(format => {
                  const selected = botCount === format.count
                  return (
                    <button
                      key={format.count}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setBotCount(format.count)
                        setOptions({ ...options, maxPlayers: format.total })
                      }}
                      style={{
                        padding: '8px 9px',
                        borderRadius: 7,
                        border: selected ? '1px solid rgba(125,211,252,0.7)' : '1px solid rgba(255,255,255,0.1)',
                        background: selected ? 'rgba(14,116,144,0.25)' : '#0e1116',
                        color: selected ? '#bae6fd' : '#aab2bd',
                        fontFamily: 'inherit',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {format.label}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="setup-option-card" style={{ background: 'rgba(255,255,255,0.04)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="setup-section-title" style={{ fontSize: 11, color: '#8f98a4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Währung</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {(['EUR', 'USD'] as const).map(option => {
                  const selected = currency === option
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setCurrency(option)}
                      style={{
                        padding: '8px 9px',
                        borderRadius: 7,
                        border: selected ? '1px solid rgba(125,211,252,0.7)' : '1px solid rgba(255,255,255,0.1)',
                        background: selected ? 'rgba(14,116,144,0.25)' : '#0e1116',
                        color: selected ? '#bae6fd' : '#aab2bd',
                        fontFamily: 'inherit',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {option === 'EUR' ? '€ Euro' : '$ Dollar'}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="setup-option-card" style={{ background: 'rgba(255,255,255,0.04)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="setup-section-title" style={{ fontSize: 11, color: '#8f98a4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Spielvariante</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {([
                  { id: 'texas-holdem', label: 'No Limit Texas Hold\'em' },
                  { id: 'omaha-high', label: 'Pot Limit Omaha High' },
                ] as const).map(option => {
                  const selected = variantId === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setVariantId(option.id)}
                      style={{
                        padding: '8px 9px',
                        borderRadius: 7,
                        border: selected ? '1px solid rgba(125,211,252,0.7)' : '1px solid rgba(255,255,255,0.1)',
                        background: selected ? 'rgba(14,116,144,0.25)' : '#0e1116',
                        color: selected ? '#bae6fd' : '#aab2bd',
                        fontFamily: 'inherit',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="setup-option-card" style={{ background: 'rgba(255,255,255,0.04)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="setup-section-title" style={{ fontSize: 11, color: '#8f98a4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Rebuys</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rebuyEnabled}
                  onChange={e => setRebuyEnabled(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#0e7490' }}
                />
                <span style={{ fontSize: 13, color: '#cbd5e1' }}>
                  Auto-Rebuy & Ersatz-Bots
                </span>
              </label>
              <p className="setup-rebuy-description" style={{ fontSize: 11, color: '#6b7280', margin: '8px 0 0 28px', lineHeight: 1.5 }}>
                Busted Bots kaufen nach oder werden nach 4 Händen durch neue ersetzt.<br />
                Nits verlassen den Tisch, LAGs kaufen aggressiv nach.
              </p>
            </section>

            <button className="setup-start-button" onClick={onStart} disabled={!!validationError} style={{
              width: '100%',
              marginTop: 'auto',
              padding: '14px 20px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(180deg, #cf2d20 0%, #8e1d15 58%, #62100c 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 17,
              cursor: validationError ? 'not-allowed' : 'pointer',
              opacity: validationError ? 0.55 : 1,
              boxShadow: '0 10px 22px rgba(0,0,0,0.28)',
            }}>
              Spiel starten ({botCount === 1 ? 'Heads-up' : botCount === 5 ? '6-max' : 'Full Ring'})
            </button>
          </div>
        </div>

        {validationError && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 14 }}>{validationError}</div>}
      </main>
    </div>
  )
}
