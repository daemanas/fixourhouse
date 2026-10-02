import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { authService } from '../../services/authService';
import { authErrorMessage } from '../../utils/authErrorMessage';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export function OtpPage() {
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const phone = location.state?.phone || '';
  const email = location.state?.email || '';
  const channel = location.state?.channel || (email ? 'email' : 'phone');
  const identity = channel === 'email' ? { email } : { phone };
  const destination = email || phone;
  const purpose = location.state?.purpose || 'registration';
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, '');
    if (!digit) return;
    const newOtp = [...otp];
    newOtp[index] = digit.slice(-1);
    setOtp(newOtp);
    if (index < OTP_LENGTH - 1 && digit) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const newOtp = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((digit, i) => {
      newOtp[i] = digit;
    });
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const redirectAfterVerify = (role) => {
    const from = location.state?.from;
    if (role === 'customer' && from?.pathname) {
      navigate(`${from.pathname}${from.search || ''}${from.hash || ''}`, {
        replace: true,
        state: location.state?.bookingServiceId
          ? { bookingServiceId: location.state.bookingServiceId }
          : undefined,
      });
      return;
    }

    switch (role) {
      case 'admin':
        navigate('/admin/analytics', { replace: true });
        break;
      case 'provider':
        navigate('/provider/dashboard', { replace: true });
        break;
      default:
        navigate('/customer/dashboard', { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      toast.error('Please enter the complete OTP');
      return;
    }
    if (!destination) {
      toast.error('Verification destination is missing. Please try again.');
      return;
    }
    setSubmitting(true);
    try {
      if (purpose === 'reset-password') {
        const result = await authService.verifyOtp({ phone, otp: code, purpose: 'reset-password' });
        const resetToken = result?.data?.resetToken;
        if (!resetToken) {
          throw new Error('Reset token missing from response');
        }
        toast.success('Phone verified! Please set a new password.');
        navigate('/auth/reset-password', { state: { token: resetToken } });
      } else {
        const result = await verifyOtp({ ...identity, otp: code, purpose });
        toast.success(`${channel === 'email' ? 'Email' : 'Phone'} verified successfully!`);
        redirectAfterVerify(result?.user?.role);
      }
    } catch (error) {
      toast.error(authErrorMessage(error, 'Invalid or expired OTP. Please request a new OTP.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!destination) {
      toast.error('Verification destination is missing. Please try again.');
      return;
    }
    try {
      if (purpose === 'login') {
        await authService.resendLoginOtp(identity);
      } else {
        await authService.resendOtp({ ...identity, purpose });
      }
      setCooldown(RESEND_COOLDOWN);
      toast.success(channel === 'email' ? 'OTP resent to your email.' : 'OTP resent to your phone.');
    } catch (error) {
      toast.error(authErrorMessage(error, 'Failed to resend OTP. Please try again.'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center mb-6">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Verify your {channel === 'email' ? 'email' : 'phone'}</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Enter the 6-digit OTP sent to <span className="font-medium text-ink-light dark:text-ink-dark">{destination || 'your contact'}</span>
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="h-14 w-12 sm:h-16 sm:w-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-ink-light dark:text-ink-dark focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  aria-label={`OTP digit ${index + 1}`}
                />
              ))}
            </div>

            <Button type="submit" fullWidth size="lg" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Continue'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Didn't receive the code?{' '}
              {cooldown > 0 ? (
                <span className="text-gray-400">Resend in {cooldown}s</span>
              ) : (
                <button
                  onClick={handleResend}
                  className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700"
                >
                  Resend OTP
                </button>
              )}
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/auth/register"
              className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to registration
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default OtpPage;