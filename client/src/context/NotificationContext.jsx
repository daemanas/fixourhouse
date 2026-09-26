import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  clearAllNotifications,
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

  const refresh = useCallback(async () => {
    if (!user?._id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const response = await getMyNotifications({ limit: 50 });
      if (currentRequestId !== requestId.current) return;
      setNotifications(response.data?.data?.notifications || []);
      setUnreadCount(response.data?.data?.unreadCount || 0);
    } catch (requestError) {
      if (currentRequestId === requestId.current) setError(requestError.response?.data?.message || 'Failed to load notifications.');
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => { refresh(); }, [refresh]);

  const markRead = useCallback(async (id) => {
    const wasUnread = notifications.some((notification) => notification._id === id && !notification.read);
    await markAsReadRequest(id);
    setNotifications((current) => current.map((notification) => notification._id === id ? { ...notification, read: true } : notification));
    if (wasUnread) setUnreadCount((current) => Math.max(0, current - 1));
  }, [notifications]);

  const markAllRead = useCallback(async () => {
    await markAllAsReadRequest();
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(async () => {
    await clearAllNotifications();
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, error, refresh, markRead, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};