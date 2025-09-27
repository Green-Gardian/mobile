import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function TasksTab() {
  const currentTasks = [
    {
      id: 1,
      binId: 'BIN_001',
      location: 'House #123, Street 5, Sector A',
      priority: 'high',
      status: 'in_progress',
      fillLevel: 85,
      estimatedTime: '30 min'
    },
    {
      id: 2,
      binId: 'BIN_007',
      location: 'Park Area, Sector A',
      priority: 'medium',
      status: 'pending',
      fillLevel: 30,
      estimatedTime: '15 min'
    },
    {
      id: 3,
      binId: 'BIN_015',
      location: 'Office Complex, Sector B',
      priority: 'low',
      status: 'completed',
      fillLevel: 0,
      estimatedTime: '20 min'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'pending': return '#f59e0b';
      default: return '#64748b';
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Tasks</Text>
          <TouchableOpacity>
            <Text style={styles.filterText}>Filter</Text>
          </TouchableOpacity>
        </View>
        
        {currentTasks.map((task) => (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.binId}>{task.binId}</Text>
              <View style={styles.statusContainer}>
                <View style={[styles.priorityBadge, { backgroundColor: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#10b981' }]}>
                  <Text style={styles.priorityText}>{task.priority.toUpperCase()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                  <Text style={styles.statusText}>{task.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
              </View>
            </View>
            
            <Text style={styles.taskLocation}>{task.location}</Text>
            
            <View style={styles.taskFooter}>
              <View style={styles.fillLevelContainer}>
                <Text style={styles.fillLevelText}>Fill Level: {task.fillLevel}%</Text>
                <View style={styles.fillLevelBar}>
                  <View style={[styles.fillLevelProgress, { width: `${task.fillLevel}%` }]} />
                </View>
              </View>
              <Text style={styles.estimatedTime}>{task.estimatedTime}</Text>
            </View>
            
            {task.status !== 'completed' && (
              <TouchableOpacity style={styles.updateStatusBtn}>
                <Text style={styles.updateStatusText}>Update Status</Text>
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
});
