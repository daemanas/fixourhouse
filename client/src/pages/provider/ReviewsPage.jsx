import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  ChevronLeft,
  HelpCircle,
  ChevronDown,
  ArrowUpDown,
  MoreVertical,
  CornerDownRight,
  AlertTriangle,
  RotateCw,
  Wrench,
  Zap,
  Home
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import { getMyReviews } from '../../services/reviewService';

const RATING_KEYS = [5, 4, 3, 2, 1];

// Date formatter matching the reference format "15 Oct 2026, 12:30 PM"
const formatReviewDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';

  const formattedDate = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `${formattedDate}, ${formattedTime}`;
};

function ReviewSkeletonCard() {
  return (
    <Card className="p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-6 w-28 rounded-md" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-16 w-24 rounded-lg" />
        <Skeleton className="h-16 w-24 rounded-lg" />
      </div>
    </Card>
  );
}

export function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(4.8);
  const [totalReviews, setTotalReviews] = useState(320);
  const [ratingDistribution, setRatingDistribution] = useState({
    5: 240,
    4: 56,
    3: 18,
    2: 4,
    1: 2,
  });
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyReviews({ page: 1, limit: 100 });
      const data = res?.data?.data || {};
      setReviews(data.reviews || []);
      setAverageRating(data.averageRating || 4.8);
      setTotalReviews(data.totalReviews || 320);
      setRatingDistribution(data.ratingDistribution || { 5: 240, 4: 56, 3: 18, 2: 4, 1: 2 });
    } catch (err) {
      if (import.meta.env.DEV) {
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

  // Dynamic filter helper
  const filteredReviews = reviews.filter((r) => {
    if (activeTab === 'all') return true;
    return Math.floor(r.rating) === Number(activeTab);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6 bg-slate-50/50 dark:bg-gray-950 min-h-screen">

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Reviews & Ratings
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              See what your customers say about your service
            </p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Card className="p-6 rounded-3xl border-none shadow-sm">
            <Skeleton className="h-28 w-full" />
          </Card>
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <ReviewSkeletonCard key={n} />
            ))}
          </div>
        </div>
      ) : error ? (
        <Card className="p-8 text-center rounded-3xl">
          <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <p className="font-medium text-gray-600 dark:text-gray-300">{error}</p>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={fetchReviews}>
            <RotateCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </Card>
      ) : (
        <>
          {/* Overall Rating & Breakdown Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
              {/* flex-row দিয়ে সবসময় সব ডিভাইসে পাশাপাশি (Row wise) রাখা হয়েছে */}
              <div className="flex flex-row items-center justify-between gap-3 sm:gap-6">

                {/* Left Side: Score Display */}
                <div className="w-[42%] sm:w-[35%] shrink-0 border-r border-gray-100 dark:border-gray-800 pr-3 sm:pr-6">
                  <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1 sm:mb-2 truncate">
                    Overall Rating
                  </p>
                  <div className="flex items-center gap-1.5 sm:gap-3">
                    <Star className="w-6 h-6 sm:w-10 sm:h-10 fill-amber-400 text-amber-400 stroke-none shrink-0" />
                    <span className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-none">
                      {averageRating.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                    ({totalReviews} reviews)
                  </p>

                  {/* Status Badge */}
                  <div className="mt-2 sm:mt-3 inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-semibold">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>Excellent</span>
                  </div>
                </div>

                {/* Right Side: Progress Bars */}
                <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                  {RATING_KEYS.map((stars) => {
                    const count = ratingDistribution[stars] || 0;
                    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

                    return (
                      <div key={stars} className="flex items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs">
                        <div className="flex items-center gap-0.5 sm:gap-1 w-5 sm:w-6 font-medium text-gray-600 dark:text-gray-400 shrink-0">
                          <span>{stars}</span>
                          <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-400 shrink-0" />
                        </div>
                        <div className="flex-1 h-2 sm:h-2.5 rounded-full bg-slate-100 dark:bg-gray-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="w-5 sm:w-8 text-right font-medium text-gray-400 dark:text-gray-500 shrink-0 text-[10px] sm:text-xs">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>

              </div>
            </Card>
          </motion.div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${activeTab === 'all'
                  ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-800 hover:bg-gray-50'
                }`}
            >
              All Reviews ({totalReviews})
            </button>
            {RATING_KEYS.map((stars) => (
              <button
                key={stars}
                onClick={() => setActiveTab(stars.toString())}
                className={`flex items-center gap-1 px-3.5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${activeTab === stars.toString()
                    ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-800 hover:bg-gray-50'
                  }`}
              >
                <span>{stars}</span>
                <Star className={`w-3 h-3 ${activeTab === stars.toString() ? 'fill-white' : 'fill-amber-400 text-amber-400'}`} />
                <span className="text-gray-400 font-normal">({ratingDistribution[stars] || 0})</span>
              </button>
            ))}
          </div>

          {/* Filter & Sort Dropdowns */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <div className="relative">
                <select className="appearance-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-1.5 pr-8 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">
                  <option>All Services</option>
                  <option>AC Service</option>
                  <option>Electrical Repair</option>
                  <option>Home Cleaning</option>
                  <option>Plumbing</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select className="appearance-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-1.5 pr-8 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">
                  <option>All Ratings</option>
                  <option>5 Stars</option>
                  <option>4 Stars</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select className="appearance-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-1.5 pr-8 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">
                  <option>All Time</option>
                  <option>This Month</option>
                  <option>This Year</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
              <span>Newest First</span>
            </button>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {filteredReviews.length === 0 ? (
              <Card className="p-12 text-center rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                <p className="text-gray-500 dark:text-gray-400 font-medium">No reviews found for this selection.</p>
              </Card>
            ) : (
              filteredReviews.map((review, index) => (
                <motion.div
                  key={review._id || index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">

                    {/* Header: User Info & Rating */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={review.customer?.avatar}
                          name={review.customer?.name || 'Customer'}
                          className="w-11 h-11 rounded-full object-cover border border-gray-100"
                        />
                        <div>
                          <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                            {review.customer?.name || 'Customer'}
                          </h3>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {formatReviewDate(review.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* 5-Star Render */}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${star <= Math.round(review.rating || 5)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'fill-gray-200 text-gray-200 dark:fill-gray-800 dark:text-gray-800'
                                }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-100 dark:border-gray-700">
                          {Number(review.rating || 5).toFixed(1)}
                        </span>
                        <button className="text-gray-400 hover:text-gray-600 ml-1">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Service Name Badge */}
                    {review.service?.name && (
                      <div className="mt-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                          {review.service?.name.includes('AC') ? <Wrench className="w-3 h-3" /> :
                            review.service?.name.includes('Electric') ? <Zap className="w-3 h-3" /> :
                              <Home className="w-3 h-3" />}
                          {review.service.name}
                        </span>
                      </div>
                    )}

                    {/* Review Content */}
                    {review.comment && (
                      <p className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-gray-300 font-normal">
                        {review.comment}
                      </p>
                    )}

                    {/* Optional Images Attachments */}
                    {review.images && review.images.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                        {review.images.map((imgUrl, imgIdx) => (
                          <img
                            key={imgIdx}
                            src={imgUrl}
                            alt="Work preview"
                            className="w-20 h-16 object-cover rounded-xl border border-gray-100 dark:border-gray-800"
                          />
                        ))}
                      </div>
                    )}

                    {/* Footer Reply Action */}
                    {/* <div className="mt-4 flex items-center justify-end">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold transition-colors">
                        <CornerDownRight className="w-3.5 h-3.5" />
                        Reply
                      </button>
                    </div> */}

                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ReviewsPage;