import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useState, useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import SplashScreen from '@/components/splash-screen';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RouterStack() {
  const { state } = useAuth();
  const isAuthed = !!state.accessToken;
  const [showSplash, setShowSplash] = useState(true);

  // Debug logging
  console.log('Auth state:', { 
    loading: state.loading, 
    hasToken: !!state.accessToken, 
    isAuthed 
  });

  useEffect(() => {
    // Only hide splash screen after authentication state is determined
    if (!state.loading) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2000); // Reduced to 2 seconds

      return () => clearTimeout(timer);
    }
  }, [state.loading]);

  // Show splash screen while loading or during splash delay
  if (showSplash || state.loading) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <Stack>
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
