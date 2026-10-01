import { NavLink } from 'react-router-dom';
import { BriefcaseBusiness, CalendarDays, House, Search, UserRound } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const customerLinks = [
  { to: '/customer/dashboard', label: 'Home', icon: House },
  { to: '/customer/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/customer/search', label: 'Service Search', icon: Search, primary: true },
  { to: '/customer/services', label: 'Services', icon: BriefcaseBusiness },
  { to: '/customer/profile', label: 'Profile', icon: UserRound },
];

export function CustomerBottomNav() {
  const { notifications } = useNotifications();
  const serviceUnreadCount = notifications.filter((notification) => (
    !notification.read
    && (
      notification.type === 'service'
      || notification.data?.serviceId
      || notification.data?.service
    )
  )).length;

  return (
    <nav aria-label="Customer navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1.5 shadow-[0_-6px_20px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
      <ul className="mx-auto flex h-[4.35rem] max-w-xl items-end justify-around">
        {customerLinks.map(({ to, label, icon: Icon, primary }) => (
          <li key={to} className={`relative flex h-full min-w-0 flex-1 justify-center ${primary ? 'items-start' : 'items-end'}`}>
            <NavLink
              to={to}
              end={to === '/customer/dashboard' || to === '/customer/profile'}
              aria-label={label}
              className={({ isActive }) => `relative flex h-full w-full flex-col items-center justify-end gap-1 pb-1 text-[10px] font-medium transition-colors ${primary ? '-translate-y-2 justify-start' : ''} ${isActive ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}
            >
              {({ isActive }) => <>
                {primary ? <span className={`-mt-5 flex h-[3.65rem] w-[3.65rem] items-center justify-center rounded-full border-4 border-white bg-emerald-700 text-white shadow-lg dark:border-slate-950 ${isActive ? 'ring-2 ring-emerald-200 dark:ring-emerald-800' : ''}`}>
                  <Icon className="h-7 w-7" strokeWidth={2.3} aria-hidden="true" />
                </span> : <span className="relative flex h-6 items-center justify-center">
                  <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} aria-hidden="true" />
                  {label === 'Services' && serviceUnreadCount > 0 && <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">{serviceUnreadCount > 9 ? '9+' : serviceUnreadCount}</span>}
                </span>}
                <span className={`max-w-full truncate ${primary ? 'mt-0.5 font-semibold' : ''}`}>{label}</span>
              </>}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default CustomerBottomNav;