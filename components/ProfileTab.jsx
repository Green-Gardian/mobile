import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { DriverAPI } from '../services/driver';

export default function ProfileTab() {
  const { signOut, state } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    name: 'Driver',
    email: 'driver@greenguardian.com',
    phone: '+92 300 0000000',
    id: 'DRV001',
    status: 'active',
    joinDate: '2024-01-15',
    licenseNumber: 'DL-2024-001',
    emergencyContact: '+92 300 9876543'
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const response = await DriverAPI.getDriverProfile();
      if (response.data.drivers && response.data.drivers.length > 0) {
        const driver = response.data.drivers[0];
        setProfileData({
          name: `${driver.first_name} ${driver.last_name}`,
          email: driver.email,
          phone: driver.phone_number,
          id: driver.id,
          status: driver.status || 'active',
          joinDate: driver.created_at ? new Date(driver.created_at).toISOString().split('T')[0] : '2024-01-15',
          licenseNumber: 'DL-2024-001', // Default since not in backend
          emergencyContact: '+92 300 9876543' // Default since not in backend
        });
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
      await DriverAPI.updateDriver(profileData.id, {
        fullName: profileData.name,
        email: profileData.email,
        phone: profileData.phone
      });
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      Alert.alert('Error', 'Failed to update profile');
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
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
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
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profileData.name.split(' ').map(n => n[0]).join('')}</Text>
          </View>
          <View style={styles.statusIndicator}>
            <Text style={styles.statusText}>{profileData.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.profileName}>{profileData.name}</Text>
        <Text style={styles.profileId}>Driver ID: {profileData.id}</Text>
      </View>

      {/* Profile Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Text style={styles.editText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.profileCard}>
          <View style={styles.profileField}>
            <Text style={styles.profileLabel}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.profileInput}
                value={profileData.name}
                onChangeText={(text) => setProfileData({...profileData, name: text})}
              />
            ) : (
              <Text style={styles.profileValue}>{profileData.name}</Text>
            )}
          </View>
          
          <View style={styles.profileField}>
            <Text style={styles.profileLabel}>Email</Text>
            {isEditing ? (
              <TextInput
                style={styles.profileInput}
                value={profileData.email}
                onChangeText={(text) => setProfileData({...profileData, email: text})}
                keyboardType="email-address"
              />
            ) : (
              <Text style={styles.profileValue}>{profileData.email}</Text>
            )}
          </View>
          
          <View style={styles.profileField}>
            <Text style={styles.profileLabel}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.profileInput}
                value={profileData.phone}
                onChangeText={(text) => setProfileData({...profileData, phone: text})}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.profileValue}>{profileData.phone}</Text>
            )}
          </View>
          
          <View style={styles.profileField}>
            <Text style={styles.profileLabel}>Driver ID</Text>
            <Text style={styles.profileValue}>{profileData.id}</Text>
          </View>
          
          <View style={styles.profileField}>
            <Text style={styles.profileLabel}>License Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.profileInput}
                value={profileData.licenseNumber}
                onChangeText={(text) => setProfileData({...profileData, licenseNumber: text})}
              />
            ) : (
              <Text style={styles.profileValue}>{profileData.licenseNumber}</Text>
            )}
          </View>
          
          <View style={styles.profileField}>
            <Text style={styles.profileLabel}>Emergency Contact</Text>
            {isEditing ? (
              <TextInput
                style={styles.profileInput}
                value={profileData.emergencyContact}
                onChangeText={(text) => setProfileData({...profileData, emergencyContact: text})}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.profileValue}>{profileData.emergencyContact}</Text>
            )}
          </View>
          
          <View style={styles.profileField}>
            <Text style={styles.profileLabel}>Join Date</Text>
            <Text style={styles.profileValue}>{profileData.joinDate}</Text>
          </View>
          
          <View style={styles.profileField}>
            <Text style={styles.profileLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: '#10b981' }]}>
              <Text style={styles.statusBadgeText}>{profileData.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>
        
        {isEditing && (
          <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateProfile}>
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Actions</Text>
        
        <TouchableOpacity style={styles.actionBtn} onPress={handleChangePassword}>
          <View style={styles.actionContent}>
            <Text style={styles.actionIcon}>🔒</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Change Password</Text>
              <Text style={styles.actionSubtitle}>Update your account password</Text>
            </View>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn}>
          <View style={styles.actionContent}>
            <Text style={styles.actionIcon}>📱</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Notification Settings</Text>
              <Text style={styles.actionSubtitle}>Manage your notification preferences</Text>
            </View>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn}>
          <View style={styles.actionContent}>
            <Text style={styles.actionIcon}>🛡️</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Privacy & Security</Text>
              <Text style={styles.actionSubtitle}>Manage your privacy settings</Text>
            </View>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity style={styles.actionBtn}>
          <View style={styles.actionContent}>
            <Text style={styles.actionIcon}>❓</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Help & Support</Text>
              <Text style={styles.actionSubtitle}>Get help with the app</Text>
            </View>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn}>
          <View style={styles.actionContent}>
            <Text style={styles.actionIcon}>📞</Text>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Contact Support</Text>
              <Text style={styles.actionSubtitle}>Reach out to our support team</Text>
            </View>
          </View>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6d28d9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  profileId: {
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  editText: {
    fontSize: 14,
    color: '#6d28d9',
    fontWeight: '500',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  profileField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  profileLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    flex: 1,
  },
  profileValue: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
    textAlign: 'right',
  },
  profileInput: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
    textAlign: 'right',
    borderBottomWidth: 1,
    borderBottomColor: '#6d28d9',
    paddingVertical: 4,
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
  actionIcon: {
    fontSize: 20,
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
  actionArrow: {
    fontSize: 20,
    color: '#64748b',
  },
  signOutBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
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
