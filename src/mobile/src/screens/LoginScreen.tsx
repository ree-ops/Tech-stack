import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { useAuth } from '../hooks/useAuth';

interface Props {
  signIn: ReturnType<typeof useAuth>['signIn'];
}

export function LoginScreen({ signIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) setError(signInError.message);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>LOWVELD GROVE</Text>
        <Text style={styles.title}>Sign in</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor="#4b5563"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          placeholder="••••••••"
          placeholderTextColor="#4b5563"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? 'Signing in…' : 'Sign in'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0f14', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#111827', borderRadius: 14, padding: 24, gap: 4 },
  eyebrow: { color: '#e8a33d', fontSize: 11, letterSpacing: 1.5, fontWeight: '700' },
  title: { color: '#f9fafb', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  label: { color: '#9ca3af', fontSize: 13, marginTop: 10 },
  input: {
    backgroundColor: '#0b0f14',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    color: '#e5e7eb',
    fontSize: 15,
    marginTop: 4,
  },
  error: { color: '#f87171', fontSize: 13, marginTop: 10 },
  button: {
    marginTop: 20,
    backgroundColor: '#e8a33d',
    borderRadius: 8,
    padding: 13,
    alignItems: 'center',
  },
  buttonText: { color: '#1c1305', fontWeight: '700', fontSize: 15 },
});
