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

// Accepts either the live (WebSocket) ZoneStatus history or a long-term
// history point read back from Supabase — both shapes carry these three
// fields, which is all this chart actually needs.
interface ChartPoint {
  ts: number;
  soil_moisture: number;
  canopy_temp: number;
}

interface Props {
  history: ChartPoint[];
}

export function TelemetryChart({ history }: Props) {
  const spanMs = history.length > 1 ? history[history.length - 1].ts - history[0].ts : 0;
  const showDate = spanMs > 36 * 60 * 60 * 1000;

  const data = history.map((t) => ({
    time: showDate
      ? new Date(t.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit' })
      : new Date(t.ts).toLocaleTimeString(),
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
          label={{ value: 'shade threshold', fill: '#f59e0b', fontSize: 10, position: 'insideBottomRight' }}
        />
        <Line type="monotone" dataKey="soil_moisture" stroke="#38bdf8" dot={false} strokeWidth={2} name="Soil moisture %" />
        <Line type="monotone" dataKey="canopy_temp" stroke="#f87171" dot={false} strokeWidth={2} name="Canopy temp °C" />
      </LineChart>
    </ResponsiveContainer>
  );
}
