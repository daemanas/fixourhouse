import Joi from 'joi';

export const createWithdrawalValidator = Joi.object({
  body: Joi.object({
    amount: Joi.number().positive().precision(2).required(),
    method: Joi.string().valid('bank', 'upi', 'wallet').required(),
    accountDetails: Joi.object({
      bankName: Joi.string().trim().max(100).optional(),
      accountNumber: Joi.string().trim().max(30).optional(),
      ifsc: Joi.string().trim().max(20).optional(),
      upiId: Joi.string().trim().max(50).optional(),
    }).optional(),
  }),
});
