import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as LinkingExpo from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResidentAPI } from '../services/residentAPI';

const STATUS_META = {
  paid: { label: 'Paid', color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle' },
  overdue: { label: 'Overdue', color: '#dc2626', bg: '#fee2e2', icon: 'alert-circle' },
  failed: { label: 'Failed', color: '#b45309', bg: '#fef3c7', icon: 'close-circle' },
  pending: { label: 'Pending', color: '#0369a1', bg: '#e0f2fe', icon: 'time' },
};

const getStatusMeta = (s) => STATUS_META[s] || STATUS_META.pending;

const formatMonth = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  } catch {
    return dateStr;
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payingId, setPayingId] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await ResidentAPI.getDuesHistory();
      setHistory(res.history || []);
    } catch (err) {
      console.error('Payment history error:', err);
      Alert.alert('Error', 'Failed to load payment history.');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handlePayNow = async (record) => {
    try {
      setPayingId(record.id);
      const returnUrl = LinkingExpo.createURL('billing-return');
      const session = await ResidentAPI.createDuesCheckoutSession(returnUrl);

      const browserResult = await WebBrowser.openAuthSessionAsync(
        session.checkoutUrl,
        returnUrl
      );

      let sessionId = session.checkoutSessionId;
      if (browserResult.type === 'success' && browserResult.url) {
        const parsed = LinkingExpo.parse(browserResult.url);
        const parsedId = parsed?.queryParams?.session_id
          ? String(parsed.queryParams.session_id)
          : null;
        if (parsedId && parsedId !== '{CHECKOUT_SESSION_ID}' && parsedId.startsWith('cs_')) {
          sessionId = parsedId;
        }
      }

      if (sessionId) {
        const verify = await ResidentAPI.verifyDuesCheckoutSession(sessionId);
        Alert.alert('Payment Status', verify.message || 'Payment status updated.');
      } else {
        Alert.alert('Payment Pending', 'Could not confirm payment yet. Please check back later.');
      }

      await loadHistory();
    } catch (err) {
      Alert.alert('Payment Error', err.message || 'Failed to process payment.');
    } finally {
      setPayingId(null);
    }
  };

  const handleViewReceipt = (url) => {
    if (url) Linking.openURL(url);
  };

  const renderItem = ({ item }) => {
    const meta = getStatusMeta(item.status);
    const isPaying = payingId === item.id;
    const currency = (item.currency || 'PKR').toUpperCase();
    const hasActions = item.receiptUrl || item.status !== 'paid';

    // Border color mirrors status
    const borderColors = {
      paid: '#10b981',
      overdue: '#dc2626',
      failed: '#f59e0b',
      pending: '#0ea5e9',
    };
    const borderColor = borderColors[item.status] || '#94a3b8';

    return (
      <View style={[styles.card, { borderLeftColor: borderColor }]}>
        {/* Top row: month + status badge */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.monthText}>{formatMonth(item.billingMonth)}</Text>
            <Text style={styles.dueDateText}>Due: {formatDate(item.dueDate)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={13} color={meta.color} />
            <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>
            {currency} {Number(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        {/* Paid metadata */}
        {item.paidAt && (
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color="#64748b" />
            <Text style={styles.metaText}>Paid on {formatDate(item.paidAt)}</Text>
          </View>
        )}
        {item.paymentMethod && (
          <View style={styles.metaRow}>
            <Ionicons name="card-outline" size={13} color="#64748b" />
            <Text style={styles.metaText}>
              via {item.paymentMethod.charAt(0).toUpperCase() + item.paymentMethod.slice(1)}
            </Text>
          </View>
        )}

        {/* Actions — only shown if there's something to do */}
        {hasActions && (
          <View style={styles.cardActions}>
            {item.receiptUrl && (
              <TouchableOpacity
                style={styles.receiptBtn}
                onPress={() => handleViewReceipt(item.receiptUrl)}
              >
                <Ionicons name="receipt-outline" size={15} color="#10b981" />
                <Text style={styles.receiptBtnText}>View Receipt</Text>
              </TouchableOpacity>
            )}
            {item.status !== 'paid' && (
              <TouchableOpacity
                style={[styles.payBtn, isPaying && styles.payBtnDisabled]}
                onPress={() => handlePayNow(item)}
                disabled={isPaying || !!payingId}
              >
                {isPaying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="card" size={15} color="#fff" />
                    <Text style={styles.payBtnText}>Pay Now</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="receipt-outline" size={48} color="#10b981" />
      </View>
      <Text style={styles.emptyTitle}>No Payment Records</Text>
      <Text style={styles.emptySubtitle}>
        Your billing history will appear here once your first dues cycle begins.
      </Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient
        colors={['#10b981', '#059669']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} id="payment-history-back">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Payment History</Text>
          <Text style={styles.headerSubtitle}>Monthly dues & billing records</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {loading && history.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading payment history...</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.list,
            history.length === 0 && styles.emptyList,
            { paddingBottom: insets.bottom + 24 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={['#10b981']}
              tintColor="#10b981"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  list: {
    padding: 16,
    gap: 14,
  },
  emptyList: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  dueDateText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1fdf7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    justifyContent: 'flex-end',
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  receiptBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#10b981',
  },
  payBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  payBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d1fae5',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
