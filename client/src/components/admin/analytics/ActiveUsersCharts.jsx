import Card from '../../ui/Card';
import EmptyState from '../../ui/EmptyState';

export function ActiveUsersCharts({ monthlyData = [] }) {
  const maxActiveCust = Math.max(1, ...monthlyData.map((d) => d.activeCustomers || 0));
  const maxActiveProv = Math.max(1, ...monthlyData.map((d) => d.activeProviders || 0));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly Active Customers */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark">Monthly Active Customers</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Customers with platform activity each month</p>
        </div>
        {monthlyData.length === 0 ? (
          <EmptyState title="No data available for this period." description="Active customer metrics will appear here." />
        ) : (
          <div className="flex items-end gap-2 sm:gap-3 h-48 pt-6 border-b border-border-light dark:border-border-dark">
            {monthlyData.map((d, idx) => {
              const h = Math.max(6, Math.round(((d.activeCustomers || 0) / maxActiveCust) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-0.5 px-2 z-10 pointer-events-none">
                    {d.activeCustomers} active
                  </div>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-primary-600 to-primary-400"
                    style={{ height: `${h}%` }}
                  />
                  <span className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-medium">{d.month}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Monthly Active Providers */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark">Monthly Active Providers</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Providers with jobs or dashboard activity</p>
        </div>
        {monthlyData.length === 0 ? (
          <EmptyState title="No data available for this period." description="Active provider metrics will appear here." />
        ) : (
          <div className="flex items-end gap-2 sm:gap-3 h-48 pt-6 border-b border-border-light dark:border-border-dark">
            {monthlyData.map((d, idx) => {
              const h = Math.max(6, Math.round(((d.activeProviders || 0) / maxActiveProv) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-0.5 px-2 z-10 pointer-events-none">
                    {d.activeProviders} active
                  </div>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-secondary-600 to-secondary-400"
                    style={{ height: `${h}%` }}
                  />
                  <span className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-medium">{d.month}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export default ActiveUsersCharts;