import { useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { DriverAPI } from '../services/driver';
import { AuthAPI, api } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '../utils/cloudinary';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as OTPAuth from 'otpauth';

const { width, height } = Dimensions.get('window');

// Responsive sizing helpers
const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

export default function ProfileTab() {
  const { signOut, state } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    date_of_birth: '',
    gender: 'male',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    license_number: '',
    id: '',
    status: 'active',
    joinDate: '2024-01-15',
    profile_picture: null
  });

  // DOB pickers state
  const [dobYear, setDobYear] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');

  // Calendar date picker for DOB
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let b = 0; b < firstDayIndex; b++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(new Date(year, month, d));
    return days;
  }, [calendarMonth]);
  const changeCalendarMonth = (dir) => setCalendarMonth(prev => {
    const n = new Date(prev); n.setMonth(prev.getMonth() + dir); return n;
  });
  const toLocalISO = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const selectDob = (date) => {
    if (!date) return;
    const iso = toLocalISO(date);
    setProfileData(p => ({ ...p, date_of_birth: iso }));
    setDobYear(iso.slice(0, 4));
    setDobMonth(iso.slice(5, 7));
    setDobDay(iso.slice(8, 10));
    setShowDobPicker(false);
  };

  // Edit name/phone modal
  const [showEditInfoModal, setShowEditInfoModal] = useState(false);
  const [editInfoForm, setEditInfoForm] = useState({ first_name: '', last_name: '', phone_number: '' });
  const [savingInfo, setSavingInfo] = useState(false);

  const openEditInfoModal = () => {
    setEditInfoForm({ first_name: profileData.first_name, last_name: profileData.last_name, phone_number: profileData.phone_number });
    setShowEditInfoModal(true);
  };
  const submitEditInfo = async () => {
    const { first_name, last_name, phone_number } = editInfoForm;
    if (!first_name.trim() || !last_name.trim() || !phone_number.trim()) {
      Alert.alert('Validation Error', 'All fields are required');
      return;
    }
    try {
      setSavingInfo(true);
      await api.put('/auth/update-profile', {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone_number: phone_number.trim(),
        email: profileData.email,
        profile_picture: profileData.profile_picture || null,
      });
      setProfileData(p => ({ ...p, first_name: first_name.trim(), last_name: last_name.trim(), phone_number: phone_number.trim() }));
      setShowEditInfoModal(false);
      Alert.alert('Success', 'Profile updated!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingInfo(false);
    }
  };

  // Image upload
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permission required.');
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
        setProfileData(p => ({ ...p, profile_picture: imageUrl }));
        await api.put('/auth/update-profile', {
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          phone_number: profileData.phone_number,
          email: profileData.email,
          profile_picture: imageUrl,
        });
        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to upload image.');
    } finally {
      setSaving(false);
    }
  };

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // MFA State
  const [mfaStatus, setMfaStatus] = useState(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [processingMfa, setProcessingMfa] = useState(false);

  const years = Array.from({ length: 50 }, (_, i) => String(new Date().getFullYear() - i));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const daysInSelectedMonth = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

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
      const response = await DriverAPI.getDriverProfile();
      if (response.data.drivers && response.data.drivers.length > 0) {
        const driver = response.data.drivers[0];
        const nextProfile = {
          first_name: driver.first_name || '',
          last_name: driver.last_name || '',
          email: driver.email || '',
          phone_number: driver.phone_number || '',
          date_of_birth: driver.date_of_birth || '',
          gender: driver.gender || 'male',
          emergency_contact_name: driver.emergency_contact_name || '',
          emergency_contact_phone: driver.emergency_contact_phone || '',
          license_number: driver.license_number || '',
          id: driver.id || '',
          status: driver.status || 'active',
          joinDate: driver.created_at ? new Date(driver.created_at).toISOString().split('T')[0] : '2024-01-15',
          profile_picture: driver.profile_picture || null
        };
        setProfileData(nextProfile);

        // Initialize DOB pickers
        const dob = String(nextProfile.date_of_birth || '');
        if (dob && /^\d{4}-\d{2}-\d{2}$/.test(dob)) {
          setDobYear(dob.slice(0, 4));
          setDobMonth(dob.slice(5, 7));
          setDobDay(dob.slice(8, 10));
        }
      }
    } catch (err) {
      console.error('Error loading profile data:', err);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setSaving(true);
      await DriverAPI.updateDriver(profileData.id, profileData);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
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

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await signOut();
              if (result.success) {
                // Force navigation to auth screen after successful logout
                router.replace('/(auth)/signin');
              }
            } catch (error) {
              console.error('Sign out error:', error);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: verticalScale(100) }}
      >
        {/* Modern Profile Header with Gradient */}
        <LinearGradient
          colors={['#10b981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          <View style={styles.profileAvatarContainer}>
            {profileData.profile_picture ? (
              <Image
                source={{ uri: profileData.profile_picture }}
                style={styles.profileAvatar}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.profileAvatarPlaceholder}>
                <Text style={styles.profileAvatarText}>
                  {profileData.first_name[0]}{profileData.last_name[0]}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarButton} onPress={pickImage} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={16} color="#ffffff" />}
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>
            {profileData.first_name} {profileData.last_name}
          </Text>
          <Text style={styles.profileRole}>Eco-Guardian Driver</Text>
          <View style={styles.profileStatusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.profileStatus}>{profileData.status.toUpperCase()}</Text>
          </View>
        </LinearGradient>

        {/* Quick Stats Cards */}
        <View style={styles.quickStatsContainer}>
          <View style={styles.quickStatCard}>
            <Ionicons name="calendar-outline" size={24} color="#10b981" />
            <Text style={styles.quickStatValue}>
              {new Date(profileData.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </Text>
            <Text style={styles.quickStatLabel}>Joined</Text>
          </View>
          <View style={styles.quickStatCard}>
            <Ionicons name="shield-checkmark" size={24} color="#10b981" />
            <Text style={styles.quickStatValue}>{mfaStatus?.mfaEnabled ? 'ON' : 'OFF'}</Text>
            <Text style={styles.quickStatLabel}>2FA</Text>
          </View>
          <View style={styles.quickStatCard}>
            <Ionicons name="card-outline" size={24} color="#10b981" />
            <Text style={styles.quickStatValue}>{profileData.license_number ? 'Yes' : 'No'}</Text>
            <Text style={styles.quickStatLabel}>License</Text>
          </View>
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="person-outline" size={22} color="#10b981" />
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TouchableOpacity style={styles.editInfoBtn} onPress={openEditInfoModal}>
              <Ionicons name="create-outline" size={16} color="#047857" />
              <Text style={styles.editInfoBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profileData.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{profileData.phone_number || '—'}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.dateInputButton}
              onPress={() => { setCalendarMonth(profileData.date_of_birth ? new Date(profileData.date_of_birth) : new Date()); setShowDobPicker(p => !p); }}
              activeOpacity={0.8}
            >
              <Text style={styles.dateInputText}>
                {profileData.date_of_birth
                  ? new Date(profileData.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  : 'Select date of birth'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#10b981" />
            </TouchableOpacity>
            {showDobPicker && (
              <View style={styles.calendarPicker}>
                <View style={styles.calendarNav}>
                  <TouchableOpacity onPress={() => changeCalendarMonth(-1)}>
                    <Ionicons name="chevron-back" size={18} color="#1e293b" />
                  </TouchableOpacity>
                  <Text style={styles.calendarMonthLabel}>
                    {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity onPress={() => changeCalendarMonth(1)}>
                    <Ionicons name="chevron-forward" size={18} color="#1e293b" />
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarWeekRow}>
                  {daysOfWeek.map(d => <Text key={d} style={styles.calendarWeekDay}>{d}</Text>)}
                </View>
                <View style={styles.calendarGrid}>
                  {calendarDays.map((day, idx) => {
                    const ds = day ? toLocalISO(day) : '';
                    const isSel = profileData.date_of_birth === ds;
                    return (
                      <TouchableOpacity
                        key={`${idx}-${ds}`}
                        style={[styles.calendarDay, isSel && styles.calendarDaySelected, !day && styles.calendarDayEmpty]}
                        disabled={!day}
                        onPress={() => selectDob(day)}
                      >
                        <Text style={[styles.calendarDayText, isSel && styles.calendarDayTextSelected]}>
                          {day ? day.getDate() : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={profileData.gender}
                onValueChange={(value) => setProfileData({ ...profileData, gender: value })}
                style={styles.picker}
              >
                <Picker.Item label="Male" value="male" />
                <Picker.Item label="Female" value="female" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>License Number</Text>
            <TextInput
              style={styles.input}
              value={profileData.license_number}
              onChangeText={(text) => setProfileData({ ...profileData, license_number: text })}
              placeholder="Enter license number"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* Emergency Contact Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="call-outline" size={22} color="#10b981" />
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Name</Text>
            <TextInput
              style={styles.input}
              value={profileData.emergency_contact_name}
              onChangeText={(text) => setProfileData({ ...profileData, emergency_contact_name: text })}
              placeholder="Emergency contact name"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Phone</Text>
            <TextInput
              style={styles.input}
              value={profileData.emergency_contact_phone}
              onChangeText={(text) => setProfileData({ ...profileData, emergency_contact_phone: text })}
              placeholder="Emergency contact phone"
              keyboardType="phone-pad"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleUpdateProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="settings-outline" size={22} color="#10b981" />
            <Text style={styles.sectionTitle}>Settings</Text>
          </View>

          <TouchableOpacity style={styles.modernActionBtn} onPress={() => setShowPrivacyModal(true)}>
            <View style={[styles.actionIconCircle, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#10b981" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Privacy & Security</Text>
              <Text style={styles.actionSubtitle}>Manage your security settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="help-circle-outline" size={22} color="#10b981" />
            <Text style={styles.sectionTitle}>Support</Text>
          </View>

          <TouchableOpacity
            style={styles.modernActionBtn}
            onPress={() => router.push('/feedback')}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#059669" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Send Feedback</Text>
              <Text style={styles.actionSubtitle}>Report bugs or share ideas</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modernActionBtn}
            onPress={() => router.push('/my-feedback')}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="list-outline" size={22} color="#047857" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>My Feedback</Text>
              <Text style={styles.actionSubtitle}>View submitted feedback</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.modernActionBtn}>
            <View style={[styles.actionIconCircle, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="call-outline" size={22} color="#059669" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Contact Support</Text>
              <Text style={styles.actionSubtitle}>Reach out to our team</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <View style={styles.signOutContainer}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Name/Phone Modal */}
      <Modal
        visible={showEditInfoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditInfoModal(false)}
      >
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f8fafc' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditInfoModal(false)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={submitEditInfo} disabled={savingInfo}>
              {savingInfo ? <ActivityIndicator size="small" color="#10b981" /> : <Text style={styles.modalSaveButtonText}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                value={editInfoForm.first_name}
                onChangeText={t => setEditInfoForm(p => ({ ...p, first_name: t }))}
                placeholder="First name"
                autoCapitalize="words"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                value={editInfoForm.last_name}
                onChangeText={t => setEditInfoForm(p => ({ ...p, last_name: t }))}
                placeholder="Last name"
                autoCapitalize="words"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={editInfoForm.phone_number}
                onChangeText={t => setEditInfoForm(p => ({ ...p, phone_number: t }))}
                placeholder="e.g. 03001234567"
                keyboardType="phone-pad"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.bottomSpacing} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Privacy & Security Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#f8fafc' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Privacy & Security</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.modernActionBtn} onPress={handleToggleMfa} disabled={processingMfa}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="finger-print-outline" size={22} color="#10b981" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Two-Factor Auth {mfaStatus?.isRequired && '(Required)'}</Text>
                <Text style={styles.actionSubtitle}>
                  {mfaStatus?.mfaEnabled ? 'Enabled - Tap to disable' : 'Disabled - Tap to enable'}
                </Text>
              </View>
              {processingMfa ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <View style={[styles.mfaBadge, { backgroundColor: mfaStatus?.mfaEnabled ? '#dcfce7' : '#f1f5f9' }]}>
                  <Text style={[styles.mfaBadgeText, { color: mfaStatus?.mfaEnabled ? '#166534' : '#64748b' }]}>
                    {mfaStatus?.mfaEnabled ? 'ON' : 'OFF'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modernActionBtn} onPress={() => { setShowPrivacyModal(false); setTimeout(() => setShowPasswordModal(true), 300); }}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="lock-closed-outline" size={22} color="#059669" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Change Password</Text>
                <Text style={styles.actionSubtitle}>Update your password</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modernActionBtn} onPress={() => Alert.alert('Privacy Policy', 'This will link to the company Privacy Policy.')}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="document-text-outline" size={22} color="#059669" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Privacy Policy</Text>
                <Text style={styles.actionSubtitle}>Read our data commitments</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modernActionBtn} onPress={() => Alert.alert('Terms of Service', 'This will link to the company Terms of Service.')}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="newspaper-outline" size={22} color="#047857" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Terms of Service</Text>
                <Text style={styles.actionSubtitle}>Review usage terms</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
            <View style={styles.bottomSpacing} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#f8fafc' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
              <Ionicons name="close" size={24} color="#64748b" />
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
                placeholderTextColor="#94a3b8"
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
                placeholderTextColor="#94a3b8"
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
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.bottomSpacing} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: moderateScale(15),
    color: '#64748b',
    marginTop: verticalScale(12),
  },
  // Modern Profile Header
  profileHeader: {
    paddingTop: verticalScale(40),
    paddingBottom: verticalScale(32),
    alignItems: 'center',
    borderBottomLeftRadius: moderateScale(24),
    borderBottomRightRadius: moderateScale(24),
  },
  profileAvatarContainer: {
    position: 'relative',
    marginBottom: verticalScale(16),
  },
  profileAvatar: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileAvatarPlaceholder: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileAvatarText: {
    fontSize: moderateScale(36),
    fontWeight: 'bold',
    color: '#ffffff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: '#047857',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileName: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: verticalScale(4),
  },
  profileRole: {
    fontSize: moderateScale(14),
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: verticalScale(12),
  },
  profileStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: moderateScale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(16),
    gap: moderateScale(6),
  },
  statusDot: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    backgroundColor: '#ffffff',
  },
  profileStatus: {
    fontSize: moderateScale(11),
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  // Quick Stats
  quickStatsContainer: {
    flexDirection: 'row',
    marginHorizontal: moderateScale(20),
    marginTop: verticalScale(-20),
    marginBottom: verticalScale(20),
    gap: moderateScale(12),
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  quickStatValue: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: verticalScale(8),
    marginBottom: verticalScale(2),
  },
  quickStatLabel: {
    fontSize: moderateScale(11),
    color: '#64748b',
    fontWeight: '500',
  },
  // Section Styles
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: moderateScale(20),
    marginBottom: verticalScale(16),
    padding: moderateScale(20),
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(16),
    gap: moderateScale(8),
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#1e293b',
  },
  // Info Rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: moderateScale(14),
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: moderateScale(14),
    color: '#1e293b',
    fontWeight: '600',
  },
  // Input Styles
  inputGroup: {
    marginBottom: verticalScale(16),
  },
  label: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#475569',
    marginBottom: verticalScale(8),
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(16),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(15),
    color: '#1e293b',
  },
  dobRow: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  dobPicker: {
    flex: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: moderateScale(12),
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  picker: {
    height: verticalScale(50),
  },
  // Save Button
  saveButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(12),
    marginTop: verticalScale(8),
    gap: moderateScale(8),
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  // Modern Action Buttons
  modernActionBtn: {
    backgroundColor: '#f8fafc',
    padding: moderateScale(16),
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionIconCircle: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(12),
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: verticalScale(2),
  },
  actionSubtitle: {
    fontSize: moderateScale(12),
    color: '#64748b',
  },
  // Sign Out
  signOutContainer: {
    marginHorizontal: moderateScale(20),
    marginBottom: verticalScale(20),
  },
  signOutBtn: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(16),
    borderRadius: moderateScale(12),
    borderWidth: 2,
    borderColor: '#fee2e2',
    gap: moderateScale(8),
  },
  signOutText: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: '#ef4444',
  },
  // Modal Styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: moderateScale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: moderateScale(20),
    paddingTop: verticalScale(20),
  },
  modalSaveButtonText: {
    color: '#10b981',
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  bottomSpacing: {
    height: verticalScale(100),
  },
  mfaBadge: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  mfaBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  editInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: moderateScale(10),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(20),
    gap: moderateScale(4),
    borderWidth: 1,
    borderColor: '#d1fae5',
    marginLeft: 'auto',
  },
  editInfoBtnText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: '#047857',
  },
  dateInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(16),
    paddingVertical: verticalScale(13),
  },
  dateInputText: {
    fontSize: moderateScale(15),
    color: '#1e293b',
  },
  calendarPicker: {
    marginTop: verticalScale(10),
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: moderateScale(14),
    padding: moderateScale(14),
    backgroundColor: '#ffffff',
  },
  calendarNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  calendarMonthLabel: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#1e293b',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  calendarWeekDay: {
    width: moderateScale(32),
    textAlign: 'center',
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: '#64748b',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calendarDay: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  calendarDayEmpty: {
    backgroundColor: 'transparent',
  },
  calendarDaySelected: {
    backgroundColor: '#dcfce7',
  },
  calendarDayText: {
    color: '#1e293b',
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  calendarDayTextSelected: {
    color: '#166534',
    fontWeight: '700',
  },
});
