import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  UsersRound,
  Zap,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const securityCards = [
  { title: 'Secure & Encrypted', description: 'Your data is protected', icon: ShieldCheck },
  { title: 'Quick Access', description: 'Get insights instantly', icon: Zap },
  { title: 'Authorized Only', description: 'Admin access required', icon: LockKeyhole },
];

function Brand() {
  return (
    <Link to="/admin/login" className="inline-flex items-center gap-2.5" aria-label="LocalFix Admin Login">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
        <MapPin className="h-6 w-6 fill-emerald-700 stroke-white" aria-hidden="true" />
      </span>
      <span className="text-[26px] font-extrabold tracking-tight text-[#101a3b]">
        Local<span className="text-emerald-700">Fix</span>
      </span>
    </Link>
  );
}

function AdminPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="absolute -inset-8 rounded-full bg-emerald-200/50 blur-3xl" aria-hidden="true" />
      <div className="relative rotate-1 rounded-[28px] border border-white/80 bg-white/90 p-3 shadow-[0_26px_70px_-28px_rgba(8,75,53,0.45)] backdrop-blur">
        <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-[#f7fafc]">
          <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-white px-4">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#101a3b]"><MapPin className="h-3.5 w-3.5 text-emerald-700" />LocalFix</span>
            <span className="flex items-center gap-2 text-[10px] font-semibold text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Admin</span>
          </div>
          <div className="grid grid-cols-[86px_1fr] sm:grid-cols-[112px_1fr]">
            <div className="space-y-3 bg-white p-3">
              {['Dashboard', 'Providers', 'Customers', 'Bookings', 'Services', 'Reviews', 'Analytics'].map((item, index) => (
                <div key={item} className={`flex items-center gap-1.5 text-[8px] font-semibold ${index === 0 ? 'rounded-md bg-emerald-700 px-1.5 py-1.5 text-white' : 'px-1.5 text-slate-500'}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />{item}
                </div>
              ))}
            </div>
            <div className="space-y-3 p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Total Providers', value: '245', icon: UsersRound, color: 'text-emerald-700 bg-emerald-50' },
                  { label: 'Total Bookings', value: '1,320', icon: CalendarDays, color: 'text-orange-600 bg-orange-50' },
                  { label: 'Total Revenue', value: '₹2,45,680', icon: BarChart3, color: 'text-emerald-700 bg-emerald-50' },
                  { label: 'Customers', value: '890', icon: UsersRound, color: 'text-fuchsia-600 bg-fuchsia-50' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-100 bg-white p-2 shadow-sm sm:p-2.5">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${color}`}><Icon className="h-3.5 w-3.5" /></span>
                    <span className="min-w-0"><span className="block truncate text-[7px] text-slate-500 sm:text-[8px]">{label}</span><span className="block truncate text-[10px] font-extrabold text-[#101a3b] sm:text-xs">{value}</span></span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between text-[9px] font-bold text-[#101a3b]"><span>Booking Trends</span><span className="font-medium text-slate-400">This Month⌄</span></div>
                <svg viewBox="0 0 360 76" className="mt-2 h-16 w-full" role="img" aria-label="Rising bookings trend">
                  <path d="M0 62 C22 58 20 38 47 46 S77 68 102 42 S142 48 169 35 S205 62 231 30 S267 44 291 28 S329 39 360 11" fill="none" stroke="#10a66f" strokeWidth="3" />
                  <path d="M0 62 C22 58 20 38 47 46 S77 68 102 42 S142 48 169 35 S205 62 231 30 S267 44 291 28 S329 39 360 11 V76 H0Z" fill="url(#area)" />
                  <defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#10a66f" stopOpacity=".18" /><stop offset="1" stopColor="#10a66f" stopOpacity="0" /></linearGradient></defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-4 -left-4 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-emerald-100 text-emerald-800 shadow-md sm:-left-7 sm:h-20 sm:w-20">
        <ShieldCheck className="h-10 w-10" aria-hidden="true" />
      </div>
      <div className="absolute -right-2 top-6 flex h-12 w-12 items-center justify-center rounded-2xl border-4 border-white bg-white text-emerald-700 shadow-md sm:-right-5 sm:h-14 sm:w-14">
        <BarChart3 className="h-7 w-7" aria-hidden="true" />
      </div>
    </div>
  );
}

export function AdminLoginPage() {
  const { login, isAuthenticated, loading } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && isAuthenticated) navigate('/admin/dashboard', { replace: true });
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f3fbf7]"><span className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent" aria-label="Checking admin session" /></div>;
  }
  if (isAuthenticated) return <Navigate to="/admin/dashboard" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      setPassword('');
      navigate('/admin/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_75%_8%,#d9f5e9_0%,transparent_38%),linear-gradient(145deg,#f9fcff_0%,#f1faf6_54%,#fff_100%)] px-4 pb-10 pt-6 sm:px-8 sm:pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] overflow-hidden" aria-hidden="true">
        <div className="absolute -right-20 -top-36 h-[400px] w-[400px] rounded-full bg-emerald-100/65 blur-2xl" />
        <div className="absolute right-[20%] top-40 h-44 w-44 rounded-full bg-white/80 blur-2xl" />
        <div className="absolute -left-24 top-80 h-56 w-56 rounded-full bg-emerald-50 blur-2xl" />
      </div>
      <div className="relative mx-auto max-w-7xl">
        <header className="mb-8 sm:mb-10"><Brand /></header>

        <section className="grid items-center gap-10 pb-7 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:pb-10">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-600" /> LocalFix Control Center
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-[#101a3b] sm:text-5xl lg:text-[58px]">
              Admin <span className="text-emerald-700">Panel</span>
            </h1>
            <p className="mt-4 max-w-md text-lg font-medium leading-relaxed text-slate-500 sm:text-xl">
              Manage, Monitor, and Grow Your Platform
            </p>
            <div className="mt-6 hidden space-y-4 sm:block">
              {[
                { title: 'Manage Providers', text: 'Approve, verify and monitor', icon: UsersRound },
                { title: 'Track Bookings', text: 'Real-time booking management', icon: CalendarDays },
                { title: 'Platform Analytics', text: 'Insights for better decisions', icon: BarChart3 },
              ].map(({ title, text, icon: Icon }) => (
                <div key={title} className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><Icon className="h-6 w-6" aria-hidden="true" /></span>
                  <span><span className="block font-bold text-[#101a3b]">{title}</span><span className="mt-0.5 block text-sm text-slate-500">{text}</span></span>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden py-2 lg:block"><AdminPreview /></div>
        </section>

        <section className="relative mx-auto max-w-4xl rounded-[28px] border border-white bg-white/95 px-5 py-7 shadow-[0_24px_80px_-32px_rgba(17,66,51,0.28)] backdrop-blur sm:px-10 sm:py-9 lg:px-12">
          <div className="mx-auto max-w-2xl">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#101a3b] sm:text-4xl">Admin <span className="text-emerald-700">Login</span></h2>
              <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">Sign in to access the LocalFix Admin Panel</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-3.5 sm:mt-7 sm:space-y-4">
              <div>
                <label htmlFor="admin-email" className="sr-only">Email Address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email Address"
                    className="min-h-[62px] w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base font-medium text-[#101a3b] outline-none transition placeholder:text-slate-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="admin-password" className="sr-only">Password</label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input
                    id="admin-password"
                    type={passwordVisible ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    className="min-h-[62px] w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-base font-medium text-[#101a3b] outline-none transition placeholder:text-slate-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />
                  <button type="button" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? 'Hide password' : 'Show password'} aria-pressed={passwordVisible} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
                    {passwordVisible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <Link to="/admin/forgot-password" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 hover:underline">Forgot password?</Link>
              </div>
              {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</p>}
              <button type="submit" disabled={submitting} className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-emerald-700 to-emerald-600 px-6 text-lg font-bold text-white shadow-[0_12px_24px_-12px_rgba(4,120,87,0.72)] transition hover:from-emerald-800 hover:to-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-70">
                {submitting ? 'Signing in…' : <>Sign In <ArrowRight className="h-5 w-5" aria-hidden="true" /></>}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs font-semibold text-slate-500 sm:my-7">
              <span className="h-px flex-1 bg-slate-200" />Secure Admin Access<span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-0">
              {securityCards.map(({ title, description, icon: Icon }, index) => (
                <div key={title} className={`flex items-center gap-3 px-1 sm:px-3 ${index > 0 ? 'sm:border-l sm:border-slate-200 sm:pl-4' : ''}`}>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"><Icon className="h-6 w-6" aria-hidden="true" /></span>
                  <span><span className="block text-xs font-bold text-[#101a3b]">{title}</span><span className="mt-0.5 block text-[11px] text-slate-500">{description}</span></span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AdminLoginPage;
