import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Clock3,
  FileText,
  LogOut,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Avatar from '../ui/Avatar';
import BrandLockup from './BrandLockup';
import { getMyProviderProfile, getProviderStats } from '../../services/providerService';
import { getMyReviews } from '../../services/reviewService';
import { useNotifications } from '../../context/NotificationContext';

const getVerificationPresentation = (provider) => {
  const status = String(provider?.verificationStatus || '').toLowerCase();
  if (status === 'rejected') {
    return { label: 'Verification Rejected', icon: CircleAlert, className: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' };
  }
  if (status === 'pending') {
    return { label: 'Verification Pending', icon: Clock3, className: 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300' };
  }
  if (provider?.isVerified === true || ['approved', 'verified'].includes(status)) {
    return { label: 'Verified Provider', icon: BadgeCheck, className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' };
  }
  return { label: 'Verification Required', icon: CircleAlert, className: 'bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' };
};

const providerNavigationGroups = [
  { heading: null, labels: ['Dashboard'] },
  { heading: 'Booking Management', labels: ['Booking Requests', 'My Jobs', 'Availability'] },
  { heading: 'Service Management', labels: ['Services', 'Gallery'] },
  { heading: 'Earnings', labels: ['Earnings', 'Transactions'] },
  { heading: 'Customer Interactions', labels: ['Reviews', 'Notifications'] },
  { heading: 'Account', labels: ['Profile', 'Settings'] },
];

export function Sidebar({ items, isOpen, onClose, desktopOnly = false }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState({});
  const [collapsed, setCollapsed] = useState(false);
  const [providerProfile, setProviderProfile] = useState(null);
  const [providerCounts, setProviderCounts] = useState({ pendingBookings: null, reviews: null });
  const isProvider = user?.role === 'provider';
  const sidebarCollapsed = isProvider && collapsed;

  const refreshProviderSidebar = useCallback(async () => {
    if (!isProvider) return;
    const [profileResult, statsResult, reviewsResult] = await Promise.allSettled([
      getMyProviderProfile(),
      getProviderStats(),
      getMyReviews({ page: 1, limit: 1 }),
    ]);
    if (profileResult.status === 'fulfilled') {
      setProviderProfile(profileResult.value.data?.data?.provider || null);
    }
    setProviderCounts((current) => ({
      pendingBookings: statsResult.status === 'fulfilled'
        ? Number(statsResult.value.data?.data?.stats?.pendingBookings || 0)
        : current.pendingBookings,
      reviews: reviewsResult.status === 'fulfilled'
        ? Number(reviewsResult.value.data?.data?.totalReviews || 0)
        : current.reviews,
    }));
  }, [isProvider]);

  useEffect(() => {
    refreshProviderSidebar();
    if (!isProvider) return undefined;
    window.addEventListener('focus', refreshProviderSidebar);
    return () => window.removeEventListener('focus', refreshProviderSidebar);
  }, [isProvider, location.pathname, refreshProviderSidebar]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getRoleLabel = () => {
    if (user?.role === 'admin') return 'Administrator';
    if (user?.role === 'provider') return 'Service Provider';
    return 'Customer';
  };

  const providerItemByLabel = new Map(items.map((item) => [item.label, item]));
  const providerBadges = {
    'Booking Requests': providerCounts.pendingBookings,
    Reviews: providerCounts.reviews,
    Notifications: unreadCount,
  };
  const displayLabels = {
    'Booking Requests': 'Bookings',
    Earnings: 'Earnings & Wallet',
    Transactions: 'Payout History',
  };

  const renderNavItem = (item, label = item.label, badgeCount = null) => (
    <NavLink
      key={`${item.to}-${label}`}
      to={item.to}
      onClick={onClose}
      title={sidebarCollapsed ? label : undefined}
      aria-label={label}
      className={({ isActive }) => `relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''} ${isActive ? 'bg-sky-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}
    >
      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className={`min-w-0 flex-1 truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{label}</span>
      {badgeCount > 0 && (
        <span className={`${sidebarCollapsed ? 'lg:absolute lg:right-0 lg:top-0' : ''} flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-50 px-1.5 text-[10px] font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300`}>
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
      {!sidebarCollapsed && <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />}
    </NavLink>
  );

  const verification = getVerificationPresentation(providerProfile);
  const VerificationIcon = verification.icon;
  const providerName = user?.name || providerProfile?.userId?.name || providerProfile?.businessName || 'Provider';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && !desktopOnly && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`${desktopOnly ? 'hidden lg:sticky lg:flex' : 'fixed lg:sticky'} top-0 left-0 z-50 h-screen w-72 ${sidebarCollapsed ? 'lg:w-[84px]' : 'lg:w-72'} bg-white dark:bg-gray-900 border-r border-border-light dark:border-border-dark flex-col transition-all duration-300 lg:translate-x-0 ${desktopOnly ? '' : isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className={`flex h-16 items-center border-b border-border-light dark:border-border-dark ${sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
          <NavLink to="/" className={`flex items-center gap-2 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            <BrandLockup textClassName="text-ink-light dark:text-ink-dark" />
          </NavLink>
          <div className="flex items-center gap-1">
            {isProvider && <button onClick={() => setCollapsed((value) => !value)} className="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:flex" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>}
            <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden" aria-label="Close sidebar">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* User info */}
        {isProvider ? (
          <div className={`border-b border-border-light dark:border-border-dark ${sidebarCollapsed ? 'px-2 py-4' : 'px-4 py-5'}`}>
            <div className={`flex ${sidebarCollapsed ? 'flex-col items-center gap-3 lg:gap-2' : 'items-start gap-3'}`}>
              <Avatar src={user?.avatar || providerProfile?.userId?.avatar} name={providerName} size={sidebarCollapsed ? 'md' : 'lg'} />
              <div className={`min-w-0 flex-1 pt-0.5 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{providerName}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Service Provider</p>
                {providerProfile ? <span className={`mt-2 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${verification.className}`}>
                  <VerificationIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{verification.label}</span>
                </span> : <span className="mt-2 inline-flex h-6 w-32 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" aria-label="Loading verification status" />}
              </div>
            </div>
          </div>
        ) : (
          <div className="border-b border-border-light px-6 py-4 dark:border-border-dark">
            <div className="flex items-center gap-3">
              <Avatar src={user?.avatar} name={user?.name || 'User'} size="md" />
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink-light dark:text-ink-dark">{user?.name || 'User'}</p><p className="text-xs text-gray-500 dark:text-gray-400">{getRoleLabel()}</p></div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className={`flex-1 space-y-3 overflow-y-auto py-4 ${sidebarCollapsed ? 'px-3 lg:px-2' : 'px-3'}`}>
          {isProvider ? (
            <>
              {providerNavigationGroups.map((group) => {
                const groupItems = group.labels.map((label) => providerItemByLabel.get(label)).filter(Boolean);
                if (groupItems.length === 0) return null;
                return <section key={group.heading || 'dashboard'} className="space-y-1">
                  {group.heading && <h2 className={`px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{group.heading}</h2>}
                  {groupItems.map((item) => renderNavItem(item, displayLabels[item.label] || item.label, providerBadges[item.label]))}
                </section>;
              })}
              <section className="space-y-1">
                <h2 className={`px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>Support</h2>
                {renderNavItem({ to: '/contact', label: 'Help & Support', icon: CircleHelp }, 'Help & Support')}
                {renderNavItem({ to: '/terms', label: 'Terms of Service', icon: FileText }, 'Terms of Service')}
                {renderNavItem({ to: '/privacy', label: 'Privacy Policy', icon: FileText }, 'Privacy Policy')}
              </section>
            </>
          ) : items.map((item) => {
            if (item.children) {
              const childIsActive = item.children.some((child) => location.pathname === child.to || location.pathname.startsWith(`${child.to}/`));
              const isExpanded = openGroups[item.label] ?? childIsActive;
              return (
                <div key={item.label}>
                  <button type="button" onClick={() => setOpenGroups((current) => ({ ...current, [item.label]: !isExpanded }))} aria-expanded={isExpanded} className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${childIsActive ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
                    <item.icon className="h-5 w-5" />{item.label}<ChevronDown className={`ml-auto h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpanded && <div className="ml-5 mt-1 space-y-1 border-l border-border-light pl-3 dark:border-border-dark">{item.children.map((child) => <NavLink key={child.to} to={child.to} onClick={onClose} className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'bg-primary-50 font-medium text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>{child.icon && <child.icon className="h-4 w-4" />}{child.label}</NavLink>)}</div>}
                </div>
              );
            }
            return <NavLink key={item.to} to={item.to} onClick={onClose} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 hover:text-ink-light dark:hover:text-ink-dark'}`}><item.icon className="h-5 w-5" />{item.label}</NavLink>;
          })}
        </nav>

        {/* Bottom actions */}
        <div className={`border-t border-border-light py-4 dark:border-border-dark ${sidebarCollapsed ? 'px-3 lg:px-2' : 'px-3'}`}>
          <button
            onClick={toggleTheme}
            title={sidebarCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
            className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className={sidebarCollapsed ? 'lg:hidden' : ''}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            onClick={handleLogout}
            title={sidebarCollapsed ? 'Logout' : undefined}
            className={`mt-1 w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/20 ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
          >
            <LogOut className="h-5 w-5" />
            <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;