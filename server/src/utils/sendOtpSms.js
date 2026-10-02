import ApiError from './ApiError.js';
import env from '../config/env.js';

const sanitizeProviderMessage = (message) => {
  let sanitized = String(message || 'No provider error message was returned.');
  for (const secret of [env.twilioAccountSid, env.twilioAuthToken]) {
    if (secret) sanitized = sanitized.split(secret).join('[redacted]');
  }
  return sanitized
    .replace(/\b\d{6}\b/g, '[redacted]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted phone]')
    .slice(0, 500);
};

export async function sendOtpSms(phone, otp) {
  const { twilioAccountSid, twilioAuthToken, twilioPhoneNumber } = env;
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    const detail = env.nodeEnv === 'development'
      ? ' SMS configuration is missing from the server environment.'
      : '';
    throw new ApiError(503, `OTP service is temporarily unavailable. Please try again later.${detail}`);
  }
  if (!/^\+[1-9]\d{7,14}$/.test(twilioPhoneNumber)) {
    console.error(
      '[auth:sms] Twilio configuration error: TWILIO_PHONE_NUMBER must be the Twilio SMS-capable sender number in E.164 format (for example, +14155552671).',
    );
    throw new ApiError(
      503,
      'OTP service is temporarily unavailable. Please check the server SMS configuration.',
    );
  }

  const credentials = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
  const body = new URLSearchParams({
    To: `+91${phone}`,
    From: twilioPhoneNumber,
    Body: `Your LocalFix verification code is ${otp}. It expires in ${Math.ceil(env.otpExpiresIn / 60)} minutes. Do not share this code.`,
  });
  let response;
  try {
    response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch (error) {
    console.error('[auth:sms] Could not reach Twilio.', {
      reason: sanitizeProviderMessage(error?.message),
    });
    throw new ApiError(502, 'Could not reach the SMS verification service. Please try again later.');
  }

  if (!response.ok) {
    let providerError;
    try {
      providerError = await response.json();
    } catch {
      providerError = null;
    }
    console.error('[auth:sms] Twilio rejected the OTP message.', {
      httpStatus: response.status,
      code: providerError?.code || null,
      message: sanitizeProviderMessage(providerError?.message),
    });
    throw new ApiError(503, 'OTP service is temporarily unavailable. Please try again later.');
  }
}
