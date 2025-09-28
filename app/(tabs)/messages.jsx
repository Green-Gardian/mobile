// app/(tabs)/messages.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MessagesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {/* Coming Soon Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="chatbubbles-outline" size={80} color="#007AFF" />
        </View>
        
        <Text style={styles.comingSoonTitle}>Customer Support Chat</Text>
        <Text style={styles.comingSoonSubtitle}>Coming Soon</Text>
        
        <Text style={styles.description}>
          This feature will allow you to communicate directly with our customer support team 
          and track messages related to your service requests.
        </Text>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#28A745" />
            <Text style={styles.featureText}>Real-time chat with support agents</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#28A745" />
            <Text style={styles.featureText}>Message history for all your requests</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#28A745" />
            <Text style={styles.featureText}>File and photo sharing</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#28A745" />
            <Text style={styles.featureText}>Quick responses and status updates</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.notifyButton} disabled>
          <Ionicons name="notifications-outline" size={20} color="#666" />
          <Text style={styles.notifyButtonText}>Notify me when available</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 30,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  comingSoonSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 30,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
    marginBottom: 40,
  },
  featuresList: {
    alignSelf: 'stretch',
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    opacity: 0.6,
  },
  notifyButtonText: {
    color: '#666',
    fontSize: 16,
    marginLeft: 8,
  },
});