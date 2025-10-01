// app/(tabs)/profile.tsx
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { ResidentAPI } from '../../services/residentAPI';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
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

  const [dobYear, setDobYear] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const arr = [];
    for (let y = current; y >= 1940; y--) arr.push(String(y));
    return arr;
  }, []);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')), []);
  const daysInSelectedMonth = useMemo(() => {
    const y = parseInt(dobYear || '2000', 10);
    const m = parseInt(dobMonth || '01', 10);
    const days = new Date(y, m, 0).getDate();
    return Array.from({ length: days }, (_, i) => String(i + 1).padStart(2, '0'));
  }, [dobYear, dobMonth]);

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

      if (profileResponse.success && profileResponse.profile) {
        setProfileExists(true);
        const profileData = profileResponse.profile;
        setProfile({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          email: profileData.email || '',
          phone_number: profileData.phone_number || '',
          date_of_birth: profileData.date_of_birth || '',
          gender: profileData.gender || 'male',
          emergency_contact_name: profileData.emergency_contact_name || '',
          emergency_contact_phone: profileData.emergency_contact_phone || '',
          preferred_collection_time: profileData.preferred_collection_time || 'morning',
          special_instructions: profileData.special_instructions || '',
          notification_preferences: profileData.notification_preferences || {
            email: true,
            sms: true,
            push: true,
          },
        });

        const dob = String(profileData.date_of_birth || '');
        if (dob && /^\d{4}-\d{2}-\d{2}/.test(dob)) {
          setDobYear(dob.slice(0, 4));
          setDobMonth(dob.slice(5, 7));
          setDobDay(dob.slice(8, 10));
        }
      }

      if (addressResponse.success && addressResponse.addresses) {
        setAddresses(addressResponse.addresses);
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

      const payload = {
        dateOfBirth: profile.date_of_birth,
        gender: profile.gender,
        emergencyContactName: profile.emergency_contact_name || null,
        emergencyContactPhone: profile.emergency_contact_phone || null,
        notificationPreferences: profile.notification_preferences,
        preferredCollectionTime: profile.preferred_collection_time || null,
        specialInstructions: profile.special_instructions || null,
      };

      let response;
      if (profileExists) {
        response = await ResidentAPI.updateUserProfile(payload);
      } else {
        response = await ResidentAPI.createUserProfile(payload);
        if (response.success) setProfileExists(true);
      }

      if (response.success) {
        Alert.alert('Success', response.message || 'Profile updated successfully!');
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const openAddressModal = (address = null) => {
    if (address) {
      setEditingAddress(address);
      setAddressForm({
        address_type: address.address_type,
        street_address: address.street_address,
        apartment_unit: address.apartment_unit || '',
        area: address.area || '',
        city: address.city,
        postal_code: address.postal_code || '',
        landmark: address.landmark || '',
        is_default: address.is_default || false,
      });
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
        Alert.alert('Success', response.message || `Address ${editingAddress ? 'updated' : 'added'} successfully!`);
        setShowAddressModal(false);
        setEditingAddress(null);
        await loadProfileData();
      } else {
        Alert.alert('Error', response.message || `Failed to ${editingAddress ? 'update' : 'add'} address`);
      }
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', error.message || `Failed to ${editingAddress ? 'update' : 'add'} address`);
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (addressId) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await ResidentAPI.deleteUserAddress(addressId);
              if (response.success) {
                Alert.alert('Success', response.message || 'Address deleted successfully');
                setShowAddressModal(false);
                await loadProfileData();
              } else {
                Alert.alert('Error', response.message || 'Failed to delete address');
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete address');
            }
          },
        },
      ]
    );
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
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
        </View>

        {/* Combined Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={24} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Profile Information</Text>
          </View>

          {/* Read-only user info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{profile.first_name} {profile.last_name}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile.email}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{profile.phone_number}</Text>
          </View>

          

          {/* Editable fields */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <Text style={styles.infoValue}>
              {new Date(profile.date_of_birth).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
            {/* <View style={styles.dobRow}>
              
              <View style={[styles.pickerContainer, styles.dobPicker]}>
                <Picker
                  selectedValue={dobYear}
                  onValueChange={(value) => {
                    setDobYear(value);
                    const newDob = `${value}-${dobMonth || '01'}-${dobDay || '01'}`;
                    setProfile({ ...profile, date_of_birth: newDob });
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Year" value="" />
                  {years.map((y) => (
                    <Picker.Item key={y} label={y} value={y} />
                  ))}
                </Picker>
              </View>
              <View style={[styles.pickerContainer, styles.dobPicker]}>
                <Picker
                  selectedValue={dobMonth}
                  onValueChange={(value) => {
                    setDobMonth(value);
                    const newDob = `${dobYear || '2000'}-${value}-${dobDay || '01'}`;
                    setProfile({ ...profile, date_of_birth: newDob });
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Mon" value="" />
                  {months.map((m) => (
                    <Picker.Item key={m} label={m} value={m} />
                  ))}
                </Picker>
              </View>
              <View style={[styles.pickerContainer, styles.dobPicker]}>
                <Picker
                  selectedValue={dobDay}
                  onValueChange={(value) => {
                    setDobDay(value);
                    const newDob = `${dobYear || '2000'}-${dobMonth || '01'}-${value}`;
                    setProfile({ ...profile, date_of_birth: newDob });
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Day" value="" />
                  {daysInSelectedMonth.map((d) => (
                    <Picker.Item key={d} label={d} value={d} />
                  ))}
                </Picker>
              </View>
            </View> */}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <Text style={styles.infoValue}>{profile.gender}</Text>
            {/* <View style={styles.pickerContainer}>
              <Picker
                selectedValue={profile.gender}
                onValueChange={(value) => setProfile({...profile, gender: value})}
                style={styles.picker}
              >
                <Picker.Item label="Male" value="male" />
                <Picker.Item label="Female" value="female" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View> */}
          </View>

          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emergency Contact Name</Text>
            <TextInput
              style={styles.input}
              value={profile.emergency_contact_name}
              onChangeText={(text) => setProfile({ ...profile, emergency_contact_name: text })}
              placeholder="Emergency contact name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emergency Contact Phone</Text>
            <TextInput
              style={styles.input}
              value={profile.emergency_contact_phone}
              onChangeText={(text) => setProfile({ ...profile, emergency_contact_phone: text })}
              placeholder="Emergency contact phone"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Collection Time</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={profile.preferred_collection_time}
                onValueChange={(value) => setProfile({ ...profile, preferred_collection_time: value })}
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
              onChangeText={(text) => setProfile({ ...profile, special_instructions: text })}
              placeholder="Any special instructions..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.rowButtons}>
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

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={async () => {
                try {
                  const result = await signOut();
                  if (result.success) {
                    router.replace('/(auth)/signin');
                  }
                } catch (error) {
                  console.error('Sign out error:', error);
                }
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#8B5CF6" />
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Addresses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={24} color="#8B5CF6" />
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
                style={styles.addressCard}
                onPress={() => openAddressModal(address)}
              >
                <View style={styles.addressHeader}>
                  <View style={styles.addressTypeContainer}>
                    <Ionicons
                      name={address.address_type === 'home' ? 'home' : address.address_type === 'office' ? 'business' : 'location'}
                      size={20}
                      color="#8B5CF6"
                    />
                    <Text style={styles.addressType}>{address.address_type.toUpperCase()}</Text>
                  </View>
                  {address.is_active && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.addressText}>{address.street_address}</Text>
                {address.apartment_unit && (
                  <Text style={styles.addressText}>Unit: {address.apartment_unit}</Text>
                )}
                <Text style={styles.addressText}>{address.area && `${address.area}, `}{address.city}</Text>
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
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#8B5CF6" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address Type</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={addressForm.address_type}
                    onValueChange={(value) => setAddressForm({ ...addressForm, address_type: value })}
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
                  onChangeText={(text) => setAddressForm({ ...addressForm, street_address: text })}
                  placeholder="Enter street address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Apartment/Unit</Text>
                <TextInput
                  style={styles.input}
                  value={addressForm.apartment_unit}
                  onChangeText={(text) => setAddressForm({ ...addressForm, apartment_unit: text })}
                  placeholder="Apartment, suite, unit"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Area/Neighborhood</Text>
                <TextInput
                  style={styles.input}
                  value={addressForm.area}
                  onChangeText={(text) => setAddressForm({ ...addressForm, area: text })}
                  placeholder="Area or neighborhood"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  value={addressForm.city}
                  onChangeText={(text) => setAddressForm({ ...addressForm, city: text })}
                  placeholder="City"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Postal Code</Text>
                <TextInput
                  style={styles.input}
                  value={addressForm.postal_code}
                  onChangeText={(text) => setAddressForm({ ...addressForm, postal_code: text })}
                  placeholder="Postal code"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Landmark</Text>
                <TextInput
                  style={styles.input}
                  value={addressForm.landmark}
                  onChangeText={(text) => setAddressForm({ ...addressForm, landmark: text })}
                  placeholder="Nearby landmark"
                />
              </View>

              {editingAddress && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteAddress(editingAddress.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="white" />
                  <Text style={styles.deleteButtonText}>Delete Address</Text>
                </TouchableOpacity>
              )}

              <View style={styles.bottomSpacing} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  scrollContainer: { flex: 1 },
  header: { backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  section: { backgroundColor: 'white', marginHorizontal: 16, marginTop: 16, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginLeft: 12, flex: 1 },
  infoCard: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, marginBottom: 12 },
  infoLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  infoValue: { fontSize: 16, color: '#333', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: 'white' },
  dobRow: { flexDirection: 'row', gap: 8 },
  dobPicker: { flex: 1 },
  textArea: { height: 100, textAlignVertical: 'top' },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: 'white' },
  picker: { height: 50 },
  saveButton: { backgroundColor: '#8B5CF6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8, flex: 1 },
  buttonDisabled: { backgroundColor: '#ccc' },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  addButton: { backgroundColor: '#8B5CF6', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  addButtonText: { color: 'white', fontSize: 14, fontWeight: '600', marginLeft: 4 },
  rowButtons: { flexDirection: 'row', gap: 12 },
  signOutButton: { backgroundColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8, paddingHorizontal: 16 },
  signOutButtonText: { color: '#8B5CF6', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  emptyAddresses: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#666', marginTop: 12, marginBottom: 20 },
  addressCard: { backgroundColor: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#8B5CF6' },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addressTypeContainer: { flexDirection: 'row', alignItems: 'center' },
  addressType: { fontSize: 12, fontWeight: '600', color: '#666', marginLeft: 6 },
  activeBadge: { backgroundColor: '#28A745', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  activeBadgeText: { fontSize: 10, color: 'white', fontWeight: '600' },
  addressText: { fontSize: 14, color: '#333', marginBottom: 2 },
  modalContainer: { flex: 1, backgroundColor: 'white' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  cancelButton: { color: '#666', fontSize: 16 },
  modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  modalSaveButtonText: { color: '#8B5CF6', fontSize: 16, fontWeight: '600' },
  deleteButton: { backgroundColor: '#FF3B30', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 8, marginTop: 16 },
  deleteButtonText: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  bottomSpacing: { height: 80 },
});