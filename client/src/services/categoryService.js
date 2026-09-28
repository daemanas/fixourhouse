import api from './api';

// Get all categories
export const getCategories = (params = {}) => api.get('/categories', { params });
export const getCategoryById = (id) => api.get(`/categories/${id}`);
export const createCategory = (data) => api.post('/admin/categories', data);
export const updateCategory = (id, data) => api.patch(`/admin/categories/${id}`, data);
