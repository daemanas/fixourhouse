import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  MapPin,
  Calendar,
  ChevronDown,
  Check,
  IndianRupee,
  ListFilter,
  MoreHorizontal,
  Search,
  Play,
  CheckCircle2,
  Phone,
  MessageSquare,
  Loader2,
  LayoutGrid,
  SlidersHorizontal,
  Wrench,
  Zap,
  CreditCard,
  Banknote,
  Upload,
  Wallet,
  Camera,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import ImageUploadField from '../../components/ui/ImageUploadField';
import resolveAssetUrl from '../../utils/assetUrl';
import { getMyBookings, updateBookingStatus } from '../../services/bookingService';
import { uploadCompletedServicePhotos } from '../../services/completedPhotoService';

const statusConfig = {
  accepted: { label: 'Accepted', color: 'primary' },
  working: { label: 'Working', color: 'warning' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'danger' },
  rejected: { label: 'Rejected', color: 'danger' },
};

const tabs = [
  { key: 'all', label: 'All', icon: ListFilter },
  { key: 'accepted', label: 'Accepted', icon: CalendarDays },
  { key: 'working', label: 'Working', icon: Zap },
  { key: 'completed', label: 'Completed', icon: Check },
];

const paymentMethods = [
  { id: 'online', label: 'Online Payment', icon: CreditCard },
  { id: 'cash', label: 'Cash Payment', icon: Banknote },
];

