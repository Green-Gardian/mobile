import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DriverAPI } from '../services/driver';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

// Responsive sizing helpers
const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

export default function PerformanceTab() {
  const { state } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [performanceData, setPerformanceData] = useState({
    totalCollections: 0,
    onTimeRate: 100,
    averageRating: 0,
    distanceCovered: '0 km',
    fuelEfficiency: 'N/A',
    complaints: 0,
    commendations: 0
  });

  const [weeklyData, setWeeklyData] = useState([]);

  const loadData = async () => {
    try {
      if (state.user?.id) {
        const response = await DriverAPI.getPerformance(state.user.id);
        const data = response.data.performance;

        setPerformanceData({
          totalCollections: data.totalCollections || data.metrics?.total_completed || 0,
          onTimeRate: data.onTimeRate || 100,
          averageRating: data.averageRating || 5.0,
          distanceCovered: data.distanceCovered || '0 km',
          fuelEfficiency: data.fuelEfficiency || 'N/A',
          complaints: data.complaints || 0,
          commendations: data.commendations || 0
        });

        if (data.weeklyData) {
          setWeeklyData(data.weeklyData);
        }
      }
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading performance data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: verticalScale(100) }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} tintColor="#10b981" />
        }
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#10b981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Ionicons name="trending-up" size={32} color="#ffffff" />
          <Text style={styles.headerTitle}>Performance</Text>
          <Text style={styles.headerSubtitle}>Track your achievements</Text>
        </LinearGradient>

        {/* Performance Overview Cards */}
        <View style={styles.overviewContainer}>
          <View style={styles.overviewCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="checkmark-done" size={24} color="#10b981" />
            </View>
            <Text style={styles.overviewNumber}>{performanceData.totalCollections}</Text>
            <Text style={styles.overviewLabel}>Total Collections</Text>
          </View>

          <View style={styles.overviewCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="star" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.overviewNumber}>{performanceData.averageRating.toFixed(1)}</Text>
            <Text style={styles.overviewLabel}>Average Rating</Text>
          </View>
        </View>

        {/* Weekly Performance Chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="bar-chart" size={22} color="#10b981" />
            <Text style={styles.sectionTitle}>Weekly Performance</Text>
          </View>

          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Collections & Rating</Text>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.legendText}>Collections</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                  <Text style={styles.legendText}>Rating</Text>
                </View>
              </View>
            </View>

            <View style={styles.chart}>
              {weeklyData.length > 0 ? (
                weeklyData.map((data, index) => (
                  <View key={index} style={styles.chartBar}>
                    <View style={styles.barContainer}>
                      <View style={[styles.collectionBar, { height: `${Math.min((data.collections / 20) * 100, 100)}%` }]} />
                      <View style={[styles.ratingBar, { height: `${(data.rating / 5) * 100}%` }]} />
                    </View>
                    <Text style={styles.weekLabel}>{data.week}</Text>
                    <Text style={styles.weekValue}>{data.collections}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyChart}>
                  <Ionicons name="bar-chart-outline" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyChartText}>No data available</Text>
                  <Text style={styles.emptyChartSubtext}>Complete tasks to see your performance</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Performance Trends */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="analytics" size={22} color="#10b981" />
            <Text style={styles.sectionTitle}>Performance Trends</Text>
          </View>

          <View style={styles.trendCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="calendar" size={20} color="#10b981" />
            </View>
            <View style={styles.trendContent}>
              <Text style={styles.trendLabel}>This Month</Text>
              <Text style={styles.trendSubtext}>vs Last Month</Text>
            </View>
            <Text style={styles.trendValue}>+12%</Text>
          </View>

          <View style={styles.trendCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="speedometer" size={20} color="#3b82f6" />
            </View>
            <View style={styles.trendContent}>
              <Text style={styles.trendLabel}>Efficiency</Text>
              <Text style={styles.trendSubtext}>vs Last Month</Text>
            </View>
            <Text style={styles.trendValue}>+8%</Text>
          </View>

          <View style={styles.trendCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="star" size={20} color="#f59e0b" />
            </View>
            <View style={styles.trendContent}>
              <Text style={styles.trendLabel}>Rating</Text>
              <Text style={styles.trendSubtext}>vs Last Month</Text>
            </View>
            <Text style={styles.trendValue}>+0.3</Text>
          </View>
        </View>

        {/* Achievement Badges */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="trophy" size={22} color="#10b981" />
            <Text style={styles.sectionTitle}>Achievements</Text>
          </View>

          <View style={styles.achievementsGrid}>
            <View style={styles.achievementCard}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.achievementGradient}
              >
                <Ionicons name="flame" size={32} color="#ffffff" />
                <Text style={styles.achievementNumber}>7</Text>
                <Text style={styles.achievementLabel}>Day Streak</Text>
              </LinearGradient>
            </View>

            <View style={styles.achievementCard}>
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.achievementGradient}
              >
                <Ionicons name="medal" size={32} color="#ffffff" />
                <Text style={styles.achievementNumber}>Top 10%</Text>
                <Text style={styles.achievementLabel}>This Month</Text>
              </LinearGradient>
            </View>

            <View style={styles.achievementCard}>
              <LinearGradient
                colors={['#f59e0b', '#d97706']}
                style={styles.achievementGradient}
              >
                <Ionicons name="star" size={32} color="#ffffff" />
                <Text style={styles.achievementNumber}>5.0</Text>
                <Text style={styles.achievementLabel}>Perfect Rating</Text>
              </LinearGradient>
            </View>

            <View style={styles.achievementCard}>
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                style={styles.achievementGradient}
              >
                <Ionicons name="leaf" size={32} color="#ffffff" />
                <Text style={styles.achievementNumber}>2.4T</Text>
                <Text style={styles.achievementLabel}>CO2 Saved</Text>
              </LinearGradient>
            </View>
          </View>
        </View>
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
  // Header with Gradient
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
    color: 'rgba(255, 255, 255, 0.9)',
  },
  // Overview Cards
  overviewContainer: {
    flexDirection: 'row',
    marginHorizontal: moderateScale(20),
    marginTop: verticalScale(-20),
    marginBottom: verticalScale(20),
    gap: moderateScale(12),
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconCircle: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  overviewNumber: {
    fontSize: moderateScale(32),
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: verticalScale(4),
  },
  overviewLabel: {
    fontSize: moderateScale(13),
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Section Styles
  section: {
    marginHorizontal: moderateScale(20),
    marginBottom: verticalScale(20),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(16),
    gap: moderateScale(8),
  },
  sectionTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#1e293b',
  },
  // Chart Card
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  chartTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1e293b',
  },
  chartLegend: {
    flexDirection: 'row',
    gap: moderateScale(16),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
  },
  legendDot: {
    width: moderateScale(10),
    height: moderateScale(10),
    borderRadius: moderateScale(5),
  },
  legendText: {
    fontSize: moderateScale(12),
    color: '#64748b',
    fontWeight: '500',
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: verticalScale(140),
    marginBottom: verticalScale(16),
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: verticalScale(100),
    gap: moderateScale(4),
  },
  collectionBar: {
    width: moderateScale(14),
    backgroundColor: '#10b981',
    borderRadius: moderateScale(4),
    minHeight: verticalScale(4),
  },
  ratingBar: {
    width: moderateScale(14),
    backgroundColor: '#3b82f6',
    borderRadius: moderateScale(4),
    minHeight: verticalScale(4),
  },
  weekLabel: {
    fontSize: moderateScale(11),
    color: '#64748b',
    marginTop: verticalScale(8),
    fontWeight: '600',
  },
  weekValue: {
    fontSize: moderateScale(10),
    color: '#94a3b8',
    marginTop: verticalScale(2),
  },
  emptyChart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(40),
  },
  emptyChartText: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: '#64748b',
    marginTop: verticalScale(12),
  },
  emptyChartSubtext: {
    fontSize: moderateScale(13),
    color: '#94a3b8',
    marginTop: verticalScale(4),
    textAlign: 'center',
  },
  // Trend Cards
  trendCard: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  trendContent: {
    flex: 1,
    marginLeft: moderateScale(12),
  },
  trendLabel: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: verticalScale(2),
  },
  trendSubtext: {
    fontSize: moderateScale(12),
    color: '#64748b',
  },
  trendValue: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#10b981',
  },
  // Achievements
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(12),
  },
  achievementCard: {
    width: `${(width - moderateScale(52)) / 2}px`,
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  achievementGradient: {
    padding: moderateScale(20),
    alignItems: 'center',
    minHeight: verticalScale(140),
    justifyContent: 'center',
  },
  achievementNumber: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: verticalScale(12),
    marginBottom: verticalScale(4),
  },
  achievementLabel: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
});
