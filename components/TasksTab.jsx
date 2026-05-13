import { useEffect, useState, useRef } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, AppState, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DriverAPI } from '../services/driver';

const { width, height } = Dimensions.get('window');

const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

export default function TasksTab() {
  const [currentTasks, setCurrentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    loadTasks();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current && appState.current.match(/inactive|background/) && nextAppState === 'active') {
        loadTasks();
      }
      appState.current = nextAppState;
    });

    const interval = setInterval(() => {
      loadTasks();
    }, 30000);

    return () => {
      try { subscription.remove(); } catch (e) { /* ignore */ }
      clearInterval(interval);
    };
  }, []);

  const loadTasks = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const response = await DriverAPI.getCurrentTasks();
      if (response.data.tasks) {
        setCurrentTasks(response.data.tasks);
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Failed to load tasks');
      setCurrentTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadTasks(true);
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await DriverAPI.updateTaskStatus(taskId, { status: newStatus });
      Alert.alert('Success', 'Task status updated successfully!');
      loadTasks();
    } catch (err) {
      console.error('Error updating task status:', err);
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#0d9488';
      case 'pending': return '#64748b';
      default: return '#94a3b8';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#dc2626';
      case 'medium': return '#64748b';
      case 'low': return '#10b981';
      default: return '#94a3b8';
    }
  };

  const filteredTasks = currentTasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const taskCounts = {
    all: currentTasks.length,
    pending: currentTasks.filter(t => t.status === 'pending').length,
    in_progress: currentTasks.filter(t => t.status === 'in_progress').length,
    completed: currentTasks.filter(t => t.status === 'completed').length,
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#047857', '#065f46']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Ionicons name="list" size={32} color="#ffffff" />
        <Text style={styles.headerTitle}>Tasks</Text>
        <Text style={styles.headerSubtitle}>Manage your collection tasks</Text>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { key: 'all', label: `All (${taskCounts.all})`, dot: null },
            { key: 'pending', label: `Pending (${taskCounts.pending})`, dot: '#64748b' },
            { key: 'in_progress', label: `In Progress (${taskCounts.in_progress})`, dot: '#0d9488' },
            { key: 'completed', label: `Completed (${taskCounts.completed})`, dot: '#10b981' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
              onPress={() => setFilter(f.key)}
            >
              {f.dot && <View style={[styles.filterDot, { backgroundColor: filter === f.key ? 'rgba(255,255,255,0.7)' : f.dot }]} />}
              <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} tintColor="#10b981" />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={24} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadTasks()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {filteredTasks.length === 0 && !error && (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#d1fae5" />
            <Text style={styles.emptyTitle}>No {filter !== 'all' ? filter.replace('_', ' ') : ''} tasks</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'all'
                ? 'Tasks will appear here when bins need collection'
                : `You don't have any ${filter.replace('_', ' ')} tasks`}
            </Text>
          </View>
        )}

        {filteredTasks.map((task) => {
          const isServiceRequest = task.task_type === 'service_request' || task.origin === 'service_request';
          return (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={styles.taskHeaderLeft}>
                  <View style={[styles.taskIconContainer, {
                    backgroundColor: '#ecfdf5',
                  }]}>
                    <Ionicons
                      name={isServiceRequest ? "document-text" : "trash"}
                      size={20}
                      color={isServiceRequest ? '#047857' : '#10b981'}
                    />
                  </View>
                  <View style={styles.taskHeaderText}>
                    <Text style={styles.binId} numberOfLines={1}>
                      {isServiceRequest ? 'REQ' : 'Bin'} #{task.bin_id || task.binId}
                    </Text>
                    <Text style={styles.taskType}>
                      {isServiceRequest ? 'Service Request' : 'Collection'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.priorityBadge, {
                  backgroundColor: task.priority === 'high' ? '#fef2f2' : '#f8fafc',
                  borderColor: getPriorityColor(task.priority),
                }]}>
                  <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
                    {task.priority.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.taskLocation}>
                <Ionicons name="location" size={16} color="#10b981" />
                <Text style={styles.taskLocationText} numberOfLines={2}>
                  {task.location?.address || task.location || 'Location not available'}
                </Text>
              </View>

              <View style={styles.taskDetails}>
                <View style={styles.taskDetailItem}>
                  <Ionicons name="speedometer-outline" size={16} color="#64748b" />
                  <Text style={styles.taskDetailText}>
                    {isServiceRequest ? `${task.fill_level || 0}kg` : `${task.fill_level || 0}%`}
                  </Text>
                </View>
                <View style={styles.taskDetailItem}>
                  <Ionicons name="time-outline" size={16} color="#64748b" />
                  <Text style={styles.taskDetailText}>{task.estimated_time || 'N/A'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                  <Text style={styles.statusText}>{task.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
              </View>

              {!isServiceRequest && (
                <View style={styles.fillLevelBar}>
                  <View style={[styles.fillLevelProgress, {
                    width: `${task.fill_level || 0}%`,
                    backgroundColor: task.fill_level > 80 ? '#dc2626' : task.fill_level > 50 ? '#d97706' : '#10b981'
                  }]} />
                </View>
              )}

              {task.status !== 'completed' && (
                <View style={styles.taskActions}>
                  {task.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.startButton}
                      onPress={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                    >
                      <Ionicons name="play-circle-outline" size={18} color="#047857" />
                      <Text style={styles.startButtonText}>Start</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => handleUpdateTaskStatus(task.id, 'completed')}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                    <Text style={styles.completeButtonText}>Complete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: moderateScale(15),
    color: '#64748b',
    marginTop: verticalScale(12),
  },
  header: {
    paddingTop: verticalScale(40),
    paddingBottom: verticalScale(32),
    paddingHorizontal: moderateScale(20),
    alignItems: 'center',
    borderBottomLeftRadius: moderateScale(24),
    borderBottomRightRadius: moderateScale(24),
  },
  headerTitle: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: verticalScale(12),
    marginBottom: verticalScale(4),
  },
  headerSubtitle: {
    fontSize: moderateScale(14),
    color: 'rgba(255, 255, 255, 0.85)',
  },
  filterContainer: {
    marginTop: verticalScale(-16),
    marginBottom: verticalScale(16),
    paddingHorizontal: moderateScale(20),
  },
  filterScroll: {
    gap: moderateScale(8),
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: moderateScale(14),
    paddingVertical: verticalScale(9),
    borderRadius: moderateScale(20),
    gap: moderateScale(6),
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  filterTabActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterTabText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#475569',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  filterDot: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
  },
  scrollContent: {
    paddingHorizontal: moderateScale(20),
    paddingBottom: verticalScale(100),
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: moderateScale(12),
    padding: moderateScale(20),
    alignItems: 'center',
    marginBottom: verticalScale(16),
    gap: verticalScale(12),
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: moderateScale(14),
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#047857',
    paddingHorizontal: moderateScale(20),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(8),
  },
  retryButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyContainer: {
    paddingVertical: verticalScale(60),
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#334155',
    marginTop: verticalScale(16),
    marginBottom: verticalScale(4),
  },
  emptySubtitle: {
    fontSize: moderateScale(14),
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: moderateScale(40),
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(14),
    padding: moderateScale(16),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  taskHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskIconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(12),
  },
  taskHeaderText: {
    flex: 1,
  },
  binId: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1e293b',
  },
  taskType: {
    fontSize: moderateScale(11),
    color: '#64748b',
    marginTop: verticalScale(2),
  },
  priorityBadge: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(8),
    borderWidth: 1,
  },
  priorityText: {
    fontSize: moderateScale(10),
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  taskLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
    marginBottom: verticalScale(12),
  },
  taskLocationText: {
    fontSize: moderateScale(13),
    color: '#64748b',
    flex: 1,
  },
  taskDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
    marginBottom: verticalScale(12),
  },
  taskDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  taskDetailText: {
    fontSize: moderateScale(12),
    color: '#64748b',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(8),
    marginLeft: 'auto',
  },
  statusText: {
    fontSize: moderateScale(10),
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  fillLevelBar: {
    height: verticalScale(5),
    backgroundColor: '#e2e8f0',
    borderRadius: moderateScale(3),
    overflow: 'hidden',
    marginBottom: verticalScale(12),
  },
  fillLevelProgress: {
    height: '100%',
    borderRadius: moderateScale(3),
  },
  taskActions: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(10),
    gap: moderateScale(6),
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  startButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#047857',
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(10),
    gap: moderateScale(6),
  },
  completeButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#ffffff',
  },
});
