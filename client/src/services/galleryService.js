import api from './api';

// Provider gallery endpoints. All require an authenticated provider; the
// backend derives provider identity from the session token (never from the
// request body).

// GET /provider/gallery — list the logged-in provider's gallery images.
export const getGallery = () => api.get('/provider/gallery');

// POST /provider/gallery — upload one or more images as multipart/form-data.
export const uploadGalleryPhotos = (files, { category = 'work_photos', onUploadProgress } = {}) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('photos', file));
  formData.append('category', category);
  return api.post('/provider/gallery', formData, {
    onUploadProgress,
  });
};

// PATCH /provider/gallery/:id — update one owned image's category/featured flag.
export const updateGalleryPhoto = (id, data) => api.patch(`/provider/gallery/${id}`, data);

// DELETE /provider/gallery/:id — remove a single gallery image.
export const deleteGalleryPhoto = (id) =>
  api.delete(`/provider/gallery/${id}`);
