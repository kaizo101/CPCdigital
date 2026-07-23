import { useState } from 'react'
import type { SessionStatsData } from '../session/session-stats'
import { getPlayerVPIP, getPlayerPFR, getPlayer3Bet, getBBPer100 } from '../session/session-stats'

export function SessionStats({
  stats, playerNames, heroId, onExport,
}: {
  stats: SessionStatsData
  playerNames: Map<string, string>
  heroId: string
  onExport: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const heroVPIP = getPlayerVPIP(stats, heroId)
  const heroPFR = getPlayerPFR(stats, heroId)
  const hero3Bet = getPlayer3Bet(stats, heroId)
  const bbPer100 = getBBPer100(stats)

  if (stats.totalHands === 0) return null

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.15)',
          background: expanded ? 'rgba(14,116,144,0.2)' : 'linear-gradient(180deg, #30343c 0%, rgba(25,25,25,0.98) 100%)',
          color: expanded ? '#bae6fd' : '#9ca3af',
          fontFamily: 'monospace',
          fontSize: 11,
          cursor: 'pointer',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 10px rgba(0,0,0,0.22)',
          whiteSpace: 'nowrap',
        }}
        title="Session-Statistiken"
      >
        📊 {heroVPIP.toFixed(0)}/{heroPFR.toFixed(0)}/{hero3Bet.toFixed(0)}
        <span style={{ color: stats.heroBBWon >= 0 ? '#86efac' : '#fca5a5', marginLeft: 6 }}>
          {stats.heroBBWon >= 0 ? '+' : ''}{stats.heroBBWon.toFixed(1)} BB
        </span>
      </button>

      {expanded && (
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
          minWidth: 240,
          zIndex: 100,
        }}>
          <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Session · {stats.totalHands} hands · {bbPer100.toFixed(1)} BB/100
          </div>

          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#6b7280', textAlign: 'left' }}>
                <th style={{ padding: '2px 6px' }}>Player</th>
                <th style={{ padding: '2px 6px', textAlign: 'right' }}>VPIP</th>
                <th style={{ padding: '2px 6px', textAlign: 'right' }}>PFR</th>
                <th style={{ padding: '2px 6px', textAlign: 'right' }}>3B</th>
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
                    <td style={{ padding: '2px 6px' }}>
                      {playerNames.get(id) ?? id}
                      {isHero ? ' *' : ''}
                    </td>
                    <td style={{ padding: '2px 6px', textAlign: 'right' }}>
                      {getPlayerVPIP(stats, id).toFixed(0)}%
                    </td>
                    <td style={{ padding: '2px 6px', textAlign: 'right' }}>
                      {getPlayerPFR(stats, id).toFixed(0)}%
                    </td>
                    <td style={{ padding: '2px 6px', textAlign: 'right' }}>
                      {getPlayer3Bet(stats, id).toFixed(0)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <button
            onClick={onExport}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '5px 8px',
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.1)',
              background: '#1f2228',
              color: '#8f98a4',
              fontFamily: 'monospace',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            📄 Session-Log exportieren
          </button>
        </div>
      )}
    </div>
  )
}
