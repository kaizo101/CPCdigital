import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PortraitGuard } from './PortraitGuard'

describe('PortraitGuard', () => {
  it('explains the landscape requirement and keeps setup and legal notices accessible', () => {
    const markup = renderToStaticMarkup(<PortraitGuard onBack={vi.fn()} onOpenLegalNotice={vi.fn()} />)

    expect(markup).toContain('data-testid="portrait-guard"')
    expect(markup).toContain('aria-label="Querformat erforderlich"')
    expect(markup).toContain('Bitte ins Querformat drehen')
    expect(markup).toContain('vollständig sichtbar und bedienbar')
    expect(markup).toContain('Zurück zum Setup')
    expect(markup).toContain('Rechtliches: Impressum und Datenschutz')
  })
})
