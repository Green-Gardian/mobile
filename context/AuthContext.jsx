import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from '@/utils/secureStore';
import { AuthAPI, clearTokens, getRefreshToken, saveTokens } from '@/services/api';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({ accessToken: null, refreshToken: null, user: null, loading: true });

  useEffect(() => {
    (async () => {
      const [access, refresh] = await Promise.all([
        SecureStore.getItemAsync('gg_access_token'),
        SecureStore.getItemAsync('gg_refresh_token'),
      ]);
      setState((s) => ({ ...s, accessToken: access, refreshToken: refresh, loading: false }));
    })();
  }, []);

  const signIn = useCallback(async (email, password) => {
    const res = await AuthAPI.signIn(email, password);
    const { access_token, refresh_token, username, role, is_verified } = res.data;
    if (role !== 'driver' && role !== 'resident') {
      throw new Error('This app is available only for drivers and residents');
    }
    await saveTokens(access_token, refresh_token);
    setState({ accessToken: access_token, refreshToken: refresh_token, user: { username, role, is_verified }, loading: false });
  }, []);

  const signOut = useCallback(async () => {
    try {
      const token = (await getRefreshToken()) || state.refreshToken || '';
      if (token) await AuthAPI.signOut(token);
    } catch {}
    await clearTokens();
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


