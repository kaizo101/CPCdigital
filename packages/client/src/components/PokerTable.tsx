import type { Card } from '@cpc/shared'
import { CardView } from './Card'
import { formatChips, type DisplayCurrency } from '../utils/format'
import {
  getBetPosition,
  getTableButtonPosition,
  isOppositeHeroSeat,
  type TableButtonLabel,
} from '../utils/positions'

export function PokerTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="poker-table" style={{
      position: 'relative',
      width: '100%',
      maxWidth: 'none',
      aspectRatio: '2.38 / 1',
      margin: '0 auto',
      background: 'radial-gradient(circle at 50% 48%, #2e3137 0%, #141619 68%, #090a0c 100%)',
      borderRadius: 320,
      border: '2px solid rgba(255,255,255,0.08)',
      boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.03), 0 30px 70px rgba(0, 0, 0, 0.45)',
      overflow: 'visible',
    }}>
      <div style={{
        position: 'absolute',
        inset: 16,
        borderRadius: 300,
        background: 'linear-gradient(180deg, #46494f 0%, #1e2025 42%, #0f1114 100%)',
        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.05), 0 10px 25px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        inset: 30,
        borderRadius: 290,
        border: '3px solid #9f1f1b',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04), inset 0 0 18px rgba(223, 44, 39, 0.28)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        inset: 42,
        borderRadius: 278,
        background: 'radial-gradient(circle at 50% 46%, #0ea33a 0%, #0a8e31 48%, #09762a 74%, #066420 100%)',
        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.05), inset 0 -34px 88px rgba(0,0,0,0.2)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '47%',
        transform: 'translate(-50%, -50%)',
        color: 'rgba(255,255,255,0.11)',
        fontSize: 'clamp(42px, 2.2vw + 1vh, 62px)',
        fontStyle: 'italic',
        letterSpacing: 1,
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        CPCdigital
      </div>
      {children}
    </div>
  )
}

export function TablePot({ pot, sidePots, currency }: { pot: number; sidePots?: { amount: number }[]; currency: DisplayCurrency }) {
  return (
    <div className="table-pot" style={{
      position: 'absolute', left: '50%', top: '34%', transform: 'translate(-50%, -50%)',
      textAlign: 'center', zIndex: 10,
    }}>
      <div style={{
        background: 'linear-gradient(180deg, rgba(22,22,22,0.96) 0%, rgba(8,8,8,0.98) 100%)',
        padding: '4px 12px',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.12)',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#f1f1f1',
        letterSpacing: 0.4,
        boxShadow: '0 8px 16px rgba(0,0,0,0.28)',
      }}>
        Pot: {formatChips(pot, currency)}
      </div>
      {sidePots && sidePots.length > 1 && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 }}>
          {sidePots.slice(1).map((sp, i) => <span key={i}>Side {i + 1}: {formatChips(sp.amount, currency)} </span>)}
        </div>
      )}
    </div>
  )
}

export function CommunityCards({ cards, phase }: { cards: Card[]; phase: string }) {
  return (
    <div className="community-cards" style={{
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      gap: 8,
      zIndex: 5,
      minHeight: 76,
      alignItems: 'center',
      padding: '10px 14px',
      borderRadius: 14,
      background: 'linear-gradient(180deg, rgba(18,18,18,0.28) 0%, rgba(0,0,0,0.12) 100%)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {cards.length === 0 ? (
        <span style={{
          color: 'rgba(255,255,255,0.62)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1.4,
          background: 'rgba(10, 28, 15, 0.42)',
          padding: '8px 12px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {phase === 'waiting' ? 'Warte auf den Deal' : 'Board wird gedealt'}
        </span>
      ) : (
        cards.map((c, i) => <CardView key={i} card={c} large />)
      )}
    </div>
  )
}

export function TablePositionButtons({
  labels,
  seatIndex,
  seatCount,
  isHero = false,
}: {
  labels: TableButtonLabel[]
  seatIndex: number
  seatCount: number
  isHero?: boolean
}) {
  if (labels.length === 0) return null
  const position = getTableButtonPosition(seatIndex, seatCount)
  const isOppositeHero = isOppositeHeroSeat(seatIndex, seatCount)

  return (
    <div className={`table-position-buttons${isHero ? ' table-position-buttons--hero' : ''}${isOppositeHero ? ' table-position-buttons--opposite' : ''}`} style={{
      position: 'absolute',
      left: position.left,
      top: position.top,
      transform: isHero
        ? 'translate(-50%, -50%) translateX(-66px)'
        : 'translate(-50%, -50%)',
      display: 'flex',
      gap: 4,
      zIndex: 13,
      pointerEvents: 'none',
    }}>
      {labels.map(label => (
        <div key={label} style={{
          minWidth: 24,
          height: 24,
          padding: '0 5px',
          boxSizing: 'border-box',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 999,
          background: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #c8c8c8 82%)',
          border: '1px solid rgba(20,20,20,0.68)',
          boxShadow: '0 4px 9px rgba(0,0,0,0.34)',
          color: '#171717',
          fontSize: 9,
          fontWeight: 900,
          letterSpacing: 0.2,
        }}>
          {label}
        </div>
      ))}
    </div>
  )
}

export function BetStack({
  amount,
  seatIndex,
  seatCount,
  currency,
  isHero = false,
}: {
  amount: number
  seatIndex: number
  seatCount: number
  currency: DisplayCurrency
  isHero?: boolean
}) {
  if (amount <= 0) return null
  const position = getBetPosition(seatIndex, seatCount)

  return (
    <div className={`bet-stack${isHero ? ' bet-stack--hero' : ''}`} style={{
      position: 'absolute',
      left: position.left,
      top: position.top,
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      alignItems: 'center',
      gap: 5,
      zIndex: 14,
    }}>
      <div style={{ position: 'relative', width: 18, height: 18 }}>
        <span style={{
          position: 'absolute',
          left: 0,
          top: 4,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#ffffff',
          border: '2px solid #b80f24',
          boxShadow: '0 3px 8px rgba(0,0,0,0.22)',
        }} />
        <span style={{
          position: 'absolute',
          left: 6,
          top: 0,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#2b6be3',
          border: '2px solid #f5f5f5',
          boxShadow: '0 3px 8px rgba(0,0,0,0.22)',
        }} />
      </div>
      <span style={{
        padding: '2px 6px',
        borderRadius: 999,
        background: 'rgba(14,14,14,0.88)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#e5f4df',
        fontSize: 10,
        fontWeight: 700,
      }}>
        {formatChips(amount, currency)}
      </span>
    </div>
  )
}
