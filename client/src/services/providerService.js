import api from './api';

// Get all approved providers (public)
export const getProviders = (params = {}) => api.get('/providers', { params });

// Get single provider by ID (public)
export const getProviderById = (id) => api.get(`/providers/${id}`);

// Get own provider profile
export const getMyProviderProfile = () => api.get('/providers/me/profile');

// Update own provider profile
export const updateMyProviderProfile = (data) => api.patch('/providers/me/profile', data);

// Get own provider settings
export const getProviderSettings = () => api.get('/providers/me/settings');

// Update own provider settings
export const updateProviderSettings = (data) => api.patch('/providers/me/settings', data);

// Deactivate own account (soft)
export const deactivateProviderAccount = () => api.patch('/providers/me/deactivate');

// Delete own account (hard)
export const deleteProviderAccount = () => api.delete('/providers/me');

// Add service to own profile
export const addService = (data) => api.post('/providers/me/services', data);

// Update a service on own profile
export const updateService = (serviceId, data) =>
  api.patch(`/providers/me/services/${serviceId}`, data);

// Delete a service from own profile
export const deleteService = (serviceId) => api.delete(`/providers/me/services/${serviceId}`);

// Update availability (bulk week update — legacy endpoint, kept for compatibility)
export const updateAvailability = (data) => api.patch('/providers/me/availability', data);

// Get own availability
export const getMyAvailability = () => api.get('/providers/me/availability');

// Add a day to own availability
export const addAvailabilityDay = (data) => api.post('/providers/me/availability', data);

// Update a single availability day (toggle / edit slots / move day)
export const updateAvailabilityDay = (day, data) =>
  api.put(`/providers/me/availability/${day}`, data);

// Delete a day from own availability
export const deleteAvailabilityDay = (day) =>
  api.delete(`/providers/me/availability/${day}`);

// Get provider dashboard stats
export const getProviderStats = () => api.get('/providers/me/stats');

// Get provider earnings summary and transaction history
export const getProviderEarnings = (params = {}) => api.get('/providers/me/earnings', { params });