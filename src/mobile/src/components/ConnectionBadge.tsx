import { StyleSheet, Text, View } from 'react-native';
import type { ConnectionStatus } from '../hooks/useZoneFeed';

const COLORS: Record<ConnectionStatus, string> = {
  connecting: '#f59e0b',
  open: '#16a34a',
  closed: '#dc2626',
};

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  return (
    <View style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: COLORS[status] }]} />
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', margin: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  text: { color: '#9ca3af', fontSize: 12, textTransform: 'uppercase' },
});
