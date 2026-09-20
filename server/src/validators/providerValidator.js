import Joi from 'joi';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

// Canonical per-day availability. This is the SINGLE SOURCE OF TRUTH for any
// provider's availability — every endpoint and page that touches availability
// uses this shape:
//   { enabled: Boolean, slots: [{ startTime, endTime }] }
const timeSlotSchema = Joi.object({
  startTime: Joi.string().pattern(TIME_PATTERN).required(),
  endTime: Joi.string().pattern(TIME_PATTERN).required(),
}).custom((value, helpers) => {
  if (value.endTime <= value.startTime) {
    return helpers.message('End time must be later than start time');
  }
  return value;
}, 'time slot validation');

// Day-level validation shared by the week PATCH and the day CRUD endpoints:
// at least one valid slot when enabled and no overlapping ranges within a day.
const validateDaySlots = (value, helpers) => {
  const effectiveSlots =
    value.slots && value.slots.length
      ? value.slots
      : value.startTime || value.endTime
        ? [{ startTime: value.startTime, endTime: value.endTime }]
        : [];

  if (value.enabled && effectiveSlots.length === 0) {
    return helpers.message('At least one time slot is required when a day is enabled');
  }

  const sorted = [...effectiveSlots].sort((a, b) =>
    a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0
  );
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].startTime < sorted[i - 1].endTime) {
      return helpers.message('Time slots cannot overlap within the same day');
    }
  }
  return value;
};

const dayAvailabilitySchema = Joi.object({
  enabled: Joi.boolean().default(false),
  slots: Joi.array().items(timeSlotSchema).default([]),
  // Legacy single-range day fields — still accepted and migrated to `slots` by
  // the controller so old clients keep working.
  startTime: Joi.string().pattern(TIME_PATTERN).allow('', null),
  endTime: Joi.string().pattern(TIME_PATTERN).allow('', null),
}).custom(validateDaySlots, 'day availability validation');

const weekAvailabilitySchema = Joi.object({
  monday: dayAvailabilitySchema,
  tuesday: dayAvailabilitySchema,
  wednesday: dayAvailabilitySchema,
  thursday: dayAvailabilitySchema,
  friday: dayAvailabilitySchema,
  saturday: dayAvailabilitySchema,
  sunday: dayAvailabilitySchema,
}).min(1);

// Legacy single-range availability { days: ['Mon',..], startTime, endTime } —
// accepted for backward compatibility and normalized to the per-day structure
// by the controller.
const legacyAvailabilitySchema = Joi.object({
  days: Joi.array()
    .items(Joi.string().valid('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'))
    .min(1)
    .required(),
  startTime: Joi.string().pattern(TIME_PATTERN).required(),
  endTime: Joi.string().pattern(TIME_PATTERN).required(),
}).custom((value, helpers) => {
  if (value.startTime && value.endTime && value.endTime <= value.startTime) {
    return helpers.message('End time must be later than start time');
  }
  return value;
}, 'legacy availability validation');

export const createProviderValidator = Joi.object({
  body: Joi.object({
    businessName: Joi.string().min(2).max(100).required(),
    category: Joi.string().required(),
    description: Joi.string().max(1000).optional(),
    location: Joi.object({
      address: Joi.string().allow('').optional(),
      country: Joi.string().allow('').optional(),
      city: Joi.string().allow('').optional(),
      district: Joi.string().allow('').optional(),
      state: Joi.string().allow('').optional(),
      pincode: Joi.string().allow('').optional(),
      countryId: Joi.string().allow('', null).optional(),
      stateId: Joi.string().allow('', null).optional(),
      districtId: Joi.string().allow('', null).optional(),
      cityId: Joi.string().allow('', null).optional(),
      coordinates: Joi.object({
        type: Joi.string().valid('Point').default('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2).optional(),
      }).optional(),
    }).optional(),
    experience: Joi.number().min(0).default(0),
    services: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          description: Joi.string().optional(),
          price: Joi.number().min(0).required(),
          duration: Joi.string().optional(),
          popular: Joi.boolean().default(false),
        })
      )
      .optional(),
  }),
});

