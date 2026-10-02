import api from './api';

export const adminAuthService = {
  async login(credentials) {
    const response = await api.post('/admin/auth/login', credentials);
    return response.data?.data;
  },

  async getSession() {
    const response = await api.get('/admin/auth/me');
    return response.data?.data;
  },

  async logout() {
    const response = await api.post('/admin/auth/logout');
    return response.data?.data;
  },
};
