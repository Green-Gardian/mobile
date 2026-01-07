import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthAPI } from '../../services/api';

export default function VerifyOTP() {
  const { email } = useLocalSearchParams();
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [step, setStep] = useState(1); // 1: OTP verification, 2: Password reset

  useEffect(() => {
    if (!email) {
      setMsg('Email is required');
      setIsError(true);
    }
  }, [email]);

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setMsg('Please enter a valid 6-digit OTP');
      setIsError(true);
      return;
    }

    setMsg('');
    setIsError(false);
    setLoading(true);
    try {
      setStep(2);
      setMsg('OTP verified! Please set your new password.');
      setIsError(false);
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Invalid OTP');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (password.length < 8) {
      setMsg('Password must be at least 8 characters');
      setIsError(true);
      return;
    }

    if (password !== confirmPassword) {
      setMsg('Passwords do not match');
      setIsError(true);
      return;
    }

    setMsg('');
    setIsError(false);
    setLoading(true);
    try {
      const res = await AuthAPI.verifyOTPAndResetPassword(email, otp, password, confirmPassword);
      setMsg(res?.data?.message || 'Password reset successfully');
      setIsError(false);

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
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setMsg('');
    setIsError(false);
    setLoading(true);
    try {
      await AuthAPI.forgotPassword(email);
      setMsg('New OTP sent to your email');
      setIsError(false);
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Unable to resend OTP');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons
                name={step === 1 ? "mail-open-outline" : "lock-closed-outline"}
                size={48}
                color="#6d28d9"
              />
            </View>

            {step === 1 ? (
              <>
                <Text style={styles.title}>Verify OTP</Text>
                <Text style={styles.subtitle}>Enter the 6-digit code sent to</Text>
                <Text style={styles.emailText}>{email}</Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>New Password</Text>
                <Text style={styles.subtitle}>Create a secure password for your account</Text>
              </>
            )}
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {!!msg && (
              <View style={[styles.infoBanner, isError && styles.errorBanner]}>
                <Ionicons
                  name={isError ? "alert-circle" : "checkmark-circle"}
                  size={20}
                  color={isError ? "#ef4444" : "#10b981"}
                />
                <Text style={[styles.infoText, isError && styles.errorText]}>{msg}</Text>
              </View>
            )}

            {step === 1 ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>OTP Code</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      placeholder="123456"
                      placeholderTextColor="#94a3b8"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="numeric"
                      maxLength={6}
                      style={styles.otpInput}
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.button, loading && { opacity: 0.7 }]}
                  onPress={verifyOTP}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={resendOTP}
                  disabled={loading}
                >
                  <Text style={styles.resendText}>Didn't receive code? Resend</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      placeholder="At least 8 characters"
                      placeholderTextColor="#94a3b8"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      placeholder="Repeat new password"
                      placeholderTextColor="#94a3b8"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      style={styles.input}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.button, loading && { opacity: 0.7 }]}
                  onPress={resetPassword}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setStep(1)}
                >
                  <Text style={styles.backText}>← Back to OTP</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#6d28d9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },
  emailText: {
    fontSize: 16,
    color: '#6d28d9',
    fontWeight: '700',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  otpInput: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
    color: '#1e293b',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6d28d9',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6d28d9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
    marginTop: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resendButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  resendText: {
    color: '#6d28d9',
    fontSize: 14,
    fontWeight: '700',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#dcfce7',
    gap: 12,
  },
  infoText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },
  errorText: {
    color: '#ef4444',
  },
});
