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

  // Debug logging
  console.log('Auth state:', { 
    loading: state.loading, 
    hasToken: !!state.accessToken, 
    isAuthed,
    user: state.user,
    role: state.user?.role
  });

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

  console.log('Navigation decision:', { isAuthed, showSplash, loading: state.loading });

  return (
    <Stack key={navigationKey}>
      {isAuthed ? (
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      )}
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RouterStack />
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
