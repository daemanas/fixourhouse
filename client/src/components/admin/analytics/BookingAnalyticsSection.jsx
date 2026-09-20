import Card from '../../ui/Card';
import EmptyState from '../../ui/EmptyState';

export function BookingAnalyticsSection({ bookingOverview = {}, monthlyData = [] }) {
  const maxBookings = Math.max(
    1,
    ...monthlyData.map((d) => Math.max(d.bookings || 0, d.completedBookings || 0))
  );

  const statusRows = [
    { label: 'Total Bookings', value: bookingOverview.total, color: 'text-ink-light dark:text-ink-dark', bg: 'bg-gray-50 dark:bg-gray-800/60' },
    { label: 'Completed', value: bookingOverview.completed, color: 'text-success-700 dark:text-success-400', bg: 'bg-success-50/50 dark:bg-success-900/10' },
    { label: 'Pending', value: bookingOverview.pending, color: 'text-warning-700 dark:text-warning-400', bg: 'bg-warning-50/50 dark:bg-warning-900/10' },
    { label: 'Accepted', value: bookingOverview.accepted, color: 'text-primary-700 dark:text-primary-400', bg: 'bg-primary-50/50 dark:bg-primary-900/10' },
    { label: 'In Progress', value: bookingOverview.inProgress, color: 'text-primary-700 dark:text-primary-400', bg: 'bg-primary-50/50 dark:bg-primary-900/10' },
    { label: 'Cancelled', value: bookingOverview.cancelled, color: 'text-danger-700 dark:text-danger-400', bg: 'bg-danger-50/50 dark:bg-danger-900/10' },
    { label: 'Refunded / Rejected', value: bookingOverview.refunded, color: 'text-danger-700 dark:text-danger-400', bg: 'bg-danger-50/50 dark:bg-danger-900/10' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Booking Status Overview Cards */}
      <Card className="p-6 lg:col-span-1 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-1">Booking Overview</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Status breakdown across platform</p>
          <div className="space-y-3">
            {statusRows.map((row, idx) => (
              <div key={idx} className={`flex justify-between items-center p-3 rounded-xl ${row.bg}`}>
                <span className={`text-sm font-medium ${row.color}`}>{row.label}</span>
                <span className={`text-sm font-bold ${row.color}`}>{(row.value || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Booking Trends Chart */}
      <Card className="p-6 lg:col-span-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark">Booking Trends</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total vs Completed bookings over time</p>
          </div>
          <div className="flex items-center gap-6 text-xs font-medium">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-primary-500" />
              <span className="text-ink-light dark:text-ink-dark">Total</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-success-500" />
              <span className="text-ink-light dark:text-ink-dark">Completed</span>
            </div>
          </div>
        </div>

        {monthlyData.length === 0 ? (
          <EmptyState title="No data available for this period." description="Booking trends will appear here." />
        ) : (
          <div className="flex items-end gap-2 sm:gap-4 h-64 pt-6 border-b border-border-light dark:border-border-dark">
            {monthlyData.map((d, idx) => {
              const totH = Math.max(4, Math.round(((d.bookings || 0) / maxBookings) * 100));
              const compH = Math.max(4, Math.round(((d.completedBookings || 0) / maxBookings) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2.5 z-20 pointer-events-none whitespace-nowrap shadow-lg">
                    <p className="font-bold">{d.month}</p>
                    <p>Total: {d.bookings}</p>
                    <p>Completed: {d.completedBookings}</p>
                  </div>
                  <div className="flex items-end gap-1 w-full max-w-[36px]">
                    <div className="flex-1 rounded-t bg-primary-500 transition-all group-hover:brightness-110" style={{ height: `${totH}%` }} />
                    <div className="flex-1 rounded-t bg-success-500 transition-all group-hover:brightness-110" style={{ height: `${compH}%` }} />
                  </div>
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

export default BookingAnalyticsSection;