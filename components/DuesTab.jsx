import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ResidentAPI } from '../services/residentAPI';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  section: {
    marginVertical: 16,
    marginHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  activeTab: {
    backgroundColor: '#10b981',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: 'white',
  },
  summaryCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  duesItem: {
    backgroundColor: 'white',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duesItemPending: {
    borderLeftColor: '#f59e0b',
  },
  duesItemOverdue: {
    borderLeftColor: '#ef4444',
  },
  duesItemContent: {
    flex: 1,
  },
  duesItemMonth: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  duesItemDetails: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  duesItemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  duesItemBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  duesItemAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginRight: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    color: '#dc2626',
    marginLeft: 8,
  },
  retryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default function DuesTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [dues, setDues] = useState({
    pending: [],
    overdue: [],
    all: [],
  });
  const [summary, setSummary] = useState({
    totalPending: 0,
    regularDuesCount: 0,
    serviceFeeCount: 0,
    regularDuesTotalAmount: 0,
    serviceFeesTotalAmount: 0,
  });

  useEffect(() => {
    loadDues();
  }, []);

  const loadDues = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ResidentAPI.getPendingDues();
      if (response.success) {
        setDues(response.dues);
        setSummary(response.summary);
      } else {
        setError(response.message || 'Failed to load dues');
      }
    } catch (err) {
      console.error('Error loading dues:', err);
      setError(err.message || 'An error occurred while loading dues');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDues();
    setRefreshing(false);
  };

  const getDuesForTab = () => {
    if (activeTab === 'pending') return dues.pending || [];
    if (activeTab === 'overdue') return dues.overdue || [];
    return dues.all || [];
  };

  const formatCurrency = (amount) => {
    return `Rs. ${(amount || 0).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDueStatusColor = (status) => {
    if (status === 'overdue') return '#ef4444';
    if (status === 'pending') return '#f59e0b';
    return '#10b981';
  };

  const currentDues = getDuesForTab();

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="receipt-outline" size={24} color="#10b981" />
          <Text style={styles.sectionTitle}>Pending Dues</Text>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Pending</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.totalPending)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Regular Dues</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.regularDuesTotalAmount)}</Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.summaryLabel}>Service Fees</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.serviceFeesTotalAmount)}</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.section, { marginBottom: 8 }]}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
              Pending ({dues.pending?.length || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'overdue' && styles.activeTab]}
            onPress={() => setActiveTab('overdue')}
          >
            <Text style={[styles.tabText, activeTab === 'overdue' && styles.activeTabText]}>
              Overdue ({dues.overdue?.length || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              All ({dues.all?.length || 0})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error State */}
      {error && (
        <View style={[styles.section, { marginBottom: 8 }]}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <TouchableOpacity style={styles.retryButton} onPress={loadDues}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading State */}
      {loading && !error && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.emptyText}>Loading dues information...</Text>
        </View>
      )}

      {/* Dues List */}
      {!loading && !error && (
        <View style={styles.section}>
          {currentDues.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
              <Text style={styles.emptyText}>
                {activeTab === 'pending'
                  ? 'No pending dues'
                  : activeTab === 'overdue'
                  ? 'No overdue dues'
                  : 'No dues found'}
              </Text>
            </View>
          ) : (
            <>
              {currentDues.map((due) => (
                <View
                  key={due.id}
                  style={[
                    styles.duesItem,
                    due.status === 'overdue' ? styles.duesItemOverdue : styles.duesItemPending,
                  ]}
                >
                  <View style={styles.duesItemContent}>
                    <Text style={styles.duesItemMonth}>
                      {formatDate(due.billingMonth)} Billing
                    </Text>
                    <Text style={styles.duesItemDetails}>
                      Due: {formatDate(due.dueDate)}
                    </Text>
                    <Text style={styles.duesItemDetails}>
                      Status: {due.status?.charAt(0).toUpperCase() + due.status?.slice(1)}
                    </Text>
                    {due.isServiceRequestFee && (
                      <View
                        style={[
                          styles.duesItemBadge,
                          { backgroundColor: '#dbeafe' },
                        ]}
                      >
                        <Text style={[styles.duesItemBadgeText, { color: '#1e40af' }]}>
                          Service Request Fee
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.duesItemAmount}>{formatCurrency(due.amount)}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}
