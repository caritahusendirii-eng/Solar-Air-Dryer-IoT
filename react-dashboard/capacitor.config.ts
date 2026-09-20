import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solardryer.iot',
  appName: 'Solar Dryer IoT',
  webDir: 'build',
  android: {
    backgroundColor: '#fffcf2',
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
    url: 'https://solardryeriot.vercel.app',
    cleartext: true,
  },
};

export default config;
