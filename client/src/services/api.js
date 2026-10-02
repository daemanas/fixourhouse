import axios from 'axios';
import env from '../config/env';

const api = axios.create({
  baseURL: env.API_URL,
  timeout: 15000,
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const requestUrl = String(config.url || '');
    const isAdminRequest = requestUrl.includes('/admin/');
    const token = isAdminRequest
      ? sessionStorage.getItem('localfix-admin-token')
      : localStorage.getItem('localfix-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    } else {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle errors and token expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAdminRequest = String(error.config?.url || '').includes('/admin/');
      if (isAdminRequest) {
        sessionStorage.removeItem('localfix-admin-token');
        if ((window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/'))
          && !window.location.pathname.startsWith('/admin/login')
          && !window.location.pathname.startsWith('/admin/forgot-password')) {
          window.location.href = '/admin/login';
        }
      } else {
        localStorage.removeItem('localfix-token');
        localStorage.removeItem('localfix-user');
        if (!window.location.pathname.includes('/auth/')) {
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;