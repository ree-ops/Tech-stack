import { useEffect, useRef, useState } from 'react';
import { WS_URL } from '../lib/config';
import type { BridgeMessage, EventLogEntry, ZoneStatus } from '../lib/types';

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

const MAX_HISTORY_PER_ZONE = 60;
const MAX_LOG = 20;

export function useZoneFeed() {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [zones, setZones] = useState<ZoneStatus[]>([]);
  const [history, setHistory] = useState<Record<string, ZoneStatus[]>>({});
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      const socket = new WebSocket(WS_URL);
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
        }
      };
    }

    connect();
    return () => {
      cancelled = true;
      wsRef.current?.close();
    };
  }, []);

  return { status, zones, history, events };
}
