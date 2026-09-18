import api from './api';

// Get current provider's withdrawal requests
export const getMyWithdrawals = () => api.get('/withdrawals/me');

// Request a withdrawal
export const createWithdrawal = (data) => api.post('/withdrawals/me', data);
