import mongoose from 'mongoose';

// Per-provider gallery image. Each document represents one uploaded photo on
// the provider's public gallery. providerId is ALWAYS derived from the
// authenticated session server-side — it is never accepted from the client.
const gallerySchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    // Browser-accessible public URL served by Express static (e.g.
    // "/uploads/gallery/1699...a1b2.jpg"). Never a local filesystem path.
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    // Original client filename (kept for display only; not trusted for paths).
    originalName: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Gallery = mongoose.model('Gallery', gallerySchema);

export default Gallery;
