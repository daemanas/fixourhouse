import { Outlet, Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/auth-pattern.svg')] opacity-10" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Wrench className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold">LocalFix</span>
          </Link>

          <div>
            <h1 className="text-4xl font-bold leading-tight">
              Trusted local services,
              <br />
              right at your doorstep.
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Book verified professionals for home, beauty, repair and more — all in one place.
            </p>
          </div>

          <div className="space-y-4">
            {[
              'Verified & background-checked providers',
              'Transparent pricing, no hidden charges',
              'Secure payments & easy cancellation',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-white" />
                <span className="text-sm text-white/90">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-ink-light dark:text-ink-dark">
              Local<span className="text-primary-600 dark:text-primary-400">Fix</span>
            </span>
          </Link>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;