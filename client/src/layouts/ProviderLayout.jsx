import DashboardLayout from './DashboardLayout';
import {
  LayoutDashboard,
  Inbox,
  Briefcase,
  CalendarClock,
  User,
  Image,
  Wrench,
  IndianRupee,
  Wallet,
  Star,
  Settings,
} from 'lucide-react';

const items = [
  { to: '/provider/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/provider/requests', label: 'Booking Requests', icon: Inbox },
  { to: '/provider/jobs', label: 'My Jobs', icon: Briefcase },
  { to: '/provider/availability', label: 'Availability', icon: CalendarClock },
  { to: '/provider/profile', label: 'Profile', icon: User },
  { to: '/provider/gallery', label: 'Gallery', icon: Image },
  { to: '/provider/documents', label: 'Documents', icon: Wallet },
  { to: '/provider/services', label: 'Services', icon: Wrench },
  { to: '/provider/pricing', label: 'Pricing', icon: IndianRupee },
  { to: '/provider/earnings', label: 'Earnings', icon: Wallet },
  { to: '/provider/withdrawals', label: 'Withdrawals', icon: Wallet },
  { to: '/provider/reviews', label: 'Reviews', icon: Star },
  { to: '/provider/settings', label: 'Settings', icon: Settings },
];

export function ProviderLayout() {
  return (
    <DashboardLayout
      items={items}
      title="Provider Dashboard"
      subtitle="Manage your services, jobs, and earnings"
    />
  );
}

export default ProviderLayout;
