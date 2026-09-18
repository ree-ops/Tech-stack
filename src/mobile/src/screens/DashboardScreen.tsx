import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { TelemetryChart } from '../components/TelemetryChart';
import { WeatherWidget } from '../components/WeatherWidget';
import { ZoneCard } from '../components/ZoneCard';
import { useZoneFeed } from '../hooks/useZoneFeed';
import { API_URL, TUNNEL_BYPASS_HEADERS } from '../lib/config';
import { supabase } from '../lib/supabase';
import { fetchZoneHistory, type ZoneHistoryRow } from '../lib/zoneHistory';

async function post(path: string, zoneId: string) {
  const { data } = await supabase.auth.getSession();
  await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
      ...TUNNEL_BYPASS_HEADERS,
    },
    body: JSON.stringify({ zone_id: zoneId }),
  });
}

interface Props {
  accessToken: string | null;
  userEmail: string | null;
  onSignOut: () => void;
}

export function DashboardScreen({ accessToken, userEmail, onSignOut }: Props) {
  const { status, zones, history, events, weather } = useZoneFeed(accessToken);
  const [manualSelection, setManualSelection] = useState<string | null>(null);

  const sortedZones = [...zones].sort((a, b) => a.priority_rank - b.priority_rank);
  const selectedZoneId = manualSelection ?? sortedZones[0]?.zone_id ?? null;
  const selectedZone = zones.find((z) => z.zone_id === selectedZoneId) ?? null;
  const selectedHistory = selectedZoneId ? history[selectedZoneId] ?? [] : [];

  // Long-term history, read back from Supabase (written by the backend
  // every ~30s) — separate from `selectedHistory` above, which is only the
  // live ~10-minute window kept in memory and pushed over the WebSocket.
  const [longTermHistory, setLongTermHistory] = useState<ZoneHistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyHours, setHistoryHours] = useState(24);

  useEffect(() => {
    if (!selectedZoneId) return;
    setLongTermHistory([]);
    setLoadingHistory(true);
    fetchZoneHistory(selectedZoneId, historyHours)
      .then(setLongTermHistory)
      .finally(() => setLoadingHistory(false));
  }, [selectedZoneId, historyHours]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Lowveld Grove</Text>
        <View style={styles.headerRight}>
          <ConnectionBadge status={status} />
          <TouchableOpacity onPress={onSignOut}>
            <Text style={styles.signOut}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>
      {userEmail && (
        <Text style={styles.signedInAs}>
          Signed in as <Text style={styles.signedInEmail}>{userEmail}</Text>
        </Text>
      )}
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

      <Text style={styles.sectionTitle}>{selectedZone?.label ?? 'Zone'} trend (live)</Text>
      <TelemetryChart history={selectedHistory} />

      <View style={styles.historyHeaderRow}>
        <Text style={styles.sectionTitle}>{selectedZone?.label ?? 'Zone'} — logged history</Text>
        <View style={styles.rangeToggle}>
          {[
            { label: '24h', hours: 24 },
            { label: '7d', hours: 24 * 7 },
          ].map((r) => (
            <TouchableOpacity
              key={r.hours}
              style={[styles.rangeButton, historyHours === r.hours && styles.rangeButtonActive]}
              onPress={() => setHistoryHours(r.hours)}
            >
              <Text style={[styles.rangeButtonText, historyHours === r.hours && styles.rangeButtonTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {loadingHistory ? (
        <Text style={styles.historyStatus}>Loading from database…</Text>
      ) : longTermHistory.length === 0 ? (
        <Text style={styles.historyStatus}>
          No history yet for this zone — it builds up over time as the backend logs readings.
        </Text>
      ) : (
        <>
          <TelemetryChart history={longTermHistory} />
          <Text style={styles.historyStatus}>{longTermHistory.length} readings from the database</Text>
        </>
      )}

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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { color: '#f9fafb', fontSize: 22, fontWeight: '700', paddingLeft: 16 },
  signOut: { color: '#9ca3af', fontSize: 12 },
  signedInAs: { color: '#6b7280', fontSize: 12, paddingHorizontal: 16, marginTop: 4, marginBottom: 8 },
  signedInEmail: { color: '#9ca3af', fontWeight: '600' },
  sectionTitle: {
    color: '#9ca3af',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  historyStatus: { color: '#6b7280', fontSize: 12, paddingHorizontal: 16, marginBottom: 8 },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  rangeToggle: { flexDirection: 'row', gap: 6 },
  rangeButton: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  rangeButtonActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
  rangeButtonText: { color: '#9ca3af', fontSize: 11 },
  rangeButtonTextActive: { color: '#0b0f14', fontWeight: '700' },
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
