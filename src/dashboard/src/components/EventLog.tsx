import type { EventLogEntry } from '../lib/types';

export function EventLog({ events }: { events: EventLogEntry[] }) {
  return (
    <ul className="event-log">
      {events.map((e) => (
        <li key={e.ts}>
          <span className="event-log-time">{new Date(e.ts).toLocaleTimeString()}</span> {e.message}
        </li>
      ))}
    </ul>
  );
}
