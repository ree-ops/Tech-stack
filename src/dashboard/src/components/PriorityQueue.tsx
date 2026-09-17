import { formatHoursToCritical, STRESS_COLORS } from '../lib/stress';
import type { ZoneStatus } from '../lib/types';

interface Props {
  zones: ZoneStatus[];
  selectedZoneId: string | null;
  onSelect: (zoneId: string) => void;
}

export function PriorityQueue({ zones, selectedZoneId, onSelect }: Props) {
  const sorted = [...zones].sort((a, b) => a.priority_rank - b.priority_rank);

  return (
    <ol className="priority-queue">
      {sorted.map((zone) => (
        <li key={zone.zone_id}>
          <button
            className={`priority-row ${zone.zone_id === selectedZoneId ? 'priority-row-selected' : ''}`}
            onClick={() => onSelect(zone.zone_id)}
          >
            <span className="priority-rank">#{zone.priority_rank}</span>
            <span className="priority-info">
              <span className="priority-label">{zone.label}</span>
              <span className="priority-eta">{formatHoursToCritical(zone.hours_to_critical)}</span>
            </span>
            <span className="priority-code" style={{ background: STRESS_COLORS[zone.stress_code] }}>
              {zone.stress_code}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
