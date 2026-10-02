import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import env from '../config/env.js';
import AdminSession from '../models/AdminSession.js';
import { ADMIN_TOKEN_USE, normalizeAdminEmail, verifyAdminToken } from '../utils/adminAuth.js';

export const adminProtect = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) {
    throw new ApiError(401, 'Admin authentication required');
  }

  const token = authorization.slice(7).trim();
  let claims;
  try {
    claims = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw new ApiError(401, 'Admin session expired');
    if (error.name === 'JsonWebTokenError') throw new ApiError(401, 'Invalid admin session');
    throw error;
  }

  const configuredEmail = normalizeAdminEmail(process.env.ADMIN_EMAIL);
  if (
    claims.role !== 'admin'
    || claims.tokenUse !== ADMIN_TOKEN_USE
    || !configuredEmail
    || normalizeAdminEmail(claims.email) !== configuredEmail
    || !claims.jti
  ) {
    throw new ApiError(403, 'Admin access required');
  }

  try {
    const activeSession = await AdminSession.exists({
      tokenId: claims.jti,
      email: configuredEmail,
      expiresAt: { $gt: new Date() },
    });
    if (!activeSession) throw new ApiError(401, 'Admin session is no longer active');
    req.admin = { email: configuredEmail, role: 'admin' };
    req.user = { _id: claims.id || null, email: configuredEmail, role: 'admin' };
    req.adminSessionId = claims.jti;
    verifyAdminToken(token, env.jwtSecret);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw new ApiError(401, 'Admin session expired');
    if (error.name === 'JsonWebTokenError') throw new ApiError(403, 'Admin access required');
    throw error;
  }
});
