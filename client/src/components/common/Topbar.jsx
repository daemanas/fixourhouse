import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, MapPin, Menu, Search } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import NotificationMenu from './NotificationMenu';

export function Topbar({ title, subtitle, onMenuClick, showSearch = false, compact = false, customerDashboard = false, hideMenuButton = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const locationData = user?.locationData || {};
  const savedCity = [locationData.city, locationData.state].filter(Boolean).join(', ') || user?.location || 'Add your location';
  const savedArea = [locationData.area || locationData.address, locationData.district]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(', ') || (user?.location ? 'Saved service location' : 'Set your service location');

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-border-light dark:border-border-dark">
      <div className={`flex items-center justify-between ${compact ? 'h-14 px-4' : customerDashboard ? 'h-16 px-3 sm:px-4' : 'h-16 px-4 sm:px-6 lg:px-8'}`}>
        <div className={`flex min-w-0 items-center ${customerDashboard ? 'gap-2 sm:gap-3' : 'gap-4'}`}>
          {!hideMenuButton && <button
            onClick={onMenuClick}
            className={`${compact ? '' : 'lg:hidden'} p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300`}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>}
          {customerDashboard ? (
            <button type="button" onClick={() => navigate('/customer/profile')} aria-label={`Change service location. Current location: ${savedCity}`} className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:hover:bg-gray-800 sm:gap-3">
              <MapPin className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block max-w-[32vw] truncate text-sm font-semibold text-slate-900 dark:text-white sm:max-w-sm">{savedCity}</span>
                <span className="hidden max-w-sm truncate text-xs text-slate-500 dark:text-gray-400 sm:block">{savedArea}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            </button>
          ) : !compact && <div>
            <h1 className="text-lg font-semibold text-ink-light dark:text-ink-dark">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {showSearch && !compact && !customerDashboard && (
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="input pl-10 w-64"
              />
            </div>
          )}
          <NotificationMenu />
          {!isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link to="/auth/login" state={{ from: location }} className="rounded-lg px-2 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
                Login
              </Link>
              <Link to="/auth/register" state={{ from: location }} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
                Sign Up
              </Link>
            </div>
          ) : customerDashboard && (
            <Link to="/customer/profile" aria-label="Open customer profile" className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
              <Avatar src={user?.avatar} name={user?.name || 'Customer'} size="sm" alt="Customer profile" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
