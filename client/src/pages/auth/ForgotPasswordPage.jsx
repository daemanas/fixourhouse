import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Check, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { authService } from '../../services/authService';
import { authErrorMessage } from '../../utils/authErrorMessage';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: location.state?.email || '' } });

  const onSubmit = async ({ email: submittedEmail }) => {
    const email = submittedEmail.trim().toLowerCase();
    setSubmitting(true);
    try {
      await authService.forgotPassword({ email });
      toast.success('Verification code sent to your email.');
      navigate('/auth/otp', {
        state: { email, channel: 'email', purpose: 'reset-password' },
      });
    } catch (error) {
      toast.error(authErrorMessage(error, 'Could not send the verification code. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[calc(100vh-5.5rem)] w-full max-w-5xl items-center gap-8 px-4 py-8 sm:px-8 md:grid-cols-[0.9fr_1.1fr] lg:gap-14">
      <section className="relative hidden min-h-[28rem] overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-8 md:flex md:flex-col md:justify-between lg:p-10">
        <div className="absolute -right-14 -top-16 h-56 w-56 rounded-full bg-emerald-100/80" />
        <div className="absolute -bottom-20 -left-10 h-60 w-60 rounded-full bg-emerald-200/50" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-lg">
          <LockKeyhole className="h-8 w-8" />
        </div>
        <div className="relative mx-auto my-10 flex h-48 w-56 items-center justify-center">
          <div className="absolute h-44 w-44 rounded-full bg-emerald-100" />
          <div className="relative flex h-32 w-40 items-center justify-center rounded-2xl border border-emerald-100 bg-white shadow-xl">
            <div className="space-y-3">
              <div className="h-2 w-24 rounded-full bg-emerald-100" />
              <div className="h-2 w-28 rounded-full bg-slate-100" />
              <div className="h-2 w-20 rounded-full bg-slate-100" />
            </div>
            <span className="absolute -bottom-5 -right-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-emerald-700 text-white shadow-lg">
              <Mail className="h-6 w-6" />
            </span>
          </div>
          <span className="absolute left-3 top-7 h-3 w-3 rounded-full bg-emerald-500" />
          <span className="absolute right-0 top-4 h-2 w-2 rounded-full bg-emerald-400" />
        </div>
        <div className="relative rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-[#101d42]">Your account, protected</p>
              <p className="mt-1 text-sm leading-5 text-slate-500">We&apos;ll email a one-time code so you can securely reset your password.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-lg rounded-[2rem] border border-emerald-50 bg-white p-6 shadow-[0_24px_70px_-35px_rgba(4,120,87,0.3)] sm:p-10">
        <Link
          to="/auth/login"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>
        <div className="mb-8">
          <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 md:hidden">
            <Mail className="h-6 w-6" />
          </span>
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Account recovery</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#101d42] sm:text-4xl">Forgot Password?</h1>
          <p className="mt-3 text-base leading-7 text-slate-500">
            Enter the email address associated with your LocalFix account and we&apos;ll send you a verification code.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="forgot-email" className="mb-2 block text-sm font-bold text-[#101d42]">Email Address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-700" />
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="your@email.com"
                className="!min-h-14 !rounded-xl !border-slate-200 !pl-12 focus:!border-emerald-600 focus:!ring-emerald-100"
                {...register('email', {
                  required: 'Email address is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
                })}
              />
            </div>
            {errors.email && <p className="mt-1.5 text-sm text-rose-600">{errors.email.message}</p>}
          </div>
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={submitting}
            className="!min-h-14 !rounded-full !bg-emerald-700 !text-base !font-bold !text-white hover:!bg-emerald-800"
          >
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" />Sending verification code...</>
              : <>Send Verification Code <ArrowRight className="ml-1 h-5 w-5" /></>}
          </Button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-sm text-slate-500">
          <Check className="h-4 w-4 text-emerald-700" />
          <span>Your email is only used to verify your account.</span>
        </div>
      </section>
    </div>
  );
}

export default ForgotPasswordPage;
