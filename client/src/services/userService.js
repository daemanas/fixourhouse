import api from './api';

// Update own profile
export const updateMyProfile = (data) => api.patch('/users/me', data);

// Change password
export const changePassword = (data) => api.patch('/users/me/password', data);

// Get wishlist
export const getWishlist = () => api.get('/users/me/wishlist');

// Toggle provider in wishlist
export const toggleWishlist = (providerId) => api.post(`/users/me/wishlist/${providerId}`);