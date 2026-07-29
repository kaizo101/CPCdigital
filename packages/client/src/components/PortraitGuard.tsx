export function PortraitGuard({ onBack }: { onBack: () => void }) {
  return (
    <div
      className="portrait-guard"
      role="region"
      aria-label="Querformat erforderlich"
      data-testid="portrait-guard"
    >
      <div style={{
        width: 'min(420px, 100%)',
        padding: '28px 24px',
        boxSizing: 'border-box',
        textAlign: 'center',
        borderRadius: 18,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'linear-gradient(180deg, rgba(24,27,32,0.98) 0%, rgba(10,12,15,0.98) 100%)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.38)',
      }}>
        <div aria-hidden="true" style={{ fontSize: 44, lineHeight: 1 }}>↻</div>
        <h1 style={{ margin: '18px 0 8px', fontSize: 22 }}>Bitte ins Querformat drehen</h1>
        <p style={{ margin: 0, color: '#a8b0bb', fontSize: 13, lineHeight: 1.55 }}>
          Der Pokertisch benötigt mehr Breite, damit Karten, Sitze und Aktionen
          vollständig sichtbar und bedienbar bleiben.
        </p>
        <button
          type="button"
          onClick={onBack}
          style={{
            marginTop: 20,
            padding: '10px 18px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.18)',
            cursor: 'pointer',
            background: 'linear-gradient(180deg, #30343c 0%, rgba(25,25,25,0.98) 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 8px 18px rgba(0,0,0,0.22)',
          }}
        >
          Zurück zum Setup
        </button>
      </div>
    </div>
  )
}
