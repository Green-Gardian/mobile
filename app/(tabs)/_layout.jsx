// app/(tabs)/_layout.tsx
import { useAuth } from '@/context/AuthContext';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

// Import your existing components (uncomment when available)
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Fallback icons if IconSymbol is not available

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { state } = useAuth();

  // If no user is authenticated, don't show tabs
  if (!state.user) {
    return null;
  }

  const userRole = state.user.role;
  console.log('userRole', userRole);

  // Driver Tabs Configuration
  if (userRole === 'driver') {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: Platform.select({
            ios: {
              position: 'absolute',
            },
            default: {
              backgroundColor: 'white',
              borderTopWidth: 1,
              borderTopColor: '#e0e0e0',
              height: 60,
              paddingBottom: 5,
              paddingTop: 5,
            },
          }),
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}>
        
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="house.fill" color={color} />
              // Fallback: <Ionicons name="home" size={28} color={color} />
            ),
          }}
        />
        
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="paperplane.fill" color={color} />
              // Fallback: <Ionicons name="search" size={28} color={color} />
            ),
          }}
        />
      </Tabs>
    );
  }

  // Resident Tabs Configuration
  if (userRole === 'resident') {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint || '#007AFF',
          tabBarInactiveTintColor: '#666',
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: Platform.select({
            ios: {
              position: 'absolute',
            },
            default: {
              backgroundColor: 'white',
              borderTopWidth: 1,
              borderTopColor: '#e0e0e0',
              height: 60,
              paddingBottom: 5,
              paddingTop: 5,
            },
          }),
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}>
        
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <IconSymbol size={size || 28} name="house.fill" color={color} />
              // Fallback: <Ionicons name="home" size={size || 24} color={color} />
            ),
          }}
        />
        
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <IconSymbol size={size || 28} name="person.circle" color={color} />
              // Fallback: <Ionicons name="person-circle-outline" size={size || 24} color={color} />
            ),
          }}
        />
        
        <Tabs.Screen
          name="service-requests"
          options={{
            title: 'Services',
            tabBarIcon: ({ color, size }) => (
              <IconSymbol size={size || 28} name="wrench.and.screwdriver" color={color} />
              // Fallback: <Ionicons name="build-outline" size={size || 24} color={color} />
            ),
          }}
        />
        
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, size }) => (
              <IconSymbol size={size || 28} name="message.circle" color={color} />
              // Fallback: <Ionicons name="chatbubble-ellipses-outline" size={size || 24} color={color} />
            ),
          }}
        />
      </Tabs>
    );
  }

  // If user role is not driver or resident, don't show any tabs
  return null;
}