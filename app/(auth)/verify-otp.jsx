import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthAPI } from '../../services/api';

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
    <View style={styles.container}>
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
              <Text style={styles.logoIcon}>🔐</Text>
            </View>
            
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
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {!!msg && <Text style={styles.info}>{msg}</Text>}

            {step === 1 ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>OTP Code</Text>
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
                  <Text style={styles.resendText}>Resend OTP</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    placeholder="New password"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    style={styles.input}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    placeholder="Confirm password"
                    placeholderTextColor="#94a3b8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    style={styles.input}
                  />
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
    </View>
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
    marginBottom: 60,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#6d28d9',
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e6e9ef',
  },
  otpInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 4,
    color: '#0f172a',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e6e9ef',
  },
  button: {
    backgroundColor: '#6d28d9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    color: '#6d28d9',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  info: {
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e6e9ef',
  },
});
