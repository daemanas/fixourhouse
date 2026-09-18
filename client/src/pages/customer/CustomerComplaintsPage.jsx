import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageSquareWarning,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { getMyComplaints } from '../../services/complaintService';

// Backend stores status / priority in lowercase — map to friendly labels here.
const statusConfig = {
  open: { label: 'Open', variant: 'warning' },
  under_review: { label: 'Under Review', variant: 'primary' },
  waiting_for_provider: { label: 'Awaiting Provider', variant: 'secondary' },
  resolved: { label: 'Resolved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

const priorityConfig = {
  low: { label: 'Low', variant: 'neutral' },
  medium: { label: 'Medium', variant: 'secondary' },
  high: { label: 'High', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'danger' },
};

const categoryLabels = {
  service_quality: 'Service Quality',
  billing: 'Payment / Billing',
  provider_behavior: 'Provider Behavior',
  delay: 'Delay / Late Service',
  safety: 'Safety Concern',
  other: 'Other',
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

export function CustomerComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyComplaints({ page, limit: 10 });
      const data = res?.data?.data || {};
      setComplaints(data.complaints || []);
      setPage(data.pagination?.page || 1);
      setPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to load your complaints. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">
            My Complaints
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Track the status of issues you've reported.
          </p>
        </div>
        <Link to="/customer/bookings">
          <Button variant="outline">View Bookings</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-danger-500 mx-auto mb-3" />
          <p className="text-red-500 font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchComplaints}>
            Try Again
          </Button>
        </Card>
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={MessageSquareWarning}
          title="No complaints yet"
          description="If something went wrong with a booking, raise a complaint from your bookings page."
          action={
            <Link to="/customer/bookings">
              <Button>Go to My Bookings</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {complaints.map((c, i) => (
            <motion.div
              key={c._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs text-gray-500">
                      {c.complaintId}
                    </span>
                    <h3 className="mt-1 font-semibold text-ink-light dark:text-ink-dark">
                      {categoryLabels[c.category] || c.category}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {c.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={statusConfig[c.status]?.variant || 'primary'}>
                      {statusConfig[c.status]?.label || c.status}
                    </Badge>
                    <Badge
                      variant={priorityConfig[c.priority]?.variant || 'neutral'}
                    >
                      {priorityConfig[c.priority]?.label || c.priority} priority
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-500 dark:text-gray-400 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Filed
                    </p>
                    <p className="font-medium text-ink-light dark:text-ink-dark">
                      {formatDate(c.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Provider
                    </p>
                    <p className="font-medium text-ink-light dark:text-ink-dark">
                      {c.provider?.businessName || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                      Booking
                    </p>
                    <p className="font-mono text-xs font-medium text-ink-light dark:text-ink-dark">
                      {c.booking?.bookingId || '—'}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && !error && pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-1 py-3 dark:border-gray-700">
          <span className="text-sm text-gray-500">
            {total} total · Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerComplaintsPage;
