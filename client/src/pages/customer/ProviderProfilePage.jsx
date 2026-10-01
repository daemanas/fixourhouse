import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star,
  MapPin,
  Clock,
  Heart,
  Award,
  Briefcase,
  Users,
  MessageSquare,
  BadgeCheck,
  Loader2,
  Calendar,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import RatingStars from '../../components/ui/RatingStars';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import { getProviderById } from '../../services/providerService';
import { getProviderReviews } from '../../services/reviewService';
import { getWishlist, toggleWishlist } from '../../services/userService';
import { summarizeAvailability, formatTime12h } from '../../utils/availability';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatLocation = (provider) => {
  const loc = provider.location;
  if (!loc) return '';
  return [loc.area, loc.city, loc.state].filter(Boolean).join(', ');
};

const formatPrice = (price) => {
  if (!price) return 'Price on request';
  return `₹${price}`;
};

export function ProviderProfilePage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('services');
  const [wishlisted, setWishlisted] = useState(false);
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const fetchProvider = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProviderById(id);
      setProvider(res.data.data.provider);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load provider profile.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const res = await getProviderReviews(id, { page: 1, limit: 20 });
      setReviews(res.data.data.reviews || []);
    } catch (err) {
      // Reviews are optional - don't block the page
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  const fetchWishlist = useCallback(async () => {
    try {
      const res = await getWishlist();
      const wishlist = res.data?.data?.wishlist || [];
      setWishlisted(wishlist.some((p) => p._id === id));
    } catch (err) {
      // Wishlist optional - don't block the page
      setWishlisted(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProvider();
    fetchReviews();
    fetchWishlist();
  }, [fetchProvider, fetchReviews, fetchWishlist]);

  const handleToggleWishlist = async () => {
    setWishlisted((prev) => !prev);
    try {
      await toggleWishlist(id);
    } catch (err) {
      // Revert on failure
      setWishlisted((prev) => !prev);
    }
  };

  const tabs = [
    { id: 'services', label: 'Services' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'about', label: 'About' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Provider not found"
        description={error || 'This provider may not be available.'}
        action={
          <Link to="/customer/search">
            <Button>Browse Providers</Button>
          </Link>
        }
      />
    );
  }

  const services = provider.services || [];
  const reviewCount = provider.reviewCount || reviews.length || 0;
  const rating = provider.rating || 0;
  const jobsCompleted = provider.jobsCompleted || 0;
  const experience = provider.experience || 0;
  const completionRate = provider.stats?.completionRate || 0;
  const availabilitySummary = summarizeAvailability(provider.availability);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <Avatar
                src={provider}
                name={provider.businessName}
                size="xl"
                rounded="rounded-2xl"
              />
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">
                    {provider.businessName}
                  </h1>
                  {provider.verificationStatus === 'approved' && (
                    <Badge variant="success" className="flex items-center gap-1">
                      <BadgeCheck className="h-3 w-3" /> Verified
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-gray-500 dark:text-gray-400">{provider.category}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-ink-light dark:text-ink-dark">
                      {rating.toFixed(1)}
                    </span>
                    ({reviewCount} reviews)
                  </span>
                  {formatLocation(provider) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {formatLocation(provider)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4" /> {experience} yrs experience
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Completion Rate</p>
                    <p className="font-semibold text-ink-light dark:text-ink-dark">
                      {completionRate ? `${completionRate}%` : 'N/A'}
                    </p>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Jobs Completed</p>
                    <p className="font-semibold text-ink-light dark:text-ink-dark">
                      {jobsCompleted.toLocaleString()}
                    </p>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Reviews</p>
                    <p className="font-semibold text-ink-light dark:text-ink-dark">{reviewCount}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <div className="flex gap-2">
                <button
                  onClick={handleToggleWishlist}
                  className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Add to wishlist"
                >
                  <Heart
                    className={`h-5 w-5 ${
                      wishlisted ? 'fill-danger-500 text-danger-500' : 'text-gray-400'
                    }`}
                  />
                </button>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-ink-light dark:text-ink-dark">
                  {formatPrice(provider.pricing?.basePrice)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">starting price</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Services Tab */}
      {activeTab === 'services' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {services.length === 0 ? (
            <Card className="p-8 text-center col-span-full">
              <p className="text-gray-500 dark:text-gray-400">
                This provider hasn't added any services yet.
              </p>
            </Card>
          ) : (
            services.map((service) => (
              <Card key={service._id} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-ink-light dark:text-ink-dark">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {service.description}
                      </p>
                    )}
                    {service.duration && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Duration: {service.duration}
                      </p>
                    )}
                  </div>
                  <p className="text-lg font-bold text-ink-light dark:text-ink-dark">
                    ₹{service.price}
                  </p>
                </div>
                <div className="mt-4">
                  <Link to={`/customer/book/${provider._id}?service=${service._id}`}>
                    <Button fullWidth>Book Now</Button>
                  </Link>
                </div>
              </Card>
            ))
          )}
        </motion.div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-ink-light dark:text-ink-dark">
                  {rating.toFixed(1)}
                </p>
                <RatingStars value={rating} size="sm" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {reviewCount} reviews
                </p>
              </div>
            </div>
          </div>
          {reviewsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : reviews.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No reviews yet"
              description="This provider hasn't received any reviews yet."
            />
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <span className="font-semibold text-primary-700 dark:text-primary-300">
                          {(review.customerId?.name || 'U').charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-ink-light dark:text-ink-dark">
                          {review.customerId?.name || 'Customer'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(review.createdAt)}
                        </p>
                      </div>
                    </div>
                    <RatingStars value={review.rating} size="sm" />
                  </div>
                  {review.comment && (
                    <p className="mt-4 text-gray-600 dark:text-gray-300">{review.comment}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <Card className="p-6">
            <h3 className="font-semibold text-ink-light dark:text-ink-dark mb-3">About</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {provider.description || 'No description provided.'}
            </p>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-6 text-center">
              <Award className="h-8 w-8 mx-auto text-primary-600 dark:text-primary-400 mb-2" />
              <p className="font-semibold text-ink-light dark:text-ink-dark">
                {experience} yrs
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Experience</p>
            </Card>
            <Card className="p-6 text-center">
              <Briefcase className="h-8 w-8 mx-auto text-secondary-600 dark:text-secondary-400 mb-2" />
              <p className="font-semibold text-ink-light dark:text-ink-dark">
                {jobsCompleted.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Jobs Completed</p>
            </Card>
            <Card className="p-6 text-center">
              <Users className="h-8 w-8 mx-auto text-success-600 dark:text-success-400 mb-2" />
              <p className="font-semibold text-ink-light dark:text-ink-dark">{reviewCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Reviews</p>
            </Card>
          </div>
          {provider.availability && (
            <Card className="p-6">
              <h3 className="font-semibold text-ink-light dark:text-ink-dark mb-3">
                Availability
              </h3>
              {availabilitySummary.dayRanges.length === 0 ? (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Calendar className="h-4 w-4" /> Not specified
                </div>
              ) : (
                <div className="space-y-2">
                  {availabilitySummary.dayRanges.map((d) => (
                    <div
                      key={d.key}
                      className="flex items-baseline gap-2 text-sm text-gray-600 dark:text-gray-300"
                    >
                      <span className="font-medium text-ink-light dark:text-ink-dark w-16">
                        {d.label}
                      </span>
                      {d.enabled && d.ranges.length > 0 ? (
                        <span>
                          {d.ranges.map((r, i) => (
                            <span key={i}>
                              {i > 0 && <span className="text-gray-400"> · </span>}
                              {formatTime12h(r.startTime)} – {formatTime12h(r.endTime)}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-gray-400">Unavailable</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default ProviderProfilePage;