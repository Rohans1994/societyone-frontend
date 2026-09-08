import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.societyone.app',
  appName: 'SocietyOne',
  webDir: 'dist',
  // Local dev/testing only: the app's WebView origin is https://localhost,
  // but the backend it's talking to during local testing is plain
  // http://192.168.0.234:3001 (no cert). WebViews block this "mixed
  // content" (secure page -> insecure request) by default, separately from
  // — and in addition to — the network_security_config.xml cleartext
  // exception already added for that same IP. Not meant for production;
  // remove once the backend is served over HTTPS.
  android: {
    allowMixedContent: true
  }
};

export default config;
