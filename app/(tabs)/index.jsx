import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PerformanceTab from '../../components/PerformanceTab';
import ProfileTab from '../../components/ProfileTab';
import TasksTab from '../../components/TasksTab';
import WorkAreasTab from '../../components/WorkAreasTab';
import { useAuth } from '../../context/AuthContext';
import { DriverAPI } from '../../services/driver';
import { VehicleAPI } from '../../services/vehicle';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { signOut, state } = useAuth();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Check if user is driver or resident
  const isDriver = state.user?.role === 'driver';
  const isResident = state.user?.role === 'resident';

  // Driver-specific state
  const [driverData, setDriverData] = useState(null);
  const [currentTasks, setCurrentTasks] = useState([]);
  const [vehicleData, setVehicleData] = useState(null);
  const [loading, setLoading] = useState(isDriver); // Only loading for drivers
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Load driver data on component mount (only for drivers)
  useEffect(() => {
    if (isDriver && state.user) {
      loadDriverData();
    } else {
      // For residents or when no user, ensure loading is false
      setLoading(false);
    }
  }, [isDriver, state.user]);

  // Add focus listener to refresh data when tab becomes active (only for drivers)
  useEffect(() => {
    if (isDriver && state.user) {
      const unsubscribe = navigation.addListener('focus', () => {
        console.log('Overview tab focused, refreshing data...');
        loadDriverData();
      });

      return unsubscribe;
    }
  }, [navigation, isDriver, state.user]);

  const loadDriverData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      console.log('Loading driver data...');
      
      // Load driver profile
      console.log('Calling DriverAPI.getDriverProfile()...');
      const profileResponse = await DriverAPI.getDriverProfile();
      console.log('Profile response:', profileResponse.data);
      
      if (profileResponse.data.drivers && profileResponse.data.drivers.length > 0) {
        const driver = profileResponse.data.drivers[0];
        setDriverData({
          name: `${driver.first_name} ${driver.last_name}`,
          id: driver.id,
          email: driver.email,
          phone: driver.phone_number,
          status: driver.status || 'active',
          rating: 4.8, // Default rating since it's not in backend yet
          totalCollections: 156, // Default since it's not in backend yet
          todayCollections: 8, // Default since it's not in backend yet
          workAreas: 2, // Default since it's not in backend yet
          vehicle: {
            plateNo: 'ISB-2024', // Default since vehicle data needs separate API
            model: 'Toyota Hilux',
            status: 'active'
          }
        });
      }

      // Load current tasks
      console.log('Calling DriverAPI.getCurrentTasks()...');
      const tasksResponse = await DriverAPI.getCurrentTasks();
      console.log('Tasks response:', tasksResponse.data);
      
      if (tasksResponse.data.tasks) {
        setCurrentTasks(tasksResponse.data.tasks);
      } else {
        // Set default tasks if API doesn't return data
        setCurrentTasks([
          {
            id: 1,
            bin_id: 'BIN_001',
            location: { address: 'House #123, Street 5, Sector A' },
            priority: 'high',
            status: 'in_progress',
            fill_level: 85,
            estimated_time: '30 min'
          },
          {
            id: 2,
            bin_id: 'BIN_007',
            location: { address: 'Park Area, Sector A' },
            priority: 'medium',
            status: 'pending',
            fill_level: 30,
            estimated_time: '15 min'
          }
        ]);
      }

      // Load vehicle data
      console.log('Calling VehicleAPI.getVehicles()...');
      const vehicleResponse = await VehicleAPI.getVehicles();
      console.log('Vehicle response:', vehicleResponse.data);
      
      if (vehicleResponse.data.vehicles && vehicleResponse.data.vehicles.length > 0) {
        const vehicle = vehicleResponse.data.vehicles[0]; // Get first vehicle
        setVehicleData({
          plateNo: vehicle.plate_no,
          model: vehicle.model || 'Vehicle Model',
          status: vehicle.status || 'active'
        });
      } else {
        // Set default vehicle data if no vehicles found
        setVehicleData({
          plateNo: 'ISB-2024',
          model: 'Toyota Hilux',
          status: 'active'
        });
      }
    } catch (err) {
      console.error('Error loading driver data:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Failed to load driver data');
      // Set default data on error
      setDriverData({
        name: 'Driver',
        id: 'DRV001',
        email: 'driver@greenguardian.com',
        phone: '+92 300 0000000',
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
      });
      setVehicleData({
        plateNo: 'ISB-2024',
        model: 'Toyota Hilux',
        status: 'active'
      });
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const onRefresh = () => {
    if (isDriver && state.user) {
      loadDriverData(true);
    }
  };

  // Resident data
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

  const renderDriverOverview = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading driver data...</Text>
        </View>
      );
    }

    if (error || !driverData) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Failed to load driver data'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadDriverData}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6d28d9']}
            tintColor="#6d28d9"
          />
        }
      >
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
            <Text style={styles.statLabel}>Today Collections</Text>
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
            <View style={styles.sectionHeaderRight}>
              <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
                <Text style={styles.refreshText}>🔄</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
          </View>
          {currentTasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <Text style={styles.binId}>{task.bin_id || task.binId}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: task.priority === 'high' ? '#ef4444' : '#f59e0b' }]}>
                  <Text style={styles.priorityText}>{task.priority.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.taskLocation}>{task.location?.address || task.location || 'Location not available'}</Text>
              <View style={styles.taskFooter}>
                <View style={styles.fillLevelContainer}>
                  <Text style={styles.fillLevelText}>Fill Level: {task.fill_level || task.fillLevel || 0}%</Text>
                  <View style={styles.fillLevelBar}>
                    <View style={[styles.fillLevelProgress, { width: `${task.fill_level || task.fillLevel || 0}%` }]} />
                  </View>
                </View>
                <Text style={styles.estimatedTime}>{task.estimated_time || task.estimatedTime || 'N/A'}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Vehicle Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assigned Vehicle</Text>
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
              <Text style={styles.vehiclePlate}>{vehicleData?.plateNo || 'N/A'}</Text>
              <View style={[styles.vehicleStatusBadge, { backgroundColor: '#10b981' }]}>
                <Text style={styles.vehicleStatusText}>{(vehicleData?.status || 'active').toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.vehicleModel}>{vehicleData?.model || 'Vehicle Model'}</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

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
    // If no user is authenticated, don't render anything
    if (!state.user) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Redirecting to sign in...</Text>
        </View>
      );
    }

    // Resident content
    if (isResident) {
      return renderResidentOverview();
    }
    
    // Driver content
    if (isDriver) {
      switch (activeTab) {
        case 'overview': return renderDriverOverview();
        case 'tasks': return <TasksTab />;
        case 'workareas': return <WorkAreasTab />;
        case 'performance': return <PerformanceTab />;
        case 'profile': return <ProfileTab />;
        default: return renderDriverOverview();
      }
    }
    
    // Fallback for unknown roles
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
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
        <View style={styles.bottomTabContainer}>
          {[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'tasks', label: 'Tasks', icon: '📋' },
            { key: 'workareas', label: 'Areas', icon: '🗺️' },
            { key: 'performance', label: 'Performance', icon: '📈' },
            { key: 'profile', label: 'Profile', icon: '👤' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={styles.bottomTab}
              onPress={() => setActiveTab(tab.key)}
            >
              <View style={[styles.tabIconContainer, activeTab === tab.key && styles.activeTabIconContainer]}>
                <Text style={[styles.tabIcon, activeTab === tab.key && styles.activeTabIcon]}>{tab.icon}</Text>
              </View>
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
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
  bottomTabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  bottomTab: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  tabIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeTabIconContainer: {
    backgroundColor: '#6d28d9',
  },
  tabIcon: {
    fontSize: 18,
    color: '#94a3b8',
  },
  activeTabIcon: {
    color: '#ffffff',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 80, // Add padding to prevent content from being hidden behind bottom tabs
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
    paddingRight: 8, // Add padding to prevent overflow
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 80, // Prevent overflow
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
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
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshBtn: {
    padding: 4,
  },
  refreshText: {
    fontSize: 16,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#6d28d9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});