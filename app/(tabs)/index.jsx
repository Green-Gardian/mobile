import PerformanceTab from '@/components/PerformanceTab';
import ProfileTab from '@/components/ProfileTab';
import TasksTab from '@/components/TasksTab';
import WorkAreasTab from '@/components/WorkAreasTab';
import { useAuth } from '@/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { signOut, state } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Check if user is driver or resident
  const isDriver = state.user?.role === 'driver';
  const isResident = state.user?.role === 'resident';

  // Mock data - replace with actual API calls later
  const driverData = {
    name: 'John Doe',
    id: 'DRV001',
    email: 'john.doe@greenguardian.com',
    phone: '+92 300 1234567',
    status: 'active',
    rating: 4.8,
    totalCollections: 156,
    todayCollections: 8,
    workAreas: 2,
    vehicle: {
      plateNo: 'ISB-2024',
      model: 'Toyota Hilux',
      status: 'active'
    }
  };

  const residentData = {
    name: state.user?.username || 'Resident',
    id: 'RES001',
    email: 'resident@example.com',
    phone: '+92 300 1234567',
    status: 'active',
    totalRequests: 12,
    pendingRequests: 2,
    completedRequests: 10,
    nextCollection: 'Tomorrow 9:00 AM'
  };

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
    }
  ];

  const renderDriverOverview = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <LinearGradient
          colors={['#6d28d9', '#8b5cf6']}
          style={styles.welcomeGradient}
        >
          <View style={styles.welcomeContent}>
            <View style={styles.profileSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{driverData.name.split(' ').map(n => n[0]).join('')}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.welcomeText}>Welcome back!</Text>
                <Text style={styles.driverName}>{driverData.name}</Text>
                <Text style={styles.driverId}>ID: {driverData.id}</Text>
              </View>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{driverData.status.toUpperCase()}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{driverData.todayCollections}</Text>
          <Text style={styles.statLabel}>Today's Collections</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{driverData.totalCollections}</Text>
          <Text style={styles.statLabel}>Total Collections</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{driverData.rating}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{driverData.workAreas}</Text>
          <Text style={styles.statLabel}>Work Areas</Text>
        </View>
      </View>

      {/* Current Tasks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Current Tasks</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {currentTasks.map((task) => (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.binId}>{task.binId}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: task.priority === 'high' ? '#ef4444' : '#f59e0b' }]}>
                <Text style={styles.priorityText}>{task.priority.toUpperCase()}</Text>
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
          </View>
        ))}
      </View>

      {/* Vehicle Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Assigned Vehicle</Text>
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleHeader}>
            <Text style={styles.vehiclePlate}>{driverData.vehicle.plateNo}</Text>
            <View style={[styles.vehicleStatusBadge, { backgroundColor: '#10b981' }]}>
              <Text style={styles.vehicleStatusText}>{driverData.vehicle.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.vehicleModel}>{driverData.vehicle.model}</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderResidentOverview = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Welcome Card */}
      <View style={styles.welcomeCard}>
        <LinearGradient
          colors={['#10b981', '#34d399']}
          style={styles.welcomeGradient}
        >
          <View style={styles.welcomeContent}>
            <View style={styles.profileSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{residentData.name.split(' ').map(n => n[0]).join('')}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.welcomeText}>Welcome back!</Text>
                <Text style={styles.driverName}>{residentData.name}</Text>
                <Text style={styles.driverId}>ID: {residentData.id}</Text>
              </View>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{residentData.status.toUpperCase()}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{residentData.totalRequests}</Text>
          <Text style={styles.statLabel}>Total Requests</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{residentData.pendingRequests}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{residentData.completedRequests}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>📅</Text>
          <Text style={styles.statLabel}>Next Collection</Text>
        </View>
      </View>

      {/* Next Collection Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Next Collection</Text>
        <View style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <Text style={styles.binId}>Collection Scheduled</Text>
            <View style={[styles.priorityBadge, { backgroundColor: '#10b981' }]}>
              <Text style={styles.priorityText}>CONFIRMED</Text>
            </View>
          </View>
          <Text style={styles.taskLocation}>{residentData.nextCollection}</Text>
          <View style={styles.taskFooter}>
            <Text style={styles.fillLevelText}>Status: Scheduled</Text>
            <Text style={styles.estimatedTime}>Regular pickup</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.quickActionButton}>
            <Text style={styles.quickActionIcon}>📞</Text>
            <Text style={styles.quickActionText}>Request Service</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Text style={styles.quickActionIcon}>📍</Text>
            <Text style={styles.quickActionText}>Update Address</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton}>
            <Text style={styles.quickActionIcon}>💬</Text>
            <Text style={styles.quickActionText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    if (isResident) {
      return renderResidentOverview();
    }
    
    // Driver content
    switch (activeTab) {
      case 'overview': return renderDriverOverview();
      case 'tasks': return <TasksTab />;
      case 'workareas': return <WorkAreasTab />;
      case 'performance': return <PerformanceTab />;
      case 'profile': return <ProfileTab />;
      default: return renderDriverOverview();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isDriver ? 'Driver Dashboard' : 'Resident Dashboard'}
        </Text>
        <TouchableOpacity style={styles.notificationBtn}>
          <Text style={styles.notificationIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation - Only for Drivers */}
      {isDriver && (
        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'overview', label: 'Overview', icon: '📊' },
              { key: 'tasks', label: 'Tasks', icon: '📋' },
              { key: 'workareas', label: 'Areas', icon: '🗺️' },
              { key: 'performance', label: 'Performance', icon: '📈' },
              { key: 'profile', label: 'Profile', icon: '👤' }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>
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
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 18,
  },
  tabContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#6d28d9',
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  activeTabLabel: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  welcomeCard: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  welcomeGradient: {
    padding: 20,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  driverId: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6d28d9',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
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
  seeAllText: {
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
  taskLocation: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  vehicleCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehiclePlate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  vehicleStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  vehicleStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  vehicleModel: {
    fontSize: 14,
    color: '#64748b',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
});