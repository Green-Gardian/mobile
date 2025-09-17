import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthAPI } from '@/services/api';

export default function VerifyAndSetPassword() {
  const { token } = useLocalSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) setMsg('Invalid or missing token');
  }, [token]);

  const onSubmit = async () => {
    setMsg('');
    setLoading(true);
    try {
      const res = await AuthAPI.verifyEmailAndSetPassword(String(token || ''), password, confirmPassword);
      setMsg(res?.data?.message || 'Verified successfully');
      setTimeout(() => router.replace('/(auth)/signin'), 1200);
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Unable to verify email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoCircle}><Text style={styles.logoIcon}>🌱</Text></View>
        <Text style={styles.title}>Verify Email & Set Password</Text>
        {!!msg && <Text style={styles.info}>{msg}</Text>}

        <Text style={styles.label}>Password</Text>
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
        <Text style={styles.label}>Confirm Password</Text>
        <TextInput placeholder="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry style={styles.input} />

        <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={onSubmit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#f3f0ff' },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 4 },
  logoCircle: { alignSelf: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoIcon: { fontSize: 28 },
  title: { textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#111827' },
  label: { marginTop: 14, marginBottom: 6, color: '#374151', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fafafa' },
  button: { marginTop: 16, backgroundColor: '#6d28d9', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  info: { color: '#111827', backgroundColor: '#eef2ff', padding: 8, borderRadius: 8, marginTop: 10, textAlign: 'center' },
});


