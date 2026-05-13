import { api } from './api';

const driverApi = {
  get: (url, config) => api.get('/driver' + url, config),
  post: (url, data, config) => api.post('/driver' + url, data, config),
  put: (url, data, config) => api.put('/driver' + url, data, config),
  delete: (url, config) => api.delete('/driver' + url, config),
};

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

  // Complete a task
  completeTask: (taskId, data) => driverApi.put(`/tasks/${taskId}/complete`, data),

  // Get all bins for map
  getBins: () => driverApi.get('/bins', { baseURL: API_BASE_URL }),

  // Get dashboard stats
  getDashboardStats: () => driverApi.get('/dashboard-stats'),
};
