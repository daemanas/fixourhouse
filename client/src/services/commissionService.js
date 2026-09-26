import api from './api';

export const getCommissionConfiguration = () => api.get('/admin/settings/commission');
export const saveDefaultCommission = (defaultRate) =>
  api.put('/admin/settings/commission', { defaultRate });
export const createCommissionOffer = (offer) =>
  api.post('/admin/settings/commission/offers', offer);
export const updateCommissionOffer = (id, offer) =>
  api.patch(`/admin/settings/commission/offers/${id}`, offer);
export const deleteCommissionOffer = (id) =>
  api.delete(`/admin/settings/commission/offers/${id}`);