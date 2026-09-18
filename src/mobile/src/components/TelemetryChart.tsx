import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { MOISTURE_THRESHOLD } from '../lib/config';

// Accepts either the live (WebSocket) ZoneStatus history or a long-term
// history row read back from Supabase — both shapes carry these two fields,
// which is all this chart actually needs.
interface ChartPoint {
  soil_moisture: number;
  canopy_temp: number;
}

interface Props {
  history: ChartPoint[];
}

const CHART_HEIGHT = 140;
const PADDING_X = 8;
const PADDING_Y = 10;

export function TelemetryChart({ history }: Props) {
  const [width, setWidth] = useState(0);

  if (history.length < 2 || width === 0) {
    return (
      <View style={styles.empty} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <Text style={styles.emptyText}>Collecting data…</Text>
      </View>
    );
  }

  const moistureValues = history.map((h) => h.soil_moisture);
  const tempValues = history.map((h) => h.canopy_temp);
  const allValues = [...moistureValues, ...tempValues, MOISTURE_THRESHOLD];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = Math.max(maxValue - minValue, 1);

  const innerWidth = width - PADDING_X * 2;
  const innerHeight = CHART_HEIGHT - PADDING_Y * 2;

  const xFor = (i: number) => PADDING_X + (i / (history.length - 1)) * innerWidth;
  const yFor = (value: number) => PADDING_Y + innerHeight - ((value - minValue) / range) * innerHeight;

  const moisturePoints = history.map((h, i) => `${xFor(i)},${yFor(h.soil_moisture)}`).join(' ');
  const tempPoints = history.map((h, i) => `${xFor(i)},${yFor(h.canopy_temp)}`).join(' ');
  const thresholdY = yFor(MOISTURE_THRESHOLD);

  const last = history[history.length - 1];

  return (
    <View style={styles.container} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Svg width={width} height={CHART_HEIGHT}>
        <Line
          x1={PADDING_X}
          y1={thresholdY}
          x2={width - PADDING_X}
          y2={thresholdY}
          stroke="#f59e0b"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <SvgText x={width - PADDING_X} y={thresholdY - 4} fontSize={9} fill="#f59e0b" textAnchor="end">
          shade threshold
        </SvgText>

        <Polyline points={moisturePoints} fill="none" stroke="#38bdf8" strokeWidth={2} />
        <Polyline points={tempPoints} fill="none" stroke="#f87171" strokeWidth={2} />

        <Circle cx={xFor(history.length - 1)} cy={yFor(last.soil_moisture)} r={3} fill="#38bdf8" />
        <Circle cx={xFor(history.length - 1)} cy={yFor(last.canopy_temp)} r={3} fill="#f87171" />
      </Svg>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#38bdf8' }]} />
          <Text style={styles.legendText}>Soil moisture %</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#f87171' }]} />
          <Text style={styles.legendText}>Canopy temp °C</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#111827', borderRadius: 12, padding: 8, marginHorizontal: 16, marginBottom: 12 },
  empty: {
    height: CHART_HEIGHT,
    backgroundColor: '#111827',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: '#6b7280', fontSize: 12 },
  legend: { flexDirection: 'row', gap: 16, paddingTop: 4, paddingLeft: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#9ca3af', fontSize: 11 },
});
