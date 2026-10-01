import DashboardLayout from './DashboardLayout';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Search,
  Wrench,
  CalendarCheck,
  MessageSquareWarning,
  Heart,
  Bell,
  User,
  Settings,
} from 'lucide-react';

const items = [
  { to: '/customer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customer/services', label: 'Services', icon: Wrench },
  { to: '/customer/search', label: 'Search Services', icon: Search },
  { to: '/customer/bookings', label: 'My Bookings', icon: CalendarCheck },
  { to: '/customer/complaints', label: 'My Complaints', icon: MessageSquareWarning },
  { to: '/customer/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/customer/notifications', label: 'Notifications', icon: Bell },
  { to: '/customer/profile', label: 'My Profile', icon: User },
  { to: '/customer/settings', label: 'Settings', icon: Settings },
];

export function CustomerLayout() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <DashboardLayout
      items={items}
      title="My LocalFix"
      subtitle="Find and manage trusted local services"
      showSearch
      customerLayout
      showCustomerHeader={!isAuthenticated}
      customerDashboardHeader={['/', '/customer', '/customer/dashboard'].includes(location.pathname)}
    />
  );
}

export default CustomerLayout;
