import { useEffect, useRef, useState } from 'react';
import { TUNNEL_BYPASS_HEADERS, WS_URL } from '../lib/config';
import type { BridgeMessage, EventLogEntry, WeatherSnapshot, ZoneStatus } from '../lib/types';

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

const MAX_LOG = 20;
const MAX_HISTORY_PER_ZONE = 60;

export function useZoneFeed(accessToken: string | null) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [zones, setZones] = useState<ZoneStatus[]>([]);
  const [history, setHistory] = useState<Record<string, ZoneStatus[]>>({});
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    function connect() {
      // Third arg (headers) is a React Native WebSocket extension not in the
      // DOM lib's type definitions — it's a no-op on web, but required here
      // so loca.lt doesn't intercept the upgrade with its reminder HTML page.
      const RNWebSocket = WebSocket as unknown as new (
        url: string,
        protocols: string[],
        options: { headers: Record<string, string> },
      ) => WebSocket;
      const socket = new RNWebSocket(`${WS_URL}?token=${encodeURIComponent(accessToken!)}`, [], {
        headers: TUNNEL_BYPASS_HEADERS,
      });
      wsRef.current = socket;
      setStatus('connecting');

      socket.onopen = () => {
        if (!cancelled) setStatus('open');
      };
      socket.onclose = () => {
        if (cancelled) return;
        setStatus('closed');
        setTimeout(connect, 2000);
      };
      socket.onerror = () => socket.close();
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as BridgeMessage;
        if (message.type === 'zones') {
          setZones(message.payload);
          setHistory((prev) => {
            const next = { ...prev };
            for (const zone of message.payload) {
              const list = next[zone.zone_id] ?? [];
              next[zone.zone_id] = [...list.slice(-(MAX_HISTORY_PER_ZONE - 1)), zone];
            }
            return next;
          });
        } else if (message.type === 'event') {
          setEvents((prev) => [message.payload, ...prev].slice(0, MAX_LOG));
        } else if (message.type === 'weather') {
          setWeather(message.payload);
        }
      };
    }

    connect();
    return () => {
      cancelled = true;
      wsRef.current?.close();
    };
  }, [accessToken]);

  return { status, zones, history, events, weather };
}
