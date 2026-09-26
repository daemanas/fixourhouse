import Card from '../../ui/Card';
import EmptyState from '../../ui/EmptyState';

export function RegistrationOverviewChart({ monthlyData = [] }) {
  const maxReg = Math.max(
    1,
    ...monthlyData.map((d) => Math.max(d.customersRegistered || 0, d.providersRegistered || 0))
  );

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark">Registration Overview</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Monthly new customer and provider registrations</p>
        </div>
        <div className="flex items-center gap-6 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-[#3B82F6]" />
            <span className="text-ink-light dark:text-ink-dark">Customers</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-[#8B5CF6]" />
            <span className="text-ink-light dark:text-ink-dark">Providers</span>
          </div>
        </div>
      </div>

      {monthlyData.length === 0 ? (
        <EmptyState title="No data available for this period." description="Registration trends will appear here." />
      ) : (
        <div className="space-y-2">
          <div className="flex items-end gap-2 sm:gap-4 h-56 pt-6 px-2 border-b border-border-light dark:border-border-dark">
            {monthlyData.map((d, idx) => {
              const custVal = d.customersRegistered || 0;
              const provVal = d.providersRegistered || 0;
              const custH = custVal > 0 ? Math.max(4, Math.round((custVal / maxReg) * 100)) : 0;
              const provH = provVal > 0 ? Math.max(4, Math.round((provVal / maxReg) * 100)) : 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded-lg py-1 px-2.5 z-20 pointer-events-none whitespace-nowrap shadow-lg">
                    <p className="font-bold">{d.month}</p>
                    <p>Customers: {custVal}</p>
                    <p>Providers: {provVal}</p>
                  </div>

                  <div className="flex-1 flex items-end gap-1 w-full max-w-[40px] h-full pb-1">
                    <div
                      className="flex-1 rounded-t bg-[#3B82F6] transition-all group-hover:brightness-110"
                      style={{ height: `${custH}%` }}
                    />
                    <div
                      className="flex-1 rounded-t bg-[#8B5CF6] transition-all group-hover:brightness-110"
                      style={{ height: `${provH}%` }}
                    />
                  </div>
                  <span className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {d.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

export default RegistrationOverviewChart;