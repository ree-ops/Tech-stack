# mobile

Expo (React Native + TypeScript) companion app: a field-monitoring view of the
same live telemetry feed as the web dashboard, with the same "Simulate heat
stress" / "Reset to healthy" controls, for showing the demo from a phone.

## Setup

```bash
npm install
npx expo start
```

## Pointing at the backend

`app.json` → `expo.extra.bridgeWsUrl` / `bridgeApiUrl` default to
`localhost:8080`, which only works in the iOS Simulator or Android emulator
running on the same machine as the backend. For a physical phone on demo day,
change both to your laptop's LAN IP, e.g.:

```json
"bridgeWsUrl": "ws://192.168.1.23:8080/ws",
"bridgeApiUrl": "http://192.168.1.23:8080/api"
```

Phone and laptop must be on the same WiFi network as the `mqtt-bridge` backend
(`../backend/mqtt-bridge`).
