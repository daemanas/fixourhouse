import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search, Star, Loader2, AlertTriangle, Eye, EyeOff, Flag } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import RatingStars from '../../components/ui/RatingStars';
import { getAdminReviews, updateReview } from '../../services/adminService';

const getReviewStatus = (review) => {
  if (!review.isVisible) return { label: 'Removed', variant: 'danger' };
  if (review.flagged) return { label: 'Flagged', variant: 'warning' };
  return { label: 'Published', variant: 'success' };
};

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: pagination.page, limit: 10 };
      if (search) params.q = search;
      if (ratingFilter) params.rating = ratingFilter;
      const res = await getAdminReviews(params);
      setReviews(res.data.data.reviews || []);
      setPagination(res.data.data.pagination || { page: 1, total: 0, pages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reviews. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, ratingFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const confirmAction = async () => {
    if (!pendingAction) return;
    const { review, action } = pendingAction;
    setActionLoading(true);
    try {
      if (action === 'remove') {
        await updateReview(review._id, { isVisible: false });
        toast.success('Review removed');
      } else if (action === 'restore') {
        await updateReview(review._id, { isVisible: true });
        toast.success('Review restored');
      } else if (action === 'flag') {
        await updateReview(review._id, { flagged: true, flagReason: 'Flagged by admin' });
        toast.success('Review flagged');
      } else if (action === 'unflag') {
        await updateReview(review._id, { flagged: false, flagReason: undefined });
        toast.success('Review unflagged');
      }
      setPendingAction(null);
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: 'customer',
      label: 'Customer',
      render: (row) => row.customerId?.name || '—',
    },
    {
      key: 'provider',
      label: 'Provider',
      render: (row) => row.providerId?.businessName || '—',
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (row) => <RatingStars value={row.rating} size="sm" />,
    },
    { key: 'comment', label: 'Review', render: (row) => row.comment || '—' },
    {
      key: 'date',
      label: 'Date',
      render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN'),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        const status = getReviewStatus(row);
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.isVisible ? (
            <button
              onClick={() => setPendingAction({ review: row, action: 'remove' })}
              className="p-1.5 rounded-lg text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20"
              title="Remove review"
            >
              <EyeOff className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setPendingAction({ review: row, action: 'restore' })}
              className="p-1.5 rounded-lg text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20"
              title="Restore review"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {row.flagged ? (
            <button
              onClick={() => setPendingAction({ review: row, action: 'unflag' })}
              className="p-1.5 rounded-lg text-warning-600 hover:bg-warning-50 dark:hover:bg-warning-900/20"
              title="Unflag review"
            >
              <Flag className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setPendingAction({ review: row, action: 'flag' })}
              className="p-1.5 rounded-lg text-warning-600 hover:bg-warning-50 dark:hover:bg-warning-900/20"
              title="Flag review"
            >
              <Flag className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const modalTitle = pendingAction
    ? {
        remove: 'Remove Review',
        restore: 'Restore Review',
        flag: 'Flag Review',
        unflag: 'Unflag Review',
      }[pendingAction.action]
    : '';

  const modalMessage = pendingAction
    ? {
        remove: 'Are you sure you want to remove this review? It will no longer be visible to users.',
        restore: 'Are you sure you want to restore this review? It will become visible to users again.',
        flag: 'Are you sure you want to flag this review? It will be marked for admin attention.',
        unflag: 'Are you sure you want to unflag this review?',
      }[pendingAction.action]
    : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Review Management</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Moderate reviews and ratings across the platform
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by customer, provider, or review..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <select
          value={ratingFilter}
          onChange={(e) => {
            setRatingFilter(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-ink-light dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Ratings</option>
          <option value="1">1 Star</option>
          <option value="2">2 Stars</option>
          <option value="3">3 Stars</option>
          <option value="4">4 Stars</option>
          <option value="5">5 Stars</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-danger-500 mx-auto mb-3" />
          <p className="text-red-500 font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchReviews}>
            Try Again
          </Button>
        </Card>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews found"
          description="Try adjusting your filters or search."
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="p-6 overflow-x-auto">
            <Table columns={columns} data={reviews} />
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      )}

      <Modal
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        title={modalTitle}
      >
        <p className="text-gray-600 dark:text-gray-300">{modalMessage}</p>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => setPendingAction(null)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmAction} disabled={actionLoading}>
            {actionLoading ? 'Processing...' : 'Confirm'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default AdminReviewsPage;