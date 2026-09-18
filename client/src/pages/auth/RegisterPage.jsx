import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Phone, Lock, User, Eye, EyeOff, ArrowRight, Loader2, UserCircle, Wrench } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

const roles = [
  { value: 'customer', label: 'Customer', description: 'Book trusted local services', icon: User },
  { value: 'provider', label: 'Provider', description: 'Offer your services and earn', icon: Wrench },
];

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await registerUser({
        name: data.name,
        phone: data.phone,
        password: data.password,
        role,
      });
      toast.success('Account created! Please verify your phone number.');
      navigate('/auth/otp', { state: { phone: data.phone } });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
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
          <h1 className="mt-6 text-2xl font-bold text-ink-light dark:text-ink-dark">Create your account</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Join LocalFix today</p>
        </div>

        <Card className="p-8">
          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-3">
              I want to join as
            </label>
            <div className="grid grid-cols-2 gap-4">
              {roles.map((r) => {
                const Icon = r.icon;
                const selected = role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className={`h-6 w-6 mb-2 ${selected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} />
                    <p className="font-medium text-sm text-ink-light dark:text-ink-dark">{r.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{r.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Your full name"
                  className="pl-10"
                  {...register('name', {
                    required: 'Name is required',
                    minLength: { value: 2, message: 'Name must be at least 2 characters' },
                  })}
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">Phone Number</label>
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
              <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
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

            <Button type="submit" fullWidth size="lg" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                to="/auth/login"
                className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700"
              >
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default RegisterPage;