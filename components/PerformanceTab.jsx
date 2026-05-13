import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DriverAPI } from '../services/driver';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

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
    commendations: 0,
    thisMonthCollections: 0,
    lastMonthCollections: 0,
    thisMonthRating: 0,
    lastMonthRating: 0,
  });

  const [weeklyData, setWeeklyData] = useState([]);

  const loadData = async () => {
    try {
      if (state.user?.id) {
        const response = await DriverAPI.getPerformance(state.user.id);
        const data = response.data.performance;

        setPerformanceData({
          totalCollections: data.totalCollections || data.metrics?.total_completed || 0,
          onTimeRate: data.onTimeRate || data.metrics?.on_time_rate || 100,
          averageRating: data.averageRating || data.metrics?.average_rating || 0,
          distanceCovered: data.distanceCovered || data.metrics?.distance_covered || '0 km',
          fuelEfficiency: data.fuelEfficiency || data.metrics?.fuel_efficiency || 'N/A',
          complaints: data.complaints || data.metrics?.complaints || 0,
          commendations: data.commendations || data.metrics?.commendations || 0,
          thisMonthCollections: data.metrics?.this_month_collections || 0,
          lastMonthCollections: data.metrics?.last_month_collections || 0,
          thisMonthRating: data.metrics?.this_month_rating || 0,
          lastMonthRating: data.metrics?.last_month_rating || 0,
        });

        if (data.weeklyData && Array.isArray(data.weeklyData)) {
          setWeeklyData(data.weeklyData);
        } else if (data.weekly && Array.isArray(data.weekly)) {
          setWeeklyData(data.weekly);
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
        <LinearGradient
          colors={['#047857', '#065f46']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Ionicons name="trending-up" size={32} color="#ffffff" />
          <Text style={styles.headerTitle}>Performance</Text>
          <Text style={styles.headerSubtitle}>Track your achievements</Text>
        </LinearGradient>

        {/* Overview Cards */}
        <View style={styles.overviewContainer}>
          <View style={styles.overviewCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark-done" size={24} color="#10b981" />
            </View>
            <Text style={styles.overviewNumber}>{performanceData.totalCollections}</Text>
            <Text style={styles.overviewLabel}>Total Collections</Text>
          </View>

          <View style={styles.overviewCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="star" size={24} color="#10b981" />
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
                  <View style={[styles.legendDot, { backgroundColor: '#0d9488' }]} />
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
                  <Ionicons name="bar-chart-outline" size={48} color="#d1fae5" />
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
            <View style={styles.iconCircle}>
              <Ionicons name="calendar" size={20} color="#10b981" />
            </View>
            <View style={styles.trendContent}>
              <Text style={styles.trendLabel}>This Month Collections</Text>
              <Text style={styles.trendSubtext}>
                {performanceData.lastMonthCollections > 0
                  ? `vs Last Month (${performanceData.lastMonthCollections})`
                  : 'vs Last Month'}
              </Text>
            </View>
            <Text style={[styles.trendValue, {
              color: performanceData.thisMonthCollections >= performanceData.lastMonthCollections ? '#10b981' : '#dc2626'
            }]}>
              {performanceData.lastMonthCollections > 0
                ? `${performanceData.thisMonthCollections >= performanceData.lastMonthCollections ? '+' : ''}${Math.round(((performanceData.thisMonthCollections - performanceData.lastMonthCollections) / performanceData.lastMonthCollections) * 100)}%`
                : `${performanceData.thisMonthCollections}`}
            </Text>
          </View>

          <View style={styles.trendCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="speedometer" size={20} color="#0d9488" />
            </View>
            <View style={styles.trendContent}>
              <Text style={styles.trendLabel}>On-Time Rate</Text>
              <Text style={styles.trendSubtext}>Delivery performance</Text>
            </View>
            <Text style={styles.trendValue}>{performanceData.onTimeRate}%</Text>
          </View>

          <View style={styles.trendCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="star" size={20} color="#10b981" />
            </View>
            <View style={styles.trendContent}>
              <Text style={styles.trendLabel}>Average Rating</Text>
              <Text style={styles.trendSubtext}>
                {performanceData.lastMonthRating > 0
                  ? `vs Last Month (${performanceData.lastMonthRating.toFixed(1)})`
                  : 'Current rating'}
              </Text>
            </View>
            <Text style={[styles.trendValue, {
              color: performanceData.thisMonthRating >= performanceData.lastMonthRating ? '#10b981' : '#dc2626'
            }]}>
              {performanceData.lastMonthRating > 0
                ? `${performanceData.thisMonthRating >= performanceData.lastMonthRating ? '+' : ''}${(performanceData.thisMonthRating - performanceData.lastMonthRating).toFixed(1)}`
                : performanceData.averageRating.toFixed(1)}
            </Text>
          </View>

          <View style={styles.trendCard}>
            <View style={[styles.iconCircle, { backgroundColor: performanceData.complaints > 0 ? '#fef2f2' : '#ecfdf5' }]}>
              <Ionicons name="alert-circle" size={20} color={performanceData.complaints > 0 ? '#dc2626' : '#10b981'} />
            </View>
            <View style={styles.trendContent}>
              <Text style={styles.trendLabel}>Complaints</Text>
              <Text style={styles.trendSubtext}>Customer feedback</Text>
            </View>
            <Text style={[styles.trendValue, { color: performanceData.complaints > 0 ? '#dc2626' : '#10b981' }]}>
              {performanceData.complaints}
            </Text>
          </View>

          <View style={styles.trendCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="thumbs-up" size={20} color="#10b981" />
            </View>
            <View style={styles.trendContent}>
              <Text style={styles.trendLabel}>Commendations</Text>
              <Text style={styles.trendSubtext}>Positive feedback</Text>
            </View>
            <Text style={styles.trendValue}>{performanceData.commendations}</Text>
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
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  iconCircle: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(10),
    backgroundColor: '#ecfdf5',
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
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    borderWidth: 1,
    borderColor: '#d1fae5',
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
    backgroundColor: '#0d9488',
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
  trendCard: {
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(10),
    borderWidth: 1,
    borderColor: '#d1fae5',
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
});
