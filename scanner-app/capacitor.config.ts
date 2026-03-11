import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.revealar.scanner',
  appName: 'RevealAR Scanner',
  webDir: 'out',
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'http',
    cleartext: true,
    allowNavigation: [
      '192.168.1.39.nip.io',
      '192.168.1.39',
      '*.nip.io',
    ],
  },
};

export default config;
