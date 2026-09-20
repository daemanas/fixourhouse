import { MapPin } from 'lucide-react';
import Card from '../../ui/Card';
import Table from '../../ui/Table';
import EmptyState from '../../ui/EmptyState';

export function LocationAnalyticsSection({ locations = {} }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coverage summary */}
      <Card className="p-6 lg:col-span-1">
        <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-1">Platform Coverage</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Geographic reach across registered users and providers</p>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Registered Cities</p>
              <p className="text-2xl font-bold text-ink-light dark:text-ink-dark mt-1">{locations.totalCities || 0}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <MapPin className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Registered Districts</p>
              <p className="text-2xl font-bold text-ink-light dark:text-ink-dark mt-1">{locations.totalDistricts || 0}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-secondary-50 dark:bg-secondary-900/20 text-secondary-600 dark:text-secondary-400 flex items-center justify-center">
              <MapPin className="h-5 w-5" />
            </div>
          </div>
        </div>
      </Card>

      {/* Top Locations Table */}
      <Card className="p-6 lg:col-span-2">
        <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-1">Top Locations</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Location volume ranking based on platform data</p>

        {!locations.topLocations || locations.topLocations.length === 0 ? (
          <EmptyState title="No data available for this period." description="Locations will appear here as users and bookings are added." />
        ) : (
          <Table
            columns={[
              { key: 'rank', label: 'Rank', render: (r) => <span className="font-bold text-gray-500">#{r.rank}</span> },
              { key: 'name', label: 'City / District', render: (r) => <span className="font-semibold text-ink-light dark:text-ink-dark">{r.name}</span> },
              { key: 'customers', label: 'Customers' },
              { key: 'providers', label: 'Providers' },
              { key: 'bookings', label: 'Bookings' },
              { key: 'completedBookings', label: 'Completed Bookings' },
            ]}
            data={locations.topLocations}
          />
        )}
      </Card>
    </div>
  );
}

export default LocationAnalyticsSection;