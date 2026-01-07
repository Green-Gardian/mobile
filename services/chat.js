import { api } from './api';

export const ChatAPI = {
    // Get all chat groups for the current user
    getChatGroups: () => api.get('/chat/get-chat-groups'),

    // Get messages for a specific chat
    getChatMessages: (chatId) => api.get(`/chat/get-chat-messages/${chatId}`),

    // Add user to chat (mostly for admin use, but good to have)
    addUserToChat: (chatId, userId) => api.post('/chat/add-user-to-chat', { chatId, userId }),

    // Remove user from chat
    removeUserFromChat: (chatId, userId) => api.post('/chat/remove-user-from-chat', { chatId, userId }),

    // Initiate or get support chat
    initiateSupportChat: () => api.post('/chat/support'),
};
