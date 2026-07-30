import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.github.kaizo101.cpcdigital',
  appName: 'CPCdigital',
  webDir: 'packages/client/dist',
  backgroundColor: '#090b0e',
  loggingBehavior: 'debug',
  android: {
    path: 'android',
    backgroundColor: '#090b0e',
    zoomEnabled: false,
  },
  plugins: {
    App: {
      disableBackButtonHandler: true,
    },
    SystemBars: {
      hidden: true,
      insetsHandling: 'css',
      style: 'DARK',
    },
  },
}

export default config
