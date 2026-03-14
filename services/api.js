import axios from 'axios';
import * as SecureStore from '../utils/secureStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const ACCESS_TOKEN_KEY = 'gg_access_token';
const REFRESH_TOKEN_KEY = 'gg_refresh_token';

export async function saveTokens(accessToken, refreshToken) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync('gg_user_data');
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Attach Authorization header
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('API Request:', config.method.toUpperCase(), config.baseURL, config.url, config.headers);
  return config;
});

// Refresh on 401
let isRefreshing = false;
let pendingQueue = [];

function processQueue(error, token) {
  pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  pendingQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error?.response?.status;
    if (status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then(() => api(original))
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        // Path updated to include /auth
        const r = await axios.post(API_BASE_URL + '/auth/refresh-token', {
          refresh_token: refreshToken,
        });
        const newAccess = r.data?.access_token;
        if (!newAccess) throw new Error('Invalid refresh response');
        await saveTokens(newAccess);
        processQueue(null, newAccess);
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (e) {
        processQueue(e, null);
        await clearTokens();
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export const AuthAPI = {
  signIn: (email, password, totpCode) => api.post('/auth/signin', { email, password, totpCode }),
  signOut: (refresh_token) => api.post('/auth/signout', { refresh_token }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email, client_type: 'mobile' }),
  resetPassword: (token, newPassword, confirmPassword) =>
    api.post(`/auth/reset-password?token=${encodeURIComponent(token)}`, {
      newPassword,
      confirmPassword,
    }),
  verifyOTPAndResetPassword: (email, otp, newPassword, confirmPassword) =>
    api.post('/auth/verify-otp-reset', {
      email,
      otp,
      newPassword,
      confirmPassword,
    }),
  verifyEmailAndSetPassword: (token, password, confirmPassword) =>
    api.post(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
      password,
      confirmPassword,
    }),
  changePassword: (currentPassword, newPassword, confirmNewPassword) =>
    api.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmNewPassword
    }),
  getMFAStatus: () => api.get('/auth/mfa/status'),
  generateMFASecret: () => api.post('/auth/mfa/generate-secret'),
  enableMFA: (totpCode) => api.post('/auth/mfa/enable', { totpCode }),
  disableMFA: () => api.post('/auth/mfa/disable'),
};


