import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

export const WS_URL = (extra.bridgeWsUrl as string) ?? 'ws://localhost:8080/ws';
export const API_URL = (extra.bridgeApiUrl as string) ?? 'http://localhost:8080/api';
export const MOISTURE_THRESHOLD = Number(extra.moistureThreshold ?? 28);

// Safe to ship in the app bundle — this is the publishable key, not a secret.
export const SUPABASE_URL = (extra.supabaseUrl as string) ?? '';
export const SUPABASE_ANON_KEY = (extra.supabaseAnonKey as string) ?? '';

// loca.lt (localtunnel) shows an HTML "click to continue" interstitial on the
// first request from a given client unless this header is present. Harmless
// to send against any other host — it's simply ignored.
export const TUNNEL_BYPASS_HEADERS = { 'bypass-tunnel-reminder': 'true' };
