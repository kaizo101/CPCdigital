import type { TableOptions } from '@cpc/shared'
import { clamp } from '../utils/format'

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
}: {
  options: TableOptions
  setOptions: (options: TableOptions) => void
  botCount: number
  setBotCount: (count: number) => void
  onStart: () => void
}) {
  const maxBots = Math.max(1, Math.min(8, options.maxPlayers - 1))
  const validationError = (() => {
    if (!Number.isFinite(options.smallBlind) || options.smallBlind <= 0) return 'Small Blind muss größer als 0 sein.'
    if (!Number.isFinite(options.bigBlind) || options.bigBlind <= 0) return 'Big Blind muss größer als 0 sein.'
    if (options.smallBlind > options.bigBlind) return 'Small Blind darf nicht größer als Big Blind sein.'
    if (!Number.isInteger(options.maxPlayers) || options.maxPlayers < 2 || options.maxPlayers > 9) return 'Spielerzahl muss zwischen 2 und 9 liegen.'
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
          <h1 style={{ fontSize: 30, fontWeight: 700, margin: '0 0 6px' }}>CPC-Offline</h1>
          <p style={{ color: '#8f98a4', margin: 0 }}>Texas Hold'em gegen Bots</p>
        </header>

        <div className="setup-grid">
          <section style={{ background: 'rgba(255,255,255,0.04)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 11, color: '#8f98a4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Tisch-Settings</div>
            <div className="setup-settings-grid">
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Small Blind</span>
                <input type="number" min={0.01} step={0.01} value={options.smallBlind} onChange={e => setOptions({ ...options, smallBlind: +e.target.value })} style={inputStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Big Blind</span>
                <input type="number" min={0.01} step={0.01} value={options.bigBlind} onChange={e => setOptions({ ...options, bigBlind: +e.target.value })} style={inputStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Max Spieler</span>
                <input
                  type="number"
                  min={2}
                  max={9}
                  step={1}
                  value={options.maxPlayers}
                  onChange={e => {
                    const maxPlayers = +e.target.value
                    setOptions({ ...options, maxPlayers })
                    setBotCount(Math.min(botCount, Math.max(1, maxPlayers - 1)))
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
                <input type="number" min={1} max={maxBots} step={1} value={botCount} onChange={e => setBotCount(clamp(+e.target.value || 1, 1, maxBots))} style={inputStyle} />
              </label>
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
