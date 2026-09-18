import api from './api';

// Create a report
export const createReport = (data) => api.post('/reports', data);

// Get my reports
export const getMyReports = (params = {}) => api.get('/reports/me', { params });