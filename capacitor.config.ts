import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.moneytracker.app',
  appName: 'Money Tracker',
  webDir: 'dist',
  backgroundColor: '#09090b',
  plugins: {
    SplashScreen: { launchShowDuration: 800, backgroundColor: '#09090b', showSpinner: false },
    Keyboard: { resizeOnFullScreen: true },
  },
}

export default config
