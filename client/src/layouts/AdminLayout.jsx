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
  Bell,
  Globe,
  Percent,
  Layers,
} from 'lucide-react';

const items = [
  { to: '/admin/analytics', label: 'Analytics', icon: LayoutDashboard },
  { to: '/admin/service-catalog', label: 'Service Catalog', icon: Layers },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/providers', label: 'Providers', icon: HardHat },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/admin/reports', label: 'Reports', icon: Flag },
  { to: '/admin/reviews', label: 'Reviews', icon: TrendingUp },
  { to: '/admin/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { to: '/admin/revenue', label: 'Revenue', icon: IndianRupee },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  {
    label: 'Settings',
    icon: Settings,
    children: [
      { to: '/admin/settings', label: 'General Settings' },
      { to: '/admin/website-settings', label: 'Website Management', icon: Globe },
      { to: '/admin/provider-commission', label: 'Provider Commission', icon: Percent },
    ],
  },
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
