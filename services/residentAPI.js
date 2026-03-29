import { getAccessToken } from '../services/api';

const API_BASE = process.env.EXPO_PUBLIC_API_URL;
const BASE_URL = `${API_BASE}/services`;

// Generic API call function with error handling
const apiCall = async (endpoint, options = {}) => {
  try {
    const token = await getAccessToken();

    if (!token) {
      throw new Error('No access token available');
    }

    console.log(`[API] Calling: ${BASE_URL}${endpoint}`);
    if (options.body) {
      console.log('[API] Request body:', options.body);
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
    console.log(`[API] Response from ${endpoint}:`, data);

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    if (!options.silentError) {
      console.error(`[API] Error for ${endpoint}:`, error);
    }
    throw error;
  }
};

export const ResidentAPI = {
  // ===== MONTHLY DUES =====
  getDuesStatus: async () => {
    return apiCall('/dues/status');
  },

  getDuesHistory: async () => {
    return apiCall('/dues/history');
  },

  createDuesCheckoutSession: async (returnUrl) => {
    return apiCall('/dues/checkout-session', {
      method: 'POST',
      body: JSON.stringify({ returnUrl }),
    });
  },

  verifyDuesCheckoutSession: async (sessionId) => {
    return apiCall('/dues/verify-session', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },

  // ===== PROFILE MANAGEMENT =====
  getUserProfile: async () => {
    return apiCall('/profile');
  },

  createUserProfile: async (profileData) => {
    const payload = {
      dateOfBirth: profileData.dateOfBirth,
      gender: profileData.gender,
      emergencyContactName: profileData.emergencyContactName || null,
      emergencyContactPhone: profileData.emergencyContactPhone || null,
      notificationPreferences: profileData.notificationPreferences || {
        email: true,
        sms: true,
        push: true,
      },
      preferredCollectionTime: profileData.preferredCollectionTime || null,
      specialInstructions: profileData.specialInstructions || null,
    };

    return apiCall('/profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateUserProfile: async (profileData) => {
    const payload = {
      dateOfBirth: profileData.dateOfBirth,
      gender: profileData.gender,
      emergencyContactName: profileData.emergencyContactName || null,
      emergencyContactPhone: profileData.emergencyContactPhone || null,
      notificationPreferences: profileData.notificationPreferences || {
        email: true,
        sms: true,
        push: true,
      },
      preferredCollectionTime: profileData.preferredCollectionTime || null,
      specialInstructions: profileData.specialInstructions || null,
      profilePicture: profileData.profilePicture || null,
    };

    return apiCall('/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // ===== ADDRESS MANAGEMENT =====
  getUserAddresses: async () => {
    return apiCall('/addresses');
  },

  addUserAddress: async (addressData) => {
    const payload = {
      addressType: addressData.address_type,
      streetAddress: addressData.street_address,
      apartmentUnit: addressData.apartment_unit || null,
      area: addressData.area || null,
      city: addressData.city,
      postalCode: addressData.postal_code || null,
      landmark: addressData.landmark || null,
      latitude: typeof addressData.latitude === 'number' ? addressData.latitude : null,
      longitude: typeof addressData.longitude === 'number' ? addressData.longitude : null,
      isDefault: !!addressData.is_default,
    };

    return apiCall('/addresses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateUserAddress: async (addressId, addressData) => {
    const payload = {
      addressType: addressData.address_type,
      streetAddress: addressData.street_address,
      apartmentUnit: addressData.apartment_unit || null,
      area: addressData.area || null,
      city: addressData.city,
      postalCode: addressData.postal_code || null,
      landmark: addressData.landmark || null,
      latitude: typeof addressData.latitude === 'number' ? addressData.latitude : null,
      longitude: typeof addressData.longitude === 'number' ? addressData.longitude : null,
      isDefault: !!addressData.is_default,
    };

    return apiCall(`/addresses/${addressId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
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

    // Backend expects snake_case based on the response format
    const payload = {
      serviceTypeId: requestData.serviceTypeId,
      addressId: requestData.addressId,
      title: requestData.title,
      description: requestData.description || null,
      preferredDate: requestData.preferredDate,
      preferredTimeSlot: requestData.preferredTimeSlot || 'morning',
      specialInstructions: requestData.specialInstructions || null,
      estimatedWeight: requestData.estimatedWeight || null,
      estimatedBags: requestData.estimatedBags || null,
    };

    return apiCall('/service-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getUserServiceRequests: async () => {
    return apiCall('/service-requests');
  },

  getDashboardStats: async () => {
    return apiCall('/dashboard/stats');
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
    // Backend expects: { overallRating: number (1-5), comments: string }
    const payload = {
      overallRating: feedbackData.rating,
      comments: feedbackData.comment,
    };

    return apiCall(`/service-requests/${requestId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getFeedback: async (requestId) => {
    try {
      const response = await apiCall(`/service-requests/${requestId}/feedback`, { silentError: true });
      // If success is false and message is "Feedback not found", return null gracefully
      if (!response.success && response.message === 'Feedback not found') {
        return { success: false, feedback: null };
      }
      return response;
    } catch (error) {
      // Handle 404 or feedback not found errors gracefully
      if (error.message && error.message.includes('Feedback not found')) {
        return { success: false, feedback: null };
      }
      throw error;
    }
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
  // Format date for display (e.g., "Oct 1, 2025")
  formatDate: (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  },

  // Format date and time for display (e.g., "Oct 1, 2025, 02:30 PM")
  formatDateTime: (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting datetime:', error);
      return 'N/A';
    }
  },

  // Get status color based on status
  getStatusColor: (status) => {
    const statusColors = {
      pending: '#f59e0b',      // Amber
      approved: '#10b981',     // Emerald
      assigned: '#0ea5e9',     // Sky
      in_progress: '#0891b2',  // Cyan
      completed: '#3b82f6',    // Blue
      cancelled: '#ef4444',    // Red
      rejected: '#64748b',     // Slate
    };
    return statusColors[status?.toLowerCase()] || '#94a3b8';
  },

  // Get gradient status colors
  getStatusColors: (status) => {
    const statusGradients = {
      pending: ['#f59e0b', '#d97706'],     // Amber to Orange
      approved: ['#10b981', '#059669'],    // Emerald to Green
      assigned: ['#0ea5e9', '#0284c7'],    // Sky to blue
      in_progress: ['#06b6d4', '#0891b2'], // Cyan to Teal
      completed: ['#3b82f6', '#2563eb'],   // Blue to Indigo
      cancelled: ['#ef4444', '#dc2626'],   // Red to Dark Red
      rejected: ['#94a3b8', '#64748b'],    // Slate to Dark Slate
    };
    return statusGradients[status?.toLowerCase()] || ['#94a3b8', '#64748b'];
  },

  // Check if request can be cancelled (only pending or approved)
  canCancelRequest: (status) => {
    if (!status) return false;
    return ['pending', 'approved'].includes(status.toLowerCase());
  },

  // Validate date format (YYYY-MM-DD) and ensure it's in the future
  validateDate: (dateString) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return date >= today;
    } catch (error) {
      console.error('Error validating date:', error);
      return false;
    }
  },

  // Format date to YYYY-MM-DD for input fields
  formatDateForInput: (date = new Date()) => {
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date for input:', error);
      return '';
    }
  },
};