import {
  Users,
  UserCheck,
  HardHat,
  Wrench,
  CalendarCheck,
  CheckCircle2,
  MapPin,
  Star,
} from 'lucide-react';
import StatCard from '../../ui/StatCard';
import Card from '../../ui/Card';
import Skeleton from '../../ui/Skeleton';

export function AnalyticsKpiGrid({ kpis = {}, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <StatCard
        title="Total Customers"
        value={(kpis.totalCustomers || 0).toLocaleString()}
        icon={Users}
        trend="Registered customers"
        color="primary"
      />
      <StatCard
        title="Active Customers"
        value={(kpis.activeCustomers || 0).toLocaleString()}
        icon={UserCheck}
        trend={`Active this period (${kpis.activeCustomersPercentage || 0}% of total)`}
        color="secondary"
      />
      <StatCard
        title="Total Providers"
        value={(kpis.totalProviders || 0).toLocaleString()}
        icon={HardHat}
        trend="Registered providers"
        color="primary"
      />
      <StatCard
        title="Active Providers"
        value={(kpis.activeProviders || 0).toLocaleString()}
        icon={Wrench}
        trend={`Active this period (${kpis.activeProvidersPercentage || 0}% of total)`}
        color="secondary"
      />
      <StatCard
        title="Total Bookings"
        value={(kpis.totalBookings || 0).toLocaleString()}
        icon={CalendarCheck}
        trend="Platform bookings"
        color="success"
      />
      <StatCard
        title="Completed Bookings"
        value={(kpis.completedBookings || 0).toLocaleString()}
        icon={CheckCircle2}
        trend={`Completed (${kpis.completionRate || 0}% completion rate)`}
        color="success"
      />
      <StatCard
        title="Total Locations"
        value={`Cities: ${kpis.totalCities || 0}`}
        icon={MapPin}
        trend={`Districts: ${kpis.totalDistricts || 0}`}
        color="warning"
      />
      <StatCard
        title="Platform Rating"
        value={`⭐ ${kpis.platformRating || '0.0'}`}
        icon={Star}
        trend={`From ${kpis.totalReviews || 0} reviews`}
        color="warning"
      />
    </div>
  );
}

export default AnalyticsKpiGrid;