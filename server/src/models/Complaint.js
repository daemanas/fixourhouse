import mongoose from 'mongoose';

// ---- Sub-documents --------------------------------------------------------

const evidenceSchema = new mongoose.Schema(
  {
    // Fully-qualified URL returned by the upload/gallery service.
    url: { type: String, required: true },
    // Stored filename (for cleanup / audit), e.g. "complaints/abc.jpg".
    filename: { type: String },
    // Original uploaded file name supplied by the client.
    originalName: { type: String },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['open', 'under_review', 'waiting_for_provider', 'resolved', 'rejected'],
      required: true,
    },
    // Actor who triggered the transition (customer / provider / admin).
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: {
      type: String,
      enum: ['customer', 'provider', 'admin'],
    },
    note: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ---- Main schema ----------------------------------------------------------

const complaintSchema = new mongoose.Schema(
  {
    // Human-readable, unique, non-MongoDB-ID complaint reference.
    complaintId: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },
    // The customer who filed the complaint
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The provider the complaint is against
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    // The booking this complaint relates to
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    // Service is derived from the linked booking (booking.serviceId). It is
    // optional because some bookings may not carry a populated serviceId; a
    // complaint must still be submittable in that case.
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: false,
    },
    status: {
      type: String,
      enum: ['open', 'under_review', 'waiting_for_provider', 'resolved', 'rejected'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    category: {
      type: String,
      enum: ['service_quality', 'billing', 'provider_behavior', 'delay', 'safety', 'other'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: [10, 'Please provide at least 10 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    // What the customer would like to happen.
    requestedResolution: {
      type: String,
      enum: ['refund', 'redo_service', 'apology', 'other'],
      required: true,
    },
    // Array of uploaded evidence objects (URL + metadata)
    evidence: {
      type: [evidenceSchema],
      default: [],
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    // Response provided by the provider during the review process.
    // Providers may NOT change the status directly.
    providerResponse: {
      message: String,
      evidence: { type: [evidenceSchema], default: [] },
      respondedAt: Date,
    },

    // Decision recorded by the admin.
    adminDecision: {
      decision: {
        type: String,
        enum: ['upheld', 'partial', 'dismissed'],
      },
      resolutionSummary: String,
      refundAmount: { type: Number, default: 0, min: 0 },
      refundProcessed: { type: Boolean, default: false },
      decidedAt: Date,
      decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    // Admin-written resolution note (free text shown to customer/provider).
    resolution: { type: String, default: '' },

    // Top-level refund tracking (mirrors the payment/refund outcome).
    // Kept at the document root so the admin UI can read/write it directly.
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'completed', 'failed'],
      default: 'none',
    },
    refundAmount: { type: Number, default: 0, min: 0 },

    // Internal admin note (never shown to customer/provider).
    adminNotes: { type: String },
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate complaints from the same customer for the same booking.
complaintSchema.index({ booking: 1, customer: 1 }, { unique: true });
complaintSchema.index({ customer: 1, createdAt: -1 });
complaintSchema.index({ provider: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ refundStatus: 1 });
complaintSchema.index({ priority: 1 });
complaintSchema.index({ category: 1 });

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;

