import type { TableOptions } from '@cpc/shared'
import { calculateStartingStack, clamp, type DisplayCurrency } from '../utils/format'
import { APP_VERSION } from '../app-version'

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
}) {
  const maxBots = 8
  const selectedBlindPreset = BLIND_PRESETS.find(preset =>
    preset.smallBlind === options.smallBlind && preset.bigBlind === options.bigBlind
  )
  const selectedBlindPresetKey = selectedBlindPreset
    ? blindPresetKey(selectedBlindPreset.smallBlind, selectedBlindPreset.bigBlind)
    : 'custom'
  const validationError = (() => {
    if (!Number.isFinite(options.smallBlind) || options.smallBlind <= 0) return 'Small Blind muss größer als 0 sein.'
    if (!Number.isFinite(options.bigBlind) || options.bigBlind <= 0) return 'Big Blind muss größer als 0 sein.'
    if (options.smallBlind > options.bigBlind) return 'Small Blind darf nicht größer als Big Blind sein.'
    if (!Number.isFinite(options.startingChips) || options.startingChips < options.bigBlind) return 'Starting Chips müssen mindestens einem Big Blind entsprechen.'
    if (!Number.isInteger(botCount) || botCount < 1 || botCount > maxBots) return `Für diesen Tisch sind 1–${maxBots} Bots möglich.`
    return null
  })()

  return (
    <div style={{
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
        @media (max-width: 720px) {
          .setup-shell { padding: 20px; }
          .setup-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .setup-settings-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <main className="setup-shell">
        <header style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>CPCdigital</h1>
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
          <p style={{ color: '#8f98a4', margin: 0 }}>Texas Hold'em gegen Bots</p>
        </header>

        <div className="setup-grid">
          <section style={{ background: 'rgba(255,255,255,0.04)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 11, color: '#8f98a4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Tisch-Settings</div>
            <div className="setup-settings-grid">
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Blind-Preset</span>
                <select
                  value={selectedBlindPresetKey}
                  onChange={event => {
                    const preset = BLIND_PRESETS.find(candidate =>
                      blindPresetKey(candidate.smallBlind, candidate.bigBlind) === event.target.value
                    )
                    if (!preset) return
                    setOptions({
                      ...options,
                      smallBlind: preset.smallBlind,
                      bigBlind: preset.bigBlind,
                      startingChips: calculateStartingStack(preset.bigBlind),
                    })
                  }}
                  style={inputStyle}
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
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Starting Chips</span>
                <input type="number" min={options.bigBlind || 0.01} step={0.01} value={options.startingChips} onChange={e => setOptions({ ...options, startingChips: +e.target.value })} style={inputStyle} />
              </label>
            </div>
          </section>

          <div className="setup-sidebar">
            <section style={{ background: 'rgba(255,255,255,0.04)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 11, color: '#8f98a4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Bots</div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Anzahl Bots (1-{maxBots})</span>
                <input
                  type="number"
                  min={1}
                  max={maxBots}
                  step={1}
                  value={botCount}
                  onChange={e => {
                    const count = clamp(+e.target.value || 1, 1, maxBots)
                    setBotCount(count)
                    setOptions({ ...options, maxPlayers: count + 1 })
                  }}
                  style={inputStyle}
                />
              </label>
            </section>

            <section style={{ background: 'rgba(255,255,255,0.04)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 11, color: '#8f98a4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Währung</div>
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

            <section style={{ background: 'rgba(255,255,255,0.04)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 11, color: '#8f98a4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Rebuys</div>
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
              <p style={{ fontSize: 11, color: '#6b7280', margin: '8px 0 0 28px', lineHeight: 1.5 }}>
                Busted Bots kaufen nach oder werden nach 4 Händen durch neue ersetzt.<br />
                Nits verlassen den Tisch, LAGs kaufen aggressiv nach.
              </p>
            </section>

            <button onClick={onStart} disabled={!!validationError} style={{
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
              Spiel starten ({botCount} Bots)
            </button>
          </div>
        </div>

        {validationError && <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 14 }}>{validationError}</div>}
      </main>
    </div>
  )
}
