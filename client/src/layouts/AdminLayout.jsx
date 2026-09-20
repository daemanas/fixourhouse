import DashboardLayout from './DashboardLayout';
import {
  LayoutDashboard,
  Users,
  HardHat,
  CalendarCheck,
  Flag,
  TrendingUp,
  IndianRupee,
  Settings,
  MessageSquareWarning,
} from 'lucide-react';

const items = [
  { to: '/admin/analytics', label: 'Analytics', icon: LayoutDashboard },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/providers', label: 'Providers', icon: HardHat },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/admin/reports', label: 'Reports', icon: Flag },
  { to: '/admin/reviews', label: 'Reviews', icon: TrendingUp },
  { to: '/admin/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { to: '/admin/revenue', label: 'Revenue', icon: IndianRupee },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout() {
  return (
    <DashboardLayout
      items={items}
      title="Admin Dashboard"
      subtitle="Manage platform users, providers, and operations"
    />
  );
}

export default AdminLayout;
