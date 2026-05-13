import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, Dimensions, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import BinMap from './BinMap';

const { width, height } = Dimensions.get('window');

// Responsive sizing
const scale = (size) => (width / 375) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

export default function WorkAreasTab({ tasks }) {
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'stats'
  const [refreshing, setRefreshing] = useState(false);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = tasks?.length || 0;
    const completed = tasks?.filter(t => t.status === 'completed').length || 0;
    const inProgress = tasks?.filter(t => t.status === 'in_progress').length || 0;
    const pending = tasks?.filter(t => t.status === 'pending').length || 0;
    const highPriority = tasks?.filter(t => t.priority === 'high').length || 0;

    return { total, completed, inProgress, pending, highPriority };
  }, [tasks]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <View style={styles.container}>
      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={['#047857', '#065f46']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Ionicons name="map" size={moderateScale(28)} color="white" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Work Areas</Text>
              <Text style={styles.headerSubtitle}>{stats.total} Total Tasks</Text>
            </View>
          </View>

          {/* View Mode Toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
              onPress={() => setViewMode('map')}
            >
              <Ionicons
                name="map-outline"
                size={moderateScale(18)}
                color={viewMode === 'map' ? '#10b981' : 'white'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'stats' && styles.toggleBtnActive]}
              onPress={() => setViewMode('stats')}
            >
              <Ionicons
                name="stats-chart-outline"
                size={moderateScale(18)}
                color={viewMode === 'stats' ? '#10b981' : 'white'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats Bar */}
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.inProgress}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.highPriority}</Text>
            <Text style={styles.statLabel}>Priority</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Content Area */}
      {viewMode === 'map' ? (
        <BinMap
          tasks={tasks}
          style={{ flex: 1, width: '100%', height: '100%' }}
        />
      ) : (
        <ScrollView
          style={styles.statsView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} />
          }
        >
          {/* Area Coverage Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="location" size={moderateScale(24)} color="#10b981" />
              <Text style={styles.cardTitle}>Coverage Overview</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.coverageItem}>
                <View style={styles.coverageIcon}>
                  <Ionicons name="checkmark-circle" size={moderateScale(32)} color="#10b981" />
                </View>
                <View style={styles.coverageInfo}>
                  <Text style={styles.coverageValue}>{stats.completed}</Text>
                  <Text style={styles.coverageLabel}>Completed Tasks</Text>
                  <Text style={styles.coveragePercent}>
                    {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% of total
                  </Text>
                </View>
              </View>

              <View style={styles.coverageItem}>
                <View style={[styles.coverageIcon, { backgroundColor: '#ecfdf5' }]}>
                  <Ionicons name="time" size={moderateScale(32)} color="#0d9488" />
                </View>
                <View style={styles.coverageInfo}>
                  <Text style={styles.coverageValue}>{stats.inProgress}</Text>
                  <Text style={styles.coverageLabel}>In Progress</Text>
                  <Text style={styles.coveragePercent}>Currently active</Text>
                </View>
              </View>

              <View style={styles.coverageItem}>
                <View style={[styles.coverageIcon, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="alert-circle" size={moderateScale(32)} color="#ef4444" />
                </View>
                <View style={styles.coverageInfo}>
                  <Text style={styles.coverageValue}>{stats.highPriority}</Text>
                  <Text style={styles.coverageLabel}>High Priority</Text>
                  <Text style={styles.coveragePercent}>Needs attention</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Task Distribution Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="pie-chart" size={moderateScale(24)} color="#10b981" />
              <Text style={styles.cardTitle}>Task Distribution</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.progressBar}>
                <View style={[styles.progressSegment, {
                  flex: stats.completed,
                  backgroundColor: '#10b981'
                }]} />
                <View style={[styles.progressSegment, {
                  flex: stats.inProgress,
                  backgroundColor: '#0d9488'
                }]} />
                <View style={[styles.progressSegment, {
                  flex: stats.pending,
                  backgroundColor: '#94a3b8'
                }]} />
              </View>

              <View style={styles.distributionLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.legendText}>Completed ({stats.completed})</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#0d9488' }]} />
                  <Text style={styles.legendText}>In Progress ({stats.inProgress})</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#94a3b8' }]} />
                  <Text style={styles.legendText}>Pending ({stats.pending})</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Performance Insights */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="trending-up" size={moderateScale(24)} color="#10b981" />
              <Text style={styles.cardTitle}>Performance Insights</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.insightRow}>
                <View style={styles.insightItem}>
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.insightBadge}
                  >
                    <Ionicons name="speedometer" size={moderateScale(24)} color="white" />
                  </LinearGradient>
                  <Text style={styles.insightLabel}>Efficiency</Text>
                  <Text style={styles.insightValue}>
                    {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                  </Text>
                </View>

                <View style={styles.insightItem}>
                  <LinearGradient
                    colors={['#059669', '#047857']}
                    style={styles.insightBadge}
                  >
                    <Ionicons name="checkmark-done" size={moderateScale(24)} color="white" />
                  </LinearGradient>
                  <Text style={styles.insightLabel}>Completion</Text>
                  <Text style={styles.insightValue}>{stats.completed}/{stats.total}</Text>
                </View>

                <View style={styles.insightItem}>
                  <LinearGradient
                    colors={['#0d9488', '#0f766e']}
                    style={styles.insightBadge}
                  >
                    <Ionicons name="flash" size={moderateScale(24)} color="white" />
                  </LinearGradient>
                  <Text style={styles.insightLabel}>Active</Text>
                  <Text style={styles.insightValue}>{stats.inProgress}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: moderateScale(16),
    paddingHorizontal: moderateScale(16),
    paddingBottom: moderateScale(12),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(16),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
  },
  headerTextContainer: {
    gap: moderateScale(2),
  },
  headerTitle: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: moderateScale(12),
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: moderateScale(20),
    padding: moderateScale(4),
    gap: moderateScale(4),
  },
  toggleBtn: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(16),
  },
  toggleBtnActive: {
    backgroundColor: 'white',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: moderateScale(11),
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: moderateScale(2),
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: moderateScale(8),
  },
  statsView: {
    flex: 1,
    padding: moderateScale(16),
  },
  card: {
    backgroundColor: 'white',
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    marginBottom: moderateScale(16),
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
    marginBottom: moderateScale(16),
  },
  cardTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#1e293b',
  },
  cardContent: {
    gap: moderateScale(12),
  },
  coverageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(16),
    paddingVertical: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  coverageIcon: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverageInfo: {
    flex: 1,
  },
  coverageValue: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#1e293b',
  },
  coverageLabel: {
    fontSize: moderateScale(14),
    color: '#64748b',
    marginTop: moderateScale(2),
  },
  coveragePercent: {
    fontSize: moderateScale(12),
    color: '#94a3b8',
    marginTop: moderateScale(2),
  },
  progressBar: {
    flexDirection: 'row',
    height: moderateScale(12),
    borderRadius: moderateScale(6),
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  progressSegment: {
    height: '100%',
  },
  distributionLegend: {
    gap: moderateScale(8),
    marginTop: moderateScale(8),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  legendDot: {
    width: moderateScale(12),
    height: moderateScale(12),
    borderRadius: moderateScale(6),
  },
  legendText: {
    fontSize: moderateScale(14),
    color: '#64748b',
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: moderateScale(12),
  },
  insightItem: {
    flex: 1,
    alignItems: 'center',
    gap: moderateScale(8),
  },
  insightBadge: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightLabel: {
    fontSize: moderateScale(12),
    color: '#64748b',
    textAlign: 'center',
  },
  insightValue: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#1e293b',
  },
  bottomPadding: {
    height: moderateScale(20),
  },
});
