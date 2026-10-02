import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  Clock3,
  Edit3,
  LockKeyhole,
  MailCheck,
  RotateCw,
  ShieldCheck,
  Zap,
  Sparkles,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { authErrorMessage } from '../../utils/authErrorMessage';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

const editRouteFor = (purpose) => {
  if (purpose === 'reset-password') return '/auth/forgot-password';
  return purpose === 'registration' ? '/auth/register' : '/auth/login';
};

export function OtpPage() {
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const email = String(location.state?.email || '').trim().toLowerCase();
  const purpose = location.state?.purpose || 'registration';

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  const inputRefs = useRef([]);

  // Timer countdown logic
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Initial Auto Focus
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const redirectAfterVerify = useCallback(
    (role) => {
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
      navigate(
        role === 'admin'
          ? '/admin/analytics'
          : role === 'provider'
          ? '/provider/dashboard'
          : '/customer/dashboard',
        { replace: true }
      );
    },
    [location.state, navigate]
  );

  const handleVerify = useCallback(
    async (codeToSubmit) => {
      const code = codeToSubmit || otp.join('');
      if (!email) {
        toast.error('Email address is missing. Please restart verification.');
        navigate(editRouteFor(purpose), { replace: true });
        return;
      }
      if (code.length !== OTP_LENGTH) {
        toast.error('Please enter the complete 6-digit code.');
        return;
      }

      setSubmitting(true);
      try {
        if (purpose === 'reset-password') {
          const result = await authService.verifyOtp({ email, otp: code, purpose });
          const resetToken = result?.data?.resetToken;
          if (!resetToken) throw new Error('Reset token missing from response');
          toast.success('Email verified! Create your new password.');
          navigate('/auth/reset-password', { state: { token: resetToken }, replace: true });
        } else {
          const result = await verifyOtp({ email, otp: code, purpose });
          toast.success('Email verified successfully!');
          redirectAfterVerify(result?.user?.role);
        }
      } catch (error) {
        toast.error(authErrorMessage(error, 'Invalid or expired code. Please try again.'));
        inputRefs.current[0]?.focus();
      } finally {
        setSubmitting(false);
      }
    },
    [email, navigate, otp, purpose, redirectAfterVerify, verifyOtp]
  );

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const updatedOtp = [...otp];
    updatedOtp[index] = digit;
    setOtp(updatedOtp);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === OTP_LENGTH - 1) {
      const fullCode = updatedOtp.join('');
      if (fullCode.length === OTP_LENGTH) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pastedData) return;

    const digits = pastedData.split('');
    const newOtp = Array(OTP_LENGTH).fill('');
    digits.forEach((digit, i) => {
      newOtp[i] = digit;
    });
    setOtp(newOtp);

    const targetFocusIndex = Math.min(digits.length, OTP_LENGTH - 1);
    inputRefs.current[targetFocusIndex]?.focus();

    if (digits.length === OTP_LENGTH) {
      handleVerify(digits.join(''));
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('Email address is missing. Please restart verification.');
      return;
    }
    setResending(true);
    try {
      if (purpose === 'login') {
        await authService.resendLoginOtp({ email });
      } else {
        await authService.resendOtp({ email, purpose });
      }
      setOtp(Array(OTP_LENGTH).fill(''));
      setCooldown(RESEND_COOLDOWN);
      toast.success('New verification code sent to your email');
      inputRefs.current[0]?.focus();
    } catch (error) {
      toast.error(authErrorMessage(error, 'Could not resend the code. Please try again.'));
    } finally {
      setResending(false);
    }
  };

  const editEmail = () => navigate(editRouteFor(purpose), { state: { ...location.state, email } });
  const formattedCooldown = `00:${String(cooldown).padStart(2, '0')}`;

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl lg:grid lg:grid-cols-12">
        
        {/* Left Side Visual Banner (Desktop / Laptop Specific) */}
        <div className="relative hidden lg:col-span-5 lg:flex lg:flex-col lg:justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-10 text-white overflow-hidden">
          {/* Ambient Lighting & Glows */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />

          {/* Top Badge */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-400 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Two-Factor Security</span>
            </div>
          </div>

          {/* Middle Content */}
          <div className="relative z-10 my-auto py-8">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
              <KeyRound className="h-8 w-8" />
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-white xl:text-4xl">
              Protecting Your Account Access
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 xl:text-base">
              We take privacy and security seriously. Enter the verification code sent to your registered email to continue.
            </p>

            {/* Feature List */}
            <div className="mt-8 space-y-3">
              {[
                'Encrypted authentication process',
                'One-time use validation code',
                'Automated session control',
              ].map((text) => (
                <div key={text} className="flex items-center gap-3 text-sm text-slate-200">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Footer Details */}
          <div className="relative z-10 border-t border-white/10 pt-6">
            <p className="text-xs text-slate-400">
              Need help? Contact support if you do not receive the email within a few minutes.
            </p>
          </div>
        </div>

        {/* Right Side OTP Verification Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-14 flex flex-col justify-center">
          
          {/* Header */}
          <div className="mb-8 text-center sm:text-left">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 lg:hidden">
              <MailCheck className="h-6 w-6" />
            </div>
            
            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl lg:text-3xl">
              Verify Your Email
            </h1>
            
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Enter the 6-digit verification code sent to
            </p>

            {/* Email Edit Chip */}
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-100/80 px-3.5 py-1.5 border border-slate-200/60 transition hover:bg-slate-200/60">
              <span className="font-mono text-sm font-semibold text-slate-800 break-all">
                {email || 'your email address'}
              </span>
              <button
                type="button"
                onClick={editEmail}
                aria-label="Edit email address"
                className="rounded-lg p-1 text-slate-500 hover:bg-white hover:text-emerald-700 transition"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }}>
            {/* Input Grid */}
            <div className="flex items-center justify-between gap-2 sm:gap-3 lg:gap-4" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  aria-label={`Digit ${index + 1}`}
                  className={`h-14 w-full sm:h-16 lg:h-18 rounded-2xl border-2 text-center text-2xl font-bold text-slate-900 outline-none transition-all duration-200 ${
                    digit
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  } focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10`}
                />
              ))}
            </div>

            {/* Resend & Timer Area */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm border-t border-slate-100 pt-6">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span>Didn&apos;t receive the code?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending}
                  className="inline-flex items-center gap-1 font-bold text-emerald-600 transition hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {resending ? 'Sending...' : 'Resend Code'}
                  <RotateCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {cooldown > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock3 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Resend in <strong className="font-mono font-semibold text-slate-700">{formattedCooldown}</strong></span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={submitting || !email || otp.join('').length !== OTP_LENGTH}
              className="!mt-8 !h-14 !rounded-2xl !bg-emerald-600 !text-base !font-bold !text-white shadow-lg shadow-emerald-600/20 hover:!bg-emerald-700 transition-all disabled:!opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <RotateCw className="h-5 w-5 animate-spin" />
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Verify & Continue
                  <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>
          </form>

          {/* Desktop Footer Features */}
          <div className="mt-10 grid grid-cols-3 gap-3 border-t border-slate-100 pt-6">
            {[
              { icon: ShieldCheck, label: 'Protected' },
              { icon: Zap, label: 'Fast Verification' },
              { icon: LockKeyhole, label: 'Private Data' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                <Icon className="h-4 w-4 text-emerald-600" />
                <span>{label}</span>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}

export default OtpPage;