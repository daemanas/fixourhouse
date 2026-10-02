import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter;
let transporterKey;

const readSmtpConfig = () => ({
  host: process.env.SMTP_HOST || env.smtp.host,
  port: Number(process.env.SMTP_PORT || env.smtp.port || 465),
  secure: String(process.env.SMTP_SECURE ?? env.smtp.secure).toLowerCase() === 'true',
  user: process.env.SMTP_USER || env.smtp.user,
  pass: process.env.SMTP_PASS || env.smtp.pass,
  from: process.env.SMTP_FROM || env.smtp.from,
  portConfigured: Boolean(process.env.SMTP_PORT) || env.smtp.portConfigured,
  secureConfigured: Boolean(process.env.SMTP_SECURE) || env.smtp.secureConfigured,
});

const smtpConfigured = (smtp) =>
  Boolean(
    smtp.host &&
    smtp.port &&
    smtp.portConfigured &&
    smtp.secureConfigured &&
    smtp.user &&
    smtp.pass &&
    smtp.from
  );

const missingSmtpSettings = (smtp) =>
  [
    ['SMTP_HOST', smtp.host],
    ['SMTP_PORT', smtp.portConfigured],
    ['SMTP_SECURE', smtp.secureConfigured],
    ['SMTP_USER', smtp.user],
    ['SMTP_PASS', smtp.pass],
    ['SMTP_FROM', smtp.from],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

function getTransporter(smtp) {
  if (!smtpConfigured(smtp)) {
    const error = new Error(`Email OTP is not configured. Missing: ${missingSmtpSettings(smtp).join(', ')}`);
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }

  const key = JSON.stringify([smtp.host, smtp.port, smtp.secure, smtp.user, smtp.pass]);
  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    transporterKey = key;
  }
  return transporter;
}

const sanitizeSmtpMessage = (message) => {
  let sanitized = String(message || 'Unknown SMTP error');
  const smtp = readSmtpConfig();
  for (const secret of [smtp.pass, smtp.user, smtp.from]) {
    if (secret) sanitized = sanitized.split(secret).join('[redacted]');
  }
  return sanitized
    .replace(/\b\d{6}\b/g, '[redacted]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted email]')
    .slice(0, 500);
};

const classifySmtpFailure = (error) => {
  const code = String(error?.code || error?.cause?.code || '').toUpperCase();
  const responseCode = Number(error?.responseCode || 0);
  if (error?.code === 'SMTP_NOT_CONFIGURED') {
    return { code: 'SMTP_NOT_CONFIGURED', statusCode: 503, message: 'Email verification is not configured on the server.' };
  }
  if (code === 'EAUTH' || [534, 535].includes(responseCode)) {
    return { code: 'SMTP_AUTH_FAILED', statusCode: 503, message: 'The email service rejected its SMTP credentials.' };
  }
  if (
    ['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH'].includes(code) ||
    /timed?\s*out|connection|getaddrinfo|ENOTFOUND|EHOSTUNREACH/i.test(String(error?.message || ''))
  ) {
    return { code: 'SMTP_CONNECTION_FAILED', statusCode: 502, message: 'Could not connect to the email service.' };
  }
  return { code: 'SMTP_SEND_FAILED', statusCode: 502, message: 'Could not send the email verification code.' };
};

