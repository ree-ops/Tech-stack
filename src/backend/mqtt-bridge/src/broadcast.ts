import type { WebSocket } from 'ws';
import type { EventLogEntry, ZoneStatus } from './types.js';

const clients = new Set<WebSocket>();
let latestStatuses: ZoneStatus[] = [];

export function registerClient(ws: WebSocket) {
  clients.add(ws);
  if (latestStatuses.length) {
    ws.send(JSON.stringify({ type: 'zones', payload: latestStatuses }));
  }
  ws.on('close', () => clients.delete(ws));
}

export function broadcastZoneStatuses(statuses: ZoneStatus[]) {
  latestStatuses = statuses;
  broadcast({ type: 'zones', payload: statuses });
}

export function broadcastEvent(entry: EventLogEntry) {
  broadcast({ type: 'event', payload: entry });
}

export function getLatestZoneStatuses() {
  return latestStatuses;
}

function broadcast(message: unknown) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === client.OPEN) client.send(data);
  }
}
