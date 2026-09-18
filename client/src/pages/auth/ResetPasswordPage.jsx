import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import { authService } from '../../services/authService';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = location.state?.token || '';
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password', '');

  const onSubmit = async (data) => {
    if (!token) {
      toast.error('Reset token is missing. Please request a new OTP.');
      return;
    }
    setSubmitting(true);
    try {
      await authService.resetPassword({ token, password: data.password });
      setResetComplete(true);
      toast.success('Password reset successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (resetComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 text-center">
            <div className="h-16 w-16 mx-auto rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-success-600 dark:text-success-400" />
            </div>
            <h2 className="text-xl font-bold text-ink-light dark:text-ink-dark">Password Reset Complete</h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <Button className="mt-6" fullWidth size="lg" onClick={() => navigate('/auth/login')}>
              Go to Login
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

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
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Reset Password</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Create a new password for your account</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
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

            <div>
              <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  className="pl-10 pr-10"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) => value === password || 'Passwords do not match',
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" fullWidth size="lg" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Remembered your password?{' '}
              <Link
                to="/auth/login"
                className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700"
              >
                Back to login
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default ResetPasswordPage;