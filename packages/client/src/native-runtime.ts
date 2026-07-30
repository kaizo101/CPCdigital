import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'

export type AppRuntime = 'web' | 'android'

export function resolveAppRuntime(platform: string, isNative: boolean): AppRuntime {
  return isNative && platform === 'android' ? 'android' : 'web'
}

export function getAppRuntime(): AppRuntime {
  return resolveAppRuntime(Capacitor.getPlatform(), Capacitor.isNativePlatform())
}

export function isAndroidRuntime(): boolean {
  return getAppRuntime() === 'android'
}

export async function applyAndroidSystemUi(): Promise<void> {
  if (!isAndroidRuntime()) return

  try {
    await SystemBars.setStyle({ style: SystemBarsStyle.Dark })
    await SystemBars.hide()
  } catch (error) {
    console.warn('[android] Systemleisten konnten nicht ausgeblendet werden.', error)
  }
}
