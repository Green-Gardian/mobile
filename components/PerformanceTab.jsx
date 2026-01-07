import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { DriverAPI } from '../services/driver';
import { useAuth } from '../context/AuthContext';

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
      <View style={[styles.container, styles.centerContent]}>
        <Text>Loading performance data...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6d28d9']} />
      }
    >
      {/* Performance Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Overview</Text>

        <View style={styles.performanceGrid}>
          <View style={styles.performanceCard}>
            <Text style={styles.performanceNumber}>{performanceData.totalCollections}</Text>
            <Text style={styles.performanceLabel}>Total Collections</Text>
          </View>
          {/* <View style={styles.performanceCard}>
            <Text style={styles.performanceNumber}>{performanceData.onTimeRate}%</Text>
            <Text style={styles.performanceLabel}>On-Time Rate</Text>
          </View> */}
          <View style={styles.performanceCard}>
            <Text style={styles.performanceNumber}>{performanceData.averageRating}</Text>
            <Text style={styles.performanceLabel}>Average Rating</Text>
          </View>
          {/* <View style={styles.performanceCard}>
            <Text style={styles.performanceNumber}>{performanceData.distanceCovered}</Text>
            <Text style={styles.performanceLabel}>Distance Covered</Text>
          </View> */}
        </View>
      </View>

      {/* Efficiency Metrics */}
      {/* <View style={styles.section}>
        <Text style={styles.sectionTitle}>Efficiency Metrics</Text>
        
        <View style={styles.efficiencyCard}>
          <View style={styles.efficiencyItem}>
            <Text style={styles.efficiencyLabel}>Fuel Efficiency</Text>
            <Text style={styles.efficiencyValue}>{performanceData.fuelEfficiency}</Text>
          </View>
          <View style={styles.efficiencyItem}>
            <Text style={styles.efficiencyLabel}>Complaints</Text>
            <Text style={styles.efficiencyValue}>{performanceData.complaints}</Text>
          </View>
          <View style={styles.efficiencyItem}>
            <Text style={styles.efficiencyLabel}>Commendations</Text>
            <Text style={styles.efficiencyValue}>{performanceData.commendations}</Text>
          </View>
        </View>
      </View> */}

      {/* Weekly Performance Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Performance</Text>

        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Collections & Rating</Text>
          </View>

          <View style={styles.chart}>
            {weeklyData.length > 0 ? weeklyData.map((data, index) => (
              <View key={index} style={styles.chartBar}>
                <View style={styles.barContainer}>
                  {/* Scale height based on max values, roughly 20 collections and 5 stars */}
                  <View style={[styles.collectionBar, { height: `${Math.min((data.collections / 20) * 100, 100)}%` }]} />
                  <View style={[styles.ratingBar, { height: `${(data.rating / 5) * 100}%` }]} />
                </View>
                <Text style={styles.weekLabel}>{data.week}</Text>
                <Text style={styles.weekValue}>{data.collections}</Text>
              </View>
            )) : (
              <Text style={{ textAlign: 'center', width: '100%', color: '#666', marginTop: 40 }}>No data available for this week</Text>
            )}
          </View>

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#6d28d9' }]} />
              <Text style={styles.legendText}>Collections</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#10b981' }]} />
              <Text style={styles.legendText}>Rating</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Performance Trends */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Trends</Text>

        <View style={styles.trendsCard}>
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>This Month</Text>
            <Text style={styles.trendValue}>+12%</Text>
            <Text style={styles.trendSubtext}>vs Last Month</Text>
          </View>
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Efficiency</Text>
            <Text style={styles.trendValue}>+8%</Text>
            <Text style={styles.trendSubtext}>vs Last Month</Text>
          </View>
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Rating</Text>
            <Text style={styles.trendValue}>+0.3</Text>
            <Text style={styles.trendSubtext}>vs Last Month</Text>
          </View>
        </View>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  performanceCard: {
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
  performanceNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6d28d9',
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  efficiencyCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  efficiencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  efficiencyLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  efficiencyValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 16,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: 2,
  },
  collectionBar: {
    width: 12,
    backgroundColor: '#6d28d9',
    borderRadius: 2,
  },
  ratingBar: {
    width: 12,
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  weekLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  weekValue: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
  },
  trendsCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  trendLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  trendValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  trendSubtext: {
    fontSize: 12,
    color: '#64748b',
  },
});
