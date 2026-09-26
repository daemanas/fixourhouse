import api from './api';

export const getPublicWebsiteSettings = () => api.get('/settings/website');
export const getAdminWebsiteSettings = () => api.get('/admin/settings/website');
export const saveWebsiteSettings = (settings) => api.put('/admin/settings/website', settings);
export const uploadWebsiteAsset = (kind, dataUrl) =>
  api.post('/admin/settings/website/assets', { kind, dataUrl });