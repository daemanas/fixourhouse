import api from './api';

// Create a new booking
export const createBooking = (data) => api.post('/bookings', data);

// Get current user's bookings (customer or provider)
export const getMyBookings = (params = {}) => api.get('/bookings/me', { params });

// Get single booking
export const getBookingById = (id) => api.get(`/bookings/${id}`);

// Update booking status (accept/reject/working/completed/cancel)
export const updateBookingStatus = (id, status, details = {}) => {
	if (typeof status !== 'string') {
		throw new TypeError('Booking status must be a string.');
	}

	return api.patch(`/bookings/${id}/status`, { ...details, status });
};
