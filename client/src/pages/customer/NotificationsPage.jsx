import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Bell,
  CheckCheck,
  Calendar,
  Star,
  MessageSquare,
  ShieldAlert,
  Clock,
  Trash2,
  Loader2,
  AlertTriangle,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { useNotifications } from '../../context/NotificationContext';

const typeConfig = {
  booking: { icon: Calendar, color: 'primary' },
  payment: { icon: CreditCard, color: 'secondary' },
  review: { icon: Star, color: 'amber' },
  system: { icon: ShieldAlert, color: 'danger' },
  warning: { icon: ShieldAlert, color: 'warning' },
  verification: { icon: ShieldCheck, color: 'primary' },
  complaint: { icon: MessageSquare, color: 'warning' },
};

const typeColors = {
  primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
  amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  secondary: 'bg-secondary-100 dark:bg-secondary-900/30 text-secondary-600 dark:text-secondary-400',
  warning: 'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400',
  danger: 'bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400',
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export function NotificationsPage() {
  const { notifications, unreadCount, loading, error, refresh, markRead, markAllRead, clearAll, deleteSingle } = useNotifications();
  const [filter, setFilter] = useState('all');
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    refresh();
  }, []); // Run on mount

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

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
    } catch (err) {
      // Silently ignore
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
    } catch (err) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Notifications</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "You're all caught up"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="h-4 w-4" />
            Mark All Read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={notifications.length === 0 || clearing}
          >
            {clearing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Clear All
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              filter === tab.id
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-danger-500 mx-auto mb-3" />
          <p className="text-red-500 font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={refresh}>
            Try Again
          </Button>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You don't have any notifications in this category."
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification, i) => {
            const config = typeConfig[notification.type] || typeConfig.system;
            const Icon = config.icon;
            return (
              <motion.div
                key={notification._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className={`p-5 cursor-pointer transition-all hover:shadow-card ${
                    !notification.read ? 'border-l-4 border-l-primary-600' : ''
                  }`}
                  onClick={() => {
                    if (!notification.read) handleMarkAsRead(notification._id);
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        typeColors[config.color]
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-ink-light dark:text-ink-dark">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <Badge variant="primary" className="shrink-0">
                              New
                            </Badge>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSingle(e, notification._id)}
                            className="p-1 text-gray-400 hover:text-danger-500 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                            title="Delete notification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;