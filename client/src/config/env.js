const env = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  APP_NAME: 'LocalFix',
  APP_DESCRIPTION: 'Find and book trusted local service providers near you.',
  SUPPORT_EMAIL: 'support@localfix.com',
  SUPPORT_PHONE: '+91 98765 43210',
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 5,
  MAX_FILE_SIZE_MB: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 50,
  },
  BOOKING_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    WORKING: 'working',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },
  ROLES: {
    CUSTOMER: 'customer',
    PROVIDER: 'provider',
    ADMIN: 'admin',
  },
  REPORT_TYPES: {
    FRAUD: 'fraud',
    ABUSE: 'abuse',
    COPYRIGHT: 'copyright',
  },
};

export default env;