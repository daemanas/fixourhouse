import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Calendar,
  CalendarDays,
  Check,
  Clock,
  Filter,
  MapPin,
  Search,
  Star,
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
import resolveAssetUrl from '../../utils/assetUrl';

const statusConfig = {
  pending: { label: 'Pending', color: 'warning', icon: Clock },
  accepted: { label: 'Accepted', color: 'primary', icon: CheckCircle2 },
  working: { label: 'Working', color: 'info', icon: Wrench },
  completed: { label: 'Completed', color: 'success', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'danger', icon: XCircle },
  rejected: { label: 'Rejected', color: 'danger', icon: XCircle },
};

const filterTabs = [
  { id: 'all', label: 'All', tone: 'green' },
  { id: 'pending', label: 'Upcoming', tone: 'blue' },
  { id: 'accepted', label: 'Accepted', tone: 'blue' },
  { id: 'working', label: 'Ongoing', tone: 'amber' },
  { id: 'completed', label: 'Completed', tone: 'green' },
  { id: 'cancelled', label: 'Cancelled', tone: 'rose' },
  { id: 'rejected', label: 'Rejected', tone: 'rose' },
];

const progressSteps = [
  { label: 'Booking Placed', statuses: ['pending', 'accepted', 'working', 'completed'] },
  { label: 'Confirmed', statuses: ['accepted', 'working', 'completed'] },
  { label: 'In Progress', statuses: ['working', 'completed'] },
  { label: 'Completed', statuses: ['completed'] },
];

const getServiceName = (booking) =>
  booking.serviceSnapshot?.serviceName || booking.serviceName || booking.serviceId?.name || 'Service';

const getProviderName = (booking) => booking.providerId?.businessName || booking.providerId?.userId?.name || 'Provider';

const getServiceImage = (booking) => {
  const service = booking.serviceSnapshot || booking.serviceId || {};
  const image = service.primaryImage || service.image || service.images?.[0]
    || booking.serviceId?.primaryImage || booking.serviceId?.image || booking.serviceId?.images?.[0];
  return image ? resolveAssetUrl(image) : '';
};

const bookingSearchText = (booking) => [
  getServiceName(booking),
  getProviderName(booking),
  booking.address?.line1,
  booking.address?.city,
  booking.address?.state,
  booking.providerId?.location?.city,
].filter(Boolean).join(' ').toLocaleLowerCase();

function BookingServiceImage({ booking, serviceName }) {
  const [failed, setFailed] = useState(false);
  const image = getServiceImage(booking);

  return image && !failed ? (
    <img
      src={image}
      alt={serviceName}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  ) : (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
      <Wrench className="h-9 w-9" strokeWidth={1.5} aria-hidden="true" />
      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">LocalFix</span>
    </div>
  );
}

