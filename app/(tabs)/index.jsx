import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, Alert, TextInput, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PerformanceTab from '../../components/PerformanceTab';
import ProfileTab from '../../components/ProfileTab';
import TasksTab from '../../components/TasksTab';
import WorkAreasTab from '../../components/WorkAreasTab';
import { useAuth } from '../../context/AuthContext';
import { DriverAPI } from '../../services/driver';
import { ResidentAPI, ServiceRequestUtils } from '../../services/residentAPI';
import { VehicleAPI } from '../../services/vehicle';
import BinMap from '../../components/BinMap';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isSmallDevice = width < 360;
const isMediumDevice = width >= 360 && width < 400;
const isLargeDevice = width >= 400;

// Responsive sizing helper
const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

import * as Location from 'expo-location';
import { useSocket } from '../../context/SocketContext';

// ... imports

export default function HomeScreen() {
  const { signOut, state } = useAuth();
  const navigation = useNavigation();
  const router = useRouter();
  const socket = useSocket();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('overview');

  // Check if user is driver or resident
  const isDriver = state.user?.role === 'driver';
  const isResident = state.user?.role === 'resident';

  // Location Tracking Effect
  useEffect(() => {
    let locationSubscription = null;

    const startTracking = async () => {
      if (!isDriver) return;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
          return;
        }

        console.log('Starting location tracking...');

        // Initial location
        const loc = await Location.getCurrentPositionAsync({});
        sendLocation(loc);

        // Tracking
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 20000,
            distanceInterval: 10,
          },
          (location) => {
            console.log('Location update:', location.coords);
            sendLocation(location);
          }
        );
      } catch (err) {
        console.error('Location tracking error:', err);
      }
    };

    const sendLocation = (location) => {
      if (socket && location && location.coords) {
        socket.emit('driver:location_update', {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      }
    };

    if (isDriver && socket) {
      startTracking();
    }

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isDriver, socket]);

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

  // Refresh data when switching to overview tab
  useEffect(() => {
    if (isDriver && state.user && activeTab === 'overview') {
      console.log('Switched to overview tab, refreshing data...');
      loadDriverData();
    }
  }, [activeTab]);

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
          profile_picture: driver.profile_picture,
          status: driver.status || 'active',
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
      }

      // Load driver stats
      try {
        console.log('Calling DriverAPI.getDashboardStats()...');
        const statsResponse = await DriverAPI.getDashboardStats();
        console.log('Stats response:', statsResponse.data);
        const stats = statsResponse.data.stats;

        // Update driver data with dynamic stats
        setDriverData(prev => ({
          ...prev,
          rating: stats.rating || 5.0,
          totalCollections: stats.totalCollections || 0,
          todayCollections: stats.todayCollections || 0,
          // workAreas removed
        }));
      } catch (statsErr) {
        console.error('Error loading dashboard stats:', statsErr);
        // Fallback or keep defaults if needed, but better to show 0 or error state
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
  const [residentStats, setResidentStats] = useState({
    totalRequests: 0,
    activeRequests: 0,
    completedRequests: 0,
    userRating: '4.9'
  });
  const [nextCollection, setNextCollection] = useState(null);
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

      const [profileResp, requestsResp, statsResp] = await Promise.all([
        ResidentAPI.getUserProfile(),
        ResidentAPI.getUserServiceRequests(),
        ResidentAPI.getDashboardStats(),
      ]);

      const normalizedProfile = Array.isArray(profileResp) ? profileResp[0] : (profileResp?.data || profileResp?.profile || profileResp || null);
      const normalizedRequests = Array.isArray(requestsResp) ? requestsResp : (requestsResp?.data || requestsResp?.serviceRequests || []);
      const normalizedStats = statsResp?.stats || {
        totalRequests: 0,
        activeRequests: 0,
        completedRequests: 0,
        userRating: '4.9'
      };

      setResidentProfile(normalizedProfile);
      setResidentRequests(normalizedRequests);
      setResidentStats(normalizedStats);
      setNextCollection(statsResp?.upcomingCollection || null);
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
        <View style={[styles.loadingContainer, { paddingTop: (insets?.top || 0) + 40 }]}>
          <Text style={styles.loadingText}>Loading driver data...</Text>
        </View>
      );
    }

    if (error || !driverData) {
      return (
        <View style={[styles.errorContainer, { paddingTop: (insets?.top || 0) + 40 }]}>
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
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: verticalScale(100) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10b981']}
            tintColor="#10b981"
          />
        }
      >
        {/* Modern Header with Profile */}
        <View style={[styles.modernHeader, { paddingTop: (insets?.top || 0) + 16 }]}>
          <View style={styles.headerLeft}>
            <View style={styles.profileImageContainer}>
              {driverData.profile_picture ? (
                <Image
                  source={{ uri: driverData.profile_picture }}
                  style={styles.profileImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileImageText}>
                    {driverData.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.greetingText}>Hello, {driverData.name.split(' ')[0]} 👋</Text>
              <Text style={styles.subtitleText}>Eco-Guardian On Duty</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#1e293b" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* Progress Card - Inspired by reference */}
        <View style={styles.progressCardContainer}>
          <LinearGradient
            colors={['#10b981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.progressCard}
          >
            <View style={styles.progressLeft}>
              <View style={styles.circularProgress}>
                <Text style={styles.progressNumber}>{driverData.todayCollections}</Text>
                <Text style={styles.progressTotal}>/{driverData.todayCollections + currentTasks.filter(t => t.status !== 'completed').length}</Text>
              </View>
            </View>
            <View style={styles.progressRight}>
              <View style={styles.statusBadgeInline}>
                <Text style={styles.statusBadgeText}>ON DUTY</Text>
              </View>
              <Text style={styles.progressTitle}>Today's{'\n'}Progress</Text>
              <Text style={styles.progressSubtitle}>
                {driverData.todayCollections}/{driverData.todayCollections + currentTasks.filter(t => t.status !== 'completed').length} collections done
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Grid - 3 columns like reference */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <View style={[styles.statIconCircle, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="leaf" size={24} color="#10b981" />
            </View>
            <Text style={styles.statValue}>{driverData.totalCollections || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconCircle, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="star" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.statValue}>{driverData.rating || 5.0}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconCircle, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="time" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.statValue}>{currentTasks.length || 0}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
        </View>

        {/* Current Tasks Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleText}>Current Tasks</Text>
            <TouchableOpacity onPress={() => setActiveTab('tasks')}>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {currentTasks.length === 0 ? (
            <View style={styles.emptyTasksContainer}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color="#cbd5e1" />
              <Text style={styles.emptyTasksTitle}>No active tasks</Text>
              <Text style={styles.emptyTasksSubtitle}>Tasks will appear here when bins need collection</Text>
            </View>
          ) : (
            currentTasks.slice(0, 3).map((task) => {
              const isServiceRequest = task.task_type === 'service_request' || task.origin === 'service_request';
              return (
                <View key={task.id} style={styles.modernTaskCard}>
                  <View style={styles.taskCardLeft}>
                    <View style={[styles.taskIconContainer, { backgroundColor: isServiceRequest ? '#f3e8ff' : '#f0fdf4' }]}>
                      <Ionicons
                        name={isServiceRequest ? "document-text" : "trash"}
                        size={24}
                        color={isServiceRequest ? '#8b5cf6' : '#10b981'}
                      />
                    </View>
                  </View>
                  <View style={styles.taskCardCenter}>
                    <View style={styles.taskCardHeader}>
                      <Text style={styles.taskBinId} numberOfLines={1}>
                        {isServiceRequest ? 'REQ' : 'Bin'} #{task.bin_id || task.binId}
                      </Text>
                      <View style={[styles.taskStatusBadge, {
                        backgroundColor: task.priority === 'high' ? '#fef2f2' : '#fef9c3'
                      }]}>
                        <Text style={[styles.taskStatusText, {
                          color: task.priority === 'high' ? '#dc2626' : '#ca8a04'
                        }]}>
                          {task.priority === 'high' ? 'PENDING' : 'PENDING'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.taskLocationText} numberOfLines={1}>
                      {task.location?.address || task.location || 'Location not available'}
                    </Text>
                    {task.estimated_time && (
                      <Text style={styles.taskDistanceText}>{task.estimated_time}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.taskNavigateButton}
                    onPress={() => setCompletingTask(task)}
                  >
                    <Ionicons name="navigate" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* Impact Section - Like reference */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitleText}>Impact</Text>
          <View style={styles.impactCard}>
            <View style={styles.impactLeft}>
              <Text style={styles.impactValue}>2.4 Tons CO2 Saved</Text>
              <Text style={styles.impactSubtext}>Environmental contribution this month</Text>
            </View>
            <View style={styles.impactChart}>
              {[40, 55, 45, 70, 85].map((height, index) => (
                <View
                  key={index}
                  style={[styles.impactBar, {
                    height: `${height}%`,
                    backgroundColor: index === 4 ? '#10b981' : '#d1fae5'
                  }]}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderResidentOverview = () => {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <Header title="Resident Dashboard" isResident />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.residentScrollContent, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={
            <RefreshControl
              refreshing={residentLoading}
              onRefresh={loadResidentData}
              colors={['#10b981']}
              tintColor="#10b981"
            />
          }
        >
          {residentLoading && residentRequests.length === 0 ? (
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
              {/* Welcome Card */}
              <View style={styles.welcomeCard}>
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.welcomeGradient}
                >
                  <View style={styles.statusBadgeCorner}>
                    <Text style={styles.statusText}>{(residentProfile?.status || 'Active').toUpperCase()}</Text>
                  </View>

                  <View style={styles.welcomeContent}>
                    <View style={styles.profileSection}>
                      <View style={styles.avatar}>
                        {residentProfile?.profile_picture ? (
                          <Image
                            source={{ uri: residentProfile.profile_picture }}
                            style={styles.avatarImage}
                            contentFit="cover"
                            transition={200}
                          />
                        ) : (
                          <Text style={styles.avatarText}>
                            {(residentProfile?.full_name || state.user?.username || 'R')
                              .split(' ')
                              .map(n => n[0])
                              .join('')}
                          </Text>
                        )}
                      </View>
                      <View style={styles.profileInfo}>
                        <Text style={styles.welcomeText}>Welcome back!</Text>
                        <Text style={styles.driverName}>{residentProfile?.full_name || state.user?.username || 'Resident'}</Text>
                        <View style={styles.locationBadge}>
                          <Ionicons name="location" size={12} color="rgba(255,255,255,0.8)" />
                          <Text style={styles.locationText} numberOfLines={1}>
                            {residentProfile?.area || residentProfile?.city || 'Location not set'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Stats Cards */}
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#ecfdf5' }]}>
                    <Ionicons name="list" size={20} color="#10b981" />
                  </View>
                  <Text style={styles.statNumber}>{residentStats.totalRequests}</Text>
                  <Text style={styles.statLabel}>Total Requests</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#fff7ed' }]}>
                    <Ionicons name="time" size={20} color="#f59e0b" />
                  </View>
                  <Text style={styles.statNumber}>
                    {residentStats.activeRequests}
                  </Text>
                  <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#f0f9ff' }]}>
                    <Ionicons name="checkmark-done" size={20} color="#0ea5e9" />
                  </View>
                  <Text style={styles.statNumber}>
                    {residentStats.completedRequests}
                  </Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#f5f3ff' }]}>
                    <Ionicons name="chatbubble-ellipses" size={20} color="#8b5cf6" />
                  </View>
                  <Text style={styles.statNumber}>{residentStats.userRating}</Text>
                  <Text style={styles.statLabel}>User Rating</Text>
                </View>
              </View>

              {/* Next Collection Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming Collection</Text>
                {nextCollection ? (
                  <View style={[styles.taskCard, { borderLeftWidth: 4, borderLeftColor: '#10b981' }]}>
                    <View style={styles.taskHeader}>
                      <Text style={styles.binId}>{nextCollection.title || 'Scheduled Pickup'}</Text>
                      <View style={[styles.priorityBadge, { backgroundColor: '#10b981' }]}>
                        <Text style={styles.priorityText}>{nextCollection.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={styles.dateTimeContainer}>
                      <Ionicons name="calendar-outline" size={16} color="#64748b" />
                      <Text style={styles.taskLocation}>
                        {ServiceRequestUtils.formatDateTime(nextCollection.scheduled_date || nextCollection.preferred_date)}
                      </Text>
                    </View>
                    <View style={styles.taskFooter}>
                      <Text style={styles.fillLevelText}>Service: {nextCollection.service_type_name || 'General'}</Text>
                      <Text style={styles.estimatedTime}>Est. {nextCollection.estimated_weight || 0}kg</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyTasksCard}>
                    <Ionicons name="calendar-outline" size={32} color="#cbd5e1" />
                    <Text style={styles.emptyTasksText}>No collections scheduled</Text>
                    <TouchableOpacity
                      style={styles.requestSmallBtn}
                      onPress={() => router.push('/service-requests')}
                    >
                      <Text style={styles.requestSmallBtnText}>Request Service</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Quick Actions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActionsContainer}>
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => router.push('/service-requests')}
                  >
                    <View style={[styles.actionIconBg, { backgroundColor: '#f0fdf4' }]}>
                      <Ionicons name="add-circle-outline" size={24} color="#10b981" />
                    </View>
                    <Text style={styles.quickActionText}>Request{"\n"}Service</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => router.push('/profile')}
                  >
                    <View style={[styles.actionIconBg, { backgroundColor: '#eff6ff' }]}>
                      <Ionicons name="map-outline" size={24} color="#3b82f6" />
                    </View>
                    <Text style={styles.quickActionText}>My{"\n"}Address</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => router.push('/chat/list')}
                  >
                    <View style={[styles.actionIconBg, { backgroundColor: '#f5f3ff' }]}>
                      <Ionicons name="chatbubbles-outline" size={24} color="#8b5cf6" />
                    </View>
                    <Text style={styles.quickActionText}>Messages</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderContent = () => {
    // If no user is authenticated, don't render anything
    if (!state.user) {
      return (
        <View style={[styles.loadingContainer, { paddingTop: (insets?.top || 0) + 40 }]}>
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
        case 'workareas': return <WorkAreasTab tasks={currentTasks} />;
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

  const Header = ({ title, isResident }) => (
    <View style={[styles.header, { borderBottomColor: isResident ? '#10b981' : '#e9d5ff' }]}>
      <Text style={[styles.headerTitle, { color: isResident ? '#065f46' : '#4c1d95' }]}>{title}</Text>
      <View style={styles.headerButtons}>
        {isResident && (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/my-feedback')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#10b981" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="notifications-outline" size={22} color={isResident ? '#10b981' : '#6d28d9'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Content */}
      <View style={[styles.content, { marginTop: insets.top }]}>
        {renderContent()}
      </View>

      {/* Tab Navigation - Only for Drivers */}
      {isDriver && (
        <View style={styles.bottomTabContainer}>
          {[
            { key: 'overview', label: 'Overview', icon: 'grid-outline' },
            { key: 'tasks', label: 'Tasks', icon: 'list-outline' },
            { key: 'workareas', label: 'Map', icon: 'map-outline' },
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
                  size={22}
                  color={activeTab === tab.key ? '#10b981' : '#94a3b8'}
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
    </SafeAreaView>
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
    borderTopColor: '#d1fae5',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomTab: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  tabIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeTabIconContainer: {
    backgroundColor: '#d1fae5',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#10b981',
    fontWeight: '700',
  },
  content: {
    flex: 1,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4
  },
  locationText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500'
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  emptyTasksCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  emptyTasksText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500'
  },
  requestSmallBtn: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10b981'
  },
  requestSmallBtnText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '700'
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  // Modern Driver UI Styles
  scrollView: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modernHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: moderateScale(20),
    paddingBottom: verticalScale(16),
    backgroundColor: '#f8fafc',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImageContainer: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    marginRight: moderateScale(12),
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#6366f1',
  },
  headerTextContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: verticalScale(2),
  },
  subtitleText: {
    fontSize: moderateScale(13),
    color: '#64748b',
    fontWeight: '500',
  },
  notificationButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: moderateScale(10),
    right: moderateScale(10),
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    backgroundColor: '#ef4444',
  },
  progressCardContainer: {
    marginHorizontal: moderateScale(20),
    marginBottom: verticalScale(20),
  },
  progressCard: {
    borderRadius: moderateScale(20),
    padding: moderateScale(20),
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    minHeight: verticalScale(140),
  },
  progressLeft: {
    marginRight: moderateScale(20),
  },
  circularProgress: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: moderateScale(36),
  },
  progressTotal: {
    fontSize: moderateScale(14),
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  progressRight: {
    flex: 1,
  },
  statusBadgeInline: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: moderateScale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
    alignSelf: 'flex-start',
    marginBottom: verticalScale(8),
  },
  statusBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  progressTitle: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: verticalScale(4),
    lineHeight: moderateScale(28),
  },
  progressSubtitle: {
    fontSize: moderateScale(13),
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: moderateScale(20),
    marginBottom: verticalScale(24),
  },
  statItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    alignItems: 'center',
    marginHorizontal: moderateScale(4),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  statIconCircle: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  statValue: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: verticalScale(2),
  },
  sectionContainer: {
    marginHorizontal: moderateScale(20),
    marginBottom: verticalScale(24),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  sectionTitleText: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#1e293b',
  },
  viewAllLink: {
    fontSize: moderateScale(14),
    color: '#10b981',
    fontWeight: '600',
  },
  modernTaskCard: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  taskCardLeft: {
    marginRight: moderateScale(12),
  },
  taskIconContainer: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCardCenter: {
    flex: 1,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  taskBinId: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  taskStatusBadge: {
    paddingHorizontal: moderateScale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(8),
  },
  taskStatusText: {
    fontSize: moderateScale(10),
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  taskLocationText: {
    fontSize: moderateScale(13),
    color: '#64748b',
    marginBottom: verticalScale(2),
  },
  taskDistanceText: {
    fontSize: moderateScale(12),
    color: '#94a3b8',
  },
  taskNavigateButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: moderateScale(8),
  },
  emptyTasksContainer: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(16),
    padding: moderateScale(32),
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyTasksTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#64748b',
    marginTop: verticalScale(12),
  },
  emptyTasksSubtitle: {
    fontSize: moderateScale(13),
    color: '#94a3b8',
    marginTop: verticalScale(4),
    textAlign: 'center',
  },
  impactCard: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  impactLeft: {
    flex: 1,
  },
  impactValue: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: verticalScale(4),
  },
  impactSubtext: {
    fontSize: moderateScale(12),
    color: '#64748b',
  },
  impactChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: verticalScale(60),
    gap: moderateScale(6),
  },
  impactBar: {
    width: moderateScale(12),
    borderRadius: moderateScale(6),
  },
});