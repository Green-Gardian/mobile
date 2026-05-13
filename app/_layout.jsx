import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import SplashScreen from '../components/splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useColorScheme } from '../hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RouterStack() {
  const { state } = useAuth();
  const isAuthed = !!state.accessToken;
  const [showSplash, setShowSplash] = useState(true);
  const [navigationKey, setNavigationKey] = useState(0);


  // Hide splash screen immediately when authentication state is determined
  useEffect(() => {
    if (!state.loading) {
      setShowSplash(false);
    }
  }, [state.loading]);

  // Reset splash screen when auth state changes (but not on initial load)
  useEffect(() => {
    if (!state.loading) {
      setShowSplash(false);
    }
  }, [isAuthed, state.loading]);

  // Force re-render when auth state changes
  useEffect(() => {
    setNavigationKey(prev => prev + 1);
  }, [isAuthed]);

  // Show splash screen while loading or during splash delay
  if (showSplash || state.loading) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }


  return (
    <Stack key={navigationKey}>
      {isAuthed ? (
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      )}
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="chat/list" options={{ headerShown: false }} />
      <Stack.Screen name="payment-history" options={{ headerShown: false }} />
      <Stack.Screen
        name="feedback"
        options={{
          presentation: 'modal',
          headerShown: false,
          title: 'Send Feedback'
        }}
      />
      <Stack.Screen
        name="my-feedback"
        options={{
          presentation: 'modal',
          headerShown: false,
          title: 'My Feedback'
        }}
      />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

import { SocketProvider } from '../context/SocketContext';
import { NotificationProvider, useNotifications } from '../context/NotificationContext';
import { NotificationContainer } from '../components/NotificationToast';
import LocationTracker from '../components/LocationTracker';

// Wrapper component to use notifications hook
function AppContent() {
  return (
    <>
      <LocationTracker />
      <NotificationContainer />
      <RouterStack />
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
