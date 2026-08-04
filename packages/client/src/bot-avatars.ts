const AVAILABLE_BOT_AVATAR_KEYS = new Set([
  // Keys are grouped by source sheet in quadrant order: TL, TR, BL, BR.
  'juno', 'elias', 'nika', 'tom',
  'mina', 'levin', 'sora', 'david',
  'kira', 'jan', 'liv', 'oskar',
  'dario', 'cleo', 'ivo', 'theo',
  'alva', 'noel', 'finn', 'runa',
  'enya', 'bela', 'lio', 'mira',
  'jara', 'kuno', 'sami', 'nele',
  'zora', 'robin', 'elin', 'armin',
  'mara', 'jonas', 'leni', 'milan',
  'hedi', 'tessa', 'nuri', 'yara',
])

export function getBotAvatarUrl(avatarKey: string | undefined): string | null {
  if (!avatarKey || !AVAILABLE_BOT_AVATAR_KEYS.has(avatarKey)) return null
  return `./avatars/${avatarKey}.webp`
}
