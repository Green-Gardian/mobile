import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
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
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            display: shouldShowTabBar ? 'flex' : 'none',
          },
          default: {
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#e2e8f0',
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
            <Ionicons size={size || 24} name="home" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="service-requests"
        options={{
          title: 'Services',
          tabBarIcon: ({ color, size }) => (
            <Ionicons size={size || 24} name="construct" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons size={size || 24} name="chatbubbles" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons size={size || 24} name="person" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
