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
  paid: { label: 'Paid', color: '#047857', bg: '#ecfdf5', icon: 'checkmark-circle' },
  overdue: { label: 'Overdue', color: '#dc2626', bg: '#fef2f2', icon: 'alert-circle' },
  failed: { label: 'Failed', color: '#64748b', bg: '#f1f5f9', icon: 'close-circle' },
  pending: { label: 'Pending', color: '#0d9488', bg: '#f0fdfa', icon: 'time' },
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
    const currency = (item.currency || 'PKR').toUpperCase();

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={[styles.cardIcon, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={18} color={meta.color} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.monthText}>{formatMonth(item.billingMonth)}</Text>
            <View style={styles.metaRowInline}>
              {item.paidAt ? (
                <>
                  <Ionicons name="checkmark-circle-outline" size={12} color="#64748b" />
                  <Text style={styles.metaText}>Paid {formatDate(item.paidAt)}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="calendar-outline" size={12} color="#64748b" />
                  <Text style={styles.metaText}>Due {formatDate(item.dueDate)}</Text>
                </>
              )}
            </View>
            {item.paymentMethod && (
              <View style={styles.metaRowInline}>
                <Ionicons name="card-outline" size={12} color="#64748b" />
                <Text style={styles.metaText}>
                  via {item.paymentMethod.charAt(0).toUpperCase() + item.paymentMethod.slice(1)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.amountValue}>
            {currency} {Number(item.amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 })}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: meta.bg, borderColor: meta.color + '40' }]}>
            <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {item.receiptUrl && (
            <TouchableOpacity
              style={styles.receiptBtn}
              onPress={() => handleViewReceipt(item.receiptUrl)}
            >
              <Ionicons name="receipt-outline" size={12} color="#047857" />
              <Text style={styles.receiptBtnText}>Receipt</Text>
            </TouchableOpacity>
          )}
        </View>
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
        colors={['#047857', '#065f46']}
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
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardIcon: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  monthText: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 3 },
  metaRowInline: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  metaText: { fontSize: 11, color: '#94a3b8' },
  cardRight: { alignItems: 'flex-end', gap: 5 },
  amountValue: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  statusPill: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1,
  },
  statusLabel: { fontSize: 10, fontWeight: '700' },
  receiptBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, backgroundColor: '#ecfdf5',
    borderWidth: 1, borderColor: '#d1fae5',
  },
  receiptBtnText: { fontSize: 10, fontWeight: '600', color: '#047857' },
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
