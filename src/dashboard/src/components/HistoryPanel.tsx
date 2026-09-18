import { useEffect, useState } from 'react';
import { fetchZoneHistory, type ZoneHistoryPoint } from '../lib/zoneHistory';
import { TelemetryChart } from './TelemetryChart';

interface Props {
  zoneId: string | null;
  zoneLabel: string;
}

const RANGES = [
  { label: '24 hours', hours: 24 },
  { label: '7 days', hours: 24 * 7 },
];

export function HistoryPanel({ zoneId, zoneLabel }: Props) {
  const [hours, setHours] = useState(RANGES[0].hours);
  const [points, setPoints] = useState<ZoneHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!zoneId) return;
    let cancelled = false;
    setLoading(true);
    fetchZoneHistory(zoneId, hours).then((data) => {
      if (!cancelled) {
        setPoints(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [zoneId, hours]);

  return (
    <div className="history-panel">
      <div className="history-panel-header">
        <h2>{zoneLabel} — logged history</h2>
        <div className="history-range-toggle">
          {RANGES.map((r) => (
            <button
              key={r.hours}
              className={hours === r.hours ? 'active' : ''}
              onClick={() => setHours(r.hours)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <p className="history-status">Loading from database…</p>
      ) : points.length === 0 ? (
        <p className="history-status">
          No history yet for this zone — it builds up every ~30s as the backend logs readings.
        </p>
      ) : (
        <>
          <TelemetryChart history={points} />
          <p className="history-status">{points.length} readings from the database</p>
        </>
      )}
    </div>
  );
}
