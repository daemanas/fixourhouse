import api from './api';

// Provider gallery endpoints. All require an authenticated provider; the
// backend derives provider identity from the session token (never from the
// request body).

// GET /provider/gallery — list the logged-in provider's gallery images.
export const getGallery = () => api.get('/provider/gallery');

// POST /provider/gallery — upload one or more images as multipart/form-data.
export const uploadGalleryPhotos = (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  return api.post('/provider/gallery', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// DELETE /provider/gallery/:id — remove a single gallery image.
export const deleteGalleryPhoto = (id) =>
  api.delete(`/provider/gallery/${id}`);
