import Joi from 'joi';

export const adminLoginValidator = Joi.object({
  body: Joi.object({
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(1).required(),
  }),
});