export const updateProviderValidator = Joi.object({
  body: Joi.object({
    businessName: Joi.string().min(2).max(100).optional(),
    category: Joi.string().optional(),
    description: Joi.string().max(1000).optional(),
    email: Joi.string().lowercase().pattern(/^\S+@\S+\.\S+$/).optional(),
    avatar: Joi.string().max(8 * 1024 * 1024).optional(),
    location: Joi.object({
      address: Joi.string().allow('').optional(),
      country: Joi.string().allow('').optional(),
      city: Joi.string().allow('').optional(),
      district: Joi.string().allow('').optional(),
      state: Joi.string().allow('').optional(),
      pincode: Joi.string().allow('').optional(),
      countryId: Joi.string().allow('', null).optional(),
      stateId: Joi.string().allow('', null).optional(),
      districtId: Joi.string().allow('', null).optional(),
      cityId: Joi.string().allow('', null).optional(),
      coordinates: Joi.object({
        type: Joi.string().valid('Point').default('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2).optional(),
      }).optional(),
    }).optional(),
    experience: Joi.number().min(0).optional(),
    serviceArea: Joi.array().items(Joi.string()).optional(),
    serviceRadius: Joi.number().min(0).optional(),
    availability: Joi.alternatives()
      .try(weekAvailabilitySchema, legacyAvailabilitySchema)
      .optional(),
    pricing: Joi.object({
      hourlyRate: Joi.number().min(0).optional(),
      basePrice: Joi.number().min(0).optional(),
      currency: Joi.string().optional(),
    }).optional(),
  }).min(1),
});

export const addServiceValidator = Joi.object({
  body: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().max(1000).optional(),
    price: Joi.number().min(0).required(),
    duration: Joi.string().optional(),
    popular: Joi.boolean().default(false),
  }),
});

export const updateServiceValidator = Joi.object({
  params: Joi.object({
    serviceId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({
    name: Joi.string().max(100).optional(),
    description: Joi.string().max(1000).optional(),
    price: Joi.number().min(0).optional(),
    duration: Joi.string().optional(),
    popular: Joi.boolean().optional(),
  }).min(1),
});

export const availabilityValidator = Joi.object({
  body: weekAvailabilitySchema,
});

// Provider-settings payload. Every group is optional so the client can PATCH a
// single group (e.g. one notification toggle) without resending the rest. Nested
// sub-documents are validated loosely — the model applies schema defaults and the
// enum constraints, so we only guard the obvious type/value mistakes here.
export const providerSettingsValidator = Joi.object({
  body: Joi.object({
    language: Joi.string().valid('English', 'Bengali', 'Hindi').optional(),
    currency: Joi.string().valid('INR (₹)', 'USD ($)', 'EUR (€)').optional(),
    notifications: Joi.object({
      newBookings: Joi.boolean().optional(),
      bookingUpdates: Joi.boolean().optional(),
      paymentAlerts: Joi.boolean().optional(),
      newReviews: Joi.boolean().optional(),
      jobCompletion: Joi.boolean().optional(),
      withdrawalStatus: Joi.boolean().optional(),
      availabilityReminders: Joi.boolean().optional(),
      marketingEmails: Joi.boolean().optional(),
    })
      .min(1)
      .optional(),
    appearance: Joi.object({
      theme: Joi.string().valid('light', 'dark', 'system').optional(),
    })
      .min(1)
      .optional(),
    privacy: Joi.object({
      profileVisibility: Joi.string().valid('public', 'private').optional(),
      showPhone: Joi.boolean().optional(),
      showEmail: Joi.boolean().optional(),
      showServiceArea: Joi.boolean().optional(),
      allowCustomerContact: Joi.boolean().optional(),
      publicReviews: Joi.boolean().optional(),
    })
      .min(1)
      .optional(),
    payment: Joi.object({
      payoutMethod: Joi.string().valid('bank', 'upi').optional(),
      accountHolderName: Joi.string().allow('').max(100).optional(),
      bankName: Joi.string().allow('').max(100).optional(),
      accountNumber: Joi.string().allow('').max(40).optional(),
      ifsc: Joi.string().allow('').pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional(),
      upiId: Joi.string().allow('').max(60).optional(),
      payoutSchedule: Joi.string().valid('manual', 'weekly', 'monthly').optional(),
    })
      .min(1)
      .optional(),
  }).min(1),
});

const dayParamValidator = Joi.string()
  .valid(...DAY_KEYS)
  .required();

export const addAvailabilityDayValidator = Joi.object({
  body: Joi.object({
    day: dayParamValidator,
    enabled: Joi.boolean().default(false),
    slots: Joi.array().items(timeSlotSchema).default([]),
  }).custom(validateDaySlots, 'add availability day validation'),
});

export const updateAvailabilityDayValidator = Joi.object({
  params: Joi.object({
    day: dayParamValidator,
  }),
  body: Joi.object({
    enabled: Joi.boolean().optional(),
    slots: Joi.array().items(timeSlotSchema).optional(),
  })
    .min(1)
    .custom(validateDaySlots, 'update availability day validation'),
});

export const deleteAvailabilityDayValidator = Joi.object({
  params: Joi.object({
    day: dayParamValidator,
  }),
});