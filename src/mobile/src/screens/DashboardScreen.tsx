import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { TelemetryChart } from '../components/TelemetryChart';
import { WeatherWidget } from '../components/WeatherWidget';
import { ZoneCard } from '../components/ZoneCard';
import { useZoneFeed } from '../hooks/useZoneFeed';
import { API_URL } from '../lib/config';

async function post(path: string, zoneId: string) {
  await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zone_id: zoneId }),
  });
}

export function DashboardScreen() {
  const { status, zones, history, events, weather } = useZoneFeed();
  const [manualSelection, setManualSelection] = useState<string | null>(null);

  const sortedZones = [...zones].sort((a, b) => a.priority_rank - b.priority_rank);
  const selectedZoneId = manualSelection ?? sortedZones[0]?.zone_id ?? null;
  const selectedZone = zones.find((z) => z.zone_id === selectedZoneId) ?? null;
  const selectedHistory = selectedZoneId ? history[selectedZoneId] ?? [] : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Lowveld Grove</Text>
        <ConnectionBadge status={status} />
      </View>
      <WeatherWidget weather={weather} />
      <Text style={styles.sectionTitle}>Priority queue — which side needs water first</Text>

      {sortedZones.map((zone) => (
        <ZoneCard
          key={zone.zone_id}
          zone={zone}
          selected={zone.zone_id === selectedZoneId}
          onSelect={() => setManualSelection(zone.zone_id)}
          onSimulate={() => post('/simulate/heat-stress', zone.zone_id)}
          onReset={() => post('/simulate/reset', zone.zone_id)}
        />
      ))}

      <Text style={styles.sectionTitle}>{selectedZone?.label ?? 'Zone'} trend</Text>
      <TelemetryChart history={selectedHistory} />

      <Text style={styles.sectionTitle}>Event log</Text>
      <View style={styles.log}>
        {events.length === 0 && <Text style={styles.logEmpty}>No events yet.</Text>}
        {events.map((item) => (
          <Text key={item.ts} style={styles.logItem}>
            {new Date(item.ts).toLocaleTimeString()} — {item.message}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: { color: '#f9fafb', fontSize: 22, fontWeight: '700', paddingLeft: 16 },
  sectionTitle: {
    color: '#9ca3af',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  log: { paddingHorizontal: 16 },
  logEmpty: { color: '#6b7280', fontSize: 12 },
  logItem: {
    color: '#d1d5db',
    fontSize: 12,
    paddingVertical: 4,
    borderBottomColor: '#1f2937',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
