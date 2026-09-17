/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BRIDGE_WS_URL?: string;
  readonly VITE_BRIDGE_API_URL?: string;
  readonly VITE_MOISTURE_THRESHOLD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