const paymentLabels = {
  online: 'Online',
  cash: 'Cash',
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

function JobServiceImage({ service }) {
  const [imageFailed, setImageFailed] = useState(false);
  const source = service?.primaryImage || service?.image || service?.images?.[0] || '';
  const imageUrl = source ? resolveAssetUrl(source) : '';

  return imageUrl && !imageFailed ? (
    <img
      src={imageUrl}
      alt=""
      loading="lazy"
      onError={() => setImageFailed(true)}
      className="h-full w-full object-cover"
    />
  ) : (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
      <Wrench className="h-7 w-7" aria-hidden="true" />
      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">LocalFix</span>
    </div>
  );
}

export function JobsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [startModalJob, setStartModalJob] = useState(null);
  const [bookingIdInput, setBookingIdInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [completeModalJob, setCompleteModalJob] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [photoModalJob, setPhotoModalJob] = useState(null);
  // Real File objects for the two required photos (plus optional extras)
  const [photoFiles, setPhotoFiles] = useState([null, null]);
  const [photoCaption, setPhotoCaption] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const openPhotoModal = (job) => {
    setPhotoModalJob(job);
    setPhotoFiles([null, null]);
    setPhotoCaption('');
  };

  const handleUploadPhotos = async (e) => {
    if (e) e.preventDefault();
    const validFiles = photoFiles.filter(Boolean);
    if (validFiles.length < 2) {
      toast.error('At least 2 photos are required');
      return;
    }
    setUploadingPhotos(true);
    try {
      const formData = new FormData();
      formData.append('bookingId', photoModalJob._id);
      if (photoCaption.trim()) formData.append('caption', photoCaption.trim());
      
      validFiles.forEach((file) => {
        formData.append('photos', file);
      });

      await uploadCompletedServicePhotos(formData);
      toast.success('Completed work photos uploaded successfully!');
      setPhotoModalJob(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photos');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyBookings();
      const allBookings = res.data.data.bookings || [];
      // Provider jobs: accepted, working, completed (exclude pending/rejected/cancelled)
      const activeJobs = allBookings.filter((b) =>
        ['accepted', 'working', 'completed'].includes(b.status)
      );
      setJobs(activeJobs);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const serviceTypeOptions = [...new Set(jobs.map((job) => {
    const service = job.serviceId;
    const serviceType = service?.serviceType || job.serviceType || service?.serviceTypeId;
    return typeof serviceType === 'object' ? serviceType?.name : serviceType;
  }).filter(Boolean))];

  const filteredJobs = jobs.filter((job) => {
    if (activeTab !== 'all' && job.status !== activeTab) return false;

    const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
    if (normalizedSearch) {
      const searchableText = [
        job.serviceId?.name,
        job.customerId?.name,
        job.address?.line1,
        job.address?.city,
        job.address?.state,
      ].filter(Boolean).join(' ').toLocaleLowerCase();
      if (!searchableText.includes(normalizedSearch)) return false;
    }

    if (serviceTypeFilter !== 'all') {
      const service = job.serviceId;
      const serviceType = service?.serviceType || job.serviceType || service?.serviceTypeId;
      const serviceTypeName = typeof serviceType === 'object' ? serviceType?.name : serviceType;
      if (serviceTypeName !== serviceTypeFilter) return false;
    }

    if (dateFilter !== 'all' && job.scheduledDate) {
      const scheduled = new Date(job.scheduledDate);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      if (dateFilter === 'today' && (scheduled < todayStart || scheduled >= tomorrowStart)) return false;
      if (dateFilter === 'upcoming' && scheduled < todayStart) return false;
      if (dateFilter === 'past' && scheduled >= todayStart) return false;
    } else if (dateFilter !== 'all' && !job.scheduledDate) {
      return false;
    }

    return true;
  });

  const openCompleteModal = (job) => {
    setCompleteModalJob(job);
    setSelectedPaymentMethod(null);
  };

  const closeCompleteModal = () => {
    if (completeLoading) return;
    setCompleteModalJob(null);
    setSelectedPaymentMethod(null);
  };

  // Complete the job: the provider must first select how the customer paid
  // (Online/Cash). The backend validates the payment method, transitions the
  // booking from 'working' to 'completed' and returns the updated booking,
  // which is used to refresh the UI immediately.
  const handleCompleteJob = async () => {
    if (completeLoading || !completeModalJob) return;
    if (!selectedPaymentMethod) return;

    setCompleteLoading(true);
    try {
      const res = await updateBookingStatus(completeModalJob._id, 'completed', {
        paymentMethod: selectedPaymentMethod,
      });
      const updatedBooking = res.data?.data?.booking;
      const paymentLabel = paymentLabels[selectedPaymentMethod] || selectedPaymentMethod;
      toast.success(`Job completed successfully. Payment recorded as ${paymentLabel}.`);
      setJobs((prev) =>
        prev.map((j) =>
          j._id === completeModalJob._id
            ? updatedBooking || {
              ...j,
              status: 'completed',
              paymentMethod: selectedPaymentMethod,
              completedAt: new Date().toISOString(),
            }
            : j
        )
      );
      closeCompleteModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete the job. Please try again.');
    } finally {
      setCompleteLoading(false);
    }
  };

  const openStartModal = (job) => {
    setStartModalJob(job);
    setBookingIdInput('');
    setVerifyError(null);
  };

  const closeStartModal = () => {
    setStartModalJob(null);
    setBookingIdInput('');
    setVerifyError(null);
  };

  // Verify the customer's Booking ID on the backend before moving the job to 'working'.
  // All status changes are performed only by the backend; this handler just submits
  // the entered ID together with the booking for server-side verification.
  const handleStartJob = async () => {
    if (verifyLoading || !startModalJob) return;

    const enteredBookingId = bookingIdInput.trim();
    if (!enteredBookingId) {
      setVerifyError('Please enter the Booking ID provided by the customer.');
      return;
    }

    setVerifyLoading(true);
    setVerifyError(null);
    try {
      await updateBookingStatus(startModalJob._id, 'working', {
        bookingId: enteredBookingId,
      });
      toast.success('Job started');
      setJobs((prev) =>
        prev.map((j) => (j._id === startModalJob._id ? { ...j, status: 'working' } : j))
      );
      closeStartModal();
    } catch (err) {
      setBookingIdInput('');
      setVerifyError(
        err.response?.data?.message || 'Failed to start job. Please try again.'
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4" aria-label="Loading jobs">
        <div className="h-9 w-44 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-5 w-72 max-w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="flex gap-2 overflow-hidden py-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-12 w-36 shrink-0 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-card-dark sm:gap-4 sm:p-4">
            <div className="h-28 w-24 shrink-0 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800 sm:h-32 sm:w-32" />
            <div className="min-w-0 flex-1 space-y-3 py-1">
              <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="flex gap-2 pt-1">
                <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Failed to load jobs"
        description={error}
        action={
          <Button onClick={fetchJobs}>Try Again</Button>
        }
      />
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 overflow-x-hidden sm:space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold leading-tight text-ink-light dark:text-ink-dark sm:text-3xl">My Jobs</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your service jobs and track progress</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSearchOpen((value) => !value)}
            aria-label={searchOpen ? 'Close job search' : 'Search jobs'}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-primary-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-primary-400"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </button>
          <Link
            to="/provider/notifications"
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-primary-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-primary-400"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {searchOpen && (
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search service, customer or location"
            aria-label="Search jobs"
            className="input h-11 rounded-xl pl-10 text-sm"
          />
        </label>
      )}

      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-full gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const count = tab.key === 'all' ? jobs.length : jobs.filter((job) => job.status === tab.key).length;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={active}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors sm:min-h-12 sm:px-4 ${active
                  ? 'bg-primary-700 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
                <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs ${active ? 'bg-white/20 text-white' : 'bg-white text-gray-600 dark:bg-gray-700 dark:text-gray-200'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2.5">
          <label className="relative flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-card-dark dark:text-gray-300">
            <CalendarDays className="h-4 w-4 text-gray-500" aria-hidden="true" />
            <span className="text-xs font-medium">Date</span>
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              aria-label="Filter jobs by date"
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </label>

          <label className={`relative flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-card-dark dark:text-gray-300 ${serviceTypeOptions.length === 0 ? 'opacity-60' : ''}`}>
            <LayoutGrid className="h-4 w-4 text-gray-500" aria-hidden="true" />
            <span className="text-xs font-medium">Service Type</span>
            <select
              value={serviceTypeFilter}
              onChange={(event) => setServiceTypeFilter(event.target.value)}
              aria-label="Filter jobs by service type"
              disabled={serviceTypeOptions.length === 0}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              <option value="all">All service types</option>
              {serviceTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </label>

          <label className="relative flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-card-dark dark:text-gray-300">
            <SlidersHorizontal className="h-4 w-4 text-gray-500" aria-hidden="true" />
            <span className="text-xs font-medium">Status</span>
            <select
              value={activeTab}
              onChange={(event) => setActiveTab(event.target.value)}
              aria-label="Filter jobs by status"
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {tabs.map((tab) => <option key={tab.key} value={tab.key}>{tab.label}</option>)}
            </select>
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </label>
        </div>
      </div>

      {filteredJobs.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No jobs found"
          description="Jobs in this view will appear here."
        />
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredJobs.map((job, index) => {
            const customer = job.customerId;
            const customerName = customer?.name || 'Customer';
            const customerAvatar = customer?.avatar;
            const customerPhone = customer?.phone;
            const service = job.serviceId || job.serviceSnapshot || {};
            const locationStr = [job.address?.line1, job.address?.city, job.address?.state].filter(Boolean).join(', ');
            const scheduledDate = job.scheduledDate
              ? new Date(job.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : null;
            const scheduledTime = job.scheduledTime || job.timeSlot;
            const statusInfo = statusConfig[job.status] || { label: job.status, color: 'primary' };

            return (
              <motion.div
                key={job._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.2) }}
              >
                <Card className="overflow-hidden rounded-2xl p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4">
                  <div className="flex min-w-0 gap-3 sm:gap-4">
                    <div className="h-[150px] w-[clamp(120px,36vw,140px)] shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 sm:h-[160px] sm:w-[140px] lg:h-36 lg:w-36">
                      <JobServiceImage service={service} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="line-clamp-2 text-sm font-bold leading-5 text-ink-light dark:text-ink-dark sm:text-base">
                            {service?.name || 'Service'}
                          </h2>
                          <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                            <Avatar src={customerAvatar} name={customerName} size="xs" />
                            <span className="truncate">{customerName}</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <Badge variant={statusInfo.color} className="whitespace-nowrap px-2 py-1 text-[10px] sm:text-xs">
                            {statusInfo.label}
                          </Badge>
                          {job.amount !== undefined && job.amount !== null && (
                            <span className="inline-flex items-center text-sm font-bold text-primary-800 dark:text-primary-300 sm:text-base">
                              <IndianRupee className="h-3.5 w-3.5" aria-hidden="true" />
                              {Number(job.amount).toLocaleString('en-IN')}
                            </span>
                          )}
                          <ArrowRight className="hidden h-4 w-4 text-gray-400 sm:block" aria-hidden="true" />
                        </div>
                      </div>

                      <div className="mt-2.5 space-y-1.5">
                        {locationStr && (
                          <p className="flex min-w-0 items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{locationStr}</span>
                          </p>
                        )}
                        {(scheduledDate || scheduledTime) && (
                          <p className="flex min-w-0 items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{[scheduledDate, scheduledTime].filter(Boolean).join(' · ')}</span>
                          </p>
                        )}
                        {job.status === 'completed' && (job.paymentMethod || job.completedAt) && (
                          <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-gray-400">
                            <Wallet className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">
                              {[paymentLabels[job.paymentMethod], job.completedAt && `Completed ${formatDateTime(job.completedAt)}`].filter(Boolean).join(' · ')}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                    {customerPhone && (
                      <a
                        href={`tel:${customerPhone}`}
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-primary-50 px-3 text-xs font-semibold text-primary-800 transition hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-300 dark:hover:bg-primary-900/40"
                      >
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" /> Contact
                      </a>
                    )}

                    {job.status === 'accepted' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => openStartModal(job)}
                        disabled={actionLoading === job._id}
                        className="min-h-9 rounded-lg px-3"
                      >
                        {actionLoading === job._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                        Start Job
                      </Button>
                    )}
                    {job.status === 'working' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => openCompleteModal(job)}
                        disabled={actionLoading === job._id}
                        className="min-h-9 rounded-lg px-3"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Complete Job
                      </Button>
                    )}
                    {job.status === 'completed' && (
                      <>
                        <span className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-success-50 px-2.5 text-xs font-semibold text-success-700 dark:bg-success-900/20 dark:text-success-300">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Completed
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPhotoModal(job)}
                          className="min-h-9 rounded-lg px-3"
                        >
                          <Camera className="h-3.5 w-3.5" /> Photos
                        </Button>
                      </>
                    )}

                    <button
                      type="button"
                      aria-label="More job actions"
                      title="More job actions"
                      className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Start Job — Booking ID Verification Modal */}
      <Modal
        isOpen={!!startModalJob}
        onClose={() => {
          if (!verifyLoading) closeStartModal();
        }}
        title="Start Job"
        subtitle="Booking ID verification required"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Enter the Booking ID provided by the customer to start this job.
          </p>
          <Input
            label="Booking ID"
            value={bookingIdInput}
            onChange={(e) => {
              setBookingIdInput(e.target.value);
              if (verifyError) setVerifyError(null);
            }}
            placeholder="e.g. LF-XXXXXXXXXXXX"
            error={verifyError}
            disabled={verifyLoading}
            autoFocus
            maxLength={64}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !verifyLoading) handleStartJob();
            }}
          />
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={closeStartModal} disabled={verifyLoading}>
              Cancel
            </Button>
            <Button onClick={handleStartJob} loading={verifyLoading}>
              Verify & Start Job
            </Button>
          </div>
        </div>
      </Modal>

      {/* Complete Job — Payment Method Modal */}
      <Modal
        isOpen={!!completeModalJob}
        onClose={closeCompleteModal}
        title="Complete Job"
        subtitle="How did the customer pay for this service?"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedPaymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedPaymentMethod(method.id)}
                  disabled={completeLoading}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${isSelected
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  <Icon
                    className={`h-5 w-5 ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
                      }`}
                  />
                  <span className="text-sm font-medium text-ink-light dark:text-ink-dark">
                    {method.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={closeCompleteModal} disabled={completeLoading}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleCompleteJob}
              disabled={!selectedPaymentMethod}
              loading={completeLoading}
            >
              Confirm & Complete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Upload Completed Work Photos Modal */}
      <Modal
        isOpen={!!photoModalJob}
        onClose={() => {
          if (!uploadingPhotos) setPhotoModalJob(null);
        }}
        title="Upload Completed Work Photos"
        subtitle="Select at least 2 photos showcasing the finished service"
      >
        <form onSubmit={handleUploadPhotos} className="space-y-4">
          <ImageUploadField
            label="Photo 1 *"
            value={photoFiles[0]}
            onChange={(file) => setPhotoFiles((prev) => { const next = [...prev]; next[0] = file; return next; })}
            disabled={uploadingPhotos}
          />
          <ImageUploadField
            label="Photo 2 *"
            value={photoFiles[1]}
            onChange={(file) => setPhotoFiles((prev) => { const next = [...prev]; next[1] = file; return next; })}
            disabled={uploadingPhotos}
          />
          <Input
            label="Caption (Optional)"
            value={photoCaption}
            onChange={(e) => setPhotoCaption(e.target.value)}
            placeholder="e.g. Cleaned filter and recharged AC coolant"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPhotoModalJob(null)}
              disabled={uploadingPhotos}
            >
              Cancel
            </Button>
            <Button type="submit" loading={uploadingPhotos}>
              <Upload className="h-4 w-4" />
              Upload Photos
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default JobsPage;