import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Phone, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import { authService } from '../../services/authService';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await authService.forgotPassword({ phone: data.phone });
      toast.success('OTP sent to your phone for password reset');
      navigate('/auth/otp', { state: { phone: data.phone, purpose: 'reset-password' } });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP. Please try again.');
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
          <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center mb-6">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Forgot Password</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Enter your phone number and we'll send you an OTP to reset your password
          </p>
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

            <Button type="submit" fullWidth size="lg" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  Send OTP
                  <ArrowRight className="h-4 w-4" />
                </>
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

export default ForgotPasswordPage;