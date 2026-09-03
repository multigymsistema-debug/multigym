import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'br.com.multigym.app',
  appName: 'MultiGym',
  webDir: 'frontend/dist',
  server: { url: 'https://multigym-web.onrender.com', cleartext: false },
  android: { allowMixedContent: false }
};
export default config;
