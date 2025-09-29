import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthAPI, clearTokens, getRefreshToken, saveTokens } from '../services/api';
import * as SecureStore from '../utils/secureStore';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({ accessToken: null, refreshToken: null, user: null, loading: true });

  useEffect(() => {
    (async () => {
      try {
        const [access, refresh, userData] = await Promise.all([
          SecureStore.getItemAsync('gg_access_token'),
          SecureStore.getItemAsync('gg_refresh_token'),
          SecureStore.getItemAsync('gg_user_data'),
        ]);
        console.log('Loaded tokens:', { access: !!access, refresh: !!refresh, user: !!userData });
        
        let user = null;
        if (userData) {
          try {
            user = JSON.parse(userData);
          } catch (e) {
            console.log('Error parsing user data:', e);
          }
        }
        
        setState((s) => ({ 
          ...s, 
          accessToken: access, 
          refreshToken: refresh, 
          user: user,
          loading: false 
        }));
      } catch (error) {
        console.log('Error loading tokens:', error);
        setState((s) => ({ ...s, accessToken: null, refreshToken: null, user: null, loading: false }));
      }
    })();
  }, []);

  const signIn = useCallback(async (email, password) => {
    const res = await AuthAPI.signIn(email, password);
    const { access_token, refresh_token, username, role, is_verified } = res.data;
    if (role !== 'driver' && role !== 'resident') {
      throw new Error('This app is available only for drivers and residents');
    }
    await saveTokens(access_token, refresh_token);
    
    // Save user data to secure storage
    const userData = { username, role, is_verified };
    await SecureStore.setItemAsync('gg_user_data', JSON.stringify(userData));
    
    setState({ accessToken: access_token, refreshToken: refresh_token, user: userData, loading: false });
  }, []);

  const signOut = useCallback(async () => {
    try {
      const token = (await getRefreshToken()) || state.refreshToken || '';
      if (token) await AuthAPI.signOut(token);
    } catch {}
    await clearTokens();
    // Clear user data from secure storage
    await SecureStore.deleteItemAsync('gg_user_data');
    setState({ accessToken: null, refreshToken: null, user: null, loading: false });
  }, [state.refreshToken]);

  const value = useMemo(() => ({ state, signIn, signOut }), [state, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


