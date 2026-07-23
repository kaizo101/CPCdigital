import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Card, Player } from '@cpc/shared'
import { CardView, CardBack } from './Card'
import { formatChips, type DisplayCurrency } from '../utils/format'
import { getSeatPosition } from '../utils/positions'
import type { PlayerActionLabel } from '../action-display'
import { getBotAvatarUrl } from '../bot-avatars'

export function PlayerSeat({
  player, seatIndex, seatCount, isMe, isCurrent, avatarKey, actionLabel, myCards, revealedCards, showCards, holeCardCount,
  currency, startingChips, rebuyPending, onRebuy,
}: {
  player: Player
  seatIndex: number
  seatCount: number
  isMe: boolean
  isCurrent: boolean
  avatarKey?: string
  actionLabel?: PlayerActionLabel
  myCards?: Card[] | null
  revealedCards?: Card[]
  holeCardCount?: number
  showCards: boolean
  currency: DisplayCurrency
  startingChips: number
  rebuyPending: boolean
  onRebuy: () => void
}) {
  const [isHovering, setIsHovering] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null)
  const position = getSeatPosition(seatIndex, seatCount)
  const isFolded = player.status === 'folded'
  const visibleCards = revealedCards ?? (isMe ? myCards : null)
  const canPeekFoldedCards = isMe && isFolded && !!myCards
  const isPeekingFoldedCards = canPeekFoldedCards && isHovering
  const showHoleCards = (showCards && (!isMe || !!visibleCards)) || isPeekingFoldedCards
  const cardBackCount = () => {
    if (isMe && myCards) return myCards.length
    if (revealedCards) return revealedCards.length
    return holeCardCount ?? 2
  }
  const canRebuy = player.chips < startingChips && !rebuyPending
  const avatarUrl = getBotAvatarUrl(avatarKey)
  const visibleAvatarUrl = avatarUrl === failedAvatarUrl ? null : avatarUrl
  const avatarInitials = player.name
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toLocaleUpperCase()

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

  const openRebuyMenu = (event: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
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

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (longPressTimer) clearTimeout(longPressTimer)
    const timer = setTimeout(() => {
      setLongPressTimer(null)
      openRebuyMenu(event)
    }, 600)
    setLongPressTimer(timer)
  }

  const handlePointerUp = () => {
    if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null) }
  }

  return (
    <div style={{
      position: 'absolute',
      left: position.left,
      top: position.top,
      transform: 'translate(-50%, -50%)',
      width: `clamp(168px, 13.5vw, ${position.width}px)`,
      textAlign: 'center',
      zIndex: isCurrent ? 30 : 20,
    }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onContextMenu={openRebuyMenu}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      title="Rechtsklick oder lang drücken für Rebuy"
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
            bottom: 50,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
            zIndex: 0,
            filter: isPeekingFoldedCards ? 'grayscale(0.18) saturate(0.82) brightness(0.9)' : 'none',
            transition: 'filter 140ms ease',
          }}>
            {visibleCards ? (
              <>
                {visibleCards.map((card, i) => (
                  <div key={i} style={{
                    marginLeft: i === 0 ? 0 : visibleCards.length <= 2 ? 0 : -16,
                    zIndex: i,
                  }}>
                    <CardView card={card} />
                  </div>
                ))}
              </>
            ) : (
              <>
                {Array.from({ length: cardBackCount() }, (_, i) => (
                  <div key={i} style={{
                    marginLeft: i === 0 ? 0 : cardBackCount() <= 2 ? 0 : -16,
                    zIndex: i,
                  }}>
                    <CardBack />
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        <div style={{
          position: 'relative',
          zIndex: 1,
          minWidth: avatarKey ? 138 : 120,
          minHeight: avatarKey ? 56 : undefined,
          boxSizing: 'border-box',
          padding: avatarKey ? '7px 15px 6px 56px' : '10px 16px 9px',
          background: isMe ? 'linear-gradient(180deg, #1d2733 0%, #10151c 100%)' : 'linear-gradient(180deg, rgba(43,43,43,0.98) 0%, rgba(18,18,18,1) 100%)',
          border: isMe ? '2px solid #2a7af0' : isCurrent ? '1px solid #bfc7d0' : '1px solid rgba(255,255,255,0.16)',
          borderRadius: 999,
          boxShadow: isCurrent ? '0 0 0 3px rgba(54, 140, 255, 0.18)' : '0 8px 18px rgba(0,0,0,0.28)',
          transform: isCurrent ? 'translateY(-1px)' : 'translateY(0)',
          transition: 'transform 180ms ease, box-shadow 180ms ease',
        }}>
          {avatarKey && (
            <div style={{
              position: 'absolute',
              left: -4,
              top: '50%',
              width: 56,
              height: 56,
              transform: 'translateY(-50%)',
              overflow: 'hidden',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '50%',
              border: isCurrent ? '2px solid #8dc3ff' : '2px solid rgba(255,255,255,0.28)',
              background: 'radial-gradient(circle at 35% 25%, #36576a 0%, #17303a 48%, #0c171d 100%)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
              color: '#d8e7eb',
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 0.4,
            }}>
              {visibleAvatarUrl ? (
                <img
                  src={visibleAvatarUrl}
                  alt=""
                  draggable={false}
                  onError={() => setFailedAvatarUrl(visibleAvatarUrl)}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    objectFit: 'cover',
                    objectPosition: '50% 34%',
                  }}
                />
              ) : avatarInitials}
            </div>
          )}
          <div style={{
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 1,
          }}>
            {player.name}
          </div>
          <div style={{ color: '#d8dde3', fontSize: 14, fontWeight: 700 }}>
            {formatChips(player.chips, currency)}
          </div>
          {(player.status !== 'waiting' || player.isSittingOut) && (
            <div style={{
              marginTop: 1,
              fontSize: 10,
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
