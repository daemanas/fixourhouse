import { useEffect, useRef, useState } from 'react';
import { Bell, Calendar, CreditCard, ShieldAlert, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const notificationIcon = {
  booking: Calendar,
  payment: CreditCard,
  review: Star,
  system: ShieldAlert,
  warning: ShieldAlert,
  verification: ShieldAlert,
};

const notificationsPath = (role) => role === 'admin'
  ? '/admin/notifications'
  : role === 'provider'
    ? '/provider/notifications'
    : '/customer/notifications';

export function NotificationMenu() {
  const { user } = useAuth();
  const { notifications, unreadCount, loading, refresh, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    refresh();
    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, refresh]);

  const openNotification = async (notification) => {
    if (!notification.read) {
      try { await markRead(notification._id); } catch { /* Keep the menu usable if marking read fails. */ }
    }
    setOpen(false);
    const bookingId = notification.data?.bookingId;
    if (bookingId && user?.role === 'admin') navigate('/admin/bookings');
    else if (bookingId && user?.role === 'provider') navigate('/provider/jobs');
    else if (bookingId && user?.role === 'customer') navigate('/customer/bookings');
    else navigate(notificationsPath(user?.role));
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-danger-500 px-1 text-center text-[10px] font-bold leading-5 text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && (
        <section className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border-light bg-white shadow-hover dark:border-border-dark dark:bg-gray-900" aria-label="Recent notifications">
          <div className="flex items-center justify-between border-b border-border-light px-4 py-3 dark:border-border-dark">
            <div><h2 className="text-sm font-semibold text-ink-light dark:text-ink-dark">Notifications</h2><p className="text-xs text-gray-500">{unreadCount} unread</p></div>
            <button type="button" onClick={() => { setOpen(false); navigate(notificationsPath(user?.role)); }} className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">View All Notifications</button>
          </div>
          {loading && notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">You are all caught up.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-border-light dark:divide-border-dark">
              {notifications.slice(0, 6).map((notification) => {
                const Icon = notificationIcon[notification.type] || Bell;
                return <li key={notification._id}><button type="button" onClick={() => openNotification(notification)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"><span className="mt-0.5 rounded-md bg-primary-50 p-2 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium text-ink-light dark:text-ink-dark">{notification.title}</span>{!notification.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary-600" />}</span><span className="mt-1 block line-clamp-2 text-xs text-gray-500">{notification.message}</span></span></button></li>;
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export default NotificationMenu;