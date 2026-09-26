import api from './api';

// Get current user's notifications
export const getMyNotifications = (params = {}) => api.get('/notifications', { params });

// Get current user's unread count
export const getUnreadCount = () => api.get('/notifications/unread-count');

// Create a test notification for testing end-to-end flow
export const createTestNotification = (data = {}) => api.post('/notifications/test', data);

// Mark a single notification as read
export const markAsRead = (id) => api.patch(`/notifications/${id}/read`);

// Mark all notifications as read
export const markAllAsRead = () => api.patch('/notifications/read-all');

// Permanently delete only the authenticated user's notifications.
export const clearAllNotifications = () => api.delete('/notifications/clear-all');

// Delete a single notification
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);