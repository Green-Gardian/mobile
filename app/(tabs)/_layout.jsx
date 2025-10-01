import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '../../components/haptic-tab';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { useAuth } from '../../context/AuthContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { state } = useAuth();
  
  // Hide main tab bar for drivers - they use internal driver tabs
  const isDriver = state.user?.role === 'driver';
  const shouldShowTabBar = !isDriver;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6d28d9',
        tabBarInactiveTintColor: '#c4b5fd',
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            display: shouldShowTabBar ? 'flex' : 'none',
          },
          default: {
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#e9d5ff',
            height: 64,
            paddingBottom: 10,
            paddingTop: 8,
            display: shouldShowTabBar ? 'flex' : 'none',
          },
        }),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size || 28} name="house.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="service-requests"
        options={{
          title: 'Services',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size || 28} name="wrench.and.screwdriver" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size || 28} name="message.circle" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size || 28} name="person.circle" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
