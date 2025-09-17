import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { AuthAPI } from '@/services/api';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setMsg('');
    setLoading(true);
    try {
      const res = await AuthAPI.forgotPassword(email.trim());
      setMsg(res?.data?.message || 'If the email exists, we sent a reset link.');
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Unable to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoCircle}><Text style={styles.logoIcon}>🌱</Text></View>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>Enter your email and we'll send you a reset link</Text>

        {!!msg && <Text style={styles.info}>{msg}</Text>}

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={onSubmit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <Text style={{ color: '#6b7280' }}>Remember your password?{' '}
            <Link href="/(auth)/signin"><Text style={{ color: '#6d28d9', fontWeight: '700' }}>Sign in</Text></Link>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#f3f0ff' },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 4 },
  logoCircle: { alignSelf: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoIcon: { fontSize: 28 },
  title: { textAlign: 'center', fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { textAlign: 'center', marginTop: 6, color: '#6b7280' },
  label: { marginTop: 14, marginBottom: 6, color: '#374151', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fafafa' },
  button: { marginTop: 16, backgroundColor: '#6d28d9', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  info: { color: '#111827', backgroundColor: '#eef2ff', padding: 8, borderRadius: 8, marginTop: 10, textAlign: 'center' },
});


