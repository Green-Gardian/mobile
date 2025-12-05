import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import { DriverAPI } from '../services/driver';

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
    joinDate: '2024-01-15'
  });

  // DOB pickers state
  const [dobYear, setDobYear] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');

  const years = Array.from({ length: 50 }, (_, i) => String(new Date().getFullYear() - i));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const daysInSelectedMonth = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  useEffect(() => {
    loadProfileData();
  }, []);

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
          joinDate: driver.created_at ? new Date(driver.created_at).toISOString().split('T')[0] : '2024-01-15'
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
    Alert.alert('Change Password', 'Password change functionality will be implemented with backend integration.');
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
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Driver Profile</Text>
      </View>

      {/* Profile Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={24} color="#6d28d9" />
          <Text style={styles.sectionTitle}>Profile Information</Text>
        </View>
        
        {/* Read-only user info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{profileData.first_name} {profileData.last_name}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{profileData.email}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{profileData.phone_number}</Text>
        </View>

        <View style={styles.divider} />

        {/* Editable fields */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date of Birth</Text>
          <View style={styles.dobRow}>
            <View style={[styles.pickerContainer, styles.dobPicker]}>
              <Picker
                selectedValue={dobYear}
                onValueChange={(value) => {
                  setDobYear(value);
                  const newDob = `${value}-${dobMonth || '01'}-${dobDay || '01'}`;
                  setProfileData({ ...profileData, date_of_birth: newDob });
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
                  setProfileData({ ...profileData, date_of_birth: newDob });
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
                  setProfileData({ ...profileData, date_of_birth: newDob });
                }}
                style={styles.picker}
              >
                <Picker.Item label="Day" value="" />
                {daysInSelectedMonth.map((d) => (
                  <Picker.Item key={d} label={d} value={d} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={profileData.gender}
              onValueChange={(value) => setProfileData({...profileData, gender: value})}
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
            value={profileData.emergency_contact_name}
            onChangeText={(text) => setProfileData({...profileData, emergency_contact_name: text})}
            placeholder="Emergency contact name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Emergency Contact Phone</Text>
          <TextInput
            style={styles.input}
            value={profileData.emergency_contact_phone}
            onChangeText={(text) => setProfileData({...profileData, emergency_contact_phone: text})}
            placeholder="Emergency contact phone"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>License Number</Text>
          <TextInput
            style={styles.input}
            value={profileData.license_number}
            onChangeText={(text) => setProfileData({...profileData, license_number: text})}
            placeholder="License number"
          />
        </View>

        <View style={styles.divider} />
        
        <View style={styles.rowButtons}>
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleUpdateProfile}
            disabled={saving}
          >
            <Ionicons name="save-outline" size={20} color="white" />
            <Text style={styles.saveButtonText}>Update Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color="#6d28d9" />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Actions</Text>
        
        <TouchableOpacity style={styles.actionBtn} onPress={handleChangePassword}>
          <View style={styles.actionContent}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="lock-closed-outline" size={24} color="#6d28d9" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Change Password</Text>
              <Text style={styles.actionSubtitle}>Update your account password</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn}>
          <View style={styles.actionContent}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="notifications-outline" size={24} color="#6d28d9" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Notification Settings</Text>
              <Text style={styles.actionSubtitle}>Manage your notification preferences</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn}>
          <View style={styles.actionContent}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#6d28d9" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Privacy & Security</Text>
              <Text style={styles.actionSubtitle}>Manage your privacy settings</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => router.push('/feedback')}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#6d28d9" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Send Feedback</Text>
              <Text style={styles.actionSubtitle}>Report bugs, request features, or share ideas</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => router.push('/my-feedback')}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="list-outline" size={24} color="#6d28d9" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>My Feedback</Text>
              <Text style={styles.actionSubtitle}>View your submitted feedback and responses</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn}>
          <View style={styles.actionContent}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="help-circle-outline" size={24} color="#6d28d9" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Help & Support</Text>
              <Text style={styles.actionSubtitle}>Get help with the app</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn}>
          <View style={styles.actionContent}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="call-outline" size={24} color="#6d28d9" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Contact Support</Text>
              <Text style={styles.actionSubtitle}>Reach out to our support team</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

    </ScrollView>
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
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
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
  editText: {
    fontSize: 14,
    color: '#6d28d9',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
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
    backgroundColor: 'white',
  },
  dobRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dobPicker: {
    flex: 1,
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
  rowButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#6d28d9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    flex: 1,
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
  signOutButton: {
    backgroundColor: '#f3f4f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  signOutButtonText: {
    color: '#6d28d9',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  saveBtn: {
    backgroundColor: '#6d28d9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  actionBtn: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f5ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  signOutBtn: {
    backgroundColor: '#6d28d9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
});
