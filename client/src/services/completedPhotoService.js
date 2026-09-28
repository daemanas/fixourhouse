import api from './api';

export const getCompletedServicePhotos = (params = {}) => api.get('/completed-photos', { params });

/**
 * Upload completed service photos.
 *
 * FormData:
 *   - bookingId: string
 *   - caption: string (optional)
 *   - photos: File[] — append each file using "photos"
 */
export const uploadCompletedServicePhotos = (formData) =>
  api.post('/completed-photos', formData);