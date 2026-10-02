import { ArrowLeft, BadgeCheck, Home, MapPin, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useWebsiteSettings } from '../context/WebsiteSettingsContext';
import resolveAssetUrl from '../utils/assetUrl';
import authProviderIllustration from '../assets/auth-provider.svg';

const pageContent = {
  '/auth/login': {
    title: <>Welcome <span className="text-emerald-700">Back!</span></>,
    description: 'Log in to book services, manage your bookings, and get the best local services near you.',
  },
  '/auth/register': {
    title: <>Join <span className="text-emerald-700">LocalFix</span></>,
    description: 'Book trusted local services or offer your services and earn.',
  },
};

function ServiceIllustration({ imageUrl }) {
  return (
    <div className="relative mx-auto flex h-56 w-full max-w-md items-center justify-center sm:h-64 lg:h-[25rem]" aria-label="LocalFix home service professionals">
      <div className="absolute h-48 w-48 rounded-full bg-emerald-100 sm:h-64 sm:w-64" />
      <img
        src={imageUrl ? resolveAssetUrl(imageUrl) : authProviderIllustration}
        alt="LocalFix trusted local service professional"
        className="absolute z-[1] h-52 w-52 rounded-[2rem] border-8 border-white object-cover shadow-2xl sm:h-64 sm:w-64"
      />
      <div className="absolute right-[12%] top-[14%] h-16 w-16 rounded-2xl bg-white/90 shadow-lg sm:h-20 sm:w-20">
        <Home className="m-auto mt-4 h-8 w-8 text-emerald-700 sm:mt-5 sm:h-10 sm:w-10" />
      </div>
      <div className="absolute bottom-[12%] left-[8%] flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-white bg-emerald-600 shadow-xl sm:h-28 sm:w-28">
        <Wrench className="h-10 w-10 text-white sm:h-14 sm:w-14" />
      </div>
      <div className="relative flex h-40 w-40 items-center justify-center rounded-[2.5rem] border-8 border-white bg-gradient-to-br from-emerald-200 to-emerald-50 shadow-2xl sm:h-56 sm:w-56">
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-emerald-700 text-white sm:h-40 sm:w-40">
          <span className="text-4xl font-extrabold tracking-tight sm:text-6xl">LF</span>
          <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] sm:text-xs">Local expert</span>
        </div>
      </div>
      <div className="absolute bottom-[18%] right-[5%] flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white px-3 py-2.5 shadow-lg sm:right-0 sm:px-4 sm:py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50"><BadgeCheck className="h-5 w-5 text-emerald-700" /></span>
        <span className="text-xs font-bold text-slate-800 sm:text-sm">Trusted local experts</span>
      </div>
      <div className="absolute left-[12%] top-[10%] flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md sm:h-12 sm:w-12">
        <Sparkles className="h-5 w-5 text-emerald-700 sm:h-6 sm:w-6" />
      </div>
    </div>
  );
}

export function AuthLayout() {
  const location = useLocation();
  const { settings } = useWebsiteSettings();
  const heroImage = settings?.hero?.desktopImageUrl || settings?.hero?.mobileImageUrl;
  const fullWidthAuthFlow = [
    '/auth/otp',
    '/auth/forgot-password',
    '/auth/reset-password',
  ].includes(location.pathname);
  const content = pageContent[location.pathname] || {
    title: <>Local services, <span className="text-emerald-700">made easy.</span></>,
    description: 'A better way to find and manage trusted local professionals.',
  };

  return (
    <div className={`min-h-screen overflow-hidden text-slate-900 ${fullWidthAuthFlow ? 'bg-[#f8fcfa]' : 'bg-[#f8fcfa] dark:bg-slate-950 dark:text-white'}`}>
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-8 lg:px-12">
        <Link to="/" aria-label="Back to LocalFix home" className={`flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${fullWidthAuthFlow ? '' : 'dark:text-slate-200 dark:hover:bg-slate-800'}`}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Link to="/" className="flex flex-col items-center">
          <span className={`flex items-center gap-1.5 text-xl font-extrabold tracking-tight text-slate-900 ${fullWidthAuthFlow ? '' : 'dark:text-white'}`}>
            <MapPin className="h-7 w-7 fill-emerald-700 text-emerald-700" />
            <span>Local<span className="text-emerald-700 dark:text-emerald-400">Fix</span></span>
          </span>
          <span className={`mt-0.5 text-[11px] font-medium text-slate-500 ${fullWidthAuthFlow ? '' : 'dark:text-slate-400'}`}>Local Services, Made Easy</span>
        </Link>
        <span className="w-10" aria-hidden="true" />
      </header>

      <main className={fullWidthAuthFlow
        ? 'w-full'
        : 'mx-auto grid w-full max-w-7xl items-center gap-2 px-4 pb-10 sm:px-8 lg:min-h-[calc(100vh-4.5rem)] lg:grid-cols-[1fr_0.92fr] lg:gap-12 lg:px-12 lg:pb-16'}
      >
        {!fullWidthAuthFlow && <section className="mx-auto w-full max-w-xl lg:py-8">
          <div className="mx-auto max-w-lg lg:mx-0">
            {/* <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" /> Trusted professionals, close to home
            </p> */}
            <h1 className="text-center text-3xl font-extrabold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-left lg:text-5xl">
              {content.title}
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-center text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base lg:mx-0 lg:text-left">
              {content.description}
            </p>
          </div>
          <div className="hidden lg:block">
            <ServiceIllustration imageUrl={heroImage} />
            <div className="mx-auto grid max-w-lg grid-cols-3 divide-x divide-emerald-100 rounded-2xl border border-emerald-100 bg-white/90 px-3 py-4 shadow-sm dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900">
              {[
                ['Secure & Safe', 'Your data is protected'],
                ['Quick Access', 'Easy account access'],
                ['Book & Manage', 'All services in one place'],
              ].map(([title, detail]) => (
                <div key={title} className="px-2 text-center">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{title}</p>
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>}

        <section className={fullWidthAuthFlow ? 'w-full' : 'mx-auto w-full max-w-xl lg:max-w-lg'}>
          {fullWidthAuthFlow ? <Outlet /> : (
            <div className="rounded-[1.75rem] border border-emerald-50 bg-white p-5 shadow-[0_24px_70px_-35px_rgba(4,120,87,0.3)] dark:border-slate-800 dark:bg-slate-900 sm:p-8">
              <Outlet />
            </div>
          )}
          {!fullWidthAuthFlow && <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
            By continuing, you agree to LocalFix's <Link to="/terms" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300">Terms</Link> and <Link to="/privacy" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300">Privacy Policy</Link>.
          </p>}
        </section>
      </main>
    </div>
  );
}

export default AuthLayout;
