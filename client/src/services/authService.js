import api from './api';

export const authService = {
  async register(data) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async login(data) {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  async verifyOtp(data) {
    const response = await api.post('/auth/otp-verify', data);
    return response.data;
  },

  async resendOtp(data) {
    const response = await api.post('/auth/otp-resend', data);
    return response.data;
  },

  async forgotPassword(data) {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },

  async resetPassword(data) {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
