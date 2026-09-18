export const WS_URL = import.meta.env.VITE_BRIDGE_WS_URL ?? 'ws://localhost:8080/ws';
export const API_URL = import.meta.env.VITE_BRIDGE_API_URL ?? 'http://localhost:8080/api';
export const MOISTURE_THRESHOLD = Number(import.meta.env.VITE_MOISTURE_THRESHOLD ?? 28);

// Safe to expose in the frontend bundle — this is the publishable key, not a
// secret. It only lets a client sign in as itself; it can't read/write data
// on anyone else's behalf.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
