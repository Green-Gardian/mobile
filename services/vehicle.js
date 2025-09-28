import axios from 'axios';
import { getAccessToken } from './api';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.10.4:3001';

// Create vehicle API instance
const vehicleApi = axios.create({
  baseURL: API_BASE_URL + '/vehicle',
  timeout: 15000,
});

// Attach Authorization header
vehicleApi.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  console.log('Vehicle API request:', config.url, 'Token:', !!token);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for debugging
vehicleApi.interceptors.response.use(
  (response) => {
    console.log('Vehicle API response:', response.config.url, response.status, response.data);
    return response;
  },
  (error) => {
    console.error('Vehicle API error:', error.config?.url, error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export const VehicleAPI = {
  // Get vehicles assigned to driver
  getVehicles: () => vehicleApi.get('/get-vehicles'),
  
  // Add vehicle (admin only)
  addVehicle: (data) => vehicleApi.post('/add-vehicle', data),
  
  // Update vehicle (admin only)
  updateVehicle: (vehicleId, data) => vehicleApi.put(`/update-vehicle/${vehicleId}`, data),
  
  // Delete vehicle (admin only)
  deleteVehicle: (vehicleId) => vehicleApi.delete(`/delete-vehicle/${vehicleId}`),
};
