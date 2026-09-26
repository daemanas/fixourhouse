import api from './api';

// Dashboard stats
export const getAdminStats = () => api.get('/admin/stats');
export const getAdminAnalytics = (params = {}) => api.get('/admin/analytics', { params });
export const getAdminLocationAnalytics = (params = {}) => api.get('/admin/analytics/locations', { params });

// Users (customers)
export const getAdminUsers = (params = {}) => api.get('/admin/users', { params });

// Customers (dedicated customer-management feature)
export const getAdminCustomers = (params = {}) => api.get('/admin/customers', { params });
export const getAdminCustomerDetail = (id) => api.get(`/admin/customers/${id}`);
export const updateCustomerStatus = (id, data) =>
  api.patch(`/admin/customers/${id}/status`, data);

// Providers
export const getAdminProviders = (params = {}) => api.get('/admin/providers', { params });

// Get single provider detail (admin view - includes services, bookings, reviews, earnings, etc.)
export const getAdminProviderDetail = (id) => api.get(`/admin/providers/${id}`);

// Update provider status (approve/reject/block/suspend)
export const updateProviderStatus = (id, data) => api.patch(`/admin/providers/${id}/status`, data);

// Update provider KYC document status
export const updateProviderDocumentStatus = (id, docId, data) =>
  api.patch(`/admin/providers/${id}/documents/${docId}`, data);

// Update user status (block/unblock/warn)
export const updateUserStatus = (id, data) => api.patch(`/admin/users/${id}/status`, data);

// Delete user
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);

// Bookings
export const getAdminBookings = (params = {}) => api.get('/admin/bookings', { params });
export const getAdminBookingDetail = (id) => api.get(`/admin/bookings/${id}`);

// Reviews
export const getAdminReviewStats = () => api.get('/admin/reviews/stats');
export const getAdminReviews = (params = {}) => api.get('/admin/reviews', { params });
export const getAdminReviewDetail = (id) => api.get(`/admin/reviews/${id}`);

// Update review (visibility/flag)
export const updateReview = (id, data) => api.patch(`/admin/reviews/${id}`, data);

// Hide / restore / delete a review (admin moderation)
export const hideReview = (id) => api.patch(`/admin/reviews/${id}/hide`);
export const restoreReview = (id) => api.patch(`/admin/reviews/${id}/restore`);
export const deleteReview = (id) => api.delete(`/admin/reviews/${id}`);

// Reports
export const getAdminReports = (params = {}) => api.get('/admin/reports', { params });

// Update report status
export const updateReportStatus = (id, data) => api.patch(`/admin/reports/${id}/status`, data);

// Revenue
export const getAdminRevenue = (params = {}) => api.get('/admin/revenue', { params });

// Revenue CSV export (triggers a file download)
export const exportAdminRevenueCsv = async (params = {}) => {
  const response = await api.get('/admin/revenue', {
    params: { ...params, export: 'csv' },
    responseType: 'blob',
  });
  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  const fname =
    response.headers['content-disposition']
      ?.match(/filename="?([^"]+)"?/)?.[1] ||
    `localfix-revenue-${new Date().toISOString().slice(0, 10)}.csv`;
  link.href = url;
  link.setAttribute('download', fname);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};