// mobile/services/systemFeedbackAPI.js
// API service for system feedback
// Place this in: mobile/services/systemFeedbackAPI.js

import { getAccessToken } from './api';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const API_URL = `${API_BASE}/feedback/system`;

/**
 * 
 * Get authorization header
 */
async function getAuthHeader() {
    try {
        const token = await getAccessToken();
        if (!token) {
            throw new Error('No authentication token found');
        }
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    } catch (error) {
        throw new Error('Authentication required');
    }
}

/**
 * Handle API response
 */
async function handleResponse(response) {
    // Check if response is JSON or HTML (error page)
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    } else {
        // If not JSON, likely an HTML error page
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        throw new Error(`Server returned non-JSON response. Status: ${response.status}. Check if the API endpoint exists.`);
    }

    if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
}

/**
 * Submit system feedback
 * @param {object} feedbackData - Feedback data
 * @returns {Promise<object>}
 */
export async function submitSystemFeedback(feedbackData) {
    try {
        const headers = await getAuthHeader();

        const response = await fetch(`${API_URL}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(feedbackData),
        });

        return await handleResponse(response);
    } catch (error) {
        console.error('Error submitting system feedback:', error);
        throw error;
    }
}

/**
 * Get user's own feedback
 * @param {object} params - Query params { status, category, limit, offset }
 * @returns {Promise<object>}
 */
export async function getMyFeedback(params = {}) {
    try {
        const headers = await getAuthHeader();

        const queryParams = new URLSearchParams();
        if (params.status) queryParams.append('status', params.status);
        if (params.category) queryParams.append('category', params.category);
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.offset) queryParams.append('offset', params.offset.toString());

        const url = `${API_URL}/my-feedback?${queryParams.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers,
        });

        return await handleResponse(response);
    } catch (error) {
        console.error('Error getting my feedback:', error);
        throw error;
    }
}

/**
 * Get feedback by ID
 * @param {number} feedbackId
 * @returns {Promise<object>}
 */
export async function getFeedbackById(feedbackId) {
    try {
        const headers = await getAuthHeader();

        const response = await fetch(`${API_URL}/${feedbackId}`, {
            method: 'GET',
            headers,
        });

        return await handleResponse(response);
    } catch (error) {
        console.error('Error getting feedback:', error);
        throw error;
    }
}

/**
 * Upvote feedback
 * @param {number} feedbackId
 * @returns {Promise<object>}
 */
export async function upvoteFeedback(feedbackId) {
    try {
        const headers = await getAuthHeader();

        const response = await fetch(`${API_URL}/${feedbackId}/upvote`, {
            method: 'POST',
            headers,
        });

        return await handleResponse(response);
    } catch (error) {
        console.error('Error upvoting feedback:', error);
        throw error;
    }
}

/**
 * Remove upvote from feedback
 * @param {number} feedbackId
 * @returns {Promise<object>}
 */
export async function removeUpvote(feedbackId) {
    try {
        const headers = await getAuthHeader();

        const response = await fetch(`${API_URL}/${feedbackId}/upvote`, {
            method: 'DELETE',
            headers,
        });

        return await handleResponse(response);
    } catch (error) {
        console.error('Error removing upvote:', error);
        throw error;
    }
}

// Admin functions (if needed in mobile app for admin users)

/**
 * Get all system feedback (Admin only)
 * @param {object} params - Query params
 * @returns {Promise<object>}
 */
export async function getAllSystemFeedback(params = {}) {
    try {
        const headers = await getAuthHeader();

        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                queryParams.append(key, params[key].toString());
            }
        });

        const url = `${API_URL}/all?${queryParams.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers,
        });

        return await handleResponse(response);
    } catch (error) {
        console.error('Error getting all feedback:', error);
        throw error;
    }
}

/**
 * Update feedback status (Admin only)
 * @param {number} feedbackId
 * @param {string} status
 * @param {string} resolutionNotes
 * @returns {Promise<object>}
 */
export async function updateFeedbackStatus(feedbackId, status, resolutionNotes = null) {
    try {
        const headers = await getAuthHeader();

        const response = await fetch(`${API_URL}/${feedbackId}/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status, resolutionNotes }),
        });

        return await handleResponse(response);
    } catch (error) {
        console.error('Error updating feedback status:', error);
        throw error;
    }
}

/**
 * Respond to feedback (Admin only)
 * @param {number} feedbackId
 * @param {string} response
 * @returns {Promise<object>}
 */
export async function respondToFeedback(feedbackId, response) {
    try {
        const headers = await getAuthHeader();

        const apiResponse = await fetch(`${API_URL}/${feedbackId}/respond`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ response }),
        });

        return await handleResponse(apiResponse);
    } catch (error) {
        console.error('Error responding to feedback:', error);
        throw error;
    }
}

/**
 * Get feedback statistics (Admin only)
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Promise<object>}
 */
export async function getFeedbackStats(startDate = null, endDate = null) {
    try {
        const headers = await getAuthHeader();

        const queryParams = new URLSearchParams();
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);

        const url = `${API_URL}/stats?${queryParams.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers,
        });

        return await handleResponse(response);
    } catch (error) {
        console.error('Error getting feedback stats:', error);
        throw error;
    }
}

export default {
    submitSystemFeedback,
    getMyFeedback,
    getFeedbackById,
    upvoteFeedback,
    removeUpvote,
    getAllSystemFeedback,
    updateFeedbackStatus,
    respondToFeedback,
    getFeedbackStats,
};
