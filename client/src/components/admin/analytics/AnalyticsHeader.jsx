import { useState } from 'react';
import { Calendar, Filter, RefreshCw, X } from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

export function AnalyticsHeader({ period, onPeriodChange, onApplyCustomRange, onRefresh, loading }) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setShowCustomModal(true);
    } else {
      onPeriodChange(val);
    }
  };

  const handleApplyCustom = () => {
    if (startDate && endDate) {
      onApplyCustomRange(startDate, endDate);
      setShowCustomModal(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Platform Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Track platform growth, users, providers, bookings, locations and overall performance.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={period}
            onChange={handleSelectChange}
            className="appearance-none pl-10 pr-10 py-2 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 text-ink-light dark:text-ink-dark text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none cursor-pointer"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          <Filter className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="p-2 rounded-xl"
          title="Refresh Analytics"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>

        {showCustomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-ink-light dark:text-ink-dark">Custom Date Range</h3>
                <button onClick={() => setShowCustomModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowCustomModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleApplyCustom} disabled={!startDate || !endDate}>
                  Apply Filter
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsHeader;