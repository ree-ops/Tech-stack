import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

export const WS_URL = (extra.bridgeWsUrl as string) ?? 'ws://localhost:8080/ws';
export const API_URL = (extra.bridgeApiUrl as string) ?? 'http://localhost:8080/api';
export const MOISTURE_THRESHOLD = Number(extra.moistureThreshold ?? 28);
