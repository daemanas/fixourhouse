import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  clearAllNotifications,
  deleteNotification as deleteNotificationRequest,
  getMyNotifications,
  markAllAsRead as markAllAsReadRequest,
  markAsRead as markAsReadRequest,
} from '../services/notificationService';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const refresh = useCallback(async (silent = false) => {
    const userId = user?._id || user?.id;
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    const currentRequestId = ++requestId.current;
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await getMyNotifications({ limit: 50 });
      if (currentRequestId !== requestId.current) return;
      setNotifications(response.data?.data?.notifications || []);
      setUnreadCount(response.data?.data?.unreadCount || 0);
    } catch (requestError) {
      if (currentRequestId === requestId.current) {
        setError(requestError.response?.data?.message || 'Failed to load notifications.');
      }
    } finally {
      if (currentRequestId === requestId.current && !silent) setLoading(false);
    }
  }, [user?._id, user?.id]);

  useEffect(() => {
    refresh();
    const userId = user?._id || user?.id;
    if (!userId) return undefined;
    const interval = setInterval(() => {
      refresh(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [refresh, user?._id, user?.id]);

  const markRead = useCallback(async (id) => {
    const target = notifications.find((n) => n._id === id);
    if (!target || target.read) return;

    setNotifications((current) =>
      current.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      await markAsReadRequest(id);
    } catch (err) {
      setNotifications((current) =>
        current.map((n) => (n._id === id ? { ...n, read: false } : n))
      );
      setUnreadCount((current) => current + 1);
      throw err;
    }
  }, [notifications]);

  const markAllRead = useCallback(async () => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
    try {
      await markAllAsReadRequest();
    } catch (err) {
      refresh(true);
      throw err;
    }
  }, [refresh]);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    try {
      await clearAllNotifications();
    } catch (err) {
      refresh(true);
      throw err;
    }
  }, [refresh]);

  const deleteSingle = useCallback(async (id) => {
    const target = notifications.find((n) => n._id === id);
    if (!target) return;
    setNotifications((current) => current.filter((n) => n._id !== id));
    if (!target.read) setUnreadCount((current) => Math.max(0, current - 1));
    try {
      await deleteNotificationRequest(id);
    } catch (err) {
      refresh(true);
      throw err;
    }
  }, [notifications, refresh]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        refresh,
        markRead,
        markAllRead,
        clearAll,
        deleteSingle,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};