import api from './api';

// ----- Customer -----
export const createComplaint = (data) => api.post('/complaints', data);
export const getMyComplaints = (params = {}) => api.get('/complaints/my', { params });

// ----- Provider -----
export const getProviderComplaints = (params = {}) =>
  api.get('/providers/me/complaints', { params });
export const respondToComplaint = (id, data) =>
  api.post(`/providers/me/complaints/${id}/respond`, data);

// ----- Admin -----
export const getAdminComplaints = (params = {}) =>
  api.get('/admin/complaints', { params });
export const getAdminComplaintStats = () => api.get('/admin/complaints/stats');
export const getAdminComplaint = (id) => api.get(`/admin/complaints/${id}`);
export const updateAdminComplaint = (id, data) =>
  api.patch(`/admin/complaints/${id}`, data);
