// app/(tabs)/service-requests.tsx
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResidentAPI, ServiceRequestUtils } from '../../services/residentAPI';

const { width } = Dimensions.get('window');

export default function ServiceRequestsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState({ rating: '', comment: '' });
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [duesStatus, setDuesStatus] = useState(null);
  const [payingDues, setPayingDues] = useState(false);

  const [requestForm, setRequestForm] = useState({
    serviceTypeId: '',
    addressId: '',
    title: '',
    description: '',
    preferredDate: '',
    preferredTimeSlot: 'morning',
    specialInstructions: '',
    estimatedWeight: '',
    estimatedBags: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const selectedDate = requestForm.preferredDate ? new Date(requestForm.preferredDate) : null;
  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const firstDayIndex = firstOfMonth.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let blank = 0; blank < firstDayIndex; blank++) {
      days.push(null);
    }
    for (let day = 1; day <= totalDays; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  }, [calendarMonth]);

  const toLocalISO = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectCalendarDate = (date) => {
    if (!date) return;
    if (date < today) return; // block past dates
    const isoDate = toLocalISO(date);
    setRequestForm({ ...requestForm, preferredDate: isoDate });
    setFormErrors({ ...formErrors, preferredDate: undefined });
    setShowDatePicker(false);
  };

  const changeCalendarMonth = (direction) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsResponse, serviceTypesResponse, addressesResponse, duesStatusResponse] = await Promise.all([
        ResidentAPI.getUserServiceRequests(),
        ResidentAPI.getServiceTypes(),
        ResidentAPI.getUserAddresses(),
        ResidentAPI.getDuesStatus(),
      ]);

      setRequests(requestsResponse.serviceRequests || []);
      setServiceTypes(serviceTypesResponse.serviceTypes || []);
      setAddresses(addressesResponse.addresses || []);
      setDuesStatus(duesStatusResponse?.dueStatus || null);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const validateForm = () => {
    const errors = {};
    if (!requestForm.serviceTypeId) errors.serviceTypeId = 'Service type is required';
    if (!requestForm.addressId) errors.addressId = 'Address is required';
    if (!requestForm.title.trim()) errors.title = 'Title is required';
    if (!requestForm.preferredDate) {
      errors.preferredDate = 'Preferred date is required';
    } else if (!ServiceRequestUtils.validateDate(requestForm.preferredDate)) {
      errors.preferredDate = 'Please enter a valid future date (YYYY-MM-DD)';
    }
    if (requestForm.estimatedWeight && (isNaN(requestForm.estimatedWeight) || parseFloat(requestForm.estimatedWeight) < 0)) {
      errors.estimatedWeight = 'Please enter a valid weight';
    }
    if (requestForm.estimatedBags && (isNaN(requestForm.estimatedBags) || parseInt(requestForm.estimatedBags) < 0)) {
      errors.estimatedBags = 'Please enter a valid number of bags';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDuesBlockedAction = () => {
    Alert.alert(
      'Payment Required',
      duesStatus?.blockReason ||
        'You have an outstanding monthly dues balance. Please clear your bill before requesting a new service.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          style: 'default',
          onPress: handlePayDues,
        },
      ]
    );
  };

  const createServiceRequest = async () => {
    if (duesStatus && !duesStatus.canRequestSpecialCollection) {
      handleDuesBlockedAction();
      return;
    }

    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form');
      return;
    }

    try {
      setLoading(true);
      const requestData = {
        serviceTypeId: parseInt(requestForm.serviceTypeId, 10),
        addressId: parseInt(requestForm.addressId, 10),
        title: requestForm.title.trim(),
        description: requestForm.description?.trim() || null,
        preferredDate: requestForm.preferredDate,
        preferredTimeSlot: requestForm.preferredTimeSlot,
        specialInstructions: requestForm.specialInstructions?.trim() || null,
        estimatedWeight: requestForm.estimatedWeight ? parseFloat(requestForm.estimatedWeight) : null,
        estimatedBags: requestForm.estimatedBags ? parseInt(requestForm.estimatedBags, 10) : null,
      };

      const response = await ResidentAPI.createServiceRequest(requestData);
      if (response.success) {
        Alert.alert('Success', response.message || 'Service request created successfully!');
        setShowCreateModal(false);
        resetForm();
        await loadData();
      } else {
        Alert.alert('Error', response.message || 'Failed to create service request');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create service request');
    } finally {
      setLoading(false);
    }
  };

  const cancelServiceRequest = async (requestId, requestTitle) => {
    Alert.alert(
      'Cancel Request',
      `Are you sure you want to cancel "${requestTitle}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await ResidentAPI.cancelServiceRequest(requestId);
              if (response.success) {
                Alert.alert('Success', response.message || 'Service request cancelled successfully');
                await loadData();
                if (showDetailsModal) setShowDetailsModal(false);
              } else {
                Alert.alert('Error', response.message || 'Failed to cancel request');
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to cancel request');
            }
          },
        },
      ]
    );
  };

  const viewRequestDetails = async (request) => {
    try {
      setLoading(true);
      const detailResponse = await ResidentAPI.getServiceRequestById(request.id);
      setSelectedRequest(detailResponse.serviceRequest);
      setShowDetailsModal(true);
      
      // Try to load feedback, but don't show error if it doesn't exist
      try {
        const feedbackResponse = await ResidentAPI.getFeedback(request.id);
        if (feedbackResponse.success && feedbackResponse.feedback) {
          setExistingFeedback(feedbackResponse.feedback);
        } else {
          // Feedback not found - this is normal, don't show error
          setExistingFeedback(null);
        }
      } catch (feedbackError) {
        // Silently handle feedback not found - this is expected for requests without feedback
        console.log('No feedback found for this request (this is normal)');
        setExistingFeedback(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!feedback.rating || !feedback.comment.trim()) {
      Alert.alert('Validation Error', 'Please provide both rating and comment');
      return;
    }

    try {
      setLoading(true);
      const response = await ResidentAPI.submitFeedback(selectedRequest.id, {
        rating: parseInt(feedback.rating, 10),
        comment: feedback.comment.trim(),
      });

      if (response.success) {
        Alert.alert('Success', response.message || 'Feedback submitted successfully!');
        setShowFeedbackModal(false);
        setFeedback({ rating: '', comment: '' });
        await viewRequestDetails(selectedRequest);
      } else {
        Alert.alert('Error', response.message || 'Failed to submit feedback');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRequestForm({
      serviceTypeId: '',
      addressId: '',
      title: '',
      description: '',
      preferredDate: '',
      preferredDateYear: '',
      preferredDateMonth: '',
      preferredDateDay: '',
      preferredTimeSlot: 'morning',
      specialInstructions: '',
      estimatedWeight: '',
      estimatedBags: '',
    });
    setFormErrors({});
  };

  const getDueStatusMeta = (status) => {
    switch (status) {
      case 'paid':
        return { label: 'Paid', color: '#16a34a', bg: '#dcfce7' };
      case 'overdue':
        return { label: 'Overdue', color: '#dc2626', bg: '#fee2e2' };
      case 'failed':
        return { label: 'Failed', color: '#b45309', bg: '#fef3c7' };
      default:
        return { label: 'Pending', color: '#0369a1', bg: '#e0f2fe' };
    }
  };

  const handlePayDues = async () => {
    try {
      setPayingDues(true);
      const returnUrl = Linking.createURL('billing-return');
      const session = await ResidentAPI.createDuesCheckoutSession(returnUrl);

      const browserResult = await WebBrowser.openAuthSessionAsync(session.checkoutUrl, returnUrl);

      let sessionId = session.checkoutSessionId;
      if (browserResult.type === 'success' && browserResult.url) {
        const parsed = Linking.parse(browserResult.url);
        const parsedSessionId = parsed?.queryParams?.session_id
          ? String(parsed.queryParams.session_id)
          : null;
        if (
          parsedSessionId &&
          parsedSessionId !== '{CHECKOUT_SESSION_ID}' &&
          parsedSessionId.startsWith('cs_')
        ) {
          sessionId = parsedSessionId;
        }
      }

      if (sessionId) {
        const verify = await ResidentAPI.verifyDuesCheckoutSession(sessionId);
        Alert.alert('Payment Status', verify.message || 'Payment status updated.');
      } else {
        Alert.alert('Payment Pending', 'Payment session closed. We could not verify a completed payment yet.');
      }

      await loadData();
    } catch (error) {
      Alert.alert('Payment Error', error.message || 'Failed to process monthly dues payment.');
    } finally {
      setPayingDues(false);
    }
  };

  const renderServiceRequest = ({ item }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => viewRequestDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.requestCardContent}>
        <View style={styles.requestHeader}>
          <View style={styles.requestTitleContainer}>
            <Text style={styles.requestTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.requestNumber}>#{item.request_number}</Text>
          </View>
          <View style={styles.statusBadge}> 
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
      
        <View style={styles.requestDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailIconBg}>
              <Ionicons name="calendar-outline" size={14} color="#10b981" />
            </View>
            <Text style={styles.detailText}>
              {ServiceRequestUtils.formatDate(item.preferred_date)} • {item.preferred_time_slot}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIconBg}>
              <Ionicons name="location-outline" size={14} color="#10b981" />
            </View>
            <Text style={styles.detailText} numberOfLines={1}>
              {item.street_address}, {item.city}
            </Text>
          </View>
        </View>

        <View style={styles.requestFooter}>
          <View style={styles.serviceTypeBadge}>
            <Ionicons name="layers-outline" size={12} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={styles.serviceTypeText}>{item.service_type_name}</Text>
          </View>
          
          <View style={styles.footerActions}>
            {ServiceRequestUtils.canCancelRequest(item.status) && (
              <TouchableOpacity
                style={styles.cancelBtnIcon}
                onPress={(e) => {
                  e.stopPropagation();
                  cancelServiceRequest(item.id, item.title);
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Service Requests</Text>
      <Text style={styles.emptyText}>You haven't created any service requests yet.</Text>
      <TouchableOpacity
        style={[styles.primaryButton, duesStatus && !duesStatus.canRequestSpecialCollection && styles.disabledButton]}
        onPress={() => {
          if (duesStatus && !duesStatus.canRequestSpecialCollection) {
            handleDuesBlockedAction();
            return;
          }
          setShowCreateModal(true);
        }}
      >
        <Text style={styles.primaryButtonText}>Create Your First Request</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && requests.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading service requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={[styles.mainHeader, { paddingTop: insets.top, backgroundColor: '#065f46' }]}> 
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Service Requests</Text>
            <Text style={styles.headerSubtitle}>{requests.length} total requests</Text>
          </View>
          <TouchableOpacity
            style={[styles.headerFab, duesStatus && !duesStatus.canRequestSpecialCollection && styles.headerFabDisabled]}
            onPress={() => {
              if (duesStatus && !duesStatus.canRequestSpecialCollection) {
                handleDuesBlockedAction();
                return;
              }
              setShowCreateModal(true);
            }}
          >
            <Ionicons name="add" size={28} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {duesStatus && (
          <View style={styles.duesBanner}>
            <View style={styles.duesBannerLeft}>
              <Text style={styles.duesTitle}>Monthly Dues</Text>
              <Text style={styles.duesAmount}>PKR {Number(duesStatus.amount || 500).toFixed(2)} • Due {ServiceRequestUtils.formatDate(duesStatus.dueDate)}</Text>
              <View style={[styles.duesStatusPill, { backgroundColor: getDueStatusMeta(duesStatus.status).bg }]}> 
                <Text style={[styles.duesStatusText, { color: getDueStatusMeta(duesStatus.status).color }]}> 
                  {getDueStatusMeta(duesStatus.status).label}
                </Text>
              </View>
              {!duesStatus.canRequestSpecialCollection && (
                <Text style={styles.duesWarning}>
                  {duesStatus.blockReason || 'Special collection is disabled until payment is completed.'}
                </Text>
              )}
            </View>

            {duesStatus.status !== 'paid' && (
              <TouchableOpacity style={styles.duesPayButton} onPress={handlePayDues} disabled={payingDues}>
                {payingDues ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="card-outline" size={16} color="#ffffff" />
                    <Text style={styles.duesPayButtonText}>Pay Now</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <FlatList
        data={requests}
        renderItem={renderServiceRequest}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContainer, 
          requests.length === 0 && styles.emptyListContainer,
          { paddingBottom: insets.bottom + 120 }
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshData} colors={['#10b981']} tintColor="#10b981" />}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreateModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setShowCreateModal(false); resetForm(); }}>
                <Text style={styles.modalAction}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Service Request</Text>
              <TouchableOpacity onPress={createServiceRequest} disabled={loading}>
                {loading ? <ActivityIndicator size="small" color="#10b981" /> : <Text style={styles.modalActionPrimary}>Create</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formCard}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Service Type *</Text>
                  <View style={[styles.pickerContainer, formErrors.serviceTypeId && styles.inputError]}>
                    <Picker selectedValue={requestForm.serviceTypeId} onValueChange={(value) => setRequestForm({...requestForm, serviceTypeId: value})} style={styles.picker}>
                      <Picker.Item label="Select service type..." value="" />
                      {serviceTypes.map((type) => (
                        <Picker.Item key={type.id} label={`${type.name}${type.base_price ? ` - Rs. ${type.base_price}` : ''}`} value={String(type.id)} />
                      ))}
                    </Picker>
                  </View>
                  {formErrors.serviceTypeId && <Text style={styles.errorText}>{formErrors.serviceTypeId}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Service Address *</Text>
                  <View style={[styles.pickerContainer, formErrors.addressId && styles.inputError]}>
                    <Picker selectedValue={requestForm.addressId} onValueChange={(value) => setRequestForm({...requestForm, addressId: value})} style={styles.picker}>
                      <Picker.Item label="Select address..." value="" />
                      {addresses.map((address) => (
                        <Picker.Item key={address.id} label={`${address.street_address}, ${address.city}`} value={String(address.id)} />
                      ))}
                    </Picker>
                  </View>
                  {formErrors.addressId && <Text style={styles.errorText}>{formErrors.addressId}</Text>}
                </View>
              </View>

              <View style={styles.formCard}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Title *</Text>
                  <TextInput style={[styles.input, formErrors.title && styles.inputError]} value={requestForm.title} onChangeText={(text) => setRequestForm({...requestForm, title: text})} placeholder="Brief title for your request" maxLength={255} />
                  {formErrors.title && <Text style={styles.errorText}>{formErrors.title}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput style={[styles.input, styles.textArea]} value={requestForm.description} onChangeText={(text) => setRequestForm({...requestForm, description: text})} placeholder="Describe your service request..." multiline numberOfLines={4} textAlignVertical="top" />
                </View>
              </View>

              <View style={styles.formCard}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Preferred Date *</Text>
                  <TouchableOpacity
                    style={[styles.dateInputButton, formErrors.preferredDate && styles.inputError]}
                    onPress={() => {
                      setCalendarMonth(selectedDate || new Date());
                      setShowDatePicker((prev) => !prev);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dateInputText}>
                      {requestForm.preferredDate ? ServiceRequestUtils.formatDate(requestForm.preferredDate) : 'Select service date'}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#16a34a" />
                  </TouchableOpacity>

                  {showDatePicker && (
                    <View style={styles.calendarPicker}>
                      <View style={styles.calendarNav}>
                        <TouchableOpacity onPress={() => changeCalendarMonth(-1)}>
                          <Ionicons name="chevron-back" size={18} color="#0f172a" />
                        </TouchableOpacity>
                        <Text style={styles.calendarMonthLabel}>
                          {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </Text>
                        <TouchableOpacity onPress={() => changeCalendarMonth(1)}>
                          <Ionicons name="chevron-forward" size={18} color="#0f172a" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.calendarWeekRow}>
                        {daysOfWeek.map((day) => (
                          <Text key={day} style={styles.calendarWeekDay}>{day}</Text>
                        ))}
                      </View>

                      <View style={styles.calendarGrid}>
                        {calendarDays.map((day, index) => {
                          const dateString = day ? toLocalISO(day) : '';
                          const isSelected = requestForm.preferredDate === dateString;
                          const isPast = day && day < today;
                          return (
                            <TouchableOpacity
                              key={`${index}-${dateString}`}
                              style={[
                                styles.calendarDay,
                                isSelected && styles.calendarDaySelected,
                                !day && styles.calendarDayEmpty,
                                isPast && styles.calendarDayPast,
                              ]}
                              disabled={!day || isPast}
                              onPress={() => selectCalendarDate(day)}
                            >
                              <Text style={[
                                styles.calendarDayText,
                                isSelected && styles.calendarDayTextSelected,
                                isPast && styles.calendarDayTextPast,
                              ]}>
                                {day ? day.getDate() : ''}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {formErrors.preferredDate && <Text style={styles.errorText}>{formErrors.preferredDate}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Time Slot</Text>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={requestForm.preferredTimeSlot} onValueChange={(value) => setRequestForm({...requestForm, preferredTimeSlot: value})} style={styles.picker}>
                      <Picker.Item label="Morning" value="morning" />
                      <Picker.Item label="Afternoon" value="afternoon" />
                      <Picker.Item label="Evening" value="evening" />
                    </Picker>
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Weight (kg)</Text>
                    <TextInput style={[styles.input, formErrors.estimatedWeight && styles.inputError]} value={requestForm.estimatedWeight} onChangeText={(text) => setRequestForm({...requestForm, estimatedWeight: text})} placeholder="0.0" keyboardType="numeric" />
                    {formErrors.estimatedWeight && <Text style={styles.errorText}>{formErrors.estimatedWeight}</Text>}
                  </View>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Bags</Text>
                    <TextInput style={[styles.input, formErrors.estimatedBags && styles.inputError]} value={requestForm.estimatedBags} onChangeText={(text) => setRequestForm({...requestForm, estimatedBags: text})} placeholder="0" keyboardType="numeric" />
                    {formErrors.estimatedBags && <Text style={styles.errorText}>{formErrors.estimatedBags}</Text>}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Special Instructions</Text>
                  <TextInput style={[styles.input, styles.textArea]} value={requestForm.specialInstructions} onChangeText={(text) => setRequestForm({...requestForm, specialInstructions: text})} placeholder="Any special instructions..." multiline numberOfLines={3} textAlignVertical="top" />
                </View>
              </View>
              <View style={styles.bottomSpacing} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Details Modal */}
      <Modal visible={showDetailsModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDetailsModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
              <Text style={styles.modalAction}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Request Details</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
            {selectedRequest && (
              <View>
                <View style={styles.detailCard}>
                  <View style={styles.detailHeader}>
                    <View style={styles.requestTitleContainer}>
                      <Text style={styles.detailTitle}>{selectedRequest.title}</Text>
                      <Text style={styles.requestNumber}>#{selectedRequest.request_number}</Text>
                    </View>
                    <View style={[styles.statusBadge, styles.statusBadgeByStatus(selectedRequest.status)]}>
                      <Text style={styles.statusText}>{selectedRequest.status.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>

                {selectedRequest.description && (
                  <View style={styles.detailCard}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.sectionContent}>{selectedRequest.description}</Text>
                  </View>
                )}

                <View style={styles.detailCard}>
                  <Text style={styles.sectionTitle}>Service Details</Text>
                  <View style={styles.infoRow}>
                    <Ionicons name="pricetag-outline" size={18} color="#64748b" style={{ marginRight: 10 }} />
                    <Text style={styles.infoLabel}>Service Type:</Text>
                    <Text style={styles.infoValue}>{selectedRequest.service_type_name}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="flag-outline" size={18} color="#64748b" style={{ marginRight: 10 }} />
                    <Text style={styles.infoLabel}>Priority:</Text>
                    <Text style={styles.infoValue}>{selectedRequest.priority}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={18} color="#64748b" style={{ marginRight: 10 }} />
                    <Text style={styles.infoLabel}>Date & Time:</Text>
                    <Text style={styles.infoValue}>{ServiceRequestUtils.formatDate(selectedRequest.preferred_date)} • {selectedRequest.preferred_time_slot}</Text>
                  </View>
                  {(selectedRequest.estimated_weight || selectedRequest.estimated_bags) && (
                    <View style={styles.infoRow}>
                      <Ionicons name="cube-outline" size={18} color="#64748b" style={{ marginRight: 10 }} />
                      <Text style={styles.infoLabel}>Load Est.:</Text>
                      <Text style={styles.infoValue}>
                        {[
                          selectedRequest.estimated_weight ? `${selectedRequest.estimated_weight}kg` : null,
                          selectedRequest.estimated_bags ? `${selectedRequest.estimated_bags} bags` : null
                        ].filter(Boolean).join(' • ')}
                      </Text>
                    </View>
                  )}
                  {(selectedRequest.base_price || selectedRequest.quoted_price || selectedRequest.final_price) && (
                    <View style={styles.infoRow}>
                      <Ionicons name="cash-outline" size={18} color="#64748b" style={{ marginRight: 10 }} />
                      <Text style={styles.infoLabel}>Pricing:</Text>
                      <Text style={styles.infoValue}>
                        Rs. {selectedRequest.final_price || selectedRequest.quoted_price || selectedRequest.base_price}
                      </Text>
                    </View>
                  )}
                </View>

                {(selectedRequest.driver_first_name || selectedRequest.driver_phone) && (
                  <View style={styles.detailCard}>
                    <Text style={styles.sectionTitle}>Driver Information</Text>
                    {selectedRequest.driver_first_name && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Name:</Text>
                        <Text style={styles.infoValue}>{selectedRequest.driver_first_name} {selectedRequest.driver_last_name}</Text>
                      </View>
                    )}
                    {selectedRequest.driver_phone && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Phone:</Text>
                        <Text style={styles.infoValue}>{selectedRequest.driver_phone}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.detailCard}>
                  <Text style={styles.sectionTitle}>Service Address</Text>
                  <Text style={styles.sectionContent}>
                    {selectedRequest.street_address}
                    {selectedRequest.apartment_unit && `, ${selectedRequest.apartment_unit}`}
                    {selectedRequest.area && `\n${selectedRequest.area}`}
                    {`\n${selectedRequest.city} ${selectedRequest.postal_code || ''}`}
                    {selectedRequest.landmark && `\nLandmark: ${selectedRequest.landmark}`}
                  </Text>
                </View>

                {existingFeedback ? (
                  <View style={styles.detailCard}>
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="chatbubble-ellipses-outline" size={20} color="#10b981" />
                      <Text style={styles.sectionTitle}>Your Feedback</Text>
                    </View>
                    <View style={styles.feedbackShowcase}>
                      <View style={[styles.statusIndicator('approved'), { width: 3 }]} />
                      <View style={styles.ratingStarsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons 
                            key={star} 
                            name={star <= existingFeedback.rating ? "star" : "star-outline"} 
                            size={18} 
                            color="#f59e0b" 
                          />
                        ))}
                        <Text style={styles.ratingValueText}>{existingFeedback.rating}.0</Text>
                      </View>
                      <View style={styles.feedbackCommentBox}>
                        <Text style={styles.feedbackCommentText}>"{existingFeedback.comment}"</Text>
                      </View>
                      <Text style={styles.feedbackDateText}>
                        Submitted {ServiceRequestUtils.formatDate(existingFeedback.created_at)}
                      </Text>
                    </View>
                  </View>
                ) : selectedRequest.status === 'completed' && (
                  <TouchableOpacity style={styles.feedbackButton} onPress={() => setShowFeedbackModal(true)}>
                    <Ionicons name="chatbox-outline" size={20} color="white" />
                    <Text style={styles.feedbackButtonText}>Give Feedback</Text>
                  </TouchableOpacity>
                )}

                {ServiceRequestUtils.canCancelRequest(selectedRequest.status) && (
                  <TouchableOpacity style={styles.cancelButton} onPress={() => cancelServiceRequest(selectedRequest.id, selectedRequest.title)}>
                    <Text style={styles.cancelButtonText}>Cancel Request</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Feedback Modal */}
      <Modal visible={showFeedbackModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFeedbackModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowFeedbackModal(false); setFeedback({ rating: '', comment: '' }); }}>
              <Text style={styles.modalAction}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Submit Feedback</Text>
            <TouchableOpacity onPress={submitFeedback} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#10b981" /> : <Text style={styles.modalActionPrimary}>Submit</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
            <View style={styles.feedbackIntro}>
              <View style={styles.feedbackIconCircle}>
                <Ionicons name="star" size={32} color="#10b981" />
              </View>
              <Text style={styles.feedbackMainTitle}>Rate Your Experience</Text>
              <Text style={styles.feedbackSubtitle}>How was the waste collection service for this request?</Text>
            </View>

            <View style={styles.feedbackFormCard}>
              <Text style={styles.feedbackLabel}>Overal Rating</Text>
              <View style={styles.starSelectionRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity 
                    key={star} 
                    onPress={() => setFeedback({ ...feedback, rating: star })}
                    style={styles.starTouch}
                  >
                    <Ionicons 
                      name={star <= feedback.rating ? "star" : "star-outline"} 
                      size={40} 
                      color={star <= feedback.rating ? "#f59e0b" : "#cbd5e1"} 
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.feedbackLabel}>Your Comments</Text>
              <TextInput
                style={styles.feedbackInput}
                value={feedback.comment}
                onChangeText={(text) => setFeedback({ ...feedback, comment: text })}
                placeholder="Share your thoughts about the service..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitFeedbackBtn,
                (!feedback.rating || feedback.submitting) && styles.btnDisabled
              ]}
              onPress={submitFeedback}
              disabled={feedback.submitting || !feedback.rating}
            >
              {feedback.submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="white" />
                  <Text style={styles.submitFeedbackBtnText}>Submit Feedback</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b' },
  mainHeader: {
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 15,
  },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  headerFab: {
    backgroundColor: '#ffffff',
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerFabDisabled: {
    opacity: 0.65,
  },
  duesBanner: {
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 18,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  duesBannerLeft: {
    flex: 1,
  },
  duesTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  duesAmount: {
    color: '#475569',
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  duesStatusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 10,
  },
  duesStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  duesWarning: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
    fontWeight: '600',
  },
  duesPayButton: {
    alignSelf: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  duesPayButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  listContainer: { padding: 20 },
  emptyListContainer: { flexGrow: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginTop: 20 },
  emptyText: { fontSize: 15, color: '#64748b', textAlign: 'center', marginVertical: 12, paddingHorizontal: 40, lineHeight: 22 },
  primaryButton: { 
    backgroundColor: '#10b981', 
    paddingHorizontal: 28, 
    paddingVertical: 14, 
    borderRadius: 15,
    elevation: 4,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  disabledButton: {
    opacity: 0.65,
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  requestCardContent: { padding: 22 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  requestTitleContainer: { flex: 1, marginRight: 10 },
  requestTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  requestNumber: { fontSize: 10, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  statusBadgeByStatus: (status) => ({
    backgroundColor: ServiceRequestUtils.getStatusColor(status) + '20',
    borderWidth: 1,
    borderColor: ServiceRequestUtils.getStatusColor(status),
  }),
  statusText: { color: '#166534', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  statusIndicator: (status) => ({
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: ServiceRequestUtils.getStatusColor(status),
  }),
  requestDetails: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
    overflow: 'hidden',
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  detailIconBg: { 
    width: 28, 
    height: 28, 
    borderRadius: 10, 
    backgroundColor: '#ecfdf5', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  detailText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  requestFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  serviceTypeBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceTypeText: { fontSize: 11, color: '#0f766e', fontWeight: '800' },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  cancelBtnIcon: { padding: 5 },
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 18, 
    backgroundColor: '#ffffff',
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9' 
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  modalAction: { color: '#64748b', fontSize: 16, fontWeight: '500' },
  modalActionPrimary: { color: '#10b981', fontSize: 16, fontWeight: '700' },
  modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  formCard: { 
    backgroundColor: '#ffffff', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  input: { 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    fontSize: 15, 
    backgroundColor: '#f8fafc',
    color: '#1e293b'
  },
  inputError: { borderColor: '#ef4444' },
  textArea: { height: 100, textAlignVertical: 'top' },
  pickerContainer: { 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 12, 
    backgroundColor: '#f8fafc',
    overflow: 'hidden'
  },
  picker: { height: 50 },
  datePickerContainer: {
    marginBottom: 8,
  },
  dateInputButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  calendarPicker: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  calendarNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarMonthLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  calendarWeekDay: {
    width: 32,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calendarDay: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarDayEmpty: {
    backgroundColor: 'transparent',
  },
  calendarDaySelected: {
    backgroundColor: '#dcfce7',
  },
  calendarDayText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  calendarDayTextSelected: {
    color: '#166534',
    fontWeight: '800',
  },
  calendarDayPast: {
    opacity: 0.3,
  },
  calendarDayTextPast: {
    color: '#94a3b8',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfWidth: { width: '48%' },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4, fontWeight: '500' },
  bottomSpacing: { height: 60 },
  detailCard: { 
    backgroundColor: 'white', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  detailTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', flex: 1, marginRight: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 12 },
  sectionContent: { fontSize: 14, color: '#475569', lineHeight: 22 },
  infoRow: { 
    flexDirection: 'row', 
    paddingVertical: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f5f9' 
  },
  infoLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', width: 120 },
  infoValue: { fontSize: 13, color: '#1e293b', flex: 1, fontWeight: '500' },
  cancelButton: { 
    backgroundColor: '#fef2f2', 
    borderRadius: 12, 
    paddingVertical: 15, 
    alignItems: 'center', 
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fee2e2'
  },
  cancelButtonText: { color: '#dc2626', fontSize: 16, fontWeight: 'bold' },
  feedbackButton: { 
    backgroundColor: '#10b981', 
    borderRadius: 12, 
    paddingVertical: 15, 
    alignItems: 'center', 
    marginTop: 8, 
    flexDirection: 'row', 
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  feedbackButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  feedbackShowcase: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    position: 'relative',
    overflow: 'hidden',
  },
  ratingStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    marginLeft: 6,
  },
  ratingValueText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    marginLeft: 8,
  },
  feedbackCommentBox: {
    marginBottom: 12,
    marginLeft: 6,
  },
  feedbackCommentText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  feedbackDateText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
    marginLeft: 6,
    fontWeight: '600',
  },
  feedbackIntro: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  feedbackIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  feedbackMainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  feedbackSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  feedbackFormCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
  },
  starSelectionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  starTouch: {
    padding: 4,
  },
  feedbackInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1e293b',
    minHeight: 120,
  },
  submitFeedbackBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  submitFeedbackBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.7,
  },
});