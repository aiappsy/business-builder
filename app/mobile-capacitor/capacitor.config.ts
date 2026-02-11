
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.business.builder',
  appName: 'Business Builder',
  webDir: '../web/dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
