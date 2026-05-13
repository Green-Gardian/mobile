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
            if (user && user.role) {
              user.role = String(user.role).toLowerCase();
            }
          } catch (e) {
            console.log('Error parsing user data:', e);
          }
        }

        // Backfill id and society_id from JWT for sessions stored before this fix
        if (access && user && !user.id) {
          try {
            const payload = access.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const claims = JSON.parse(atob(payload));
            if (claims.id) user.id = claims.id;
            if (user.society_id === undefined) user.society_id = claims.society_id ?? null;
          } catch (e) {
            console.log('Error parsing JWT claims:', e);
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

  const signIn = useCallback(async (email, password, totpCode) => {
    const res = await AuthAPI.signIn(email, password, totpCode);
    const { access_token, refresh_token, user_id, username, role, is_verified, society_id } = res.data;
    const normalizedRole = String(role).toLowerCase();
    if (normalizedRole !== 'driver' && normalizedRole !== 'resident') {
      throw new Error('This app is available only for drivers and residents');
    }
    await saveTokens(access_token, refresh_token);

    const userData = { id: user_id, username, role: normalizedRole, is_verified, society_id: society_id ?? null };
    await SecureStore.setItemAsync('gg_user_data', JSON.stringify(userData));

    setState({ accessToken: access_token, refreshToken: refresh_token, user: userData, loading: false });

    return { success: true, user: userData };
  }, []);

  const signOut = useCallback(async () => {
    try {
      const token = (await getRefreshToken()) || state.refreshToken || '';
      if (token) await AuthAPI.signOut(token);
    } catch { }
    await clearTokens();
    // Clear user data from secure storage
    await SecureStore.deleteItemAsync('gg_user_data');
    setState({ accessToken: null, refreshToken: null, user: null, loading: false });

    // Return success to indicate successful logout
    return { success: true };
  }, [state.refreshToken]);

  const value = useMemo(() => ({ state, signIn, signOut }), [state, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


