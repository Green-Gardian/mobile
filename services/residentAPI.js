// services/residentAPI.js
import { getAccessToken } from '@/services/api';

const BASE_URL = 'http://localhost:3001/services';

// Generic API call function with error handling
const apiCall = async (endpoint, options = {}) => {
  try {
    const token = await getAccessToken();
    
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API call error for ${endpoint}:`, error);
    throw error;
  }
};

export const ResidentAPI = {
  // ===== PROFILE MANAGEMENT =====
  getUserProfile: async () => {
    return apiCall('/profile');
  },

  updateUserProfile: async (profileData) => {
    return apiCall('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // ===== ADDRESS MANAGEMENT =====
  getUserAddresses: async () => {
    return apiCall('/addresses');
  },

  addUserAddress: async (addressData) => {
    return apiCall('/addresses', {
      method: 'POST',
      body: JSON.stringify(addressData),
    });
  },

  updateUserAddress: async (addressId, addressData) => {
    return apiCall(`/addresses/${addressId}`, {
      method: 'PUT',
      body: JSON.stringify(addressData),
    });
  },

  deleteUserAddress: async (addressId) => {
    return apiCall(`/addresses/${addressId}`, {
      method: 'DELETE',
    });
  },

  // ===== SERVICE TYPES =====
  getServiceTypes: async () => {
    return apiCall('/service-types');
  },

  // ===== SERVICE REQUESTS =====
  createServiceRequest: async (requestData) => {
    // Validate required fields
    const requiredFields = ['serviceTypeId', 'addressId', 'title', 'preferredDate'];
    const missingFields = requiredFields.filter(field => !requestData[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    return apiCall('/service-requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  },

  getUserServiceRequests: async () => {
    return apiCall('/service-requests');
  },

  getServiceRequestById: async (requestId) => {
    return apiCall(`/service-requests/${requestId}`);
  },

  cancelServiceRequest: async (requestId) => {
    return apiCall(`/service-requests/${requestId}/cancel`, {
      method: 'PUT',
    });
  },

  // ===== FEEDBACK =====
  submitFeedback: async (requestId, feedbackData) => {
    return apiCall(`/service-requests/${requestId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });
  },

  getFeedback: async (requestId) => {
    return apiCall(`/service-requests/${requestId}/feedback`);
  },

  // ===== MESSAGES =====
  getRequestMessages: async (requestId) => {
    return apiCall(`/service-requests/${requestId}/messages`);
  },

  sendMessage: async (requestId, messageData) => {
    return apiCall(`/service-requests/${requestId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  },
};

// Utility functions for formatting and validation
export const ServiceRequestUtils = {
  // Format date for display
  formatDate: (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  // Format date and time for display
  formatDateTime: (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Get status color
  getStatusColor: (status) => {
    const statusColors = {
      pending: '#FFA500',
      approved: '#007AFF',
      assigned: '#17A2B8',
      in_progress: '#6F42C1',
      completed: '#28A745',
      cancelled: '#DC3545',
      rejected: '#DC3545',
    };
    return statusColors[status] || '#666';
  },

  // Check if request can be cancelled
  canCancelRequest: (status) => {
    return ['pending', 'approved'].includes(status);
  },

  // Validate date format (YYYY-MM-DD)
  validateDate: (dateString) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }
    
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return date >= today;
  },

  // Format date to YYYY-MM-DD
  formatDateForInput: (date = new Date()) => {
    return date.toISOString().split('T')[0];
  },
};