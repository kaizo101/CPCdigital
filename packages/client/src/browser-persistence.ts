import { BOT_ROSTER_STORAGE_KEY, SESSION_LOG_STORAGE_KEY } from './bot-roster-store'
import { HAND_REPLAY_ARCHIVE_KEY } from './session/hand-replay'
import { isAndroidRuntime } from './native-runtime'

const CHOICE_KEY = 'cpcdigital:browser-persistence-choice'
const PERSISTED_HISTORY_KEYS = [
  BOT_ROSTER_STORAGE_KEY,
  SESSION_LOG_STORAGE_KEY,
  HAND_REPLAY_ARCHIVE_KEY,
  'replay-session',
  'replay-start-index',
  'replay-debug',
] as const

/** Only the plain browser demo needs an opt-in; native shells retain their policy. */
export function isPlainBrowserRuntime(): boolean {
  if (typeof window === 'undefined') return false
  const hasElectronBridge = Boolean((window as Window & { electronAPI?: unknown }).electronAPI)
  return !hasElectronBridge && !isAndroidRuntime()
}

export function readBrowserPersistenceChoice(): boolean {
  try {
    return localStorage.getItem(CHOICE_KEY) === '1'
  } catch {
    return false
  }
}

export function enableBrowserPersistence(): boolean {
  try {
    localStorage.setItem(CHOICE_KEY, '1')
    return true
  } catch {
    return false
  }
}

/** Opting out also removes old, pre-opt-in browser history. */
export function disableBrowserPersistence(): boolean {
  let removedAll = true
  const legacyReplayKeys: string[] = []
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key && /^replay-\d+$/.test(key)) legacyReplayKeys.push(key)
    }
  } catch {
    removedAll = false
  }
  for (const key of [CHOICE_KEY, ...PERSISTED_HISTORY_KEYS, ...legacyReplayKeys]) {
    try {
      localStorage.removeItem(key)
    } catch {
      removedAll = false
    }
  }
  return removedAll
}
