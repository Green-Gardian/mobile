import { api } from './api';

const vehicleApi = {
  get: (url, config) => api.get('/vehicle' + url, config),
  post: (url, data, config) => api.post('/vehicle' + url, data, config),
  put: (url, data, config) => api.put('/vehicle' + url, data, config),
  delete: (url, config) => api.delete('/vehicle' + url, config),
};

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
