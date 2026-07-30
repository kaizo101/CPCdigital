import { useState } from 'react'
import type { SessionStatsData } from '../session/session-stats'
import { getPlayerVPIP, getPlayerPFR, getPlayer3Bet, getBBPer100 } from '../session/session-stats'

export function SessionStats({
  stats, playerNames, heroId, onExport, showDebug, compact = false, allowExport = true,
}: {
  stats: SessionStatsData
  playerNames: Map<string, string>
  heroId: string
  onExport: () => void
  showDebug: boolean
  compact?: boolean
  allowExport?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const heroVPIP = getPlayerVPIP(stats, heroId)
  const heroPFR = getPlayerPFR(stats, heroId)
  const hero3Bet = getPlayer3Bet(stats, heroId)
  const bbPer100 = getBBPer100(stats)

  if (stats.totalHands === 0) return null

  return (
    <div
      className="session-stats"
      data-compact={compact ? 'true' : 'false'}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}
    >
      <button
        onClick={() => setVisible(!visible)}
        aria-expanded={visible}
        title={visible ? 'Stats ausblenden' : 'Stats einblenden'}
        style={{
          minWidth: compact ? 29 : undefined,
          minHeight: compact ? 28 : undefined,
          padding: compact ? '3px 6px' : '6px 10px',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.15)',
          background: visible ? 'rgba(14,116,144,0.2)' : 'linear-gradient(180deg, #30343c 0%, rgba(25,25,25,0.98) 100%)',
          color: visible ? '#bae6fd' : '#9ca3af',
          fontFamily: 'monospace',
          fontSize: compact ? 14 : 18,
          lineHeight: 1,
          cursor: 'pointer',
          boxShadow: visible ? '0 0 0 2px rgba(125,211,252,0.3)' : 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 10px rgba(0,0,0,0.22)',
        }}
      >
        📊
      </button>

      {visible && (!showDebug || compact) && (
        <div className="session-stats-summary" style={{
          position: compact ? 'absolute' : undefined,
          top: compact ? 'calc(100% + 7px)' : undefined,
          right: compact ? 0 : undefined,
          zIndex: compact ? 120 : undefined,
          display: 'flex',
          alignItems: 'center',
          flexWrap: compact ? 'wrap' : undefined,
          gap: compact ? 6 : 10,
          width: compact ? 'max-content' : undefined,
          maxWidth: compact ? 'calc(100vw - 20px)' : undefined,
          padding: compact ? '7px 9px' : '6px 12px',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.1)',
          background: compact ? 'rgba(10,17,21,0.98)' : 'rgba(14,116,144,0.12)',
          boxShadow: compact ? '0 10px 24px rgba(0,0,0,0.52)' : undefined,
          fontFamily: 'monospace',
          fontSize: compact ? 9 : 11,
          color: '#bae6fd',
          whiteSpace: 'nowrap',
        }}>
          <span>VPIP <strong>{heroVPIP.toFixed(0)}%</strong></span>
          <span style={{ color: '#4b5563' }}>·</span>
          <span>PFR <strong>{heroPFR.toFixed(0)}%</strong></span>
          <span style={{ color: '#4b5563' }}>·</span>
          <span>3B <strong>{hero3Bet.toFixed(0)}%</strong></span>
          <span style={{ color: '#4b5563' }}>|</span>
          <span style={{ color: stats.heroBBWon >= 0 ? '#86efac' : '#fca5a5' }}>
            <strong>{stats.heroBBWon >= 0 ? '+' : ''}{stats.heroBBWon.toFixed(1)} BB</strong>
          </span>
          <span style={{ color: '#4b5563' }}>·</span>
          <span><strong>{bbPer100.toFixed(1)}</strong> BB/100</span>
          <span style={{ color: '#4b5563' }}>·</span>
          <span style={{ color: '#6b7280' }}>{stats.totalHands} hands</span>
          {allowExport && (
            <button
              onClick={onExport}
              title="Session-Log exportieren"
              style={{
                marginLeft: 2,
                padding: '2px 6px',
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                color: '#6b7280',
                fontFamily: 'monospace',
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              📄
            </button>
          )}
        </div>
      )}

      {visible && showDebug && !compact && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 6,
          padding: 12,
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(17,18,21,0.97)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          minWidth: 320,
          zIndex: 100,
          fontFamily: 'monospace',
          fontSize: 11,
          color: '#bae6fd',
        }}>
          <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 6 }}>
            Session · {stats.totalHands} hands · {bbPer100.toFixed(1)} BB/100
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#6b7280', textAlign: 'left' }}>
                <th style={{ padding: '1px 6px' }}>Player</th>
                <th style={{ padding: '1px 6px', textAlign: 'right' }}>VPIP</th>
                <th style={{ padding: '1px 6px', textAlign: 'right' }}>PFR</th>
                <th style={{ padding: '1px 6px', textAlign: 'right' }}>3B</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(stats.players).map(id => {
                const isHero = id === heroId
                return (
                  <tr key={id} style={{
                    color: isHero ? '#f3f4f6' : '#9ca3af',
                    fontWeight: isHero ? 600 : 400,
                  }}>
                    <td style={{ padding: '1px 6px' }}>
                      {playerNames.get(id) ?? id}{isHero ? ' *' : ''}
                    </td>
                    <td style={{ padding: '1px 6px', textAlign: 'right' }}>
                      {getPlayerVPIP(stats, id).toFixed(0)}%
                    </td>
                    <td style={{ padding: '1px 6px', textAlign: 'right' }}>
                      {getPlayerPFR(stats, id).toFixed(0)}%
                    </td>
                    <td style={{ padding: '1px 6px', textAlign: 'right' }}>
                      {getPlayer3Bet(stats, id).toFixed(0)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {allowExport && (
            <button
              onClick={onExport}
              style={{
                marginTop: 8,
                padding: '3px 8px',
                borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#1f2228',
                color: '#8f98a4',
                fontFamily: 'monospace',
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              📄 Export
            </button>
          )}
        </div>
      )}
    </div>
  )
}
