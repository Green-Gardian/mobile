import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DriverAPI } from '../services/driver';

export default function TasksTab() {
  const [currentTasks, setCurrentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
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
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await DriverAPI.updateTaskStatus(taskId, { status: newStatus });
      Alert.alert('Success', 'Task status updated successfully!');
      loadTasks(); // Reload tasks
    } catch (err) {
      console.error('Error updating task status:', err);
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'pending': return '#f59e0b';
      default: return '#64748b';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Tasks</Text>
          <TouchableOpacity onPress={loadTasks}>
            <Text style={styles.filterText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {currentTasks.map((task) => (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.binId}>{task.bin_id}</Text>
              <View style={styles.statusContainer}>
                <View style={[styles.priorityBadge, { backgroundColor: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#10b981' }]}>
                  <Text style={styles.priorityText}>{task.priority.toUpperCase()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                  <Text style={styles.statusText}>{task.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.taskLocation}>{task.location?.address || 'Location not available'}</Text>

            <View style={styles.taskFooter}>
              <View style={styles.fillLevelContainer}>
                <Text style={styles.fillLevelText}>Fill Level: {task.fill_level || 0}%</Text>
                <View style={styles.fillLevelBar}>
                  <View style={[styles.fillLevelProgress, { width: `${task.fill_level || 0}%` }]} />
                </View>
              </View>
              <Text style={styles.estimatedTime}>{task.estimated_time || 'N/A'}</Text>
            </View>

            {task.status !== 'completed' && (
              <TouchableOpacity
                style={styles.updateStatusBtn}
                onPress={() => handleUpdateTaskStatus(task.id, 'completed')}
              >
                <Text style={styles.updateStatusText}>Mark Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  filterText: {
    fontSize: 14,
    color: '#6d28d9',
    fontWeight: '500',
  },
  taskCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  binId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  taskLocation: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fillLevelContainer: {
    flex: 1,
    marginRight: 12,
  },
  fillLevelText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  fillLevelBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fillLevelProgress: {
    height: '100%',
    backgroundColor: '#6d28d9',
  },
  estimatedTime: {
    fontSize: 12,
    color: '#64748b',
  },
  updateStatusBtn: {
    backgroundColor: '#6d28d9',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
});
