import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Star,
  Heart,
  Search,
  ArrowRight,
  Wrench,
  Home,
  Sparkles,
  ShieldCheck,
  Zap,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import RatingStars from '../../components/ui/RatingStars';
import EmptyState from '../../components/ui/EmptyState';
import { getMyBookings } from '../../services/bookingService';
import { getCategories } from '../../services/categoryService';
import { getWishlist } from '../../services/userService';

const categoryIcons = {
  'Home Cleaning': Home,
  'Plumbing': Wrench,
  'Electrical': Zap,
  'Beauty & Spa': Sparkles,
  'Appliance Repair': Wrench,
  'Pest Control': ShieldCheck,
};

const categoryColors = {
  'Home Cleaning': 'from-primary-500 to-primary-600',
  'Plumbing': 'from-secondary-500 to-secondary-600',
  'Electrical': 'from-amber-500 to-orange-600',
  'Beauty & Spa': 'from-pink-500 to-rose-600',
  'Appliance Repair': 'from-emerald-500 to-teal-600',
  'Pest Control': 'from-indigo-500 to-blue-600',
};

const statusStyles = {
  pending: 'warning',
  accepted: 'primary',
  working: 'info',
  completed: 'success',
  cancelled: 'danger',
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  // Handle "10:00 AM" or "14:00" formats
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m || 0).padStart(2, '0')} ${period}`;
};

const formatAmount = (amount) => {
  if (!amount && amount !== 0) return '';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

export function CustomerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeBookings: 0,
    pendingBookings: 0,
    acceptedBookings: 0,
    totalSpent: 0,
    wishlistCount: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, categoriesRes, wishlistRes] = await Promise.allSettled([
        getMyBookings({ limit: 5 }),
        getCategories(),
        getWishlist(),
      ]);

      // Bookings
      const bookings = bookingsRes.status === 'fulfilled'
        ? bookingsRes.value.data?.data?.bookings || []
        : [];
      setRecentBookings(bookings);

      // Categories
      const cats = categoriesRes.status === 'fulfilled'
        ? categoriesRes.value.data?.data?.categories || []
        : [];
      setCategories(cats);

      // Wishlist count
      const wishlist = wishlistRes.status === 'fulfilled'
        ? wishlistRes.value.data?.data?.wishlist || []
        : [];

      // Calculate real stats from bookings
      const totalBookings = bookingsRes.status === 'fulfilled'
        ? bookingsRes.value.data?.data?.pagination?.total || bookings.length
        : 0;
      const activeBookings = bookings.filter((b) =>
        ['pending', 'accepted', 'working'].includes(b.status)
      ).length;
      const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
      const acceptedBookings = bookings.filter((b) =>
        ['accepted', 'working'].includes(b.status)
      ).length;
      const totalSpent = bookings
        .filter((b) => b.status === 'completed')
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      setStats({
        totalBookings,
        activeBookings,
        pendingBookings,
        acceptedBookings,
        totalSpent,
        wishlistCount: wishlist.length,
      });

      if (bookingsRes.status === 'rejected' && categoriesRes.status === 'rejected' && wishlistRes.status === 'rejected') {
        setError('Failed to load dashboard data. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 p-8 text-white"
      >
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="mt-2 text-white/80 max-w-lg">
            Find trusted professionals for all your home service needs. Book in seconds, relax in minutes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/customer/search">
              <Button variant="white" size="lg">
                <Search className="h-4 w-4" />
                Book a Service
              </Button>
            </Link>
            <Link to="/customer/bookings">
              <Button variant="white-outline" size="lg">
                <Calendar className="h-4 w-4" />
                My Bookings
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {error && (
        <Card className="p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-danger-500" />
            <p className="text-sm text-red-500 font-medium">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            Retry
          </Button>
        </Card>
      )}

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Bookings"
            value={String(stats.totalBookings)}
            icon={Calendar}
            color="primary"
          />
          <StatCard
            title="Active Bookings"
            value={String(stats.activeBookings)}
            icon={Clock}
            color="secondary"
            trend={`${stats.pendingBookings} pending, ${stats.acceptedBookings} accepted`}
          />
          <StatCard
            title="Total Spent"
            value={formatAmount(stats.totalSpent) || '₹0'}
            icon={Zap}
            color="success"
          />
          <StatCard
            title="Wishlist"
            value={String(stats.wishlistCount)}
            icon={Heart}
            color="danger"
          />
        </div>
      )}

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-ink-light dark:text-ink-dark">Popular Categories</h2>
          <Link
            to="/customer/search"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {categories.length === 0 ? (
          <Card className="p-8 text-center text-gray-500 dark:text-gray-400">
            No categories available yet.
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((cat, i) => {
              const Icon = categoryIcons[cat.name] || Wrench;
              const color = categoryColors[cat.name] || 'from-primary-500 to-primary-600';
              return (
                <motion.div
                  key={cat._id || cat.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={`/customer/search?category=${cat.name.toLowerCase()}`}>
                    <Card className="p-6 text-center hover:shadow-card transition-shadow cursor-pointer">
                      <div className={`h-12 w-12 mx-auto rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <p className="text-sm font-medium text-ink-light dark:text-ink-dark">{cat.name}</p>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Bookings */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-ink-light dark:text-ink-dark">Recent Bookings</h2>
          <Link
            to="/customer/bookings"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : recentBookings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No bookings yet"
            description="Book your first service to get started."
            action={
              <Link to="/customer/search">
                <Button>Book a Service</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {recentBookings.map((booking) => (
              <Card key={booking._id} className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                      <Wrench className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink-light dark:text-ink-dark">
                        {booking.serviceName || booking.serviceId?.name || 'Service'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {booking.providerId?.businessName || 'Provider'}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(booking.scheduledDate)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatTime(booking.scheduledTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-ink-light dark:text-ink-dark">
                        {formatAmount(booking.amount)}
                      </p>
                      <Badge variant={statusStyles[booking.status] || 'default'}>
                        {booking.status}
                      </Badge>
                    </div>
                    {booking.status === 'completed' && booking.rating > 0 && (
                      <RatingStars value={booking.rating} size="sm" />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-bold text-ink-light dark:text-ink-dark mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link to="/customer/search">
            <Card className="p-6 hover:shadow-card transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                  <Search className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="font-medium text-ink-light dark:text-ink-dark">Find a Provider</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Search by service or category</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link to="/customer/wishlist">
            <Card className="p-6 hover:shadow-card transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-danger-50 dark:bg-danger-900/20 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-danger-600 dark:text-danger-400" />
                </div>
                <div>
                  <p className="font-medium text-ink-light dark:text-ink-dark">My Wishlist</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">View saved providers</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link to="/customer/notifications">
            <Card className="p-6 hover:shadow-card transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary-50 dark:bg-secondary-900/20 flex items-center justify-center">
                  <Star className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
                </div>
                <div>
                  <p className="font-medium text-ink-light dark:text-ink-dark">Notifications</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">View updates and alerts</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}

export default CustomerDashboard;