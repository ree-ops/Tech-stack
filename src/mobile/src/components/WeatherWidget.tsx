import { StyleSheet, Text, View } from 'react-native';
import type { WeatherSnapshot } from '../lib/types';

export function WeatherWidget({ weather }: { weather: WeatherSnapshot | null }) {
  if (!weather) {
    return (
      <View style={styles.widget}>
        <Text style={styles.empty}>Loading weather…</Text>
      </View>
    );
  }

  return (
    <View style={styles.widget}>
      <Text style={styles.temp}>{weather.temp_c}°C</Text>
      <Text style={styles.condition}>{weather.condition}</Text>
      <Text style={styles.humidity}>💧 {weather.humidity_pct}%</Text>
      {weather.rain_expected ? (
        <Text style={styles.rain}>🌧 Rain expected ({weather.rain_probability_pct}%)</Text>
      ) : (
        <Text style={styles.clear}>No rain expected</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  widget: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  empty: { color: '#9ca3af', fontSize: 12 },
  temp: { color: '#f9fafb', fontSize: 13, fontWeight: '700' },
  condition: { color: '#9ca3af', fontSize: 12 },
  humidity: { color: '#38bdf8', fontSize: 12, fontWeight: '600' },
  rain: { color: '#38bdf8', fontSize: 11 },
  clear: { color: '#9ca3af', fontSize: 11 },
});
