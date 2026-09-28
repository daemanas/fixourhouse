import api from './api';

export const getServiceTypes = (params = {}) => api.get('/service-types', { params });
export const getServiceTypeById = (id) => api.get(`/service-types/${id}`);
export const createServiceType = (data) => api.post('/admin/service-types', data);
export const updateServiceType = (id, data) => api.patch(`/admin/service-types/${id}`, data);
