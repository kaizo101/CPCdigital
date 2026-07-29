import type { Card } from '@cpc/shared'

const SUIT_SYMBOL: Record<string, string> = {
  clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠',
}
const SUIT_COLOR: Record<string, string> = {
  clubs: '#222', diamonds: '#c00', hearts: '#c00', spades: '#222',
}

export function CardView({ card, large }: { card: Card; large?: boolean }) {
  const color = SUIT_COLOR[card.suit]
  const suit = SUIT_SYMBOL[card.suit]
  const w = large ? 'clamp(44px, 4.2vw + 0.4vh, 98px)' : 'clamp(36px, 3.2vw + 0.4vh, 82px)'
  const h = large ? 'clamp(62px, 5.9vw + 0.6vh, 138px)' : 'clamp(50px, 4.5vw + 0.6vh, 115px)'
  const rankSize = large ? 'clamp(18px, 2vw, 34px)' : 'clamp(15px, 1.65vw, 28px)'
  const suitCenter = large ? 'clamp(22px, 2.75vw, 48px)' : 'clamp(18px, 2.1vw, 38px)'
  return (
    <div className={large ? 'playing-card playing-card--large' : 'playing-card'} style={{
      display: 'inline-flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: w,
      height: h,
      border: '1px solid #b0b0b0',
      borderRadius: 5,
      background: '#ffffff',
      padding: '2px 3px',
      boxSizing: 'border-box',
      boxShadow: '0 3px 10px rgba(0,0,0,0.45)',
      userSelect: 'none',
      flexShrink: 0,
      position: 'relative',
    }}>
      <div style={{ color, lineHeight: 1, textAlign: 'left' }}>
        <div style={{ fontSize: rankSize, fontWeight: 800 }}>{card.rank}{suit}</div>
      </div>
      <div style={{ color, fontSize: suitCenter, textAlign: 'center', lineHeight: 1, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        {suit}
      </div>
      <div style={{ color, lineHeight: 1, textAlign: 'right', transform: 'rotate(180deg)', position: 'absolute', bottom: 2, right: 3 }}>
        <div style={{ fontSize: rankSize, fontWeight: 800 }}>{card.rank}{suit}</div>
      </div>
    </div>
  )
}

export function CardBack() {
  const w = 'clamp(36px, 3.2vw + 0.4vh, 82px)'
  const h = 'clamp(50px, 4.5vw + 0.6vh, 115px)'
  return (
    <div className="playing-card-back" style={{
      display: 'inline-flex',
      width: w,
      height: h,
      border: '1px solid #5a1a1a',
      borderRadius: 5,
      background: 'linear-gradient(160deg, #8b1a1a 0%, #6b0f0f 40%, #4a0a0a 100%)',
      boxShadow: '0 3px 10px rgba(0,0,0,0.45)',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute',
        inset: 3,
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 3,
        background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 6px)',
      }} />
    </div>
  )
}
