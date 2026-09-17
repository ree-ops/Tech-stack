export const WS_URL = import.meta.env.VITE_BRIDGE_WS_URL ?? 'ws://localhost:8080/ws';
export const API_URL = import.meta.env.VITE_BRIDGE_API_URL ?? 'http://localhost:8080/api';
export const MOISTURE_THRESHOLD = Number(import.meta.env.VITE_MOISTURE_THRESHOLD ?? 28);
