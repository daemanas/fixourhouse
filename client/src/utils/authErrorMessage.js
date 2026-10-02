export function authErrorMessage(error, fallback) {
  const status = error?.response?.status;
  const responseMessage = error?.response?.data?.message?.toLowerCase() || '';
  const code = error?.response?.data?.code;
  const messages = {
    SMTP_NOT_CONFIGURED: 'Email verification is not configured on the server.',
    SMTP_AUTH_FAILED: 'The email service rejected its SMTP credentials.',
    SMTP_CONNECTION_FAILED: 'Could not connect to the email service.',
    SMTP_SEND_FAILED: 'Could not send the email verification code.',
    OTP_EXPIRED: 'This verification code has expired. Please request a new one.',
    OTP_INVALID: 'The verification code is incorrect. Please try again.',
    OTP_TOO_MANY_ATTEMPTS: 'Too many incorrect codes. Request a new verification code.',
    OTP_RESEND_COOLDOWN: 'Please wait before requesting another verification code.',
    EMAIL_ALREADY_EXISTS: 'An account already exists with this email address. Please sign in.',
    USER_NOT_FOUND: 'No account exists with this email address. Please sign up.',
  };
  if (code && messages[code]) return messages[code];
  if (status === 502 || status === 503) {
    if (responseMessage.includes('google')) {
      return 'Google sign-in is temporarily unavailable. Please try again later.';
    }
    if (status === 429) return 'Please wait before trying again.';
    if (responseMessage.includes('email') || responseMessage.includes('smtp')) {
      return 'Email verification is temporarily unavailable. Please try again later.';
    }
    if (
      import.meta.env.DEV
      && responseMessage.includes('configuration is missing')
    ) {
      return 'SMS verification is temporarily unavailable. Please check the server configuration.';
    }
    return responseMessage.includes('sms')
      ? 'SMS verification is temporarily unavailable. Please try again later.'
      : 'OTP service is temporarily unavailable. Please try again later.';
  }
  if (status === 409 && error?.response?.data?.message?.includes('phone')) {
    return 'An account already exists with this phone number. Please login.';
  }

  const message = error?.response?.data?.message;
  if (
    typeof message === 'string'
    && message.length <= 240
    && !/mongo|mongoose|duplicate key|e11000|stack|exception| at \w+\s*\(/i.test(message)
  ) {
    return message;
  }
  return fallback;
}
