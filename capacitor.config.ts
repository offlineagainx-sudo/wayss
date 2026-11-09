import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wayss.social',
  appName: 'WAYSS',
  webDir: 'public',
  server: {
    url: 'https://wayss-vqpb.vercel.app',
    cleartext: false,
    androidScheme: 'https'
  }
};

export default config;
