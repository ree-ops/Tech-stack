# mobile

Expo (React Native + TypeScript) companion app: a field-monitoring view of the
same live telemetry feed as the web dashboard, with the same "Simulate heat
stress" / "Reset to healthy" controls, priority queue, and weather widget
(temperature, humidity, rain forecast), for showing the demo from a phone.

## Setup

```bash
npm install
npm start
```

**Use `npm start` / `npm run android` / `npm run ios`, not `npx expo start`
directly** — those npm scripts auto-run `scripts/sync-lan-ip.js` first, which
detects this Mac's current WiFi IP and writes it into `app.json` for you.
Laptop IPs change often (DHCP renewals, switching networks), and a stale IP
in `app.json` is the single most common reason the app shows "CONNECTING"
forever on a physical phone. If you do run `npx expo start` directly for some
reason, run `npm run sync-lan-ip` first.

## Pointing at the backend

Phone and laptop must be on the same WiFi network as the `mqtt-bridge`
backend (`../backend/mqtt-bridge`) — the auto-sync script only fixes the IP
address in `app.json`, it can't get around the phone and laptop being on
genuinely different networks.