export async function sendOtpEmail(email, otp) {
  const config = readSmtpConfig();
  try {
    const info = await getTransporter(config).sendMail({
      from: config.from,
      to: email,
      subject: `${otp} - LocalFix Verification Code`,
      text: `Hello,\n\nYour LocalFix verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you did not request this verification code, you can safely ignore this email.\n\nRegards,\nLocalFix Team`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LocalFix Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Card Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 32px 28px; text-align: center;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 8px 16px; margin-bottom: 12px;">
                      <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Local<span style="color: #10b981;">Fix</span></span>
                    </div>
                    <h1 style="margin: 0; font-size: 14px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px;">Account Verification</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #0f172a; text-align: center;">
                Verify Your Email Address
              </h2>
              <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.6; color: #475569; text-align: center;">
                Use the security code below to complete your verification on LocalFix.
              </p>

              <!-- OTP Visual Box -->
              <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; padding: 24px; text-align: center; margin-bottom: 28px;">
                <span style="display: block; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                  Verification Code
                </span>
                <div style="font-size: 36px; font-weight: 800; color: #0f172a; letter-spacing: 10px; font-family: 'Courier New', Courier, monospace; line-height: 1; padding: 8px 0;">
                  ${otp}
                </div>
                <div style="margin-top: 12px; display: inline-block; background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 20px; padding: 4px 12px;">
                  <span style="font-size: 12px; font-weight: 600; color: #92400e;">⏱️ Expires in 5 minutes</span>
                </div>
              </div>

              <!-- Security Notice -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; border-left: 4px solid #10b981;">
                <tr>
                  <td style="font-size: 13px; line-height: 1.5; color: #64748b;">
                    <strong style="color: #334155;">Security Notice:</strong> Never share this code with anyone. LocalFix staff will never ask for your verification code or password.
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #94a3b8; text-align: center;">
                If you didn't request this code, you can safely ignore this email. Someone might have entered your email address by mistake.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 13px; font-weight: 600; color: #475569;">
                LocalFix Marketplace
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                Connecting you with trusted local service professionals.
              </p>
              <p style="margin: 12px 0 0; font-size: 11px; color: #cbd5e1;">
                © ${new Date().getFullYear()} LocalFix Inc. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    const normalizeAddress = (value) =>
      String(typeof value === 'string' ? value : value?.address || '').trim().toLowerCase();
    const accepted = Array.isArray(info.accepted) ? info.accepted : [];
    const rejected = Array.isArray(info.rejected) ? info.rejected : [];
    const recipient = email.trim().toLowerCase();
    const acceptedRecipient = accepted.some((address) => normalizeAddress(address) === recipient);
    const rejectedRecipient = rejected.some((address) => normalizeAddress(address) === recipient);

    if (!acceptedRecipient || rejectedRecipient) {
      const error = new Error(
        rejectedRecipient
          ? 'SMTP server rejected the verification email recipient.'
          : 'SMTP server did not confirm acceptance of the verification email recipient.'
      );
      error.code = 'SMTP_SEND_FAILED';
      error.accepted = accepted;
      error.rejected = rejected;
      error.response = info.response;
      error.messageId = info.messageId;
      throw error;
    }

    if (env.nodeEnv === 'development') {
      console.info('[email] OTP sent', {
        recipient,
        accepted: accepted.map(normalizeAddress),
        rejected: rejected.map(normalizeAddress),
        messageId: info.messageId || null,
        response: sanitizeSmtpMessage(info.response),
      });
    }
  } catch (error) {
    const classified = classifySmtpFailure(error);
    console.error('[auth:email] Failed to send verification code.', {
      code: classified.code,
      responseCode: error?.responseCode || null,
      accepted: (error?.accepted || []).map((address) =>
        String(typeof address === 'string' ? address : address?.address || '').trim().toLowerCase()
      ),
      rejected: (error?.rejected || []).map((address) =>
        String(typeof address === 'string' ? address : address?.address || '').trim().toLowerCase()
      ),
      messageId: error?.messageId || null,
      message: sanitizeSmtpMessage(error?.message),
      response: sanitizeSmtpMessage(error?.response),
    });
    const serviceError = new Error(classified.message);
    serviceError.code = classified.code;
    serviceError.statusCode = classified.statusCode;
    serviceError.isOperational = true;
    throw serviceError;
  }
}

export async function verifySmtpConnection() {
  const config = readSmtpConfig();
  console.info('[auth:email] SMTP configuration:', {
    configured: smtpConfigured(config),
    host: config.host ? 'configured' : 'missing',
    port: config.portConfigured ? 'configured' : 'missing',
    secure: config.secureConfigured ? 'configured' : 'missing',
    user: config.user ? 'configured' : 'missing',
    from: config.from ? 'configured' : 'missing',
  });
  if (!smtpConfigured(config)) {
    const missing = missingSmtpSettings(config);
    console.warn(`[auth:email] SMTP not configured; email OTP is unavailable. Missing: ${missing.join(', ')}`);
    return false;
  }
  try {
    await getTransporter(config).verify();
    console.info('[auth:email] SMTP connection verified.');
    return true;
  } catch (error) {
    const classified = classifySmtpFailure(error);
    console.error('[auth:email] SMTP connection verification failed.', {
      code: classified.code,
      responseCode: error?.responseCode || null,
      message: sanitizeSmtpMessage(error?.message),
    });
    return false;
  }
}

export const emailService = { sendOtpEmail, verifySmtpConnection };