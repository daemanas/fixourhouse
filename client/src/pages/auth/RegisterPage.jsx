import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowRight, Loader2, Lock, Mail, Phone, Store, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LocationCascade from '../../components/common/LocationCascade';
import GoogleAuthButton from '../../components/auth/GoogleAuthButton';
import { authErrorMessage } from '../../utils/authErrorMessage';

const roles = [
  { value: 'customer', label: 'Customer', description: 'Book trusted local services', icon: UserRound },
  { value: 'provider', label: 'Provider', description: 'Offer your services and earn', icon: Store },
];

export function RegisterPage() {
  const { register: registerUser, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState('customer');
  const [pendingGoogle, setPendingGoogle] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locationData, setLocationData] = useState({
    country: 'India',
    state: '',
    district: '',
    city: '',
    countryId: '',
    stateId: '',
    districtId: '',
    cityId: '',
  });
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues: { email: location.state?.email || '' } });

  useEffect(() => {
    const googleRegistration = location.state?.googleRegistration;
    if (!googleRegistration) return;
    setPendingGoogle(googleRegistration);
    if (googleRegistration.name) setValue('name', googleRegistration.name);
  }, [location.state, setValue]);

  const formattedLocation = () => [locationData.city, locationData.district, locationData.state]
    .filter(Boolean)
    .join(', ');

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const identity = { email: data.email.trim().toLowerCase() };
      await registerUser({
        name: data.name,
        ...identity,
        channel: 'email',
        password: data.password,
        role,
        location: formattedLocation(),
        locationData,
      });
      toast.success('Please verify your email address.');
      navigate('/auth/otp', {
        state: { ...location.state, ...identity, channel: 'email', purpose: 'registration' },
      });
    } catch (error) {
      toast.error(authErrorMessage(error, 'Registration failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleCredential = async (idToken) => {
    setSubmitting(true);
    try {
      const result = await googleLogin({ idToken });
      if (result.requiresRegistration) {
        setPendingGoogle({
          idToken,
          email: result.email,
          name: result.name,
          avatar: result.avatar,
        });
        if (result.name) setValue('name', result.name);
        toast.success('Google verified. Add your phone number and account type to continue.');
        return;
      }
      toast.success('Welcome to LocalFix!');
      const userRole = result.user.role;
      const from = location.state?.from;
      if (from?.pathname && userRole === 'customer') {
        navigate(`${from.pathname}${from.search || ''}${from.hash || ''}`, { replace: true });
        return;
      }
      navigate(
        userRole === 'admin' ? '/admin/analytics'
          : userRole === 'provider' ? '/provider/dashboard'
            : '/customer/dashboard',
        { replace: true }
      );
    } catch (error) {
      toast.error(authErrorMessage(error, 'Google sign-up failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const completeGoogleRegistration = async () => {
    const values = getValues();
    const phone = String(values.phone || '').replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(phone)) {
      toast.error('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await googleLogin({
        idToken: pendingGoogle.idToken,
        role,
        name: values.name || pendingGoogle.name,
        phone,
        location: formattedLocation(),
        locationData,
      });
      toast.success('Welcome to LocalFix!');
      const userRole = result.user.role;
      const from = location.state?.from;
      if (from?.pathname && userRole === 'customer') {
        navigate(`${from.pathname}${from.search || ''}${from.hash || ''}`, { replace: true });
      } else {
        navigate(userRole === 'provider' ? '/provider/dashboard' : '/customer/dashboard', { replace: true });
      }
    } catch (error) {
      toast.error(authErrorMessage(error, 'Google sign-up failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-5 text-center lg:text-left">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">Create your account</h2>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Choose how you want to use LocalFix.</p>
      </div>

      <form
        onSubmit={pendingGoogle ? (event) => event.preventDefault() : handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <fieldset>
          <legend className="mb-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200">I want to join as</legend>
          <div className="grid grid-cols-2 gap-3">
            {roles.map(({ value, label, description, icon: Icon }) => {
              const selected = role === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  aria-pressed={selected}
                  className={`min-h-28 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:p-4 ${
                    selected
                      ? 'border-emerald-600 bg-emerald-50 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/40'
                      : 'border-slate-200 bg-white hover:border-emerald-200 dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${selected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">{label}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">{description}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="register-name" className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">Full Name</label>
          <Input
            id="register-name"
            autoComplete="name"
            placeholder={role === 'provider' ? 'Your name or business contact' : 'Your full name'}
            className="min-h-12 rounded-xl"
            {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } })}
          />
          {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
        </div>

        {pendingGoogle && <div>
          <label htmlFor="register-phone" className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">Phone Number</label>
          <div className="flex min-h-12 overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950">
            <span className="flex items-center gap-2 border-r border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><Phone className="h-4 w-4 text-emerald-700" />+91</span>
            <Input
              id="register-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              placeholder="10 digit mobile number"
              className="min-h-12 rounded-none border-0 px-3 shadow-none focus:ring-0"
              {...register('phone', {
                required: 'Phone number is required',
                validate: (value) => /^[6-9]\d{9}$/.test(String(value || '').replace(/\D/g, ''))
                  || 'Enter a valid 10-digit Indian mobile number',
                setValueAs: (value) => String(value || '').replace(/\D/g, '').slice(-10),
              })}
            />
          </div>
          {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone.message}</p>}
        </div>}

        {!pendingGoogle && <div>
          <label htmlFor="register-email" className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">Email Address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700" />
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="min-h-12 rounded-xl pl-10"
              {...register('email', {
                required: 'Email address is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
              })}
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
        </div>}

        {!pendingGoogle && <div>
          <label htmlFor="register-password" className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="Create a password"
              className="min-h-12 rounded-xl pl-10"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
            />
          </div>
          {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>}
        </div>}

        <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">Location <span className="font-normal text-slate-400">(Optional)</span></p>
          <LocationCascade value={locationData} onChange={setLocationData} className="!grid-cols-1 sm:!grid-cols-2" />
        </div>

        {pendingGoogle ? (
          <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              Verified Google email: {pendingGoogle.email}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Choose your account type above and provide your required phone number.</p>
            <Button type="button" fullWidth size="lg" disabled={submitting} onClick={completeGoogleRegistration} className="!min-h-12 !rounded-xl !bg-emerald-700 !text-white hover:!bg-emerald-800">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</> : <>Complete Google Sign Up <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </div>
        ) : (
          <Button type="submit" fullWidth size="lg" disabled={submitting} className="!min-h-12 !rounded-xl !bg-emerald-700 !text-white hover:!bg-emerald-800">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending verification code...</> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
          </Button>
        )}
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />or continue with<span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>
      <GoogleAuthButton
        onCredential={handleGoogleCredential}
        disabled={submitting}
      />

      <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-300">
        Already have an account?{' '}
        <Link to="/auth/login" state={location.state} className="font-bold text-emerald-700 hover:underline dark:text-emerald-300">Sign In</Link>
      </p>
    </div>
  );
}

export default RegisterPage;
