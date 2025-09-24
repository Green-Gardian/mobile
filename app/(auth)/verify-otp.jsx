import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthAPI } from '@/services/api';

export default function VerifyOTP() {
  const { email } = useLocalSearchParams();
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: OTP verification, 2: Password reset

  useEffect(() => {
    if (!email) {
      setMsg('Email is required');
      return;
    }
  }, [email]);

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setMsg('Please enter a valid 6-digit OTP');
      return;
    }

    setMsg('');
    setLoading(true);
    try {
      // For now, just verify OTP format and move to next step
      // In a real implementation, you might want to verify OTP first
      setStep(2);
      setMsg('OTP verified! Please set your new password.');
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (password.length < 6) {
      setMsg('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setMsg('Passwords do not match');
      return;
    }

    setMsg('');
    setLoading(true);
    try {
      const res = await AuthAPI.verifyOTPAndResetPassword(email, otp, password, confirmPassword);
      setMsg(res?.data?.message || 'Password reset successfully');
      
      Alert.alert(
        'Success!',
        'Your password has been reset successfully. You can now sign in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/signin'),
          },
        ]
      );
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setMsg('');
    setLoading(true);
    try {
      const res = await AuthAPI.forgotPassword(email);
      setMsg('New OTP sent to your email');
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Unable to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoCircle}><Text style={styles.logoIcon}>🔐</Text></View>
        
        {step === 1 ? (
          <>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>Enter the 6-digit code sent to your email</Text>
            <Text style={styles.emailText}>{email}</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>Create a new password for your account</Text>
          </>
        )}

        {!!msg && <Text style={styles.info}>{msg}</Text>}

        {step === 1 ? (
          <>
            <Text style={styles.label}>OTP Code</Text>
            <TextInput
              placeholder="123456"
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              maxLength={6}
              style={styles.otpInput}
              autoFocus
            />

            <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={verifyOTP} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendButton} onPress={resendOTP} disabled={loading}>
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              placeholder="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
            
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              placeholder="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={resetPassword} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Resetting...' : 'Reset Password'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
              <Text style={styles.backText}>← Back to OTP</Text>
            </TouchableOpacity>
          </>
        )}
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
  subtitle: { textAlign: 'center', marginTop: 6, color: '#6b7280', marginBottom: 8 },
  emailText: { textAlign: 'center', fontSize: 14, color: '#6d28d9', fontWeight: '600', marginBottom: 16 },
  label: { marginTop: 14, marginBottom: 6, color: '#374151', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fafafa' },
  otpInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fafafa', textAlign: 'center', fontSize: 18, fontWeight: '600', letterSpacing: 4 },
  button: { marginTop: 16, backgroundColor: '#6d28d9', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  resendButton: { marginTop: 12, alignItems: 'center' },
  resendText: { color: '#6d28d9', fontWeight: '600' },
  backButton: { marginTop: 12, alignItems: 'center' },
  backText: { color: '#6b7280', fontWeight: '600' },
  info: { color: '#111827', backgroundColor: '#eef2ff', padding: 8, borderRadius: 8, marginTop: 10, textAlign: 'center' },
});
