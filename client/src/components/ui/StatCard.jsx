import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Parse a trend value into a finite percentage, or null when the value is not
 * a real percentage. Accepts numbers and numeric strings (with optional sign,
 * decimals and trailing "%"). Any other string is treated as a text label and
 * never rendered as a percentage — this prevents "NaN%" / "Infinity%" badges.
 */
const parsePercent = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[+-]?\d*\.?\d+%?$/.test(trimmed)) return null;
  const num = Number.parseFloat(trimmed);
  return Number.isFinite(num) ? num : null;
};

export function StatCard({ title, label, value, icon: Icon, trend, trendLabel, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400',
    secondary: 'bg-secondary-50 dark:bg-secondary-900/20 text-secondary-600 dark:text-secondary-400',
    success: 'bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400',
    warning: 'bg-warning-50 dark:bg-warning-900/20 text-warning-600 dark:text-warning-400',
    danger: 'bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400',
  };

  // The heading must always be visible — accept both `title` (new) and
  // `label` (used by several dashboards) so no card is left untitled.
  const heading = title || label;

  // Only a genuine numeric percentage renders the up/down badge. Non-numeric
  // strings are shown as plain text so information is never lost.
  const percent = parsePercent(trend);
  const hasPercent = percent !== null;
  const isPositive = percent >= 0;
  const textLabel =
    !hasPercent && typeof trend === 'string' && trend.trim() !== ''
      ? trend
      : trendLabel;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          {heading && <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{heading}</p>}
          <p className="mt-2 text-3xl font-bold text-ink-light dark:text-ink-dark">{value}</p>
        </div>
        {Icon && (
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
      {(hasPercent || textLabel) && (
        <div className="mt-4 flex items-center gap-2">
          {hasPercent && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                isPositive
                  ? 'bg-success-50 text-success-600 dark:bg-success-900/20 dark:text-success-400'
                  : 'bg-danger-50 text-danger-600 dark:bg-danger-900/20 dark:text-danger-400'
              }`}
            >
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(percent)}%
            </span>
          )}
          {textLabel && <span className="text-xs text-gray-500 dark:text-gray-400">{textLabel}</span>}
        </div>
      )}
    </motion.div>
  );
}

export default StatCard;