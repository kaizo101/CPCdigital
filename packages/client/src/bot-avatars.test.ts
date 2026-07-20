import { describe, expect, it } from 'vitest'
import { getBotAvatarUrl } from './bot-avatars'

describe('bot avatars', () => {
  it('returns public URLs only for avatars that ship with the client', () => {
    expect(getBotAvatarUrl('juno')).toBe('./avatars/juno.webp')
    expect(getBotAvatarUrl('elias')).toBe('./avatars/elias.webp')
    expect(getBotAvatarUrl('mara')).toBeNull()
    expect(getBotAvatarUrl(undefined)).toBeNull()
  })
})
