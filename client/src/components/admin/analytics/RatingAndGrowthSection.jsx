import { Clock } from 'lucide-react';
import Card from '../../ui/Card';
import EmptyState from '../../ui/EmptyState';

export function RatingAndGrowthSection({ ratingOverview = {}, userGrowth = {}, recentActivity = [] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Rating Card */}
      <Card className="p-6 lg:col-span-1">
        <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-1">Platform Rating</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Customer reviews breakdown</p>

        <div className="text-center py-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl mb-4">
          <p className="text-4xl font-extrabold text-amber-500">⭐ {ratingOverview.average || '0.0'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Average rating from {ratingOverview.totalReviews || 0} reviews
          </p>
        </div>

        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingOverview.distribution?.[star] || 0;
            const total = ratingOverview.totalReviews || 1;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={star} className="flex items-center gap-3 text-xs">
                <span className="w-6 font-semibold text-ink-light dark:text-ink-dark">{star}★</span>
                <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-12 text-right font-medium text-gray-500 dark:text-gray-400">{count}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* User Growth & Recent Activity */}
      <Card className="p-6 lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-1">User Growth & Activity</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Growth indicators and live platform activity feed</p>
        </div>

        {/* Growth stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-primary-50/50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/20">
            <p className="text-xs font-medium text-primary-700 dark:text-primary-400">Customer Growth</p>
            <p className="text-xl font-bold text-primary-800 dark:text-primary-300 mt-1">
              {userGrowth.customerGrowthPercent !== null && userGrowth.customerGrowthPercent !== undefined
                ? `${userGrowth.customerGrowthPercent > 0 ? '+' : ''}${userGrowth.customerGrowthPercent}%`
                : 'N/A'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-secondary-50/50 dark:bg-secondary-900/10 border border-secondary-100 dark:border-secondary-900/20">
            <p className="text-xs font-medium text-secondary-700 dark:text-secondary-400">Provider Growth</p>
            <p className="text-xl font-bold text-secondary-800 dark:text-secondary-300 mt-1">
              {userGrowth.providerGrowthPercent !== null && userGrowth.providerGrowthPercent !== undefined
                ? `${userGrowth.providerGrowthPercent > 0 ? '+' : ''}${userGrowth.providerGrowthPercent}%`
                : 'N/A'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-success-50/50 dark:bg-success-900/10 border border-success-100 dark:border-success-900/20">
            <p className="text-xs font-medium text-success-700 dark:text-success-400">Booking Growth</p>
            <p className="text-xl font-bold text-success-800 dark:text-success-300 mt-1">
              {userGrowth.bookingGrowthPercent !== null && userGrowth.bookingGrowthPercent !== undefined
                ? `${userGrowth.bookingGrowthPercent > 0 ? '+' : ''}${userGrowth.bookingGrowthPercent}%`
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div>
          <h3 className="text-sm font-bold text-ink-light dark:text-ink-dark mb-3">Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <EmptyState title="No data available for this period." description="Activity log will populate automatically." />
          ) : (
            <div className="space-y-3">
              {recentActivity.map((act) => (
                <div key={act.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink-light dark:text-ink-dark">{act.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{act.actor}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default RatingAndGrowthSection;