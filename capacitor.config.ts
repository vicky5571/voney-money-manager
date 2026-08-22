import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.voney.twa',
  appName: 'Voney',
  webDir: 'out',
  // Keep SSR on Vercel — Capacitor loads live URL. No local `out` needed yet.
  // Later switch to `next export` + webDir bundle for full offline.
  server: {
    url: 'https://voney-money-manager.vercel.app',
    cleartext: false,
  },
  plugins: {
    SplashScreen: { launchShowDuration: 300, backgroundColor: '#FFFFFF' },
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
};

export default config;
