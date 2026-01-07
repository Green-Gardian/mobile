import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import SystemFeedbackForm from '../components/SystemFeedbackForm';
import { submitSystemFeedback } from '../services/systemFeedbackAPI';
import { useAuth } from '../context/AuthContext';

export default function FeedbackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useAuth();
  const [showForm, setShowForm] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (feedbackData) => {
    try {
      setLoading(true);
      await submitSystemFeedback(feedbackData);
      setShowForm(false);
    } catch (error) {
      throw error; // Let SystemFeedbackForm handle the error display
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!showForm) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={[styles.successHeader, { paddingTop: insets.top + 20 }]}
        >
          <TouchableOpacity onPress={handleCancel} style={styles.closeButtonLight}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Ionicons name="checkmark-circle" size={100} color="#fff" />
        </LinearGradient>
        
        <View style={styles.successContent}>
          <Text style={styles.successTitle}>Thank You!</Text>
          <Text style={styles.successMessage}>
            Your feedback has been submitted successfully. We appreciate your input and will use it to make the app even better!
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={handleCancel}>
            <Text style={styles.doneButtonText}>Back to App</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#10b981', '#059669']}
        style={[styles.mainHeader, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>System Feedback</Text>
            <Text style={styles.headerSubtitle}>Tell us what you think</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <SystemFeedbackForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        userRole={state.user?.role}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mainHeader: {
    paddingBottom: 24,
  },
  successHeader: {
    height: '40%',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    position: 'relative',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonLight: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  successContent: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 40,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  doneButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

