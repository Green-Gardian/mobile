// app/(tabs)/profile.tsx
import { Ionicons } from '@expo/vector-icons';
import SelectPicker from '../../components/SelectPicker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, useRef } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { ResidentAPI } from '../../services/residentAPI';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { Image } from 'expo-image';
import { AuthAPI } from '../../services/api';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as OTPAuth from 'otpauth';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  // MFA State
  const [mfaStatus, setMfaStatus] = useState(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [processingMfa, setProcessingMfa] = useState(false);

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
    profile_picture: null,
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
    latitude: null,
    longitude: null,
  });

  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const locationSearchTimeout = useRef(null);

  const [dobYear, setDobYear] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        setSaving(true);
        const imageUrl = await uploadToCloudinary(result.assets[0].uri);

        // Update local state
        setProfile({ ...profile, profile_picture: imageUrl });

        // Optional: Auto-save the picture change to backend immediately
        if (profileExists) {
          await ResidentAPI.updateUserProfile({
            ...profile,
            profilePicture: imageUrl
          });
        }

        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (error) {
      console.error('Image picking error:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
    fetchMfaStatus();
  }, []);

  const fetchMfaStatus = async () => {
    try {
      const response = await AuthAPI.getMFAStatus();
      setMfaStatus(response.data);
    } catch (error) {
      console.error('Error fetching MFA status:', error);
    }
  };

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
          profile_picture: profileData.profile_picture || null,
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
        profilePicture: profile.profile_picture || null,
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
        latitude: address.latitude ?? null,
        longitude: address.longitude ?? null,
      });
      setLocationSearch(address.street_address || '');
      setLocationResults([]);
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
        latitude: null,
        longitude: null,
      });
      setLocationSearch('');
      setLocationResults([]);
    }
    setShowAddressModal(true);
  };

  const searchLocation = async (query) => {
    if (!query || query.length < 3) {
      setLocationResults([]);
      return;
    }

    try {
      setLocationSearching(true);
      const url = `https://nominatim.openstreetmap.org/search?format=json&accept-language=en&q=${encodeURIComponent(
        query,
      )}&countrycodes=pk&limit=5&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          // Nominatim requires a valid identifying User-Agent
          'User-Agent': 'GreenGuardianMobile/1.0 (resident-address-search)',
          Accept: 'application/json',
        },
      });

      const text = await response.text();

      try {
        const data = JSON.parse(text);
        setLocationResults(Array.isArray(data) ? data : []);
      } catch (parseErr) {
        console.error('Error parsing location search response:', parseErr);
        console.error('Raw response (truncated):', text.slice(0, 200));
        setLocationResults([]);
      }
    } catch (err) {
      console.error('Error searching location:', err);
      setLocationResults([]);
    } finally {
      setLocationSearching(false);
    }
  };

  const handleLocationSearchChange = (text) => {
    setLocationSearch(text);
    if (locationSearchTimeout.current) {
      clearTimeout(locationSearchTimeout.current);
    }
    locationSearchTimeout.current = setTimeout(() => {
      searchLocation(text);
    }, 400);
  };

  const handleSelectLocation = (location) => {
    const address = location.address || {};
    const city =
      address.city ||
      address.town ||
      address.county ||
      address.state ||
      '';
    const area =
      address.suburb ||
      address.village ||
      address.hamlet ||
      address.neighbourhood ||
      address.quarter ||
      '';

    const streetParts = [
      address.house_number && address.road
        ? `${address.house_number} ${address.road}`
        : address.road,
      area || null,
      city || null,
    ].filter(Boolean);

    const streetAddress =
      streetParts.length > 0
        ? streetParts.join(', ')
        : location.display_name || '';

    setAddressForm((prev) => ({
      ...prev,
      street_address: streetAddress || prev.street_address,
      city: city || prev.city,
      area: area || prev.area,
      postal_code: address.postcode || '',
      latitude: location.lat ? parseFloat(location.lat) : prev.latitude,
      longitude: location.lon ? parseFloat(location.lon) : prev.longitude,
    }));

    setLocationSearch(location.display_name || '');
    setLocationResults([]);
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

  const handleChangePassword = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    setShowPasswordModal(true);
  };

  const submitPasswordChange = async () => {
    try {
      const { currentPassword, newPassword, confirmNewPassword } = passwordForm;

      if (!currentPassword || !newPassword || !confirmNewPassword) {
        Alert.alert('Validation Error', 'All fields are required');
        return;
      }

      if (newPassword !== confirmNewPassword) {
        Alert.alert('Validation Error', 'New passwords do not match');
        return;
      }

      if (newPassword.length < 6) {
        Alert.alert('Validation Error', 'Password must be at least 6 characters long');
        return;
      }

      setChangingPassword(true);
      await AuthAPI.changePassword(currentPassword, newPassword, confirmNewPassword);

      Alert.alert('Success', 'Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      console.error('Error changing password:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleToggleMfa = async () => {
    if (mfaStatus?.mfaEnabled) {
      if (!mfaStatus.canDisable) {
        Alert.alert('Restricted', 'MFA cannot be disabled for your account role.');
        return;
      }

      Alert.alert(
        'Disable Two-Factor Authentication',
        'Are you sure you want to disable biometric security? This will reduce your account security.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              try {
                const authResult = await LocalAuthentication.authenticateAsync({
                  promptMessage: 'Authenticate to disable Two-Factor Security',
                });
                if (!authResult.success) return;

                setProcessingMfa(true);
                await AuthAPI.disableMFA();
                await SecureStore.deleteItemAsync('gg_mfa_secret');
                Alert.alert('Success', 'Biometric Security has been disabled.');
                fetchMfaStatus();
              } catch (error) {
                Alert.alert('Error', error.response?.data?.message || 'Failed to disable MFA');
              } finally {
                setProcessingMfa(false);
              }
            }
          }
        ]
      );
    } else {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) {
          Alert.alert('Unsupported', 'Biometric authentication is not set up on this device. Please enable it in your phone settings first.');
          return;
        }

        setProcessingMfa(true);
        const response = await AuthAPI.generateMFASecret();
        const secretBase32 = response.data.secret;

        const authResult = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to enable Two-Factor Security',
          disableDeviceFallback: false,
          cancelLabel: 'Cancel',
        });

        if (!authResult.success) {
          setProcessingMfa(false);
          return;
        }

        let totp = new OTPAuth.TOTP({
          issuer: 'Green Guardian',
          label: 'User',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(secretBase32)
        });

        const generatedToken = totp.generate();
        await AuthAPI.enableMFA(generatedToken);
        await SecureStore.setItemAsync('gg_mfa_secret', secretBase32);

        Alert.alert('Success', 'Biometric Security is now enabled!');
        fetchMfaStatus();
      } catch (error) {
        Alert.alert('Error', error.response?.data?.message || 'Failed to enable Biometrics');
      } finally {
        setProcessingMfa(false);
      }
    }
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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        {/* Premium Profile Header */}
        <LinearGradient
          colors={['#047857', '#065f46']}
          style={[styles.profileHeader, { paddingTop: insets.top + 20 }]}
        >
          <View style={styles.headerContent}>
            <View style={styles.avatarWrapper}>
              {profile.profile_picture ? (
                <Image
                  source={{ uri: profile.profile_picture }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {profile.first_name?.[0]}{profile.last_name?.[0]}
                </Text>
              )}
              <TouchableOpacity style={styles.editAvatarBtn} onPress={pickImage}>
                <Ionicons name="camera" size={16} color="white" />
              </TouchableOpacity>
            </View>
            <Text style={styles.profileName}>{profile.first_name} {profile.last_name}</Text>
            <Text style={styles.profileEmail}>{profile.email}</Text>

            <View style={styles.statusBadgeRow}>
              <View style={styles.premiumBadge}>
                <Ionicons name="shield-checkmark" size={12} color="white" />
                <Text style={styles.premiumBadgeText}>VERIFIED RESIDENT</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Combined Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={24} color="#10b981" />
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


          <View style={styles.divider} />


          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Collection Time</Text>
            <SelectPicker
              selectedValue={profile.preferred_collection_time}
              onValueChange={(value) => setProfile({ ...profile, preferred_collection_time: value })}
              options={[
                { label: 'Morning (8 AM - 12 PM)', value: 'morning' },
                { label: 'Afternoon (12 PM - 5 PM)', value: 'afternoon' },
                { label: 'Evening (5 PM - 8 PM)', value: 'evening' },
              ]}
            />
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
              <Ionicons name="log-out-outline" size={20} color="#059669" />
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Addresses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={24} color="#10b981" />
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
              <View key={address.id} style={styles.addressCard}>
                <View style={styles.addressCardHeader}>
                  <View style={styles.addressTypeWrapper}>
                    <Ionicons
                      name={address.address_type === 'home' ? 'home' : address.address_type === 'office' ? 'business' : 'location'}
                      size={18}
                      color="#0f172a"
                    />
                    <Text style={styles.addressTypeText}>{address.address_type.toUpperCase()}</Text>
                  </View>
                  {address.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                    </View>
                  )}
                </View>

                <View style={styles.addressCardBody}>
                  <Text style={styles.addressMainText}>{address.street_address}</Text>
                  {address.apartment_unit && <Text style={styles.addressSubText}>Unit: {address.apartment_unit}</Text>}
                  <Text style={styles.addressSubText}>{address.area}, {address.city}</Text>

                  <View style={styles.addressActions}>
                    <TouchableOpacity
                      style={styles.addressActionBtn}
                      onPress={() => openAddressModal(address)}
                    >
                      <Ionicons name="create-outline" size={18} color="#059669" />
                      <Text style={styles.addressActionText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={24} color="#10b981" />
            <Text style={styles.sectionTitle}>Settings</Text>
          </View>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowPrivacyModal(true)}>
            <View style={styles.actionContent}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="shield-checkmark-outline" size={24} color="#10b981" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Privacy & Security</Text>
                <Text style={styles.actionSubtitle}>Manage your security and MFA</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/payment-history')}
            id="profile-payment-history-btn"
          >
            <View style={styles.actionContent}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="receipt-outline" size={24} color="#10b981" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Payment History</Text>
                <Text style={styles.actionSubtitle}>View your monthly dues & billing records</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Privacy & Security Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                <Text style={styles.cancelButton}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Privacy & Security</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleToggleMfa} disabled={processingMfa}>
                <View style={styles.actionContent}>
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="finger-print-outline" size={24} color="#10b981" />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>Two-Factor Auth {mfaStatus?.isRequired && '(Required)'}</Text>
                    <Text style={styles.actionSubtitle}>
                      {mfaStatus?.mfaEnabled ? 'Enabled - Tap to disable' : 'Disabled - Tap to enable'}
                    </Text>
                  </View>
                </View>
                {processingMfa ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <View style={[styles.mfaBadge, { backgroundColor: mfaStatus?.mfaEnabled ? '#dcfce7' : '#f8fafc' }]}>
                    <Text style={[styles.mfaBadgeText, { color: mfaStatus?.mfaEnabled ? '#166534' : '#64748b' }]}>
                      {mfaStatus?.mfaEnabled ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => { setShowPrivacyModal(false); setTimeout(() => setShowPasswordModal(true), 300); }}>
                <View style={styles.actionContent}>
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="lock-closed-outline" size={24} color="#10b981" />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>Change Password</Text>
                    <Text style={styles.actionSubtitle}>Update your secure account password</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Privacy Policy', 'This will link to the company Privacy Policy.')}>
                <View style={styles.actionContent}>
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="document-text-outline" size={24} color="#10b981" />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>Privacy Policy</Text>
                    <Text style={styles.actionSubtitle}>Read our data/privacy commitments</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Terms of Service', 'This will link to the company Terms of Service.')}>
                <View style={styles.actionContent}>
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="newspaper-outline" size={24} color="#10b981" />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>Terms of Service</Text>
                    <Text style={styles.actionSubtitle}>Review the usage terms and agreements</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
              </TouchableOpacity>
              <View style={styles.bottomSpacing} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

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
                <SelectPicker
                  selectedValue={addressForm.address_type}
                  onValueChange={(value) => setAddressForm({ ...addressForm, address_type: value })}
                  options={[
                    { label: 'Home', value: 'home' },
                    { label: 'Office', value: 'office' },
                    { label: 'Other', value: 'other' },
                  ]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Search Location</Text>
                <TextInput
                  style={styles.input}
                  value={locationSearch}
                  onChangeText={handleLocationSearchChange}
                  placeholder="Search by address, area, or landmark"
                />
                {locationSearching && (
                  <View style={{ marginTop: 8 }}>
                    <ActivityIndicator size="small" color="#10b981" />
                  </View>
                )}
                {locationResults.length > 0 && (
                  <View style={styles.locationSuggestions}>
                    {locationResults.map((loc) => (
                      <TouchableOpacity
                        key={loc.place_id}
                        style={styles.locationSuggestionItem}
                        onPress={() => handleSelectLocation(loc)}
                      >
                        <View style={styles.locationSuggestionHeader}>
                          <Ionicons name="location-outline" size={18} color="#0f172a" />
                          <Text style={styles.locationSuggestionTitle} numberOfLines={1}>
                            {loc.display_name.split(',')[0]}
                          </Text>
                        </View>
                        <Text style={styles.locationSuggestionSubtext} numberOfLines={2}>
                          {loc.display_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
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

      {/* Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={submitPasswordChange} disabled={changingPassword}>
                {changingPassword ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Current Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.currentPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
                  placeholder="Enter current password"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.newPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
                  placeholder="Enter new password (min 6 chars)"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm New Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.confirmNewPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmNewPassword: text })}
                  placeholder="Confirm new password"
                  secureTextEntry
                />
              </View>
              <View style={styles.bottomSpacing} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  scrollContainer: { flex: 1 },
  profileHeader: {
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 10,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden', // Ensure image respects border radius
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#047857',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  premiumBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1fae5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginLeft: 12, flex: 1 },
  infoCard: {
    backgroundColor: '#ecfdf5',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d1fae5'
  },
  infoLabel: { fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 15, color: '#1e293b', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 20 },
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
  textArea: { height: 100, textAlignVertical: 'top' },
  pickerContainer: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', overflow: 'hidden' },
  picker: { height: 50 },
  saveButton: {
    backgroundColor: '#047857',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    elevation: 2,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  buttonDisabled: { backgroundColor: '#94a3b8' },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '700', marginLeft: 8 },
  addButton: {
    backgroundColor: '#047857',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20
  },
  addButtonText: { color: 'white', fontSize: 13, fontWeight: '700', marginLeft: 4 },
  rowButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  signOutButton: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d1d5db'
  },
  signOutButtonText: { color: '#dc2626', fontSize: 15, fontWeight: '700', marginLeft: 8 },
  emptyAddresses: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#64748b', marginTop: 12, marginBottom: 20 },
  addressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d1fae5',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  addressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  addressTypeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressTypeText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  defaultBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: '800',
  },
  addressCardBody: {
    padding: 16,
  },
  addressMainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  addressSubText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  addressActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
  },
  addressActionText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  modalContainer: { flex: 1, backgroundColor: 'white' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  cancelButton: { color: '#64748b', fontSize: 15 },
  modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  modalSaveButtonText: { color: '#10b981', fontSize: 16, fontWeight: '700' },
  deleteButton: {
    backgroundColor: '#fee2e2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  deleteButtonText: { color: '#dc2626', fontSize: 15, fontWeight: '700', marginLeft: 8 },
  locationSuggestions: { marginTop: 10, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff' },
  locationSuggestionItem: { paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  locationSuggestionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  locationSuggestionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1 },
  locationSuggestionSubtext: { fontSize: 13, color: '#475569', lineHeight: 18 },
  bottomSpacing: { height: 100 },
  actionBtn: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#d1fae5' },
  actionContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  actionIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ecfdf5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 2 },
  actionSubtitle: { fontSize: 12, color: '#64748b' },
  mfaBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  mfaBadgeText: { fontSize: 13, fontWeight: '700' },
  qrContainer: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  qrText: { fontSize: 14, color: '#334155', textAlign: 'center', lineHeight: 20 },
  manualCodeText: { fontSize: 16, fontWeight: '700', color: '#10b981', textAlign: 'center', marginTop: 10, letterSpacing: 1 },
});