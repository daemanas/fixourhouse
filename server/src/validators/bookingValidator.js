import Joi from 'joi';

// The client submits the picked calendar day normalized to UTC midnight
// (e.g. new Date('YYYY-MM-DD').toISOString()), so validate against the start
// of today in UTC instead of the exact request instant.
const dateNotBeforeToday = (value, helpers) => {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  if (value.getTime() < startOfToday.getTime()) {
    return helpers.message('{{#label}} must be today or a future date');
  }
  return value;
};

export const createBookingValidator = Joi.object({
  body: Joi.object({
    providerId: Joi.string().required(),
    serviceId: Joi.string().required(),
    scheduledDate: Joi.date().custom(dateNotBeforeToday).required(),
    scheduledTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
    address: Joi.object({
      line1: Joi.string().required(),
      line2: Joi.string().optional(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      pincode: Joi.string().pattern(/^[1-9]\d{5}$/).required(),
    }).required(),
    notes: Joi.string().max(500).optional(),
    paymentMethod: Joi.string().valid('card', 'upi', 'netbanking', 'wallet', 'online', 'cash').optional(),
  }),
});

export const updateBookingStatusValidator = Joi.object({
  params: Joi.object({
    id: Joi.string().required(),
  }),
  body: Joi.object({
    status: Joi.string().valid('accepted', 'rejected', 'working', 'completed', 'cancelled').required(),
    // When a provider starts a job ('working') they must submit the customer's
    // Booking ID. Exact-match verification against the stored booking is done in
    // the controller (server-side) — this schema only requires/rejects the field.
    bookingId: Joi.string().trim().when('status', {
      is: 'working',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    // When a provider completes a job they must select how the customer paid
    // ('online' or 'cash'); it is recorded on the booking together with the
    // status change. Never accepted for any other status.
    paymentMethod: Joi.string().valid('online', 'cash').when('status', {
      is: 'completed',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    reason: Joi.string().max(500).optional(),
  }),
});