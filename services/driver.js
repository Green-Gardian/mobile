import axios from 'axios';
import { getAccessToken } from './api';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const driverApi = axios.create({
  baseURL: API_BASE_URL + '/driver',
  timeout: 15000,
});

driverApi.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  console.log('Driver API request:', config.url, 'Token:', !!token);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

driverApi.interceptors.response.use(
  (response) => {
    console.log('Driver API response:', response.config.url, response.status, response.data);
    return response;
  },
  (error) => {
    console.error('Driver API error:', error.config?.url, error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export const DriverAPI = {
  // Get driver profile information
  getDriverProfile: () => driverApi.get('/get-drivers'),
  
  // Update driver profile
  updateDriver: (driverId, data) => driverApi.put(`/update-driver/${driverId}`, data),
  
  // Get driver work areas
  getWorkAreas: (driverId) => driverApi.get(`/work-areas`),
  
  // Get collection routes
  getCollectionRoutes: (driverId) => driverApi.get(`/${driverId}/routes`),
  
  // Get current tasks
  getCurrentTasks: () => driverApi.get('/current-tasks'),
  
  // Update task status
  updateTaskStatus: (taskId, data) => driverApi.put(`/tasks/${taskId}/status`, data),
  
  // Update driver location
  updateLocation: (data) => driverApi.put('/location', data),
  
  // Get driver schedule
  getSchedule: (driverId) => driverApi.get(`/${driverId}/schedule`),
  
  // Get driver performance
  getPerformance: (driverId, period = 30) => driverApi.get(`/${driverId}/performance?period=${period}`),
};
