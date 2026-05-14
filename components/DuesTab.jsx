import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, Text, TouchableOpacity,
  ActivityIndicator, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as LinkingExpo from 'expo-linking';
import { ResidentAPI } from '../services/residentAPI';

export default function DuesTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [payingId, setPayingId] = useState(null);
  const [dues, setDues] = useState({ pending: [], overdue: [], all: [] });
  const [summary, setSummary] = useState({
    totalPending: 0,
    regularDuesTotalAmount: 0,
    serviceFeesTotalAmount: 0,
  });

  useEffect(() => { loadDues(); }, []);

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
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await loadDues(); setRefreshing(false); };

  const handlePay = async () => {
    try {
      setPayingId('all');
      const returnUrl = LinkingExpo.createURL('billing-return');
      const session = await ResidentAPI.createDuesCheckoutSession(returnUrl);

      if (!session?.checkoutUrl) {
        Alert.alert('Error', session?.message || 'Could not create payment session.');
        return;
      }

      const browserResult = await WebBrowser.openAuthSessionAsync(session.checkoutUrl, returnUrl);

      let sessionId = session.checkoutSessionId;
      if (browserResult.type === 'success' && browserResult.url) {
        const parsed = LinkingExpo.parse(browserResult.url);
        const pid = parsed?.queryParams?.session_id ? String(parsed.queryParams.session_id) : null;
        if (pid && pid.startsWith('cs_')) sessionId = pid;
      }

      if (sessionId) {
        const verify = await ResidentAPI.verifyDuesCheckoutSession(sessionId);
        Alert.alert(
          verify.paymentStatus === 'paid' ? '✅ Payment Successful' : 'Payment Pending',
          verify.message || 'Payment status updated.'
        );
      } else {
        Alert.alert('Payment Pending', 'Could not confirm yet. Check back later.');
      }
      await loadDues();
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to process payment.';
      Alert.alert('Payment Error', msg);
    } finally {
      setPayingId(null);
    }
  };

  const formatCurrency = (amount) => `Rs. ${(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const tabs = [
    { key: 'pending', label: 'Pending', count: dues.pending?.length || 0 },
    { key: 'overdue', label: 'Overdue', count: dues.overdue?.length || 0 },
    { key: 'all', label: 'All', count: dues.all?.length || 0 },
  ];

  const currentDues = activeTab === 'pending' ? dues.pending || []
    : activeTab === 'overdue' ? dues.overdue || []
    : dues.all || [];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading dues...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" colors={['#10b981']} />}
    >
      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryIconWrap}>
            <Ionicons name="wallet-outline" size={22} color="#047857" />
          </View>
          <View>
            <Text style={styles.summaryLabel}>Total Outstanding</Text>
            <Text style={styles.summaryTotal}>{formatCurrency(summary.totalPending)}</Text>
          </View>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <View style={styles.summaryRowItem}>
            <Ionicons name="calendar-outline" size={15} color="#64748b" />
            <Text style={styles.summaryRowLabel}>Monthly Dues</Text>
          </View>
          <Text style={styles.summaryRowValue}>{formatCurrency(summary.regularDuesTotalAmount)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryRowItem}>
            <Ionicons name="construct-outline" size={15} color="#64748b" />
            <Text style={styles.summaryRowLabel}>Service Fees</Text>
          </View>
          <Text style={styles.summaryRowValue}>{formatCurrency(summary.serviceFeesTotalAmount)}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
            {t.count > 0 && (
              <View style={[styles.tabBadge, activeTab === t.key && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === t.key && styles.tabBadgeTextActive]}>
                  {t.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadDues}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty */}
      {!error && currentDues.length === 0 && (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="checkmark-circle-outline" size={36} color="#10b981" />
          </View>
          <Text style={styles.emptyTitle}>All clear!</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'pending' ? 'No pending dues' : activeTab === 'overdue' ? 'No overdue dues' : 'No dues found'}
          </Text>
        </View>
      )}

      {/* Pay All button — shown when there are any pending/overdue dues */}
      {!error && (dues.pending?.length > 0 || dues.overdue?.length > 0) && (
        <TouchableOpacity
          style={[styles.payAllBtn, payingId === 'all' && styles.payBtnDisabled]}
          onPress={handlePay}
          disabled={payingId === 'all'}
          activeOpacity={0.85}
        >
          {payingId ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="card-outline" size={20} color="#fff" />
              <Text style={styles.payAllText}>
                Pay — {formatCurrency(summary.totalPending)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Dues list */}
      {!error && currentDues.length > 0 && (
        <View style={styles.list}>
          {currentDues.map((due) => {
            const isOverdue = due.status === 'overdue';
            return (
              <View key={due.id} style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={[styles.cardIcon, isOverdue ? styles.cardIconOverdue : styles.cardIconPending]}>
                    <Ionicons
                      name={due.isServiceRequestFee ? 'construct-outline' : 'calendar-outline'}
                      size={18}
                      color={isOverdue ? '#dc2626' : '#047857'}
                    />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>
                      {due.isServiceRequestFee ? 'Service Fee' : formatDate(due.billingMonth)}
                    </Text>
                    <Text style={styles.cardSub}>Due {formatDate(due.dueDate)}</Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardAmount}>{formatCurrency(due.amount)}</Text>
                  <View style={[styles.statusPill, isOverdue ? styles.statusPillOverdue : styles.statusPillPending]}>
                    <Text style={[styles.statusText, isOverdue ? styles.statusTextOverdue : styles.statusTextPending]}>
                      {isOverdue ? 'Overdue' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 10, fontSize: 14, color: '#64748b' },

  // Summary card
  summaryCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  summaryIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center',
  },
  summaryLabel: { fontSize: 12, color: '#64748b', fontWeight: '500', marginBottom: 2 },
  summaryTotal: { fontSize: 24, fontWeight: '800', color: '#065f46' },
  summaryDivider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryRowItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryRowLabel: { fontSize: 13, color: '#64748b' },
  summaryRowValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },

  // Tabs
  tabsRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  tabActive: { backgroundColor: '#047857', borderColor: '#047857' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  tabTextActive: { color: '#fff' },
  tabBadge: {
    backgroundColor: '#f1f5f9', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center',
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  tabBadgeTextActive: { color: '#fff' },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fef2f2',
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#fecaca',
  },
  errorText: { flex: 1, fontSize: 13, color: '#dc2626' },
  retryText: { fontSize: 13, color: '#047857', fontWeight: '700' },

  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#ecfdf5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: '#94a3b8' },

  // List
  list: { paddingHorizontal: 16, gap: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardIcon: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  cardIconPending: { backgroundColor: '#ecfdf5' },
  cardIconOverdue: { backgroundColor: '#fef2f2' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  cardSub: { fontSize: 12, color: '#94a3b8' },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  cardAmount: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  statusPill: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1,
  },
  statusPillPending: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  statusPillOverdue: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  statusText: { fontSize: 10, fontWeight: '700' },
  statusTextPending: { color: '#d97706' },
  statusTextOverdue: { color: '#dc2626' },
  payAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#047857', borderRadius: 14,
    marginHorizontal: 16, marginBottom: 12,
    paddingVertical: 16,
  },
  payBtnDisabled: { backgroundColor: '#94a3b8' },
  payAllText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
