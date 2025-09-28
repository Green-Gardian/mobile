// app/(tabs)/service-requests.tsx
import { ResidentAPI, ServiceRequestUtils } from '@/services/residentAPI';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
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

const { width } = Dimensions.get('window');

export default function ServiceRequestsScreen() {
  // State management
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Form state
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

  // Load initial data
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

      if (requestsResponse.success) {
        setRequests(requestsResponse.data || []);
      }
      
      if (serviceTypesResponse.success) {
        setServiceTypes(serviceTypesResponse.data || []);
      }
      
      if (addressesResponse.success) {
        setAddresses(addressesResponse.data || []);
      }
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

  // Form validation
  const validateForm = () => {
    const errors = {};
    
    if (!requestForm.serviceTypeId) {
      errors.serviceTypeId = 'Service type is required';
    }
    
    if (!requestForm.addressId) {
      errors.addressId = 'Address is required';
    }
    
    if (!requestForm.title.trim()) {
      errors.title = 'Title is required';
    }
    
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
        ...requestForm,
        estimatedWeight: requestForm.estimatedWeight ? parseFloat(requestForm.estimatedWeight) : null,
        estimatedBags: requestForm.estimatedBags ? parseInt(requestForm.estimatedBags) : null,
      };

      const response = await ResidentAPI.createServiceRequest(requestData);

      if (response.success) {
        Alert.alert('Success', 'Service request created successfully!');
        setShowCreateModal(false);
        resetForm();
        await loadData();
      } else {
        Alert.alert('Error', response.message || 'Failed to create service request');
      }
    } catch (error) {
      console.error('Error creating request:', error);
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
                Alert.alert('Success', 'Service request cancelled successfully');
                await loadData();
              } else {
                Alert.alert('Error', response.message || 'Failed to cancel request');
              }
            } catch (error) {
              console.error('Error cancelling request:', error);
              Alert.alert('Error', 'Failed to cancel request');
            }
          },
        },
      ]
    );
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

  const viewRequestDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const getServiceTypeName = (serviceTypeId) => {
    const serviceType = serviceTypes.find(type => type.id === serviceTypeId);
    return serviceType ? serviceType.name : 'Unknown Service';
  };

  const getAddressString = (addressId) => {
    const address = addresses.find(addr => addr.id === addressId);
    if (!address) return 'Unknown Address';
    return `${address.street_address}, ${address.city}`;
  };

  const renderServiceRequest = ({ item, index }) => (
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
        <View style={[
          styles.statusBadge, 
          { backgroundColor: ServiceRequestUtils.getStatusColor(item.status) }
        ]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      {item.description && (
        <Text style={styles.requestDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      
      <View style={styles.requestDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            {ServiceRequestUtils.formatDate(item.preferred_date)} • {item.preferred_time_slot}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.detailText} numberOfLines={1}>
            {getAddressString(item.address_id)}
          </Text>
        </View>

        {(item.estimated_weight || item.estimated_bags) && (
          <View style={styles.detailRow}>
            <Ionicons name="cube-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {item.estimated_weight && `${item.estimated_weight}kg`}
              {item.estimated_weight && item.estimated_bags && ' • '}
              {item.estimated_bags && `${item.estimated_bags} bags`}
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
            style={styles.cancelButton}
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
      <Text style={styles.emptyText}>
        You haven't created any service requests yet.
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Text style={styles.createButtonText}>Create Your First Request</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && requests.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading service requests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Service Requests</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.createButtonText}>New Request</Text>
        </TouchableOpacity>
      </View>

      {/* Service Requests List */}
      <FlatList
        data={requests}
        renderItem={renderServiceRequest}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContainer,
          requests.length === 0 && styles.emptyListContainer
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={refreshData}
            colors={['#007AFF']}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Service Request Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              
              <Text style={styles.modalTitle}>New Service Request</Text>
              
              <TouchableOpacity 
                onPress={createServiceRequest} 
                disabled={loading}
                style={[styles.saveButtonContainer, loading && styles.disabledButton]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Text style={styles.saveButton}>Create</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Form Content */}
            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Service Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Type *</Text>
                <View style={[styles.pickerContainer, formErrors.serviceTypeId && styles.inputError]}>
                  <Picker
                    selectedValue={requestForm.serviceTypeId}
                    onValueChange={(value) => setRequestForm({...requestForm, serviceTypeId: value})}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select service type..." value="" />
                    {serviceTypes.map((type) => (
                      <Picker.Item 
                        key={type.id} 
                        label={type.name} 
                        value={type.id.toString()} 
                      />
                    ))}
                  </Picker>
                </View>
                {formErrors.serviceTypeId && (
                  <Text style={styles.errorText}>{formErrors.serviceTypeId}</Text>
                )}
              </View>

              {/* Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Address *</Text>
                <View style={[styles.pickerContainer, formErrors.addressId && styles.inputError]}>
                  <Picker
                    selectedValue={requestForm.addressId}
                    onValueChange={(value) => setRequestForm({...requestForm, addressId: value})}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select address..." value="" />
                    {addresses.map((address) => (
                      <Picker.Item 
                        key={address.id} 
                        label={`${address.address_type.toUpperCase()}: ${address.street_address}, ${address.city}`} 
                        value={address.id.toString()} 
                      />
                    ))}
                  </Picker>
                </View>
                {formErrors.addressId && (
                  <Text style={styles.errorText}>{formErrors.addressId}</Text>
                )}
              </View>

              {/* Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={[styles.input, formErrors.title && styles.inputError]}
                  value={requestForm.title}
                  onChangeText={(text) => setRequestForm({...requestForm, title: text})}
                  placeholder="Brief title for your request"
                  maxLength={255}
                />
                {formErrors.title && (
                  <Text style={styles.errorText}>{formErrors.title}</Text>
                )}
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={requestForm.description}
                  onChangeText={(text) => setRequestForm({...requestForm, description: text})}
                  placeholder="Describe your service request in detail..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Preferred Date and Time */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Preferred Date *</Text>
                  <TextInput
                    style={[styles.input, formErrors.preferredDate && styles.inputError]}
                    value={requestForm.preferredDate}
                    onChangeText={(text) => setRequestForm({...requestForm, preferredDate: text})}
                    placeholder="YYYY-MM-DD"
                  />
                  {formErrors.preferredDate && (
                    <Text style={styles.errorText}>{formErrors.preferredDate}</Text>
                  )}
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Time Slot</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={requestForm.preferredTimeSlot}
                      onValueChange={(value) => setRequestForm({...requestForm, preferredTimeSlot: value})}
                      style={styles.picker}
                    >
                      <Picker.Item label="Morning" value="morning" />
                      <Picker.Item label="Afternoon" value="afternoon" />
                      <Picker.Item label="Evening" value="evening" />
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Weight and Bags */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Estimated Weight (kg)</Text>
                  <TextInput
                    style={[styles.input, formErrors.estimatedWeight && styles.inputError]}
                    value={requestForm.estimatedWeight}
                    onChangeText={(text) => setRequestForm({...requestForm, estimatedWeight: text})}
                    placeholder="0.0"
                    keyboardType="numeric"
                  />
                  {formErrors.estimatedWeight && (
                    <Text style={styles.errorText}>{formErrors.estimatedWeight}</Text>
                  )}
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Estimated Bags</Text>
                  <TextInput
                    style={[styles.input, formErrors.estimatedBags && styles.inputError]}
                    value={requestForm.estimatedBags}
                    onChangeText={(text) => setRequestForm({...requestForm, estimatedBags: text})}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                  {formErrors.estimatedBags && (
                    <Text style={styles.errorText}>{formErrors.estimatedBags}</Text>
                  )}
                </View>
              </View>

              {/* Special Instructions */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Special Instructions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={requestForm.specialInstructions}
                  onChangeText={(text) => setRequestForm({...requestForm, specialInstructions: text})}
                  placeholder="Any special instructions for the service provider..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.bottomSpacing} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Request Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
              <Text style={styles.cancelButton}>Close</Text>
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
                    <View style={[
                      styles.statusBadge, 
                      { backgroundColor: ServiceRequestUtils.getStatusColor(selectedRequest.status) }
                    ]}>
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
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service Type:</Text>
                    <Text style={styles.detailValue}>{getServiceTypeName(selectedRequest.service_type_id)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Preferred Date:</Text>
                    <Text style={styles.detailValue}>
                      {ServiceRequestUtils.formatDate(selectedRequest.preferred_date)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Time Slot:</Text>
                    <Text style={styles.detailValue}>{selectedRequest.preferred_time_slot}</Text>
                  </View>
                  {selectedRequest.estimated_weight && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Estimated Weight:</Text>
                      <Text style={styles.detailValue}>{selectedRequest.estimated_weight} kg</Text>
                    </View>
                  )}
                  {selectedRequest.estimated_bags && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Estimated Bags:</Text>
                      <Text style={styles.detailValue}>{selectedRequest.estimated_bags}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.sectionTitle}>Service Address</Text>
                  <Text style={styles.sectionContent}>{getAddressString(selectedRequest.address_id)}</Text>
                </View>

                {selectedRequest.special_instructions && (
                  <View style={styles.detailCard}>
                    <Text style={styles.sectionTitle}>Special Instructions</Text>
                    <Text style={styles.sectionContent}>{selectedRequest.special_instructions}</Text>
                  </View>
                )}

                <View style={styles.detailCard}>
                  <Text style={styles.sectionTitle}>Timeline</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Created:</Text>
                    <Text style={styles.detailValue}>
                      {ServiceRequestUtils.formatDateTime(selectedRequest.created_at)}
                    </Text>
                  </View>
                  {selectedRequest.scheduled_date && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Scheduled:</Text>
                      <Text style={styles.detailValue}>
                        {ServiceRequestUtils.formatDate(selectedRequest.scheduled_date)}
                      </Text>
                    </View>
                  )}
                  {selectedRequest.completed_at && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Completed:</Text>
                      <Text style={styles.detailValue}>
                        {ServiceRequestUtils.formatDateTime(selectedRequest.completed_at)}
                      </Text>
                    </View>
                  )}
                </View>

                {ServiceRequestUtils.canCancelRequest(selectedRequest.status) && (
                  <View style={styles.detailCard}>
                    <TouchableOpacity
                      style={styles.cancelRequestButton}
                      onPress={() => {
                        setShowDetailsModal(false);
                        cancelServiceRequest(selectedRequest.id, selectedRequest.title);
                      }}
                    >
                      <Text style={styles.cancelRequestButtonText}>Cancel Request</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 40,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  requestNumber: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  requestDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  requestDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  createdDate: {
    fontSize: 12,
    color: '#999',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButtonContainer: {
    paddingHorizontal: 8,
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  picker: {
    height: 50,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  bottomSpacing: {
    height: 40,
  },
  detailCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  cancelRequestButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelRequestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});