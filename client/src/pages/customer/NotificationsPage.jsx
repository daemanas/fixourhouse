import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Bell,
  CheckCheck,
  Calendar,
  Star,
  MessageSquare,
  ShieldAlert,
  Trash2,
  Loader2,
  AlertTriangle,
  CreditCard,
  ShieldCheck,
  Inbox,
  Settings,
  ChevronRight,
  X,
  Tag,
  Info,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { useNotifications } from '../../context/NotificationContext';

const typeConfig = {
  booking: {
    icon: Calendar,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-900/40',
  },
  payment: {
    icon: CreditCard,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-100 dark:border-blue-900/40',
  },
  review: {
    icon: Star,
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-100 dark:border-amber-900/40',
  },
  system: {
    icon: ShieldAlert,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-100 dark:border-rose-900/40',
  },
  warning: {
    icon: ShieldAlert,
    color: 'text-orange-500 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/60 border-orange-100 dark:border-orange-900/40',
  },
  verification: {
    icon: ShieldCheck,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-900/40',
  },
  complaint: {
    icon: MessageSquare,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/60 border-violet-100 dark:border-violet-900/40',
  },
};

const formatTimeShort = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const getDateGroup = (dateStr) => {
  if (!dateStr) return 'Earlier';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Earlier';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (targetDate.getTime() === today.getTime()) return 'Today';
  if (targetDate.getTime() === yesterday.getTime()) return 'Yesterday';
  return 'Earlier';
};

export function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
    clearAll,
    deleteSingle,
  } = useNotifications();

  const [filter, setFilter] = useState('all');
  const [clearing, setClearing] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    refresh();
  }, []);

  const counts = useMemo(() => {
    const res = { all: notifications.length, unread: unreadCount };
    notifications.forEach((n) => {
      res[n.type] = (res[n.type] || 0) + 1;
    });
    return res;
  }, [notifications, unreadCount]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'all') return true;
      if (filter === 'unread') return !n.read;
      return n.type === filter;
    });
  }, [notifications, filter]);

  const groupedNotifications = useMemo(() => {
    const groups = { Today: [], Yesterday: [], Earlier: [] };
    filteredNotifications.forEach((n) => {
      const group = getDateGroup(n.createdAt);
      if (groups[group]) {
        groups[group].push(n);
      } else {
        groups.Earlier.push(n);
      }
    });
    return groups;
  }, [filteredNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark all as read');
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markRead(id);
    } catch {
      // Ignore
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await clearAll();
      toast.success('All notifications cleared');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear notifications');
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteSingle = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteSingle(id);
      toast.success('Notification deleted');
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'booking', label: 'Bookings' },
    { id: 'payment', label: 'Payments' },
    { id: 'verification', label: 'Verification' },
    { id: 'review', label: 'Reviews' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-16 px-3 sm:px-6">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span className="bg-emerald-500 text-white font-bold text-xs px-2.5 py-0.5 rounded-full shadow-xs">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="p-2.5 text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Mark all as read"
          >
            <CheckCheck className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={notifications.length === 0 || clearing}
            className="p-2.5 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Clear all notifications"
          >
            {clearing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* PROMO / INFO BANNER */}
      {showBanner && (
        <div className="relative bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Stay Updated!</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Get important updates about your bookings, payments, and account status.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {filterTabs.map((tab) => {
          const isSelected = filter === tab.id;
          const count = counts[tab.id] || 0;

          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800'
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-md font-bold ${
                    isSelected
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* NOTIFICATIONS CONTAINER */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Fetching notifications...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>
          <Button variant="outline" size="sm" onClick={refresh} className="rounded-xl">
            Try Again
          </Button>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-3xl p-8 sm:p-14 text-center space-y-4 shadow-xs">
          <div className="h-16 w-16 bg-slate-50 dark:bg-gray-800/80 border border-slate-100 dark:border-gray-700/60 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Inbox className="h-8 w-8 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              No Notifications Found
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {filter !== 'all'
                ? `You have no notifications under the "${filter}" category.`
                : 'Your inbox is clear. Check back later for fresh updates.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([groupTitle, items]) => {
            if (items.length === 0) return null;

            return (
              <div key={groupTitle} className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                  {groupTitle}
                </h3>

                <div className="space-y-2.5">
                  <AnimatePresence>
                    {items.map((notification) => {
                      const config = typeConfig[notification.type] || typeConfig.system;
                      const Icon = config.icon;
                      const isUnread = !notification.read;

                      return (
                        <motion.div
                          key={notification._id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.18 }}
                          onClick={() => {
                            if (isUnread) handleMarkAsRead(notification._id);
                          }}
                          className={`relative overflow-hidden bg-white dark:bg-gray-900 border rounded-2xl p-4 transition-all shadow-xs hover:shadow-md cursor-pointer group flex items-center justify-between gap-3 ${
                            isUnread
                              ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/10 dark:bg-emerald-950/10'
                              : 'border-slate-100 dark:border-gray-800/80 hover:border-slate-300 dark:hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            {/* Icon Indicator */}
                            <div className="relative shrink-0">
                              <div
                                className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center border ${config.bg}`}
                              >
                                <Icon className={`h-5 w-5 ${config.color}`} />
                              </div>
                              {isUnread && (
                                <span className="absolute -top-1 -left-1 h-3 w-3 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
                              )}
                            </div>

                            {/* Text Content */}
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h4
                                  className={`text-xs sm:text-sm font-bold leading-tight ${
                                    isUnread
                                      ? 'text-slate-900 dark:text-white'
                                      : 'text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {notification.title}
                                </h4>
                                <span className="text-[11px] text-slate-400 shrink-0">
                                  {formatTimeShort(notification.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {notification.message}
                              </p>
                            </div>
                          </div>

                          {/* Action Controls */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSingle(e, notification._id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete notification"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;