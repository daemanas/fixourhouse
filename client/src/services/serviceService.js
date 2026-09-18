import api from './api';

// Get all services
export const getServices = (params = {}) => api.get('/services', { params });

// Get single service by ID
export const getServiceById = (id) => api.get(`/services/${id}`);