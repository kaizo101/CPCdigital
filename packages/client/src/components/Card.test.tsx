import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CardView } from './Card'

describe('CardView', () => {
  it('shows a ten as 10 in both visible corners without changing its internal rank', () => {
    const card = { rank: 'T' as const, suit: 'hearts' as const }
    const markup = renderToStaticMarkup(<CardView card={card} />)

    expect(markup.match(/>10♥<\/div>/g)).toHaveLength(2)
    expect(markup).not.toContain('>T♥</div>')
    expect(card.rank).toBe('T')
  })

  it('leaves other visible ranks unchanged', () => {
    const markup = renderToStaticMarkup(<CardView card={{ rank: 'A', suit: 'spades' }} large />)

    expect(markup.match(/>A♠<\/div>/g)).toHaveLength(2)
  })
})
