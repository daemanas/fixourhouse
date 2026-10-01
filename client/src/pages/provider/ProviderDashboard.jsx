import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  UserRound,
  Wallet,
  XCircle,
  IndianRupee,
  Star,
  Loader2,
  Wrench,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyAvailability, getProviderEarnings, getProviderStats } from '../../services/providerService';
import { getMyBookings } from '../../services/bookingService';
import Avatar from '../../components/ui/Avatar';
import resolveAssetUrl from '../../utils/assetUrl';

const statusConfig = {
  pending: { label: 'New Request', className: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' },
  accepted: { label: 'Assigned', className: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300' },
  working: { label: 'In Progress', className: 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' },
  rejected: { label: 'Rejected', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
};

const quickActions = [
  { to: '/provider/services', label: 'My Services', icon: Wrench, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' },
  { to: '/provider/jobs', label: 'My Jobs', icon: CalendarCheck, color: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300' },
  { to: '/provider/earnings', label: 'Earnings', icon: Wallet, color: 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300' },
  { to: '/provider/reviews', label: 'Reviews', icon: Star, color: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300' },
  { to: '/provider/profile', label: 'Profile', icon: UserRound, color: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' },
];

const getServiceImage = (booking) => {
  const service = booking.serviceId || booking.serviceSnapshot || {};
  const source = service.primaryImage || service.image || service.images?.[0] || '';
  return source ? resolveAssetUrl(source) : '';
};

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
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
      <Wrench className="h-7 w-7" aria-hidden="true" />
      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">LocalFix</span>
    </div>
  );
}

export function ProviderDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [providerInfo, setProviderInfo] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [cancelledCount, setCancelledCount] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, bookingsRes] = await Promise.all([
        getProviderStats(),
        getMyBookings({ limit: 5 }),
      ]);
      setStats(statsRes.data.data.stats);
      setProviderInfo(statsRes.data.data.provider || null);
      setRecentBookings(bookingsRes.data.data.bookings || []);

      const [earningsResult, cancelledResult, availabilityResult] = await Promise.allSettled([
        getProviderEarnings(),
        getMyBookings({ status: 'cancelled', page: 1, limit: 1 }),
        getMyAvailability(),
      ]);
      if (earningsResult.status === 'fulfilled') {
        setEarnings(earningsResult.value.data?.data?.earnings || null);
      }
      if (cancelledResult.status === 'fulfilled') {
        setCancelledCount(cancelledResult.value.data?.data?.pagination?.total ?? 0);
      }
      if (availabilityResult.status === 'fulfilled') {
        setAvailability(availabilityResult.value.data?.data?.availability || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Failed to load dashboard"
        description={error}
        action={
          <Button onClick={fetchDashboard}>Try Again</Button>
        }
      />
    );
  }

  const isVerified =
    providerInfo?.isVerified ||
    ['approved', 'verified'].includes(providerInfo?.verificationStatus) ||
    ['approved', 'verified'].includes(user?.verificationStatus);

  const providerName = user?.name || providerInfo?.businessName || 'Provider';
  const completedCount = Number(stats?.completedBookings || 0);
  const workingCount = Number(stats?.workingBookings || 0);
  const bookingsTotal = Number(stats?.totalBookings || 0);
  const cancelledBookings = cancelledCount;
  const availableDays = availability ? Object.values(availability).filter((day) => day?.enabled && day?.slots?.length).length : null;
  const availableForJobs = availableDays > 0;
  const statsTiles = [
    { label: 'Total Jobs', value: bookingsTotal, icon: Briefcase, style: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' },
    { label: 'Completed', value: completedCount, icon: CheckCircle2, style: 'bg-lime-50 text-lime-700 dark:bg-lime-900/20 dark:text-lime-300' },
    { label: 'Ongoing', value: workingCount, icon: Clock, style: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300' },
    { label: 'Cancelled', value: cancelledBookings, icon: XCircle, style: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' },
  ];

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-5 overflow-x-hidden sm:space-y-7">
      <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-card-dark sm:flex-row sm:items-center sm:p-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative shrink-0">
            <Avatar src={user?.avatar || providerInfo?.avatar} name={providerName} size="xl" />
            <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white dark:border-card-dark ${availableForJobs ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} aria-label={availableForJobs ? 'Available' : 'Unavailable'} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">Hello,</p>
            <h1 className="truncate text-xl font-bold text-ink-light dark:text-ink-dark sm:text-2xl">{providerName}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Service Provider</p>
            {Number(stats?.avgRating) > 0 && (
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-amber-900/20 dark:text-gray-200">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                {Number(stats.avgRating).toFixed(1)}
                {Number(stats?.totalReviews) > 0 && <span className="font-normal text-gray-500">({stats.totalReviews} reviews)</span>}
              </div>
            )}
          </div>
        </div>

        <Link to="/provider/availability" className="block sm:w-64 sm:shrink-0">
          <div className="flex min-h-[76px] items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 transition hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:hover:bg-emerald-900/20">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-emerald-900 dark:text-emerald-200">{availableDays === null ? 'Availability schedule' : availableForJobs ? 'Available for Jobs' : 'Not available for jobs'}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{availableDays === null ? 'Set your working hours' : availableForJobs ? `${availableDays} active ${availableDays === 1 ? 'day' : 'days'} · You can receive new requests` : 'Enable a working day to receive requests'} · Manage schedule</p>
            </div>
            <span className={`relative h-7 w-12 shrink-0 rounded-full ${availableForJobs ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'}`} aria-hidden="true">
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${availableForJobs ? 'left-6' : 'left-1'}`} />
            </span>
          </div>
        </Link>
      </section>

      {isVerified && (
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <BadgeCheck className="h-4 w-4" aria-hidden="true" /> LocalFix verified provider
        </div>
      )}
      {!isVerified && (
        <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300">
          <Clock className="h-4 w-4" aria-hidden="true" /> Provider verification is pending
        </div>
      )}

      <Link to="/provider/requests" className="group block overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 p-4 text-white shadow-sm transition hover:shadow-md sm:p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15 sm:h-16 sm:w-16">
            <Wrench className="h-8 w-8" strokeWidth={1.6} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold sm:text-lg">Ready to get new jobs?</h2>
            <p className="mt-1 max-w-2xl text-xs text-emerald-50/90 sm:text-sm">Keep your profile updated and accept requests to grow your business.</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </div>
      </Link>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4" aria-label="Job statistics">
        {statsTiles.map(({ label, value, icon: Icon, style }, index) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: index * 0.04 }}>
            <Card className="h-full rounded-2xl p-3 shadow-sm sm:p-4">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${style}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <p className="mt-3 text-2xl font-bold text-ink-light dark:text-ink-dark">{value === null ? '—' : value}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">{label}</p>
            </Card>
          </motion.div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4" aria-label="Earnings and rating">
        <Link to="/provider/earnings" className="group min-w-0">
          <Card className="flex min-h-[92px] items-center gap-3 rounded-2xl p-4 shadow-sm transition hover:shadow-md sm:p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"><Wallet className="h-6 w-6" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xl font-bold text-ink-light dark:text-ink-dark">{earnings ? `₹${Number(earnings.totalEarnings || 0).toLocaleString('en-IN')}` : '—'}</span><span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">Total Earnings</span></span>
            <ArrowRight className="h-5 w-5 shrink-0 text-gray-400 transition group-hover:translate-x-1 group-hover:text-primary-600" aria-hidden="true" />
          </Card>
        </Link>
        <Link to="/provider/reviews" className="group min-w-0">
          <Card className="flex min-h-[92px] items-center gap-3 rounded-2xl p-4 shadow-sm transition hover:shadow-md sm:p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"><Star className="h-6 w-6 fill-amber-400 text-amber-400" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xl font-bold text-ink-light dark:text-ink-dark">{Number(stats?.avgRating || 0).toFixed(1)}</span><span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">Provider Rating{Number(stats?.totalReviews) > 0 ? ` · ${stats.totalReviews} reviews` : ''}</span></span>
            <ArrowRight className="h-5 w-5 shrink-0 text-gray-400 transition group-hover:translate-x-1 group-hover:text-primary-600" aria-hidden="true" />
          </Card>
        </Link>
      </section>

      <nav className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Provider quick actions">
        {quickActions.map(({ to, label, icon: Icon, color }) => (
          <Link key={to} to={to} className="group min-w-0">
            <div className={`flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border border-transparent px-2 py-3 text-center transition group-hover:-translate-y-0.5 group-hover:border-gray-200 group-hover:bg-white group-hover:shadow-sm dark:group-hover:border-gray-700 dark:group-hover:bg-card-dark sm:min-h-[104px] ${color}`}>
              <Icon className="h-6 w-6" strokeWidth={1.7} aria-hidden="true" />
              <span className="truncate text-xs font-semibold sm:text-sm">{label}</span>
            </div>
          </Link>
        ))}
      </nav>

      <section className="space-y-3" aria-labelledby="recent-requests-heading">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="recent-requests-heading" className="text-lg font-bold text-ink-light dark:text-ink-dark sm:text-xl">Recent Booking Requests</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Your latest booking activity</p>
          </div>
          <Link to="/provider/requests" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-700 hover:underline dark:text-primary-300 sm:text-sm">View All <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>

        {recentBookings.length === 0 ? (
          <Card className="rounded-2xl p-3 sm:p-5">
            <EmptyState icon={CalendarCheck} title="No bookings yet" description="New bookings will appear here." />
          </Card>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {recentBookings.map((booking, index) => {
              const customer = booking.customerId;
              const customerName = customer?.name || 'Customer';
              const service = booking.serviceId || booking.serviceSnapshot || {};
              const serviceName = service.name || service.serviceName || booking.serviceName || 'Service';
              const statusInfo = statusConfig[booking.status] || { label: booking.status, className: 'bg-gray-100 text-gray-600' };
              const address = booking.address || booking.bookingAddress || {};
              const location = [address.city, address.state].filter(Boolean).join(', ');
              const date = booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
              const canAccept = booking.status === 'pending';

              return (
                <motion.div key={booking._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.16) }}>
                  <Card className="overflow-hidden rounded-2xl p-3 shadow-sm sm:p-3.5">
                    <div className="grid min-w-0 grid-cols-[96px_minmax(0,1fr)] gap-3 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                      <div className="h-[112px] overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 sm:h-[116px]">
                        <BookingServiceImage booking={booking} serviceName={serviceName} />
                      </div>
                      <div className="min-w-0 self-start sm:self-center">
                        <h3 className="line-clamp-2 text-sm font-bold leading-5 text-ink-light dark:text-ink-dark">{serviceName}</h3>
                        <p className="mt-1 truncate text-xs text-gray-600 dark:text-gray-300">{customerName}</p>
                        {location && <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{location}</span></p>}
                        {(date || booking.scheduledTime) && <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400"><Calendar className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{[date, booking.scheduledTime].filter(Boolean).join(' · ')}</span></p>}
                      </div>
                      <div className="col-span-2 flex items-center justify-between gap-2 border-t border-gray-100 pt-2.5 dark:border-gray-800 sm:col-span-1 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusInfo.className}`}>{statusInfo.label}</span>
                        {booking.amount !== undefined && booking.amount !== null && <span className="inline-flex items-center text-base font-bold text-emerald-700 dark:text-emerald-400"><IndianRupee className="h-3.5 w-3.5" />{Number(booking.amount).toLocaleString('en-IN')}</span>}
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-2.5 dark:border-gray-800">
                      <Link to={booking.status === 'pending' ? '/provider/requests' : '/provider/jobs'} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-primary-200 px-3 text-xs font-semibold text-primary-800 hover:bg-primary-50 dark:border-primary-900 dark:text-primary-300 dark:hover:bg-primary-900/20">View Details</Link>
                      {customer?.phone && <a href={`tel:${customer.phone}`} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-700"><Phone className="h-3.5 w-3.5" />Contact</a>}
                      {canAccept && <Link to="/provider/requests" className="inline-flex min-h-9 items-center justify-center rounded-lg bg-emerald-700 px-3.5 text-xs font-semibold text-white hover:bg-emerald-800">Accept</Link>}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default ProviderDashboard;