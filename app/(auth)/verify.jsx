import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthAPI } from '../../services/api';

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
    <LinearGradient
      colors={['#6d28d9', '#8b5cf6', '#a855f7']}
      style={styles.container}
    >
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
              <Text style={styles.logoIcon}>🌱</Text>
            </View>
            <Text style={styles.title}>Verify Email & Set Password</Text>
            <Text style={styles.subtitle}>Complete your account setup</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {!!msg && <Text style={styles.info}>{msg}</Text>}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput 
                placeholder="Password" 
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
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
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={confirmPassword} 
                onChangeText={setConfirmPassword} 
                secureTextEntry 
                style={styles.input} 
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && { opacity: 0.7 }]} 
              onPress={onSubmit} 
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Saving...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
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
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  button: {
    backgroundColor: '#ffffff',
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
    color: '#6d28d9',
    fontSize: 16,
    fontWeight: 'bold',
  },
  info: {
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});


