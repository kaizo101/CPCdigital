import { useState } from 'react'
import type { Card, Player } from '@cpc/shared'
import { CardView, CardBack } from './Card'
import { formatChips } from '../utils/format'
import { getSeatPosition } from '../utils/positions'
import type { PlayerActionLabel } from '../action-display'

export function PlayerSeat({
  player, seatIndex, seatCount, isMe, isCurrent, actionLabel, myCards, revealedCards, showCards,
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
}) {
  const [isHovering, setIsHovering] = useState(false)
  const position = getSeatPosition(seatIndex, seatCount)
  const isFolded = player.status === 'folded'
  const visibleCards = revealedCards ?? (isMe ? myCards : null)
  const canPeekFoldedCards = isMe && isFolded && !!myCards
  const isPeekingFoldedCards = canPeekFoldedCards && isHovering
  const showHoleCards = (showCards && (!isMe || !!visibleCards)) || isPeekingFoldedCards

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
            {formatChips(player.chips)}
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
    </div>
  )
}
