// app/(tabs)/profile.tsx
import { ResidentAPI } from '@/services/residentAPI';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState({
    date_of_birth: '',
    gender: 'male',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    preferred_collection_time: 'morning',
    special_instructions: '',
    notification_preferences: {
      email: true,
      sms: true,
      push: true,
    },
  });

  // Address state
  const [addresses, setAddresses] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    address_type: 'home',
    street_address: '',
    apartment_unit: '',
    area: '',
    city: '',
    postal_code: '',
    landmark: '',
    is_default: false,
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profileResponse, addressResponse] = await Promise.all([
        ResidentAPI.getUserProfile(),
        ResidentAPI.getUserAddresses(),
      ]);
      
      if (profileResponse.success && profileResponse.data) {
        setProfile({
          ...profile,
          ...profileResponse.data,
          notification_preferences: profileResponse.data.notification_preferences || {
            email: true,
            sms: true,
            push: true,
          },
        });
      }
      
      if (addressResponse.success && addressResponse.data) {
        setAddresses(addressResponse.data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const response = await ResidentAPI.updateUserProfile(profile);
      
      if (response.success) {
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const openAddressModal = (address = null) => {
    if (address) {
      setEditingAddress(address);
      setAddressForm(address);
    } else {
      setEditingAddress(null);
      setAddressForm({
        address_type: 'home',
        street_address: '',
        apartment_unit: '',
        area: '',
        city: '',
        postal_code: '',
        landmark: '',
        is_default: false,
      });
    }
    setShowAddressModal(true);
  };

  const saveAddress = async () => {
    try {
      if (!addressForm.street_address.trim() || !addressForm.city.trim()) {
        Alert.alert('Validation Error', 'Street address and city are required');
        return;
      }

      setSaving(true);
      let response;
      
      if (editingAddress) {
        response = await ResidentAPI.updateUserAddress(editingAddress.id, addressForm);
      } else {
        response = await ResidentAPI.addUserAddress(addressForm);
      }
      
      if (response.success) {
        Alert.alert('Success', `Address ${editingAddress ? 'updated' : 'added'} successfully!`);
        setShowAddressModal(false);
        setEditingAddress(null);
        await loadProfileData();
      } else {
        Alert.alert('Error', response.message || `Failed to ${editingAddress ? 'update' : 'add'} address`);
      }
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', `Failed to ${editingAddress ? 'update' : 'add'} address`);
    } finally {
      setSaving(false);
    }
  };

  const updateNotificationPreference = (key, value) => {
    setProfile({
      ...profile,
      notification_preferences: {
        ...profile.notification_preferences,
        [key]: value,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
        </View>
        
        {/* Personal Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              value={profile.date_of_birth}
              onChangeText={(text) => setProfile({...profile, date_of_birth: text})}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={profile.gender}
                onValueChange={(value) => setProfile({...profile, gender: value})}
                style={styles.picker}
              >
                <Picker.Item label="Male" value="male" />
                <Picker.Item label="Female" value="female" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emergency Contact Name</Text>
            <TextInput
              style={styles.input}
              value={profile.emergency_contact_name}
              onChangeText={(text) => setProfile({...profile, emergency_contact_name: text})}
              placeholder="Emergency contact name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emergency Contact Phone</Text>
            <TextInput
              style={styles.input}
              value={profile.emergency_contact_phone}
              onChangeText={(text) => setProfile({...profile, emergency_contact_phone: text})}
              placeholder="Emergency contact phone"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Service Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Service Preferences</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Collection Time</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={profile.preferred_collection_time}
                onValueChange={(value) => setProfile({...profile, preferred_collection_time: value})}
                style={styles.picker}
              >
                <Picker.Item label="Morning (8 AM - 12 PM)" value="morning" />
                <Picker.Item label="Afternoon (12 PM - 5 PM)" value="afternoon" />
                <Picker.Item label="Evening (5 PM - 8 PM)" value="evening" />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Special Instructions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={profile.special_instructions}
              onChangeText={(text) => setProfile({...profile, special_instructions: text})}
              placeholder="Any special instructions for service providers..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Notification Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Notification Preferences</Text>
          </View>

          <View style={styles.switchContainer}>
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Email Notifications</Text>
                <Text style={styles.switchDescription}>Receive updates via email</Text>
              </View>
              <Switch
                value={profile.notification_preferences.email}
                onValueChange={(value) => updateNotificationPreference('email', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={profile.notification_preferences.email ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>SMS Notifications</Text>
                <Text style={styles.switchDescription}>Receive updates via text message</Text>
              </View>
              <Switch
                value={profile.notification_preferences.sms}
                onValueChange={(value) => updateNotificationPreference('sms', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={profile.notification_preferences.sms ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Push Notifications</Text>
                <Text style={styles.switchDescription}>Receive app notifications</Text>
              </View>
              <Switch
                value={profile.notification_preferences.push}
                onValueChange={(value) => updateNotificationPreference('push', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={profile.notification_preferences.push ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Save Profile Button */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={saveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="white" />
                <Text style={styles.saveButtonText}>Update Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Addresses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>My Addresses</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => openAddressModal()}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {addresses.length === 0 ? (
            <View style={styles.emptyAddresses}>
              <Ionicons name="home-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No addresses added yet</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => openAddressModal()}
              >
                <Text style={styles.addButtonText}>Add Your First Address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            addresses.map((address) => (
              <TouchableOpacity
                key={address.id}
                style={[styles.addressCard, address.is_default && styles.defaultAddress]}
                onPress={() => openAddressModal(address)}
              >
                <View style={styles.addressHeader}>
                  <View style={styles.addressTypeContainer}>
                    <Ionicons 
                      name={address.address_type === 'home' ? 'home' : address.address_type === 'office' ? 'business' : 'location'} 
                      size={20} 
                      color="#007AFF" 
                    />
                    <Text style={styles.addressType}>{address.address_type.toUpperCase()}</Text>
                  </View>
                  {address.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                    </View>
                  )}
                </View>
                
                <Text style={styles.addressText}>{address.street_address}</Text>
                {address.apartment_unit && (
                  <Text style={styles.addressText}>Unit: {address.apartment_unit}</Text>
                )}
                <Text style={styles.addressText}>{address.area && `${address.area}, `}{address.city}</Text>
                {address.postal_code && (
                  <Text style={styles.addressText}>Postal: {address.postal_code}</Text>
                )}
                {address.landmark && (
                  <Text style={styles.landmarkText}>📍 {address.landmark}</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Address Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingAddress ? 'Edit Address' : 'Add Address'}
              </Text>
              <TouchableOpacity 
                onPress={saveAddress} 
                disabled={saving}
                style={[saving && styles.disabledButton]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Text style={styles.saveButton}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address Type</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={addressForm.address_type}
                    onValueChange={(value) => setAddressForm({...addressForm, address_type: value})}
                    style={styles.picker}
                  >
                    <Picker.Item label="🏠 Home" value="home" />
                    <Picker.Item label="🏢 Office" value="office" />
                    <Picker.Item label="📍 Other" value="other" />
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Street Address *</Text>
                <TextInput
                  style={styles.input}
                  value={addressForm.street_address}
                  onChangeText={(text) => setAddressForm({...addressForm, street_address: text})}
                  placeholder="Enter your street address"
                  required
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Apartment/Unit</Text>
                <TextInput
                  style={styles.input}
                  value={addressForm.apartment_unit}
                  onChangeText={(text) => setAddressForm({...addressForm, apartment_unit: text})}
                  placeholder="Apartment, suite, unit, etc."
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Area/Neighborhood</Text>
                <TextInput
                  style={styles.input}
                  value={addressForm.area}
                  onChangeText={(text) => setAddressForm({...addressForm, area: text})}
                  placeholder="Area or neighborhood"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  value={addressForm.city}
                  onChangeText={(text) => setAddressForm({...addressForm, city: text})}
                  placeholder="City"
                  required
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Postal Code</Text>
                <TextInput
                  style={styles.input}
                  value={addressForm.postal_code}
                  onChangeText={(text) => setAddressForm({...addressForm, postal_code: text})}
                  placeholder="Postal code"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Landmark</Text>
                <TextInput
                  style={styles.input}
                  value={addressForm.landmark}
                  onChangeText={(text) => setAddressForm({...addressForm, landmark: text})}
                  placeholder="Nearby landmark (optional)"
                />
              </View>

              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAddressForm({...addressForm, is_default: !addressForm.is_default})}
              >
                <View style={[styles.checkbox, addressForm.is_default && styles.checkboxChecked]}>
                  {addressForm.is_default && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Set as default address</Text>
              </TouchableOpacity>

              <View style={styles.bottomSpacing} />
            </ScrollView>
          </KeyboardAvoidingView>
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
  scrollContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
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
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  picker: {
    height: 50,
  },
  switchContainer: {
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  switchDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyAddresses: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    marginBottom: 20,
  },
  addressCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  defaultAddress: {
    borderLeftColor: '#28A745',
    backgroundColor: '#f8fff9',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  defaultBadge: {
    backgroundColor: '#28A745',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  landmarkText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
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
  cancelButton: {
    color: '#FF3B30',
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  disabledButton: {
    opacity: 0.5,
  },
  bottomSpacing: {
    height: 40,
  },
});