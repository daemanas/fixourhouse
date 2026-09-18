import { Router } from 'express';
import {
  register,
  login,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  getMe,
} from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  registerValidator,
  loginValidator,
  otpValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from '../validators/authValidator.js';
import { authLimiter } from '../config/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, validate(registerValidator), register);
router.post('/login', authLimiter, validate(loginValidator), login);
router.post('/otp-verify', authLimiter, validate(otpValidator), verifyOtp);
router.post('/otp-resend', authLimiter, validate(forgotPasswordValidator), resendOtp);
router.post('/forgot-password', authLimiter, validate(forgotPasswordValidator), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordValidator), resetPassword);
router.get('/me', protect, getMe);

export default router;