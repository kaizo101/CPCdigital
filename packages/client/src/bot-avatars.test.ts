import { describe, expect, it } from 'vitest'
import { getBotAvatarUrl } from './bot-avatars'
import { INITIAL_BOT_IDENTITY_NAMES } from './bot-identities'

describe('bot avatars', () => {
  it('returns public URLs for the 40 portraits that ship with the client', () => {
    const shippedKeys = INITIAL_BOT_IDENTITY_NAMES
      .slice(0, 40)
      .map(name => name.toLowerCase())

    for (const avatarKey of shippedKeys) {
      expect(getBotAvatarUrl(avatarKey)).toBe(`./avatars/${avatarKey}.webp`)
    }
  })

  it('falls back to initials for identities without a shipped portrait', () => {
    for (const name of INITIAL_BOT_IDENTITY_NAMES.slice(40)) {
      expect(getBotAvatarUrl(name.toLowerCase())).toBeNull()
    }
    expect(getBotAvatarUrl(undefined)).toBeNull()
  })
})
