import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Star, ThumbsUp, MessageSquare, AlertTriangle, RotateCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import RatingStars from '../../components/ui/RatingStars';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import { getMyReviews } from '../../services/reviewService';
import { useAuth } from '../../context/AuthContext';

const RATING_KEYS = [5, 4, 3, 2, 1];

const formatReviewDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

function ReviewSkeletonCard() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </Card>
  );
}

export function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState({
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyReviews({ page: 1, limit: 100 });
      const data = res?.data?.data || {};
      setReviews(data.reviews || []);
      setAverageRating(data.averageRating || 0);
      setTotalReviews(data.totalReviews || 0);
      setRatingDistribution(data.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
    } catch (err) {
      // Log the real API error in development for easier debugging.
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('Failed to load provider reviews:', err);
      }
      setError(err.response?.data?.message || 'Failed to load reviews. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const distribution = RATING_KEYS.map((stars) => ({
    stars,
    count: ratingDistribution[stars] || 0,
    percentage:
      totalReviews > 0
        ? Math.round(((ratingDistribution[stars] || 0) / totalReviews) * 100)
        : 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Reviews</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            See what customers are saying about your services
          </p>
        </div>
        {/* Provider identity — comes from the shared authenticated user object so
            the sidebar, profile and this page always stay in sync. */}
        {user?.name && (
          <div className="flex items-center gap-3 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-gray-900 px-4 py-2.5">
            <Avatar src={user?.avatar} name={user?.name} size="md" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Your profile</p>
              <p className="text-sm font-semibold text-ink-light dark:text-ink-dark truncate max-w-[160px]">
                {user?.name}
              </p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <Card className="p-6 space-y-4">
              <Skeleton className="h-5 w-32" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              {RATING_KEYS.map((stars) => (
                <div key={stars} className="flex items-center gap-3">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="flex-1 h-2 rounded-full" />
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </Card>
          </div>
          <div className="lg:col-span-2 space-y-4">
            {RATING_KEYS.map((_, i) => (
              <ReviewSkeletonCard key={i} />
            ))}
          </div>
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-danger-500 mx-auto mb-3" />
          <p className="font-medium text-gray-600 dark:text-gray-300">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchReviews}>
            <RotateCw className="h-4 w-4" />
            Retry
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rating Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="p-6">
              <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-4">
                Rating Summary
              </h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="text-5xl font-bold text-ink-light dark:text-ink-dark">
                  {averageRating.toFixed(1)}
                </div>
                <div>
                  <RatingStars value={averageRating} />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {totalReviews} total reviews
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {distribution.map((item) => (
                  <div key={item.stars} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300 w-8">
                      {item.stars} ★
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-2 rounded-full bg-amber-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-8 text-right">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-4">
            {reviews.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No reviews yet"
                description="Customer reviews will appear here after completed services."
              />
            ) : (
              reviews.map((review, index) => (
                <motion.div
                  key={review._id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <Card className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={review.customer?.avatar}
                          name={review.customer?.name || 'Customer'}
                          size="md"
                        />
                        <div>
                          <h3 className="font-semibold text-ink-light dark:text-ink-dark">
                            {review.customer?.name || 'Customer'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatReviewDate(review.createdAt)}
                            {review.service?.name ? ` • ${review.service.name}` : ''}
                          </p>
                        </div>
                      </div>
                      <Badge variant="primary">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        {Number(review.rating || 0).toFixed(1)}
                      </Badge>
                    </div>
                    {review.comment && (
                      <p className="mt-4 text-gray-600 dark:text-gray-300">{review.comment}</p>
                    )}
                    {review.helpful != null && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <ThumbsUp className="h-4 w-4" />
                        {review.helpful} people found this helpful
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewsPage;
