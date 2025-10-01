// app/(tabs)/service-requests.tsx
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResidentAPI, ServiceRequestUtils } from '../../services/residentAPI';

const { width } = Dimensions.get('window');

export default function ServiceRequestsScreen() {
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsResponse, serviceTypesResponse, addressesResponse] = await Promise.all([
        ResidentAPI.getUserServiceRequests(),
        ResidentAPI.getServiceTypes(),
        ResidentAPI.getUserAddresses(),
      ]);

      setRequests(requestsResponse.serviceRequests || []);
      setServiceTypes(serviceTypesResponse.serviceTypes || []);
      setAddresses(addressesResponse.addresses || []);
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

  const createServiceRequest = async () => {
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
      preferredTimeSlot: 'morning',
      specialInstructions: '',
      estimatedWeight: '',
      estimatedBags: '',
    });
    setFormErrors({});
  };

  const renderServiceRequest = ({ item }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => viewRequestDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.requestHeader}>
        <View style={styles.requestTitleContainer}>
          <Text style={styles.requestTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.requestNumber}>#{item.request_number}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: ServiceRequestUtils.getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      {item.description && (
        <Text style={styles.requestDescription} numberOfLines={2}>{item.description}</Text>
      )}
      
      <View style={styles.requestDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            {ServiceRequestUtils.formatDate(item.preferred_date)} • {item.preferred_time_slot}
          </Text>
        </View>
        
        {item.estimated_weight && (
          <View style={styles.detailRow}>
            <Ionicons name="cube-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {item.estimated_weight}kg{item.estimated_bags && ` • ${item.estimated_bags} bags`}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.requestActions}>
        <Text style={styles.createdDate}>
          Created {ServiceRequestUtils.formatDate(item.created_at)}
        </Text>
        
        {ServiceRequestUtils.canCancelRequest(item.status) && (
          <TouchableOpacity
            style={styles.cancelButtonSmall}
            onPress={(e) => {
              e.stopPropagation();
              cancelServiceRequest(item.id, item.title);
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Service Requests</Text>
      <Text style={styles.emptyText}>You haven't created any service requests yet.</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={() => setShowCreateModal(true)}>
        <Text style={styles.primaryButtonText}>Create Your First Request</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && requests.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading service requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Service Requests</Text>
        <TouchableOpacity style={styles.newRequestButton} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.newRequestButtonText}>New Request</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={requests}
        renderItem={renderServiceRequest}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContainer, requests.length === 0 && styles.emptyListContainer]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshData} colors={['#8B5CF6']} />}
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
                {loading ? <ActivityIndicator size="small" color="#8B5CF6" /> : <Text style={styles.modalActionPrimary}>Create</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Type *</Text>
                <View style={[styles.pickerContainer, formErrors.serviceTypeId && styles.inputError]}>
                  <Picker selectedValue={requestForm.serviceTypeId} onValueChange={(value) => setRequestForm({...requestForm, serviceTypeId: value})} style={styles.picker}>
                    <Picker.Item label="Select service type..." value="" />
                    {serviceTypes.map((type) => (
                      <Picker.Item key={type.id} label={`${type.name}${type.base_price ? ` - $${type.base_price}` : ''}`} value={String(type.id)} />
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput style={[styles.input, formErrors.title && styles.inputError]} value={requestForm.title} onChangeText={(text) => setRequestForm({...requestForm, title: text})} placeholder="Brief title for your request" maxLength={255} />
                {formErrors.title && <Text style={styles.errorText}>{formErrors.title}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, styles.textArea]} value={requestForm.description} onChangeText={(text) => setRequestForm({...requestForm, description: text})} placeholder="Describe your service request..." multiline numberOfLines={4} textAlignVertical="top" />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Preferred Date *</Text>
                  <TextInput style={[styles.input, formErrors.preferredDate && styles.inputError]} value={requestForm.preferredDate} onChangeText={(text) => setRequestForm({...requestForm, preferredDate: text})} placeholder="YYYY-MM-DD" />
                  {formErrors.preferredDate && <Text style={styles.errorText}>{formErrors.preferredDate}</Text>}
                </View>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Time Slot</Text>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={requestForm.preferredTimeSlot} onValueChange={(value) => setRequestForm({...requestForm, preferredTimeSlot: value})} style={styles.picker}>
                      <Picker.Item label="Morning" value="morning" />
                      <Picker.Item label="Afternoon" value="afternoon" />
                      <Picker.Item label="Evening" value="evening" />
                    </Picker>
                  </View>
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

          <ScrollView style={styles.modalContent}>
            {selectedRequest && (
              <View>
                <View style={styles.detailCard}>
                  <View style={styles.detailHeader}>
                    <Text style={styles.detailTitle}>{selectedRequest.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: ServiceRequestUtils.getStatusColor(selectedRequest.status) }]}>
                      <Text style={styles.statusText}>{selectedRequest.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.requestNumber}>#{selectedRequest.request_number}</Text>
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
                    <Text style={styles.infoLabel}>Service Type:</Text>
                    <Text style={styles.infoValue}>{selectedRequest.service_type_name}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Priority:</Text>
                    <Text style={styles.infoValue}>{selectedRequest.priority}</Text>
                  </View>
                  {selectedRequest.base_price && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Base Price:</Text>
                      <Text style={styles.infoValue}>${selectedRequest.base_price}</Text>
                    </View>
                  )}
                  {selectedRequest.quoted_price && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Quoted Price:</Text>
                      <Text style={styles.infoValue}>${selectedRequest.quoted_price}</Text>
                    </View>
                  )}
                  {selectedRequest.final_price && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Final Price:</Text>
                      <Text style={styles.infoValue}>${selectedRequest.final_price}</Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Preferred Date:</Text>
                    <Text style={styles.infoValue}>{ServiceRequestUtils.formatDate(selectedRequest.preferred_date)} • {selectedRequest.preferred_time_slot}</Text>
                  </View>
                  {selectedRequest.estimated_weight && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Weight:</Text>
                      <Text style={styles.infoValue}>{selectedRequest.estimated_weight} kg</Text>
                    </View>
                  )}
                  {selectedRequest.estimated_bags && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Bags:</Text>
                      <Text style={styles.infoValue}>{selectedRequest.estimated_bags}</Text>
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
                    <Text style={styles.sectionTitle}>Your Feedback</Text>
                    <View style={styles.ratingContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons key={star} name={star <= existingFeedback.rating ? "star" : "star-outline"} size={24} color="#FFB800" />
                      ))}
                    </View>
                    <Text style={styles.sectionContent}>{existingFeedback.comment}</Text>
                    <Text style={styles.feedbackDate}>
                      Submitted on {ServiceRequestUtils.formatDate(existingFeedback.created_at)}
                    </Text>
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
              {loading ? <ActivityIndicator size="small" color="#8B5CF6" /> : <Text style={styles.modalActionPrimary}>Submit</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rating (1-5) *</Text>
              <View style={styles.ratingSelector}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setFeedback({...feedback, rating: String(star)})}>
                    <Ionicons name={feedback.rating >= star ? "star" : "star-outline"} size={40} color="#FFB800" style={styles.star} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Comment *</Text>
              <TextInput style={[styles.input, styles.textArea]} value={feedback.comment} onChangeText={(text) => setFeedback({...feedback, comment: text})} placeholder="Share your experience..." multiline numberOfLines={6} textAlignVertical="top" />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  newRequestButton: { backgroundColor: '#8B5CF6', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginLeft: 12 },
  newRequestButtonText: { color: 'white', fontSize: 14, fontWeight: '600', marginLeft: 4 },
  listContainer: { padding: 16 },
  emptyListContainer: { flexGrow: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30, paddingHorizontal: 40 },
  primaryButton: { backgroundColor: '#8B5CF6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  requestCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  requestTitleContainer: { flex: 1, marginRight: 12 },
  requestTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 4 },
  requestNumber: { fontSize: 12, color: '#666', fontWeight: '500' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: 'white', fontSize: 10, fontWeight: '600' },
  requestDescription: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
  requestDetails: { marginBottom: 16 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailText: { fontSize: 14, color: '#333', marginLeft: 8, flex: 1 },
  requestActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  createdDate: { fontSize: 12, color: '#999' },
  cancelButtonSmall: { backgroundColor: '#FF3B30', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  cancelButtonText: { color: 'white', fontSize: 12, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: 'white' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  modalAction: { color: '#666', fontSize: 16, fontWeight: '400' },
  modalActionPrimary: { color: '#8B5CF6', fontSize: 16, fontWeight: '600' },
  modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: 'white' },
  inputError: { borderColor: '#FF3B30' },
  textArea: { height: 100, textAlignVertical: 'top' },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: 'white' },
  picker: { height: 50 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfWidth: { width: '48%' },
  errorText: { color: '#FF3B30', fontSize: 12, marginTop: 4 },
  bottomSpacing: { height: 40 },
  detailCard: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 16, marginBottom: 16 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  detailTitle: { fontSize: 20, fontWeight: '600', color: '#333', flex: 1, marginRight: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  sectionContent: { fontSize: 14, color: '#666', lineHeight: 20 },
  infoRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  infoLabel: { fontSize: 14, fontWeight: '500', color: '#666', width: 120 },
  infoValue: { fontSize: 14, color: '#333', flex: 1 },
  cancelButton: { backgroundColor: '#FF3B30', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  feedbackButton: { backgroundColor: '#8B5CF6', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8, flexDirection: 'row', justifyContent: 'center' },
  feedbackButtonText: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  ratingContainer: { flexDirection: 'row', marginBottom: 12 },
  ratingSelector: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 },
  star: { marginHorizontal: 4 },
  feedbackDate: { fontSize: 12, color: '#999', marginTop: 8, fontStyle: 'italic' },
});