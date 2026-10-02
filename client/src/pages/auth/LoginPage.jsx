import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import GoogleAuthButton from '../../components/auth/GoogleAuthButton';
import { authService } from '../../services/authService';
import { authErrorMessage } from '../../utils/authErrorMessage';

export function LoginPage() {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectAfterLogin = (role) => {
    const from = location.state?.from;
    if (from?.pathname && role === 'customer') {
      navigate(`${from.pathname}${from.search || ''}${from.hash || ''}`, {
        replace: true,
        state: location.state?.bookingServiceId
          ? { bookingServiceId: location.state.bookingServiceId }
          : undefined,
      });
      return;
    }
    navigate(
      role === 'admin' ? '/admin/analytics'
        : role === 'provider' ? '/provider/dashboard'
          : '/customer/dashboard',
      { replace: true }
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      const identity = { email: email.trim().toLowerCase() };
      await authService.requestLoginOtp(identity);
      toast.success('A login code has been sent.');
      navigate('/auth/otp', {
        state: { ...location.state, ...identity, channel: 'email', purpose: 'login' },
      });
    } catch (error) {
      toast.error(authErrorMessage(error, 'Could not continue. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleCredential = async (idToken) => {
    setSubmitting(true);
    try {
      const result = await googleLogin({ idToken });
      if (result.requiresRegistration) {
        navigate('/auth/register', {
          state: {
            ...location.state,
            googleRegistration: { idToken, email: result.email, name: result.name },
          },
        });
        return;
      }
      toast.success('Welcome to LocalFix!');
      redirectAfterLogin(result.user.role);
    } catch (error) {
      toast.error(authErrorMessage(error, 'Google sign-in failed. Try signing up if you are new.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 text-center lg:text-left">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">Sign in to LocalFix</h2>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Your trusted local services are just a step away.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">Email Address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700" />
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="min-h-14 rounded-xl pl-10"
            />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">We’ll email you a one-time verification code.</p>
        </div>

        <Button type="submit" fullWidth size="lg" disabled={submitting} className="!min-h-12 !rounded-xl !bg-emerald-700 !text-white hover:!bg-emerald-800">
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Please wait...</> : <>Send OTP <ArrowRight className="h-4 w-4" /></>}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />or continue with<span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>
      <GoogleAuthButton onCredential={handleGoogleCredential} disabled={submitting} />

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
        Don't have an account?{' '}
        <Link to="/auth/register" state={location.state} className="font-bold text-emerald-700 hover:underline dark:text-emerald-300">Sign Up</Link>
      </p>
      <p className="mt-3 text-center text-xs text-slate-400">
        <Link to="/auth/forgot-password" className="hover:text-emerald-700 hover:underline">Forgot your password?</Link>
      </p>
    </div>
  );
}

export default LoginPage;
