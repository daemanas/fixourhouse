import api from './api';

// Get current user's notifications
export const getMyNotifications = (params = {}) => api.get('/notifications', { params });

// Mark a single notification as read
export const markAsRead = (id) => api.patch(`/notifications/${id}/read`);

// Mark all notifications as read
export const markAllAsRead = () => api.patch('/notifications/read-all');

// Permanently delete only the authenticated user's notifications.
export const clearAllNotifications = () => api.delete('/notifications/clear-all');