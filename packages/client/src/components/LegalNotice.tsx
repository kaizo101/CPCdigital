import { useEffect } from 'react'

// The client uses Vite's relative base (`./`) for Pages, Electron, and Android.
const notices = {
  imprint: { title: 'Impressum', url: './impressum.html' },
  privacy: { title: 'Datenschutz', url: './datenschutz.html' },
} as const

export type LegalNoticeKind = keyof typeof notices

export function LegalNoticeLink({ kind, onOpen, style }: {
  kind: LegalNoticeKind
  onOpen: () => void
  style?: React.CSSProperties
}) {
  const notice = notices[kind]
  return (
    <a
      href={notice.url}
      style={style}
      onClick={event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        onOpen()
      }}
    >
      {notice.title}
    </a>
  )
}

export function LegalNoticeDialog({ kind, onSelect, onClose }: {
  kind: LegalNoticeKind
  onSelect: (kind: LegalNoticeKind) => void
  onClose: () => void
}) {
  const notice = notices[kind]
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rechtliches"
      onClick={event => {
        if (event.target === event.currentTarget) onClose()
      }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000, padding: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.8)', boxSizing: 'border-box',
      }}
    >
      <div style={{
        width: 'min(100%, 760px)', height: 'min(100%, 780px)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: 12,
        background: '#101318',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 8 }}>
          {(Object.keys(notices) as LegalNoticeKind[]).map(item => (
            <button
              key={item}
              type="button"
              aria-pressed={kind === item}
              onClick={() => onSelect(item)}
              style={{
                padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                background: kind === item ? 'rgba(14, 116, 144, 0.35)' : '#30343c',
                color: '#fff', font: 'inherit',
              }}
            >
              {notices[item].title}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <button type="button" onClick={onClose} autoFocus style={{
            padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            background: '#30343c', color: '#fff', font: 'inherit',
          }}>
            Schließen
          </button>
        </div>
        <iframe
          title={notice.title}
          src={notice.url}
          style={{ flex: 1, width: '100%', border: 0, background: '#101318' }}
        />
      </div>
    </div>
  )
}
