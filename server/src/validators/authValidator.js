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

const emailSchema = Joi.string().empty('').trim().lowercase().email().max(254)
  .messages({ 'string.email': 'Please enter a valid email address' });

export const registerValidator = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    channel: Joi.string().valid('phone', 'email').required(),
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
  }).custom((body, helpers) => {
    if ((body.channel === 'phone' && !body.phone) || (body.channel === 'email' && !body.email)) {
      return helpers.error('any.custom');
    }
    return body;
  }).messages({ 'any.custom': 'Choose the matching phone or email registration method.' }),
});

export const loginValidator = Joi.object({
  body: Joi.object({
    phone: phoneSchema,
    password: Joi.string().required(),
  }),
});

export const loginOtpValidator = Joi.object({
  body: Joi.object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
  }).xor('phone', 'email'),
});

export const resendOtpValidator = Joi.object({
  body: Joi.object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    purpose: Joi.string().valid('registration', 'login', 'reset-password').default('registration'),
  }).xor('phone', 'email'),
});

export const googleAuthValidator = Joi.object({
  body: Joi.object({
    idToken: Joi.string().max(8192).required(),
    role: Joi.string().valid('customer', 'provider'),
    name: Joi.string().min(2).max(50).optional(),
    phone: phoneSchema.optional(),
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

export const otpValidator = Joi.object({
  body: Joi.object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    otp: Joi.string().length(6).required(),
    purpose: Joi.string().valid('registration', 'reset-password', 'login').optional(),
  }).xor('phone', 'email'),
});

export const forgotPasswordValidator = Joi.object({
  body: Joi.object({
    email: emailSchema.required().messages({ 'any.required': 'Email address is required' }),
  }),
});

export const resetPasswordValidator = Joi.object({
  body: Joi.object({
    token: Joi.string().required(),
    password: Joi.string()
      .min(8)
      .max(50)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must include an uppercase letter, a lowercase letter, and a number',
      }),
  }),
});