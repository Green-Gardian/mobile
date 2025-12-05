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
import { getMyFeedback } from '../services/systemFeedbackAPI';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  open: '#3B82F6',
  acknowledged: '#8B5CF6',
  in_progress: '#F59E0B',
  resolved: '#10B981',
  closed: '#6B7280',
  wont_fix: '#EF4444',
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
  bug_report: '🐛',
  feature_request: '💡',
  improvement: '⚡',
  complaint: '😔',
  praise: '🎉',
  general: '💬',
};

export default function MyFeedbackScreen() {
  const router = useRouter();
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
      case 'critical': return '#DC2626';
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Feedback</Text>
          <View style={styles.closeButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6d28d9" />
          <Text style={styles.loadingText}>Loading feedback...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Feedback</Text>
        <TouchableOpacity
          onPress={() => router.push('/feedback')}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color="#6d28d9" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadFeedback} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!error && (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6d28d9']}
              tintColor="#6d28d9"
            />
          }
        >
          {feedback.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={80} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Feedback Yet</Text>
              <Text style={styles.emptyMessage}>
                You haven't submitted any feedback yet. Share your thoughts to help us improve!
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/feedback')}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Submit Feedback</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.feedbackList}>
              {feedback.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.feedbackCard}
                  onPress={() => {
                    // TODO: Navigate to feedback detail screen
                    Alert.alert('Feedback Details', `Title: ${item.title}\n\nStatus: ${STATUS_LABELS[item.status] || item.status}`);
                  }}
                >
                  <View style={styles.feedbackHeader}>
                    <View style={styles.feedbackTypeContainer}>
                      <Text style={styles.feedbackTypeIcon}>
                        {FEEDBACK_TYPE_ICONS[item.feedback_type] || '💬'}
                      </Text>
                      <View style={styles.feedbackTitleContainer}>
                        <Text style={styles.feedbackTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View style={styles.feedbackMeta}>
                          <Text style={styles.categoryText}>{item.category}</Text>
                          <Text style={styles.dateText}> • {formatDate(item.created_at)}</Text>
                        </View>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: STATUS_COLORS[item.status] || '#6B7280' },
                      ]}
                    >
                      <Text style={styles.statusText}>
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
                        { borderColor: getPriorityColor(item.priority) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          { color: getPriorityColor(item.priority) },
                        ]}
                      >
                        {item.priority?.toUpperCase() || 'MEDIUM'}
                      </Text>
                    </View>
                    {item.admin_response && (
                      <View style={styles.responseIndicator}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.responseText}>Replied</Text>
                      </View>
                    )}
                    {item.requires_urgent_attention && (
                      <View style={styles.urgentBadge}>
                        <Ionicons name="alert-circle" size={14} color="#EF4444" />
                        <Text style={styles.urgentText}>Urgent</Text>
                      </View>
                    )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    margin: 16,
    borderRadius: 12,
  },
  errorText: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
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
    backgroundColor: '#6d28d9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackList: {
    padding: 16,
  },
  feedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  feedbackTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  feedbackTypeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  feedbackTitleContainer: {
    flex: 1,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  feedbackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  feedbackDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  feedbackFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  responseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  responseText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  urgentText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
});

