declare const __APP_VERSION__: string
declare const __APP_SOURCE_URL__: string

/** Release version injected from the root package.json by Vite. */
export const APP_VERSION = __APP_VERSION__

/** Optional public source URL, injected for network-hosted builds such as the demo. */
export const APP_SOURCE_URL = __APP_SOURCE_URL__
