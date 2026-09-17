import type { ConnectionStatus } from '../hooks/useZoneFeed';
import { formatHoursToCritical, STRESS_COLORS } from '../lib/stress';
import type { ZoneStatus } from '../lib/types';

interface Props {
  zone: ZoneStatus | null;
  status: ConnectionStatus;
}

export function ZoneStatusCard({ zone, status }: Props) {
  return (
    <div className="zone-status-card">
      <div className={`connection-dot connection-${status}`} title={status} />
      {zone ? (
        <>
          <span
            className="stress-code-badge"
            style={{ background: STRESS_COLORS[zone.stress_code] }}
            title="Predictive stress code"
          >
            {zone.stress_code}
          </span>
          <dl>
            <div>
              <dt>Zone</dt>
              <dd>{zone.label}</dd>
            </div>
            <div>
              <dt>Soil moisture</dt>
              <dd>
                {zone.soil_moisture}% ({zone.moisture_rate_pct_per_hr >= 0 ? '+' : ''}
                {zone.moisture_rate_pct_per_hr}/hr)
              </dd>
            </div>
            <div>
              <dt>Canopy temp</dt>
              <dd>
                {zone.canopy_temp}°C ({zone.temp_rate_c_per_hr >= 0 ? '+' : ''}
                {zone.temp_rate_c_per_hr}/hr)
              </dd>
            </div>
            <div>
              <dt>Time to critical</dt>
              <dd>{formatHoursToCritical(zone.hours_to_critical)}</dd>
            </div>
            <div>
              <dt>Shade cloth</dt>
              <dd>{zone.actuator_on ? 'DEPLOYED' : 'retracted'}</dd>
            </div>
            <div>
              <dt>Irrigation pump</dt>
              <dd>{zone.pump_on ? 'RUNNING' : 'off'}</dd>
            </div>
          </dl>
        </>
      ) : (
        <span className="zone-status-empty">Waiting for telemetry…</span>
      )}
    </div>
  );
}
