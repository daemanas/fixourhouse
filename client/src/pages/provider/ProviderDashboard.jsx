import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  CalendarCheck,
  IndianRupee,
  Star,
  TrendingUp,
  Clock,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getProviderStats } from '../../services/providerService';
import { getMyBookings } from '../../services/bookingService';
import Avatar from '../../components/ui/Avatar';

const statusConfig = {
  pending: { label: 'Pending', color: 'warning' },
  accepted: { label: 'Accepted', color: 'primary' },
  working: { label: 'Working', color: 'secondary' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'danger' },
  rejected: { label: 'Rejected', color: 'danger' },
};

export function ProviderDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [providerInfo, setProviderInfo] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
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

  const statCards = [
    {
      label: 'Total Bookings',
      value: String(stats?.totalBookings || 0),
      icon: Briefcase,
      trend: `${stats?.pendingBookings || 0} pending`,
      color: 'primary',
    },
    {
      label: 'Pending Requests',
      value: String(stats?.pendingBookings || 0),
      icon: CalendarCheck,
      trend: 'Awaiting action',
      color: 'warning',
    },
    {
      label: 'Completed Jobs',
      value: String(stats?.completedBookings || 0),
      icon: TrendingUp,
      trend: `${stats?.completionRate || 0}% completion`,
      color: 'success',
    },
    {
      label: 'Average Rating',
      value: String(stats?.avgRating || '0.0'),
      icon: Star,
      trend: `${stats?.totalReviews || 0} reviews`,
      color: 'secondary',
    },
  ];

  const isVerified =
    providerInfo?.isVerified ||
    ['approved', 'verified'].includes(providerInfo?.verificationStatus) ||
    ['approved', 'verified'].includes(user?.verificationStatus);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">
            Welcome back, {providerInfo?.businessName || user?.name || 'Provider'}
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Here's what's happening with your services today
          </p>
        </div>
        <Link to="/provider/availability">
          <Button variant="outline">
            <Clock className="h-4 w-4" />
            Update Availability
          </Button>
        </Link>
      </div>

      {/* Verification Status Banner */}
      {isVerified ? (
        <Card className="p-5 border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-emerald-900 dark:text-emerald-200">
                Account Verified (🟢)
              </h3>
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                Your provider profile is fully verified by LocalFix Admin. Your business is live and listed for customer search and bookings.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-5 border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-amber-900 dark:text-amber-200">
                Verification Pending (🟡)
              </h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Your account verification call is currently pending with the LocalFix team. Our administrator will contact you at your registered phone number to verify your services.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark">
                    Recent Bookings
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Your latest booking activity
                  </p>
                </div>
                <Link
                  to="/provider/jobs"
                  className="flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                >
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {recentBookings.length === 0 ? (
                <EmptyState
                  icon={CalendarCheck}
                  title="No bookings yet"
                  description="New bookings will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {recentBookings.map((booking) => {
                    const customer = booking.customerId;
                    const customerName = customer?.name || 'Customer';
                    const service = booking.serviceId;
                    const statusInfo = statusConfig[booking.status] || {
                      label: booking.status,
                      color: 'primary',
                    };
                    return (
                      <div
                        key={booking._id}
                        className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <Avatar src={customer?.avatar} name={customerName} size="md" />
                          <div className="min-w-0">
                            <p className="font-medium text-ink-light dark:text-ink-dark truncate">
                              {customerName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {service?.name || 'Service'} • {booking.scheduledTime || '—'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-semibold text-ink-light dark:text-ink-dark">
                            ₹{booking.amount ?? 0}
                          </span>
                          <Badge variant={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions & Performance */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card className="p-6">
              <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link to="/provider/requests" className="block">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors">
                    <CalendarCheck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    <div>
                      <p className="font-medium text-ink-light dark:text-ink-dark">Booking Requests</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {stats?.pendingBookings || 0} new requests
                      </p>
                    </div>
                  </div>
                </Link>
                <Link to="/provider/jobs" className="block">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-success-50 dark:bg-success-900/20 hover:bg-success-100 dark:hover:bg-success-900/30 transition-colors">
                    <TrendingUp className="h-5 w-5 text-success-600 dark:text-success-400" />
                    <div>
                      <p className="font-medium text-ink-light dark:text-ink-dark">My Jobs</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {stats?.workingBookings || 0} working now
                      </p>
                    </div>
                  </div>
                </Link>
                <Link to="/provider/profile" className="block">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary-50 dark:bg-secondary-900/20 hover:bg-secondary-100 dark:hover:bg-secondary-900/30 transition-colors">
                    <Star className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
                    <div>
                      <p className="font-medium text-ink-light dark:text-ink-dark">My Profile</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Update your profile</p>
                    </div>
                  </div>
                </Link>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="p-6">
              <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-4">
                Performance
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">Completion Rate</span>
                    <span className="font-medium text-ink-light dark:text-ink-dark">
                      {stats?.completionRate || 0}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-2 rounded-full bg-success-500"
                      style={{ width: `${stats?.completionRate || 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">Total Reviews</span>
                    <span className="font-medium text-ink-light dark:text-ink-dark">
                      {stats?.totalReviews || 0}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-2 rounded-full bg-primary-500"
                      style={{ width: `${Math.min((stats?.totalReviews || 0) * 10, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">Average Rating</span>
                    <span className="font-medium text-ink-light dark:text-ink-dark">
                      {stats?.avgRating || '0.0'} / 5
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-2 rounded-full bg-secondary-500"
                      style={{ width: `${((stats?.avgRating || 0) / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default ProviderDashboard;