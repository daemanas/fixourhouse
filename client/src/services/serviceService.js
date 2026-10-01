import api from './api';

// Get all services
export const getServices = (params = {}) => api.get('/services', { params });

// Get single service by ID
export const getServiceById = (id, params = {}) => api.get(`/services/${id}`, { params });

// Get paginated reviews attached to completed bookings for one exact service
export const getServiceReviews = (id, params = {}) => api.get(`/services/${id}/reviews`, { params });