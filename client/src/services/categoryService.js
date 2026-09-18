import api from './api';

// Get all categories
export const getCategories = (params = {}) => api.get('/categories', { params });