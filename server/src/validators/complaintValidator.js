import Joi from 'joi';

const VALID_CATEGORIES = [
  'service_quality',
  'billing',
  'provider_behavior',
  'delay',
  'safety',
  'other',
];
const VALID_RESOLUTIONS = ['refund', 'redo_service', 'apology', 'other'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export const createComplaintValidator = Joi.object({
  body: Joi.object({
    bookingId: Joi.string().hex().length(24).required(),
    category: Joi.string().valid(...VALID_CATEGORIES).required(),
    priority: Joi.string().valid(...VALID_PRIORITIES).optional(),
    description: Joi.string().min(10).max(2000).required(),
    // Optional from the frontend; the controller falls back to 'other' when absent.
    requestedResolution: Joi.string().valid(...VALID_RESOLUTIONS).optional(),
    // Free-text resolution when requestedResolution === 'other'.
    requestedResolutionText: Joi.string().max(2000).allow('', null).optional(),
    evidence: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().required(),
          filename: Joi.string().optional(),
          originalName: Joi.string().optional(),
        })
      )
      .max(5)
      .optional(),
  }),
});

export const respondComplaintValidator = Joi.object({
  body: Joi.object({
    message: Joi.string().min(10).max(2000).required(),
  }),
});

export const reviewComplaintValidator = Joi.object({
  body: Joi.object({
    action: Joi.string()
      .valid('start_review', 'request_provider', 'reject', 'resolve')
      .required(),
    adminNotes: Joi.string().max(2000).allow('', null).optional(),
  }),
});

export const decideComplaintValidator = Joi.object({
  body: Joi.object({
    decision: Joi.string().valid('upheld', 'partial', 'dismissed').required(),
    resolutionSummary: Joi.string().min(10).max(2000).required(),
    refundAmount: Joi.number().min(0).optional(),
    adminNotes: Joi.string().max(2000).allow('', null).optional(),
  }),
});

const STATUSES = ['open', 'under_review', 'waiting_for_provider', 'resolved', 'rejected'];
const REFUND_STATUSES = ['none', 'pending', 'completed', 'failed'];

// Admin PATCH payload. The admin UI sends a flat shape:
//   status (lifecycle), adminDecision (free-text note), resolution (summary),
//   refundStatus + refundAmount (outcome). An explicit `decision` enum is
//   optional — the controller derives one when absent.
export const updateComplaintValidator = Joi.object({
  body: Joi.object({
    status: Joi.string().valid(...STATUSES).optional(),
    priority: Joi.string().valid(...VALID_PRIORITIES).optional(),
    assignedTo: Joi.string().hex().length(24).allow(null, '').optional(),
    providerResponse: Joi.object({
      message: Joi.string().min(1).max(2000).required(),
      attachments: Joi.array().items(Joi.string()).max(5).optional(),
    }).optional(),
    adminDecision: Joi.alternatives()
      .try(Joi.string().max(2000), Joi.object().unknown(true))
      .optional(),
    decision: Joi.string().valid('upheld', 'partial', 'dismissed').optional(),
    resolution: Joi.string().max(2000).allow('', null).optional(),
    resolutionSummary: Joi.string().max(2000).allow('', null).optional(),
    refundStatus: Joi.string().valid(...REFUND_STATUSES).optional(),
    refundAmount: Joi.number().min(0).optional(),
  })
    .min(1)
    .unknown(false),
});

