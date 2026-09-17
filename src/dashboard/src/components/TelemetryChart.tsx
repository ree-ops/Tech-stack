import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MOISTURE_THRESHOLD } from '../lib/config';
import type { ZoneStatus } from '../lib/types';

interface Props {
  history: ZoneStatus[];
}

export function TelemetryChart({ history }: Props) {
  const data = history.map((t) => ({
    time: new Date(t.ts).toLocaleTimeString(),
    soil_moisture: t.soil_moisture,
    canopy_temp: t.canopy_temp,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} minTickGap={30} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
        <ReferenceLine
          y={MOISTURE_THRESHOLD}
          stroke="#f59e0b"
          strokeDasharray="6 4"
          label={{ value: 'shade threshold', fill: '#f59e0b', fontSize: 10 }}
        />
        <Line type="monotone" dataKey="soil_moisture" stroke="#38bdf8" dot={false} strokeWidth={2} name="Soil moisture %" />
        <Line type="monotone" dataKey="canopy_temp" stroke="#f87171" dot={false} strokeWidth={2} name="Canopy temp °C" />
      </LineChart>
    </ResponsiveContainer>
  );
}
