import Joi from 'joi';

export const createReportValidator = Joi.object({
  body: Joi.object({
    targetType: Joi.string().valid('provider', 'customer', 'review', 'booking').required(),
    targetId: Joi.string().required(),
    type: Joi.string().valid('fraud', 'abuse', 'copyright', 'other').required(),
    description: Joi.string().max(2000).optional(),
  }),
});