function BookingProgress({ status }) {
  if (['cancelled', 'rejected'].includes(status)) return null;
  const currentStep = status === 'pending' ? 0 : status === 'accepted' ? 1 : status === 'working' ? 2 : status === 'completed' ? 3 : -1;
  if (currentStep < 0) return null;

  return (
    <div className="grid grid-cols-4 gap-1 pt-2" aria-label="Booking progress">
      {progressSteps.map((step, index) => {
        const complete = index < currentStep;
        const current = index === currentStep;
        return (
          <div key={step.label} className="relative flex min-w-0 flex-col items-center text-center">
            {index < progressSteps.length - 1 && (
              <span className={`absolute left-1/2 top-3 h-px w-full border-t border-dashed ${index < currentStep ? 'border-emerald-500' : 'border-gray-300 dark:border-gray-700'}`} aria-hidden="true" />
            )}
            <span className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border ${complete ? 'border-emerald-600 bg-emerald-600 text-white' : current ? 'border-emerald-600 bg-white text-emerald-700 ring-2 ring-emerald-100 dark:bg-card-dark dark:text-emerald-300 dark:ring-emerald-900/30' : 'border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-card-dark'}`}>
              {complete ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <span className={`mt-1.5 max-w-full truncate text-[9px] leading-3 sm:text-[10px] ${current || complete ? 'font-semibold text-emerald-800 dark:text-emerald-300' : 'text-gray-400 dark:text-gray-500'}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
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

  const statusCounts = Object.fromEntries(filterTabs.map((tab) => [
    tab.id,
    tab.id === activeFilter && tab.id !== 'all'
      ? pagination.total
      : tab.id === 'all'
        ? pagination.total
        : bookings.filter((booking) => booking.status === tab.id).length,
  ]));

  const visibleBookings = bookings.filter((booking) => {
    const query = searchTerm.trim().toLocaleLowerCase();
    const matchesSearch = !query || bookingSearchText(booking).includes(query);
    const bookingDate = booking.scheduledDate ? new Date(booking.scheduledDate) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const matchesDate = dateFilter === 'all' || !bookingDate || (
      dateFilter === 'upcoming' ? bookingDate >= today : bookingDate < today
    );
    return matchesSearch && matchesDate;
  });

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 overflow-x-hidden sm:space-y-6">
      <header className="relative overflow-hidden rounded-2xl bg-white p-4 dark:bg-card-dark sm:p-5">
        <div className="pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full bg-emerald-50/80 dark:bg-emerald-900/10" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark sm:text-3xl">My Bookings</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track and manage all your service bookings</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              aria-label={searchOpen ? 'Close booking search' : 'Search bookings'}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            ><Search className="h-5 w-5" aria-hidden="true" /></button>
            <button
              type="button"
              onClick={() => setShowFilters((shown) => !shown)}
              aria-label="Toggle booking filters"
              aria-expanded={showFilters}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            ><Filter className="h-5 w-5" aria-hidden="true" /></button>
          </div>
        </div>
        {searchOpen && (
          <label className="relative mt-4 block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search service, provider or location"
              aria-label="Search bookings"
              className="input h-11 rounded-xl pl-10 text-sm"
            />
          </label>
        )}
        <div className="mt-3">
          <Link to="/customer/search" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white transition hover:bg-emerald-800">
            <Package className="h-4 w-4" aria-hidden="true" /> Book New Service
          </Link>
        </div>
      </header>

      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          {filterTabs.map((tab) => {
            const color = tab.tone === 'blue' ? 'bg-sky-50 text-sky-800 dark:bg-sky-900/20 dark:text-sky-300'
              : tab.tone === 'amber' ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                : tab.tone === 'rose' ? 'bg-rose-50 text-rose-800 dark:bg-rose-900/20 dark:text-rose-300'
                  : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300';
            const count = statusCounts[tab.id] || 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                aria-pressed={activeFilter === tab.id}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition sm:min-h-11 sm:px-4 sm:text-sm ${activeFilter === tab.id ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm' : `border-transparent ${color}`}`}
              >
                {tab.label}
                <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] ${activeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-white/75 dark:bg-black/10'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-card-dark">
          <span className="mr-1 text-xs font-semibold text-gray-500">Date</span>
          {[
            { value: 'all', label: 'Any date' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
          ].map((option) => (
            <button key={option.value} type="button" onClick={() => setDateFilter(option.value)} className={`min-h-8 rounded-full px-3 text-xs font-medium ${dateFilter === option.value ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
              {option.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <Card className="p-5 text-center sm:p-8">
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => fetchBookings()}>Try Again</Button>
        </Card>
      )}

      {!error && loading ? (
        <div className="space-y-3" aria-label="Loading bookings">
          {[0, 1, 2].map((item) => (
            <div key={item} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-card-dark sm:grid-cols-[170px_minmax(0,1fr)] sm:p-4">
              <div className="aspect-[16/8] animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800 sm:aspect-[4/3]" />
              <div className="space-y-3"><div className="h-5 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800" /><div className="h-4 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-800" /><div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" /><div className="h-10 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" /></div>
            </div>
          ))}
        </div>
      ) : !error && bookings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No bookings found"
          description="You haven't made any bookings yet. Your bookings will appear here."
          action={<Link to="/customer/search"><Button>Find Services</Button></Link>}
        />
      ) : !error && visibleBookings.length === 0 ? (
        <EmptyState icon={Search} title="No matching bookings" description="Try changing your search or date filter." />
      ) : (
        !error && (
          <div className="space-y-3 sm:space-y-4">
            {visibleBookings.map((booking, i) => {
              const providerName = getProviderName(booking);
              const serviceName = getServiceName(booking);
              const serviceId = booking.serviceId?._id || booking.serviceSnapshot?.serviceId;
              const statusTone = booking.status === 'pending' ? 'bg-sky-50 text-sky-800 dark:bg-sky-900/20 dark:text-sky-300'
                : booking.status === 'accepted' ? 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                  : booking.status === 'working' ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                    : booking.status === 'completed' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-800 dark:bg-rose-900/20 dark:text-rose-300';
              const canRebook = Boolean(serviceId);

              return (
                <motion.div key={booking._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.2) }}>
                  <Card className="overflow-hidden rounded-2xl p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4">
                    <div className="grid min-w-0 gap-3 sm:grid-cols-[160px_minmax(0,1fr)_auto] sm:gap-4 lg:grid-cols-[190px_minmax(0,1fr)_auto]">
                      <div className="relative aspect-[16/8] overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 sm:aspect-[4/3]">
                        <BookingServiceImage booking={booking} serviceName={serviceName} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="line-clamp-2 text-base font-bold text-ink-light dark:text-ink-dark sm:text-lg">{serviceName}</h2>
                            <div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                              <Avatar src={booking.providerId} name={providerName} size="xs" />
                              <p className="truncate">{providerName}</p>
                            </div>
                          </div>
                          <div className="shrink-0 sm:hidden">{getStatusBadge(booking.status)}</div>
                        </div>

                        {(Number(booking.providerId?.rating) > 0 || Number(booking.providerId?.reviewCount) > 0) && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                            {Number(booking.providerId?.rating) > 0 && <span className="font-semibold">{Number(booking.providerId.rating).toFixed(1)}</span>}
                            {Number(booking.providerId?.reviewCount) > 0 && <span className="text-gray-400">({booking.providerId.reviewCount} reviews)</span>}
                          </div>
                        )}

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex min-w-0 items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0 text-gray-500" />{formatDate(booking.scheduledDate)}</span>
                          <span className="inline-flex min-w-0 items-center gap-1.5"><Clock className="h-3.5 w-3.5 shrink-0 text-gray-500" />{formatTime(booking.scheduledTime)}</span>
                          {booking.address && <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 text-gray-500" /><span className="line-clamp-2">{formatAddress(booking.address)}</span></span>}
                        </div>
                      </div>

                      <aside className="hidden shrink-0 flex-col items-end justify-between gap-3 sm:flex">
                        {getStatusBadge(booking.status)}
                        <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">₹{Number(booking.amount || 0).toLocaleString('en-IN')}</span>
                      </aside>

                      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2.5 dark:border-gray-800 sm:col-span-3">
                        <div className="flex min-w-0 items-center gap-2 sm:hidden">
                          <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">₹{Number(booking.amount || 0).toLocaleString('en-IN')}</span>
                          <span className="truncate text-[10px] text-gray-400">{booking.bookingId}</span>
                        </div>
                        <div className="hidden min-w-0 flex-1 sm:block"><BookingProgress status={booking.status} /></div>
                        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                          <Button variant="outline" size="sm" className="min-h-9 rounded-lg px-3" onClick={() => setSelectedBooking(booking)}>View Details <ChevronRight className="h-4 w-4" /></Button>
                          {booking.status === 'pending' && (
                            <Button variant="danger" size="sm" className="min-h-9 rounded-lg px-3" onClick={() => { setSelectedBooking(booking); setShowCancelModal(true); }}>Cancel</Button>
                          )}
                          {(booking.status === 'accepted' || booking.status === 'working') && booking.providerId?.userId?.phone && (
                            <a href={`tel:${booking.providerId.userId.phone}`} className="hidden min-h-9 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 sm:inline-flex"><Phone className="h-3.5 w-3.5" />Contact</a>
                          )}
                          {booking.status === 'completed' && canRebook && (
                            <Link to={`/customer/service/${serviceId}`} className="inline-flex min-h-9 items-center rounded-lg border border-emerald-700 px-3 text-xs font-semibold text-emerald-800 dark:border-emerald-500 dark:text-emerald-300">Book Again</Link>
                          )}
                          {booking.status === 'cancelled' && canRebook && (
                            <Link to={`/customer/service/${serviceId}`} className="inline-flex min-h-9 items-center rounded-lg border border-rose-300 px-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:text-rose-300">Rebook</Link>
                          )}
                        </div>
                      </div>

                      <div className="sm:hidden"><BookingProgress status={booking.status} /></div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}

            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { const next = page - 1; setPage(next); fetchBookings(activeFilter, next); }}>Previous</Button>
                <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">Page {page} of {pagination.pages}</span>
                <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => { const next = page + 1; setPage(next); fetchBookings(activeFilter, next); }}>Next</Button>
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
                src={selectedBooking.providerId}
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