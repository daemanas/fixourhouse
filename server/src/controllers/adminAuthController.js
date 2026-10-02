import env from '../config/env.js';
import AdminSession from '../models/AdminSession.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  createAdminToken,
  credentialsMatch,
  normalizeAdminEmail,
  verifyAdminToken,
} from '../utils/adminAuth.js';

export const loginAdmin = asyncHandler(async (req, res) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || !env.jwtSecret) {
    throw new ApiError(503, 'Admin authentication is not configured');
  }

  const submitted = req.body || {};
  if (!credentialsMatch(
    { email: submitted.email, password: submitted.password },
    { email: adminEmail, password: adminPassword }
  )) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const email = normalizeAdminEmail(adminEmail);
  const token = createAdminToken(email, env.jwtSecret);
  const claims = verifyAdminToken(token, env.jwtSecret);
  await AdminSession.create({
    tokenId: claims.jti,
    email,
    expiresAt: new Date(claims.exp * 1000),
  });
  res.status(200).json(
    new ApiResponse(200, {
      token,
      admin: { email, role: 'admin' },
    }, 'Admin login successful')
  );
});

export const getAdminSession = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, { admin: req.admin }, 'Admin session is valid')
  );
});

export const logoutAdmin = asyncHandler(async (req, res) => {
  await AdminSession.deleteOne({ tokenId: req.adminSessionId });
  res.status(200).json(new ApiResponse(200, {}, 'Admin logged out successfully'));
});
