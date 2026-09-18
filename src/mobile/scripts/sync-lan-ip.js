#!/usr/bin/env node
// Auto-detects this Mac's current WiFi IP and writes it into app.json's
// bridgeWsUrl/bridgeApiUrl, so a phone on the same network can always reach
// the backend without hand-editing app.json every time the laptop's IP
// changes (which happens often — DHCP renewals, switching networks, etc.).
// Runs automatically before `npm start` / `npm run android` / `npm run ios`.

const { execSync } = require('node:child_process');
const { readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const appJsonPath = path.join(__dirname, '..', 'app.json');

function getLanIp() {
  const interfaces = ['en0', 'en1'];
  for (const iface of interfaces) {
    try {
      const ip = execSync(`ipconfig getifaddr ${iface}`, { stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
      if (ip) return ip;
    } catch {
      // that interface has no address — try the next one
    }
  }
  return null;
}

const ip = getLanIp();
if (!ip) {
  console.warn('[sync-lan-ip] Could not detect a WiFi IP — leaving app.json unchanged.');
  process.exit(0);
}

const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));
const extra = appJson.expo.extra ?? {};

const port = (extra.bridgeApiUrl ?? 'http://localhost:8080').match(/:(\d+)/)?.[1] ?? '8080';
const newWsUrl = `ws://${ip}:${port}/ws`;
const newApiUrl = `http://${ip}:${port}/api`;

if (extra.bridgeWsUrl === newWsUrl && extra.bridgeApiUrl === newApiUrl) {
  console.log(`[sync-lan-ip] Already up to date (${ip}).`);
  process.exit(0);
}

extra.bridgeWsUrl = newWsUrl;
extra.bridgeApiUrl = newApiUrl;
appJson.expo.extra = extra;

writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log(`[sync-lan-ip] Updated app.json -> ${ip}`);
