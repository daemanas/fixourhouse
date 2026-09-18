import axios from 'axios';
import env from '../config/env';

const api = axios.create({
  baseURL: env.API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('localfix-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      localStorage.removeItem('localfix-token');
      localStorage.removeItem('localfix-user');
      if (!window.location.pathname.includes('/auth/')) {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;