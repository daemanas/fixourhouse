import Joi from 'joi';

// Normalize phone numbers from formats like "+91 98765 43210", "98765 43210", "+919876543210"
// to bare 10-digit "9876543210" before validation.
const normalizePhone = (value) => {
  if (typeof value !== 'string') return value;
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  }
  return digits;
};

const phoneSchema = Joi.string()
  .custom((value, helpers) => {
    const normalized = normalizePhone(value);
    if (!/^[6-9]\d{9}$/.test(normalized)) {
      return helpers.error('string.pattern.base');
    }
    return normalized;
  }, 'Normalize phone number')
  .required()
  .messages({
    'string.pattern.base': 'Please enter a valid 10-digit Indian phone number',
    'any.required': 'Phone number is required',
  });

export const registerValidator = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    phone: phoneSchema,
    password: Joi.string().min(6).max(50).required(),
    role: Joi.string().valid('customer', 'provider').default('customer'),
    location: Joi.string().allow('').optional(),
    locationData: Joi.object({
      country: Joi.string().allow('').optional(),
      state: Joi.string().allow('').optional(),
      district: Joi.string().allow('').optional(),
      city: Joi.string().allow('').optional(),
      countryId: Joi.string().allow('', null).optional(),
      stateId: Joi.string().allow('', null).optional(),
      districtId: Joi.string().allow('', null).optional(),
      cityId: Joi.string().allow('', null).optional(),
    }).optional(),
  }),
});

export const loginValidator = Joi.object({
  body: Joi.object({
    phone: phoneSchema,
    password: Joi.string().required(),
  }),
});

export const otpValidator = Joi.object({
  body: Joi.object({
    phone: phoneSchema,
    otp: Joi.string().length(6).required(),
    purpose: Joi.string().valid('registration', 'reset-password').optional(),
  }),
});

export const forgotPasswordValidator = Joi.object({
  body: Joi.object({
    phone: phoneSchema,
  }),
});

export const resetPasswordValidator = Joi.object({
  body: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).max(50).required(),
  }),
});