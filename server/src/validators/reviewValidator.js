import Joi from 'joi';

export const createReviewValidator = Joi.object({
  body: Joi.object({
    bookingId: Joi.string().hex().length(24).required(),
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().max(1000).optional(),
  }),
});