import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  MessageSquare,
  MessageSquareWarning,
  Wrench,
  Package,
  Phone,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import RatingStars from '../../components/ui/RatingStars';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Avatar from '../../components/ui/Avatar';
import { getMyBookings, updateBookingStatus } from '../../services/bookingService';
import { createReview } from '../../services/reviewService';
import { createComplaint } from '../../services/complaintService';

const statusConfig = {
  pending: { label: 'Pending', color: 'warning', icon: Clock },
  accepted: { label: 'Accepted', color: 'primary', icon: CheckCircle2 },
  working: { label: 'Working', color: 'info', icon: Wrench },
  completed: { label: 'Completed', color: 'success', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'danger', icon: XCircle },
  rejected: { label: 'Rejected', color: 'danger', icon: XCircle },
};

const filterTabs = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'working', label: 'Working' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'rejected', label: 'Rejected' },
];

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatTime = (timeStr) => {
  if (!timeStr) return 'N/A';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m || '00'} ${ampm}`;
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatAddress = (address) => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  return [address.line1, address.line2, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(', ');
};

const buildTimeline = (booking) => {
  const timeline = [];
  const timestamp = booking.createdAt || booking.updatedAt;

  if (booking.status === 'pending') {
    timeline.push({ status: 'Booking Placed', date: formatDate(timestamp), completed: true });
    timeline.push({ status: 'Awaiting Provider', date: 'Pending', completed: false });
  } else if (booking.status === 'accepted') {
    timeline.push({ status: 'Booking Placed', date: formatDate(timestamp), completed: true });
    timeline.push({ status: 'Provider Accepted', date: formatDate(booking.updatedAt), completed: true });
  } else if (booking.status === 'rejected') {
    timeline.push({ status: 'Booking Placed', date: formatDate(timestamp), completed: true });
    timeline.push({ status: 'Provider Rejected', date: formatDate(booking.updatedAt), completed: true });
  } else if (booking.status === 'working') {
    timeline.push({ status: 'Booking Placed', date: formatDate(timestamp), completed: true });
    timeline.push({ status: 'Provider Accepted', date: formatDate(booking.updatedAt), completed: true });
    timeline.push({ status: 'Service Started', date: formatDate(booking.scheduledDate), completed: true });
  } else if (booking.status === 'completed') {
    timeline.push({ status: 'Booking Placed', date: formatDate(timestamp), completed: true });
    timeline.push({ status: 'Provider Accepted', date: formatDate(booking.updatedAt), completed: true });
    timeline.push({ status: 'Service Started', date: formatDate(booking.scheduledDate), completed: true });
    timeline.push({ status: 'Service Completed', date: formatDate(booking.completedAt || booking.updatedAt), completed: true });
  } else if (booking.status === 'cancelled') {
    timeline.push({ status: 'Booking Placed', date: formatDate(timestamp), completed: true });
    timeline.push({
      status: booking.cancelledBy === 'customer' ? 'Cancelled by You' : 'Cancelled',
      date: formatDate(booking.updatedAt),
      completed: true,
    });
  }

  return timeline;
};

export function BookingsPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  // Values below map 1:1 to the backend Complaint enums.
  const [complaintCategory, setComplaintCategory] = useState('service_quality');
  const [complaintPriority, setComplaintPriority] = useState('medium');
  const [complaintResolution, setComplaintResolution] = useState('other');
  const [complaintResolutionText, setComplaintResolutionText] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [submittedComplaintId, setSubmittedComplaintId] = useState(null);

  const fetchBookings = useCallback(
    async (status = activeFilter, pageNum = page) => {
      setLoading(true);
      setError(null);
      try {
        const params = { page: pageNum, limit: 10 };
        if (status !== 'all') params.status = status;
        const res = await getMyBookings(params);
        const { bookings: data, pagination: pg } = res.data.data;
        setBookings(data);
        setPagination(pg);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load bookings. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [activeFilter, page]
  );

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleTabChange = (tab) => {
    setActiveFilter(tab);
    setPage(1);
    fetchBookings(tab, 1);
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await updateBookingStatus(selectedBooking._id, 'cancelled', {
        reason: cancelReason || 'Cancelled by customer',
      });
      toast.success('Booking cancelled successfully');
      setShowCancelModal(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (rating < 1) {
      toast.error('Please select a rating from 1 to 5 stars');
      return;
    }
    setSubmittingReview(true);
    try {
      await createReview({
        bookingId: selectedBooking._id,
        rating,
        comment: reviewText,
      });
      toast.success('Review submitted successfully');
      setShowReviewModal(false);
      setRating(0);
      setReviewText('');
      setSelectedBooking(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitComplaint = async () => {
    if (!complaintDesc.trim()) {
      toast.error('Please describe your complaint');
      return;
    }
    if (!selectedBooking) {
      toast.error('No booking selected.');
      return;
    }
    setSubmittingComplaint(true);
    try {
      // Guard against an unselected enum (the Select placeholder renders an
      // empty value="" option). Sending '' for category/priority/resolution
      // would fail backend Joi validation with a 400.
      const category = complaintCategory || 'service_quality';
      const priority = complaintPriority || 'medium';
      const requestedResolution = complaintResolution || 'other';

      const res = await createComplaint({
        bookingId: selectedBooking._id,
        category,
        priority,
        requestedResolution,
        requestedResolutionText:
          requestedResolution === 'other' ? complaintResolutionText.trim() : '',
        description: complaintDesc.trim(),
        evidence: [],
      });
      const newId = res?.data?.data?.complaintId;
      setSubmittedComplaintId(newId || null);
      toast.success('Complaint submitted. Our team will review it shortly.');
      setShowComplaintModal(false);
      setComplaintDesc('');
      setComplaintResolutionText('');
      setSelectedBooking(null);
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (status === 409 && err?.response?.data?.data?.complaintId) {
        setSubmittedComplaintId(err.response.data.data.complaintId);
        toast.error(
          `An active complaint ${err.response.data.data.complaintId} already exists for this booking.`
        );
      } else if (status === 400) {
        toast.error(msg || 'This booking cannot be disputed right now.');
      } else if (status === 403) {
        toast.error(msg || 'You are not allowed to complain about this booking.');
      } else if (status === 404) {
        toast.error(msg || 'Booking not found.');
      } else {
        toast.error(msg || 'Failed to submit complaint. Please try again.');
      }
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = statusConfig[status];
    if (!config) return <Badge variant="default">{status}</Badge>;
    const Icon = config.icon;
    return (
      <Badge variant={config.color} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const providerAddress = (booking) => {
    const loc = booking.providerId?.location;
    if (!loc) return '';
    return [loc.area, loc.city].filter(Boolean).join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">My Bookings</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Track and manage all your service bookings
          </p>
        </div>
        <Link to="/customer/search">
          <Button>
            <Package className="h-4 w-4" />
            Book New Service
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              activeFilter === tab.id
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <Card className="p-8 text-center">
          <p className="text-red-500">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => fetchBookings()}>
            Try Again
          </Button>
        </Card>
      )}

      {/* Bookings List */}
      {!error && loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : !error && bookings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No bookings found"
          description="You haven't made any bookings in this category yet."
          action={
            <Link to="/customer/search">
              <Button>Find Services</Button>
            </Link>
          }
        />
      ) : (
        !error && (
          <div className="space-y-4">
            {bookings.map((booking, i) => (
              <motion.div
                key={booking._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-6 hover:shadow-card transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar
                        src={booking.providerId?.userId?.avatar}
                        name={booking.providerId?.businessName}
                        size="md"
                        rounded="rounded-xl"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-ink-light dark:text-ink-dark">
                            {booking.providerId?.businessName || 'Provider'}
                          </h3>
                          {getStatusBadge(booking.status)}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {booking.serviceName} • ₹{booking.amount}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {formatDate(booking.scheduledDate)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatTime(booking.scheduledTime)}
                          </span>
                          {booking.address && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {formatAddress(booking.address)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-ink-light dark:text-ink-dark">
                          ₹{booking.amount}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{booking.bookingId}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedBooking(booking)}>
                        View Details
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => {
                    const next = page - 1;
                    setPage(next);
                    fetchBookings(activeFilter, next);
                  }}
                >
                  Previous
                </Button>
                <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                  Page {page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.pages}
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    fetchBookings(activeFilter, next);
                  }}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )
      )}

      {/* Booking Details Modal */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Booking Details"
        size="lg"
        footer={
          selectedBooking && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {selectedBooking.status === 'pending' && (
                <Button
                  variant="danger"
                  onClick={() => {
                    setShowCancelModal(true);
                  }}
                >
                  Cancel Booking
                </Button>
              )}
              {selectedBooking.status === 'accepted' && selectedBooking.providerId?.userId?.phone && (
                <a
                  href={`tel:${selectedBooking.providerId.userId.phone}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  Call Provider
                </a>
              )}
              {selectedBooking.status === 'completed' && (
                <Button onClick={() => setShowReviewModal(true)}>
                  <MessageSquare className="h-4 w-4" />
                  Write Review
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowComplaintModal(true)}
              >
                <MessageSquareWarning className="h-4 w-4" />
                Raise Complaint
              </Button>
              <Button variant="outline" onClick={() => setSelectedBooking(null)}>
                Close
              </Button>
            </div>
          )
        }
      >
        {selectedBooking && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar
                src={selectedBooking.providerId?.userId?.avatar}
                name={selectedBooking.providerId?.businessName}
                size="lg"
                rounded="rounded-xl"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-ink-light dark:text-ink-dark">
                  {selectedBooking.providerId?.businessName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedBooking.serviceName}
                </p>
                <div className="mt-1">{getStatusBadge(selectedBooking.status)}</div>
              </div>
              {/* Contact provider when accepted/working */}
              {(selectedBooking.status === 'accepted' || selectedBooking.status === 'working') &&
                selectedBooking.providerId?.userId?.phone && (
                  <a
                    href={`tel:${selectedBooking.providerId.userId.phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    Contact Provider
                  </a>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">Booking ID</p>
                <p className="font-medium text-ink-light dark:text-ink-dark">
                  {selectedBooking.bookingId}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">Amount</p>
                <p className="font-medium text-ink-light dark:text-ink-dark">
                  ₹{selectedBooking.amount}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                <p className="font-medium text-ink-light dark:text-ink-dark">
                  {formatDate(selectedBooking.scheduledDate)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">Time</p>
                <p className="font-medium text-ink-light dark:text-ink-dark">
                  {formatTime(selectedBooking.scheduledTime)}
                </p>
              </div>
              {selectedBooking.address && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 col-span-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Service Address</p>
                  <p className="font-medium text-ink-light dark:text-ink-dark">
                    {formatAddress(selectedBooking.address)}
                  </p>
                </div>
              )}
              {selectedBooking.notes && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 col-span-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Notes</p>
                  <p className="font-medium text-ink-light dark:text-ink-dark">
                    {selectedBooking.notes}
                  </p>
                </div>
              )}
              {selectedBooking.status === 'completed' && (
                <>
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Payment Method</p>
                    <p className="font-medium text-ink-light dark:text-ink-dark capitalize">
                      {selectedBooking.paymentMethod === 'online'
                        ? 'Online'
                        : selectedBooking.paymentMethod === 'cash'
                        ? 'Cash'
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Completed At</p>
                    <p className="font-medium text-ink-light dark:text-ink-dark">
                      {formatDateTime(selectedBooking.completedAt)}
                    </p>
                  </div>
                </>
              )}
              {selectedBooking.cancelReason && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 col-span-2">
                  <p className="text-xs text-red-500 dark:text-red-400">Cancellation Reason</p>
                  <p className="font-medium text-red-600 dark:text-red-300">
                    {selectedBooking.cancelReason}
                  </p>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div>
              <h4 className="font-semibold text-ink-light dark:text-ink-dark mb-4">
                Booking Timeline
              </h4>
              <div className="space-y-0">
                {buildTimeline(selectedBooking).map((step, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          step.completed
                            ? 'bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                        }`}
                      >
                        {step.completed ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>
                      {index < buildTimeline(selectedBooking).length - 1 && (
                        <div
                          className={`w-0.5 flex-1 min-h-8 ${
                            step.completed
                              ? 'bg-success-500 dark:bg-success-400'
                              : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                        />
                      )}
                    </div>
                    <div className="pb-6">
                      <p className="font-medium text-ink-light dark:text-ink-dark">{step.status}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{step.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Booking"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to cancel this booking? This action cannot be undone.
          </p>
          <Textarea
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation (optional)"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Keep Booking
            </Button>
            <Button variant="danger" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Yes, Cancel Booking'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Write a Review"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
              Your Rating
            </label>
            <RatingStars value={rating} size="lg" onChange={setRating} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
              Your Review
            </label>
            <Textarea
              rows={4}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience with this provider..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowReviewModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReview} disabled={submittingReview}>
              {submittingReview ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Submit Review'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Complaint Modal */}
      <Modal
        isOpen={showComplaintModal}
        onClose={() => setShowComplaintModal(false)}
        title="Raise a Complaint"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Report an issue with this booking. Our admin team will review it and
            may reach out to the provider.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <Select
              options={[
                { value: 'service_quality', label: 'Service Quality' },
                { value: 'billing', label: 'Payment / Billing' },
                { value: 'provider_behavior', label: 'Provider Behavior' },
                { value: 'delay', label: 'Delay / Late Service' },
                { value: 'safety', label: 'Safety Concern' },
                { value: 'other', label: 'Other' },
              ]}
              value={complaintCategory}
              onChange={(e) => setComplaintCategory(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Priority</label>
            <Select
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
              value={complaintPriority}
              onChange={(e) => setComplaintPriority(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Requested Resolution
            </label>
            <Select
              options={[
                { value: 'refund', label: 'Refund' },
                { value: 'redo_service', label: 'Redo the Service' },
                { value: 'apology', label: 'Apology' },
                { value: 'other', label: 'Other' },
              ]}
              value={complaintResolution}
              onChange={(e) => setComplaintResolution(e.target.value)}
            />
          </div>
          {complaintResolution === 'other' && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                Describe your preferred resolution
              </label>
              <Textarea
                rows={2}
                value={complaintResolutionText}
                onChange={(e) => setComplaintResolutionText(e.target.value)}
                placeholder="Tell us how you'd like this resolved..."
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea
              rows={4}
              value={complaintDesc}
              onChange={(e) => setComplaintDesc(e.target.value)}
              placeholder="Describe the issue in detail..."
            />
          </div>
          {submittedComplaintId && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200">
              Your complaint{' '}
              <span className="font-semibold">{submittedComplaintId}</span> has
              been recorded. You can track it in{' '}
              <a
                href="/customer/complaints"
                className="font-semibold underline"
              >
                My Complaints
              </a>
              .
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowComplaintModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitComplaint} disabled={submittingComplaint}>
              {submittingComplaint ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Submit Complaint'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default BookingsPage;