import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.thomas.codetasks',
  appName: 'code-tasks',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
