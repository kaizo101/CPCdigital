const AVAILABLE_BOT_AVATAR_KEYS = new Set([
  'elias',
  'juno',
  'nika',
  'tom',
])

export function getBotAvatarUrl(avatarKey: string | undefined): string | null {
  if (!avatarKey || !AVAILABLE_BOT_AVATAR_KEYS.has(avatarKey)) return null
  return `./avatars/${avatarKey}.webp`
}
