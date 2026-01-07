import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMyFeedback } from '../services/systemFeedbackAPI';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  open: '#3b82f6', // Blue
  acknowledged: '#8b5cf6', // Purple
  in_progress: '#f59e0b', // Amber
  resolved: '#10b981', // Emerald
  closed: '#64748b', // Slate
  wont_fix: '#ef4444', // Red
};

const STATUS_LABELS = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  wont_fix: "Won't Fix",
};

const FEEDBACK_TYPE_ICONS = {
  bug_report: 'bug-outline',
  feature_request: 'bulb-outline',
  improvement: 'flash-outline',
  complaint: 'sad-outline',
  praise: 'heart-outline',
  general: 'chatbubble-outline',
};

export default function MyFeedbackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      setError(null);
      const response = await getMyFeedback({ limit: 50 });
      if (response.success) {
        setFeedback(response.feedback || []);
      } else {
        throw new Error(response.message || 'Failed to load feedback');
      }
    } catch (err) {
      console.error('Error loading feedback:', err);
      setError(err.message || 'Failed to load feedback');
      Alert.alert('Error', err.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFeedback();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return '#dc2626';
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#64748b';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#10b981', '#059669']} style={[styles.headerGradient, { paddingTop: insets.top }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Feedback</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading your feedback...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#10b981', '#059669']} style={[styles.headerGradient, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Feedback</Text>
          <TouchableOpacity
            onPress={() => router.push('/feedback')}
            style={styles.headerAddBtn}
          >
            <Ionicons name="add" size={26} color="#10b981" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={40} color="#ef4444" />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadFeedback} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!error && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#10b981']}
              tintColor="#10b981"
            />
          }
        >
          {feedback.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="chatbubbles-outline" size={80} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>No feedback found</Text>
              <Text style={styles.emptyMessage}>
                You haven't submitted any system feedback yet. Your thoughts help us improve!
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/feedback')}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Submit First Feedback</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.feedbackList}>
              {feedback.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.feedbackCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    Alert.alert('Feedback details coming soon', `Status: ${STATUS_LABELS[item.status] || item.status}`);
                  }}
                >
                  <View style={[styles.statusIndicatorBar, { backgroundColor: STATUS_COLORS[item.status] || '#64748b' }]} />
                  
                  <View style={styles.cardContent}>
                    <View style={styles.feedbackHeader}>
                      <View style={styles.feedbackTypeRow}>
                        <View style={[styles.typeIconContainer, { backgroundColor: '#f1f5f9' }]}>
                          <Ionicons 
                            name={FEEDBACK_TYPE_ICONS[item.feedback_type] || 'chatbubble-outline'} 
                            size={20} 
                            color="#1e293b" 
                          />
                        </View>
                        <View style={styles.feedbackTitleContainer}>
                          <Text style={styles.feedbackTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <View style={styles.feedbackMeta}>
                            <Text style={styles.categoryText}>{item.category || 'General'}</Text>
                            <Text style={styles.dateText}> • {formatDate(item.created_at)}</Text>
                          </View>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: (STATUS_COLORS[item.status] || '#64748b') + '15' },
                          { borderColor: (STATUS_COLORS[item.status] || '#64748b') + '30' }
                        ]}
                      >
                        <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || '#64748b' }]}>
                          {STATUS_LABELS[item.status] || item.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.feedbackDescription} numberOfLines={2}>
                      {item.description}
                    </Text>

                    <View style={styles.feedbackFooter}>
                      <View
                        style={[
                          styles.priorityBadge,
                          { borderColor: (getPriorityColor(item.priority) || '#64748b') + '30' },
                          { backgroundColor: (getPriorityColor(item.priority) || '#64748b') + '10' }
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityText,
                            { color: getPriorityColor(item.priority) || '#64748b' },
                          ]}
                        >
                          {item.priority?.toUpperCase() || 'MEDIUM'}
                        </Text>
                      </View>
                      
                      <View style={{ flex: 1 }} />

                      {item.admin_response && (
                        <View style={styles.responseIndicator}>
                          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                          <Text style={styles.responseText}>Admin Replied</Text>
                        </View>
                      )}
                      
                      {item.requires_urgent_attention && (
                        <View style={styles.urgentBadge}>
                          <Ionicons name="alert-circle" size={14} color="#ef4444" />
                          <Text style={styles.urgentText}>Urgent</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerGradient: {
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  headerAddBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    backgroundColor: '#f1f5f9',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 12,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  feedbackList: {
    padding: 20,
  },
  feedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  statusIndicatorBar: {
    width: 6,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  feedbackTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  feedbackTitleContainer: {
    flex: 1,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  feedbackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  feedbackDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  feedbackFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  responseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  responseText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    marginLeft: 8,
  },
  urgentText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '700',
  },
});

