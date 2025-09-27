import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function WorkAreasTab() {
  const workAreas = [
    {
      id: 1,
      name: 'Sector A',
      description: 'Residential area with 150 households',
      bins: 25,
      status: 'active',
      estimatedTime: '4 hours',
      priority: 'medium'
    },
    {
      id: 2,
      name: 'Sector B',
      description: 'Commercial area with shops and offices',
      bins: 18,
      status: 'active',
      estimatedTime: '3 hours',
      priority: 'high'
    },
    {
      id: 3,
      name: 'Sector C',
      description: 'Industrial zone with warehouses',
      bins: 32,
      status: 'inactive',
      estimatedTime: '5 hours',
      priority: 'low'
    }
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#64748b';
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' ? '#10b981' : '#64748b';
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Assigned Work Areas</Text>
          <TouchableOpacity>
            <Text style={styles.mapViewText}>Map View</Text>
          </TouchableOpacity>
        </View>
        
        {workAreas.map((area) => (
          <View key={area.id} style={styles.workAreaCard}>
            <View style={styles.workAreaHeader}>
              <Text style={styles.workAreaName}>{area.name}</Text>
              <View style={styles.badgeContainer}>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(area.priority) }]}>
                  <Text style={styles.priorityText}>{area.priority.toUpperCase()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(area.status) }]}>
                  <Text style={styles.statusText}>{area.status.toUpperCase()}</Text>
                </View>
              </View>
            </View>
            
            <Text style={styles.workAreaDescription}>{area.description}</Text>
            
            <View style={styles.workAreaStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{area.bins}</Text>
                <Text style={styles.statLabel}>Total Bins</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{area.estimatedTime}</Text>
                <Text style={styles.statLabel}>Est. Time</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>85%</Text>
                <Text style={styles.statLabel}>Completion</Text>
              </View>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.viewRouteBtn}>
                <Text style={styles.viewRouteText}>View Route</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.startCollectionBtn}>
                <Text style={styles.startCollectionText}>Start Collection</Text>
              </TouchableOpacity>
            </View>
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
  mapViewText: {
    fontSize: 14,
    color: '#6d28d9',
    fontWeight: '500',
  },
  workAreaCard: {
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
  workAreaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workAreaName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  badgeContainer: {
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
  workAreaDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  workAreaStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6d28d9',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  viewRouteBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewRouteText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6d28d9',
  },
  startCollectionBtn: {
    flex: 1,
    backgroundColor: '#6d28d9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  startCollectionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
});
