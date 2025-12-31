import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, Alert, TextInput } from 'react-native';
import PerformanceTab from '../../components/PerformanceTab';
import ProfileTab from '../../components/ProfileTab';
import TasksTab from '../../components/TasksTab';
import WorkAreasTab from '../../components/WorkAreasTab';
import { useAuth } from '../../context/AuthContext';
import { DriverAPI } from '../../services/driver';
import { ResidentAPI, ServiceRequestUtils } from '../../services/residentAPI';
import { VehicleAPI } from '../../services/vehicle';
import BinMap from '../../components/BinMap';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { signOut, state } = useAuth();
  const navigation = useNavigation();
  const router = useRouter();
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

  // Task completion state
  const [completingTask, setCompletingTask] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [collectionWeight, setCollectionWeight] = useState('');
  const [completing, setCompleting] = useState(false);

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
        setCurrentTasks([]);
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
        setVehicleData(null);
      }
    } catch (err) {
      console.error('Error loading driver data:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Failed to load driver data');
      setDriverData(null);
      setVehicleData(null);
      setCurrentTasks([]);
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

  const handleCompleteTask = async (taskId) => {
    try {
      setCompleting(true);
      await DriverAPI.completeTask(taskId, {
        notes: completionNotes,
        collection_weight: collectionWeight ? parseFloat(collectionWeight) : null
      });

      // Refresh tasks
      await loadDriverData();

      // Close modal and reset
      setCompletingTask(null);
      setCompletionNotes('');
      setCollectionWeight('');

      // Show success message (you can use a toast library or Alert)
      console.log('Task completed successfully');
    } catch (error) {
      console.error('Error completing task:', error);
      setError('Failed to complete task');
    } finally {
      setCompleting(false);
    }
  };

  // Resident-specific state
  const [residentLoading, setResidentLoading] = useState(isResident);
  const [residentProfile, setResidentProfile] = useState(null);
  const [residentRequests, setResidentRequests] = useState([]);
  const [residentError, setResidentError] = useState(null);

  useEffect(() => {
    if (isResident && state.user) {
      loadResidentData();
    } else {
      setResidentLoading(false);
    }
  }, [isResident, state.user]);

  const loadResidentData = async () => {
    try {
      setResidentLoading(true);
      setResidentError(null);

      const [profileResp, requestsResp] = await Promise.all([
        ResidentAPI.getUserProfile(),
        ResidentAPI.getUserServiceRequests(),
      ]);

      const normalizedProfile = Array.isArray(profileResp) ? profileResp[0] : (profileResp?.data || profileResp || null);
      const normalizedRequests = Array.isArray(requestsResp) ? requestsResp : (requestsResp?.data || []);

      setResidentProfile(normalizedProfile);
      setResidentRequests(normalizedRequests);
    } catch (e) {
      console.error('Error loading resident data:', e);
      setResidentError('Failed to load dashboard');
    } finally {
      setResidentLoading(false);
    }
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Driver Dashboard</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/feedback')}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#6d28d9" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn}>
              <Ionicons name="notifications-outline" size={24} color="#6d28d9" />
            </TouchableOpacity>
          </View>
        </View>



        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <LinearGradient
            colors={['#6d28d9', '#8b5cf6']}
            style={styles.welcomeGradient}
          >
            {/* ... rest of welcome card ... */}
            {/* Status Badge - Top Right Corner */}
            <View style={styles.statusBadgeCorner}>
              <Text style={styles.statusText}>{driverData.status.toUpperCase()}</Text>
            </View>

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
                <Ionicons name="refresh-outline" size={20} color="#6d28d9" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
          </View>
          {currentTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyStateText}>No active tasks</Text>
              <Text style={styles.emptyStateSubtext}>Tasks will appear here when bins need collection</Text>
            </View>
          ) : (
            currentTasks.map((task) => {
              const isServiceRequest = task.task_type === 'service_request' || task.origin === 'service_request';
              return (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.binId}>{isServiceRequest ? 'REQ' : 'BIN'}: {task.bin_id || task.binId}</Text>
                    <View style={[styles.priorityBadge, { backgroundColor: isServiceRequest ? '#8b5cf6' : (task.priority === 'high' ? '#ef4444' : '#f59e0b') }]}>
                      <Text style={styles.priorityText}>{task.priority.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.taskLocation}>{task.location?.address || task.location || 'Location not available'}</Text>
                  {isServiceRequest && task.title && <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{task.title}</Text>}
                  <View style={styles.taskFooter}>
                    <View style={styles.fillLevelContainer}>
                      <Text style={styles.fillLevelText}>
                        {isServiceRequest ? `Est. Weight: ${task.fill_level || 0}kg` : `Fill Level: ${task.fill_level || 0}%`}
                      </Text>
                      {!isServiceRequest && (
                        <View style={styles.fillLevelBar}>
                          <View style={[styles.fillLevelProgress, { width: `${task.fill_level || task.fillLevel || 0}%` }]} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.estimatedTime}>{task.estimated_time || task.estimatedTime || 'N/A'}</Text>
                  </View>

                  {/* Complete Task Button */}
                  <TouchableOpacity
                    style={styles.completeTaskBtn}
                    onPress={() => setCompletingTask(task)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.completeTaskBtnText}>Complete Task</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
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
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.residentScrollContent}
    >
      {residentLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : residentError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{residentError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadResidentData}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Resident Dashboard</Text>
            <TouchableOpacity style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={24} color="#6d28d9" />
            </TouchableOpacity>
          </View>

          {/* Welcome Card */}
          <View style={styles.welcomeCard}>
            <LinearGradient
              colors={['#10b981', '#34d399']}
              style={styles.welcomeGradient}
            >
              {/* Status Badge - Top Right Corner */}
              <View style={styles.statusBadgeCorner}>
                <Text style={styles.statusText}>{(residentProfile?.status || 'active').toUpperCase()}</Text>
              </View>

              <View style={styles.welcomeContent}>
                <View style={styles.profileSection}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(residentProfile?.full_name || state.user?.username || 'R').split(' ').map(n => n[0]).join('')}</Text>
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.welcomeText}>Welcome back!</Text>
                    <Text style={styles.driverName}>{residentProfile?.full_name || state.user?.username || 'Resident'}</Text>
                    {!!residentProfile?.email && <Text style={styles.driverId}>{residentProfile.email}</Text>}
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{residentRequests.length}</Text>
              <Text style={styles.statLabel}>Total Requests</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{residentRequests.filter(r => (r.status || '').toLowerCase() === 'pending').length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{residentRequests.filter(r => (r.status || '').toLowerCase() === 'completed').length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={24} color="#6d28d9" />
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
              <Text style={styles.taskLocation}>{ServiceRequestUtils.formatDateTime(
                (residentRequests.find(r => (r.status || '').toLowerCase() === 'approved')?.scheduled_date) ||
                (residentRequests.find(r => (r.status || '').toLowerCase() === 'approved')?.preferred_date)
              ) || 'N/A'}</Text>
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
                <Ionicons name="call-outline" size={24} color="#6d28d9" />
                <Text style={styles.quickActionText}>Request Service</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionButton}>
                <Ionicons name="location-outline" size={24} color="#6d28d9" />
                <Text style={styles.quickActionText}>Update Address</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionButton}>
                <Ionicons name="chatbubble-outline" size={24} color="#6d28d9" />
                <Text style={styles.quickActionText}>Contact Support</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
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
      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Tab Navigation - Only for Drivers */}
      {isDriver && (
        <View style={styles.bottomTabContainer}>
          {[
            { key: 'overview', label: 'Overview', icon: 'analytics-outline' },
            { key: 'tasks', label: 'Tasks', icon: 'list-outline' },
            { key: 'workareas', label: 'Areas', icon: 'map-outline' },
            { key: 'performance', label: 'Performance', icon: 'trending-up-outline' },
            { key: 'profile', label: 'Profile', icon: 'person-outline' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={styles.bottomTab}
              onPress={() => setActiveTab(tab.key)}
            >
              <View style={[styles.tabIconContainer, activeTab === tab.key && styles.activeTabIconContainer]}>
                <Ionicons
                  name={tab.icon}
                  size={20}
                  color={activeTab === tab.key ? '#6d28d9' : '#a78bfa'}
                />
              </View>
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Task Completion Modal */}
      <Modal
        visible={!!completingTask}
        transparent
        animationType="slide"
        onRequestClose={() => setCompletingTask(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Task</Text>
              <TouchableOpacity onPress={() => setCompletingTask(null)}>
                <Ionicons name="close-outline" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>

            {completingTask && (
              <View style={styles.modalBody}>
                <Text style={styles.modalBinInfo}>
                  Bin: {completingTask.bin_name || completingTask.bin_id}
                </Text>
                <Text style={styles.modalLocationInfo}>
                  {completingTask.location?.address || 'Location not available'}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Collection Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter weight in kg"
                    keyboardType="numeric"
                    value={collectionWeight}
                    onChangeText={setCollectionWeight}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add any notes about the collection"
                    multiline
                    numberOfLines={4}
                    value={completionNotes}
                    onChangeText={setCompletionNotes}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setCompletingTask(null)}
                    disabled={completing}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitBtn, completing && styles.submitBtnDisabled]}
                    onPress={() => handleCompleteTask(completingTask.id)}
                    disabled={completing}
                  >
                    {completing ? (
                      <Text style={styles.submitBtnText}>Completing...</Text>
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.submitBtnText}>Complete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9d5ff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4c1d95',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomTabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e9d5ff',
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
    backgroundColor: '#ede9fe',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#a78bfa',
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#6d28d9',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingBottom: 120, // Keep padding for driver internal tabs
  },
  residentScrollContent: {
    paddingBottom: 80, // Padding for main tab bar
  },
  welcomeCard: {
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  welcomeGradient: {
    padding: 20,
  },
  welcomeContent: {
    flexDirection: 'row',
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
  statusBadgeCorner: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
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
    marginHorizontal: 20,
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
  completeTaskBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  completeTaskBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalBinInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  modalLocationInfo: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
});