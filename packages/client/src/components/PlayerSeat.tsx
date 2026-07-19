import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Card, Player } from '@cpc/shared'
import { CardView, CardBack } from './Card'
import { formatChips, type DisplayCurrency } from '../utils/format'
import { getSeatPosition } from '../utils/positions'
import type { PlayerActionLabel } from '../action-display'

export function PlayerSeat({
  player, seatIndex, seatCount, isMe, isCurrent, actionLabel, myCards, revealedCards, showCards,
  currency, startingChips, rebuyPending, onRebuy,
}: {
  player: Player
  seatIndex: number
  seatCount: number
  isMe: boolean
  isCurrent: boolean
  actionLabel?: PlayerActionLabel
  myCards?: [Card, Card] | null
  revealedCards?: [Card, Card]
  showCards: boolean
  currency: DisplayCurrency
  startingChips: number
  rebuyPending: boolean
  onRebuy: () => void
}) {
  const [isHovering, setIsHovering] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const position = getSeatPosition(seatIndex, seatCount)
  const isFolded = player.status === 'folded'
  const visibleCards = revealedCards ?? (isMe ? myCards : null)
  const canPeekFoldedCards = isMe && isFolded && !!myCards
  const isPeekingFoldedCards = canPeekFoldedCards && isHovering
  const showHoleCards = (showCards && (!isMe || !!visibleCards)) || isPeekingFoldedCards
  const canRebuy = player.chips < startingChips && !rebuyPending

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', close)
    window.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', close)
    }
  }, [contextMenu])

  const openRebuyMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const menuWidth = 248
    const menuHeight = 142
    const padding = 10
    setContextMenu({
      x: Math.max(padding, Math.min(event.clientX, window.innerWidth - menuWidth - padding)),
      y: Math.max(padding, Math.min(event.clientY, window.innerHeight - menuHeight - padding)),
    })
  }

  return (
    <div style={{
      position: 'absolute',
      left: position.left,
      top: position.top,
      transform: 'translate(-50%, -50%)',
      width: `clamp(160px, 12vw, ${position.width}px)`,
      textAlign: 'center',
      zIndex: isCurrent ? 30 : 20,
    }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onContextMenu={openRebuyMenu}
      title="Rechtsklick für Rebuy"
    >
      <div style={{
        position: 'relative',
        isolation: 'isolate',
        opacity: isPeekingFoldedCards ? 0.88 : isFolded ? 0.68 : 1,
        transition: 'opacity 140ms ease',
      }}>
        {showHoleCards && (
          <div style={{
            position: 'absolute',
            bottom: 44,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 1,
            zIndex: 0,
            filter: isPeekingFoldedCards ? 'grayscale(0.18) saturate(0.82) brightness(0.9)' : 'none',
            transition: 'filter 140ms ease',
          }}>
            {visibleCards ? (
              <>
                <CardView card={visibleCards[0]} />
                <CardView card={visibleCards[1]} />
              </>
            ) : (
              <>
                <CardBack />
                <CardBack />
              </>
            )}
          </div>
        )}

        <div style={{
          position: 'relative',
          zIndex: 1,
          minWidth: 106,
          padding: '8px 13px 7px',
          background: isMe ? 'linear-gradient(180deg, #1d2733 0%, #10151c 100%)' : 'linear-gradient(180deg, rgba(43,43,43,0.98) 0%, rgba(18,18,18,1) 100%)',
          border: isMe ? '2px solid #2a7af0' : isCurrent ? '1px solid #bfc7d0' : '1px solid rgba(255,255,255,0.16)',
          borderRadius: 999,
          boxShadow: isCurrent ? '0 0 0 3px rgba(54, 140, 255, 0.18)' : '0 8px 18px rgba(0,0,0,0.28)',
          transform: isCurrent ? 'translateY(-1px)' : 'translateY(0)',
          transition: 'transform 180ms ease, box-shadow 180ms ease',
        }}>
          <div style={{
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 1,
          }}>
            {player.name}
          </div>
          <div style={{ color: '#d8dde3', fontSize: 13, fontWeight: 700 }}>
            {formatChips(player.chips, currency)}
          </div>
          {(player.status !== 'waiting' || player.isSittingOut) && (
            <div style={{
              marginTop: 1,
              fontSize: 9,
              color: player.isSittingOut ? '#9cc6ff' : isFolded ? '#d5d0ca' : '#92d767',
              textTransform: 'uppercase',
              letterSpacing: 0.7,
            }}>
              {player.isSittingOut ? 'Sitting Out' : isFolded ? 'Folded' : actionLabel ?? player.status}
            </div>
          )}
        </div>
      </div>

      {isCurrent && (
        <div style={{
          marginTop: 4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 7px',
          borderRadius: 999,
          background: 'linear-gradient(180deg, #203043 0%, #121a23 100%)',
          border: '1px solid rgba(84, 148, 235, 0.8)',
          color: '#8dc3ff',
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}>
          Am Zug
        </div>
      )}

      {contextMenu && createPortal(
        <div
          role="menu"
          aria-label={`Rebuy für ${player.name}`}
          onPointerDown={event => event.stopPropagation()}
          onContextMenu={event => event.preventDefault()}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            width: 228,
            padding: 10,
            zIndex: 1000,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'linear-gradient(180deg, rgba(27,31,37,0.99) 0%, rgba(10,12,15,0.99) 100%)',
            boxShadow: '0 18px 45px rgba(0,0,0,0.58)',
            color: '#e5e7eb',
            fontFamily: 'monospace',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: '#f3f4f6' }}>{player.name}</div>
          <div style={{ marginTop: 3, fontSize: 10, color: '#8f98a4' }}>
            Stack {formatChips(player.chips, currency)} · Ziel {formatChips(startingChips, currency)}
          </div>
          <button
            type="button"
            role="menuitem"
            disabled={!canRebuy}
            onClick={onRebuy}
            style={{
              width: '100%',
              marginTop: 9,
              padding: '9px 10px',
              borderRadius: 7,
              border: rebuyPending
                ? '1px solid rgba(74,222,128,0.45)'
                : '1px solid rgba(255,255,255,0.12)',
              background: canRebuy
                ? 'linear-gradient(180deg, #256b42 0%, #17472c 100%)'
                : rebuyPending
                  ? 'rgba(22,101,52,0.22)'
                  : '#252a31',
              color: canRebuy ? '#f0fdf4' : rebuyPending ? '#86efac' : '#77818c',
              fontFamily: 'inherit',
              fontSize: 11,
              fontWeight: 800,
              cursor: canRebuy ? 'pointer' : 'default',
            }}
          >
            {rebuyPending
              ? 'Für nächste Hand vorgemerkt'
              : player.chips >= startingChips
                ? 'Bereits mindestens Startstack'
                : 'Auf Startstack auffüllen'}
          </button>
        </div>,
        document.body,
      )}
    </div>
  )
}
