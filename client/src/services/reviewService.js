import api from './api';

// Create a review for a completed booking
export const createReview = (data) => api.post('/reviews', data);

// Get reviews for a provider (public)
export const getProviderReviews = (providerId, params = {}) =>
  api.get(`/reviews/provider/${providerId}`, { params });

// Get the authenticated provider's own reviews with rating summary.
// The provider is derived from the JWT on the backend — never from a client ID.
export const getMyReviews = (params = {}) => api.get('/reviews/me', { params });