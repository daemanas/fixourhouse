import mongoose from 'mongoose';

const websiteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'website', unique: true, immutable: true },
    siteName: { type: String, trim: true, default: 'LocalFix', maxlength: 80 },
    logoUrl: { type: String, trim: true, default: '' },
    darkLogoUrl: { type: String, trim: true, default: '' },
    faviconUrl: { type: String, trim: true, default: '' },
    hero: {
      desktopImageUrl: { type: String, trim: true, default: '' },
      mobileImageUrl: { type: String, trim: true, default: '' },
      heading: { type: String, trim: true, default: '' },
      subtitle: { type: String, trim: true, default: '' },
      primaryButtonText: { type: String, trim: true, default: '' },
      primaryButtonAction: { type: String, trim: true, default: '' },
      secondaryButtonText: { type: String, trim: true, default: '' },
      secondaryButtonAction: { type: String, trim: true, default: '' },
      enabled: { type: Boolean, default: true },
      displayOrder: { type: Number, default: 0, min: 0 },
    },
    contact: {
      officialEmail: { type: String, trim: true, default: '' },
      supportEmail: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      whatsapp: { type: String, trim: true, default: '' },
      officeAddress: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: 'India' },
      postalCode: { type: String, trim: true, default: '' },
      businessHours: { type: String, trim: true, default: '' },
      mapUrl: { type: String, trim: true, default: '' },
    },
    social: {
      facebook: { type: String, trim: true, default: '' },
      instagram: { type: String, trim: true, default: '' },
      youtube: { type: String, trim: true, default: '' },
      linkedin: { type: String, trim: true, default: '' },
      twitter: { type: String, trim: true, default: '' },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

const WebsiteSettings = mongoose.model('WebsiteSettings', websiteSettingsSchema);

export default WebsiteSettings;