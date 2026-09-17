import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatHoursToCritical, STRESS_COLORS } from '../lib/stress';
import type { ZoneStatus } from '../lib/types';

interface Props {
  zone: ZoneStatus;
  selected: boolean;
  onSelect: () => void;
  onSimulate: () => void;
  onReset: () => void;
}

export function ZoneCard({ zone, selected, onSelect, onSimulate, onReset }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <View style={styles.headerRow}>
        <Text style={styles.rank}>#{zone.priority_rank}</Text>
        <Text style={styles.zoneLabel}>{zone.label}</Text>
        <View style={[styles.badge, { backgroundColor: STRESS_COLORS[zone.stress_code] }]}>
          <Text style={styles.badgeText}>{zone.stress_code}</Text>
        </View>
      </View>

      <Text style={styles.eta}>{formatHoursToCritical(zone.hours_to_critical)}</Text>

      <View style={styles.row}>
        <Text style={styles.metricLabel}>Soil moisture</Text>
        <Text style={styles.metricValue}>
          {zone.soil_moisture}% ({zone.moisture_rate_pct_per_hr >= 0 ? '+' : ''}
          {zone.moisture_rate_pct_per_hr}/hr)
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.metricLabel}>Canopy temp</Text>
        <Text style={styles.metricValue}>
          {zone.canopy_temp}°C ({zone.temp_rate_c_per_hr >= 0 ? '+' : ''}
          {zone.temp_rate_c_per_hr}/hr)
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.metricLabel}>Shade cloth</Text>
        <Text style={styles.metricValue}>{zone.actuator_on ? 'DEPLOYED' : 'retracted'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.metricLabel}>Irrigation pump</Text>
        <Text style={styles.metricValue}>{zone.pump_on ? 'RUNNING' : 'off'}</Text>
      </View>

      {selected && (
        <View style={styles.controls}>
          <TouchableOpacity style={styles.buttonWarn} onPress={onSimulate}>
            <Text style={styles.buttonText}>Simulate heat stress</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonOk} onPress={onReset}>
            <Text style={styles.buttonText}>Reset to healthy</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderColor: '#1f2937',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#111827',
  },
  cardSelected: { borderColor: '#e8a33d' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rank: { color: '#9ca3af', fontSize: 12, fontVariant: ['tabular-nums'] },
  zoneLabel: { color: '#e5e7eb', fontSize: 16, fontWeight: '700', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: '#0b0f14', fontSize: 11, fontWeight: '700' },
  eta: { color: '#9ca3af', fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  metricLabel: { color: '#9ca3af', fontSize: 13 },
  metricValue: { color: '#f9fafb', fontSize: 13, fontWeight: '600' },
  controls: { flexDirection: 'row', gap: 10, marginTop: 12 },
  buttonWarn: { flex: 1, backgroundColor: '#b45309', padding: 10, borderRadius: 8, alignItems: 'center' },
  buttonOk: { flex: 1, backgroundColor: '#166534', padding: 10, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#f9fafb', fontWeight: '600', fontSize: 13 },
});
