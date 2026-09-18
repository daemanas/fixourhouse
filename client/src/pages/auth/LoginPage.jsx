import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Phone, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const redirectAfterLogin = (role) => {
    const from = location.state?.from?.pathname;
    if (from) {
      navigate(from, { replace: true });
      return;
    }
    switch (role) {
      case 'admin':
        navigate('/admin/dashboard', { replace: true });
        break;
      case 'provider':
        navigate('/provider/dashboard', { replace: true });
        break;
      default:
        navigate('/customer/dashboard', { replace: true });
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const result = await login({ phone: data.phone, password: data.password });
      toast.success('Welcome back!');
      redirectAfterLogin(result.user.role);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
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
          <Link to="/" className="inline-block">
            <span className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              LocalFix
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-ink-light dark:text-ink-dark">Welcome back</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Sign in to continue to your account</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="pl-10"
                  {...register('phone', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^[+]?[0-9]{10,15}$/,
                      message: 'Enter a valid phone number',
                    },
                  })}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Remember me
              </label>
              <Link
                to="/auth/forgot-password"
                className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" fullWidth size="lg" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                to="/auth/register"
                className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700"
              >
                Register now
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default LoginPage;