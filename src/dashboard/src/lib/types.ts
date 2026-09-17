export interface ZoneTelemetry {
  zone_id: string;
  soil_moisture: number;
  canopy_temp: number;
  actuator_on: boolean;
  pump_on: boolean;
  ts: number;
}

export type StressCode = 'OK' | 'WATCH' | 'WARNING' | 'CRITICAL';

export interface ZoneStatus extends ZoneTelemetry {
  label: string;
  moisture_rate_pct_per_hr: number;
  temp_rate_c_per_hr: number;
  hours_to_critical: number | null;
  stress_code: StressCode;
  priority_rank: number;
}

export interface EventLogEntry {
  message: string;
  ts: number;
}

export type BridgeMessage =
  | { type: 'zones'; payload: ZoneStatus[] }
  | { type: 'event'; payload: EventLogEntry };
