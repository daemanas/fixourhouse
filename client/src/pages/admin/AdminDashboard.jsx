import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Wrench, CalendarCheck, IndianRupee, TrendingUp, Loader2, AlertTriangle } from 'lucide-react';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { getAdminStats } from '../../services/adminService';

const statusConfig = {
  completed: 'success',
  working: 'primary',
  accepted: 'primary',
  pending: 'warning',
  cancelled: 'danger',
  rejected: 'danger',
};

const columns = [
  { key: 'id', label: 'Booking ID', render: (row) => `#${row._id?.slice(-6) || '—'}` },
  { key: 'customer', label: 'Customer', render: (row) => row.customerId?.name || '—' },
  { key: 'provider', label: 'Provider', render: (row) => row.providerId?.businessName || '—' },
  { key: 'service', label: 'Service', render: (row) => row.service?.name || '—' },
  { key: 'amount', label: 'Amount', render: (row) => `₹${row.service?.price || 0}` },
  {
    key: 'status',
    label: 'Status',
    render: (row) => (
      <Badge variant={statusConfig[row.status] || 'primary'}>{row.status}</Badge>
    ),
  },
];

export function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminStats();
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
        icon={AlertTriangle}
        title="Failed to load dashboard"
        description={error}
        action={<Button onClick={fetchStats}>Try Again</Button>}
      />
    );
  }

  const stats = data?.stats || {};
  const recentBookings = data?.recentBookings || [];
  const revenueByMonth = data?.revenueByMonth || [];
  const topProviders = data?.topProviders || [];

  const statCards = [
    { icon: Users, label: 'Total Customers', value: String(stats.totalUsers || 0), trend: `${stats.blockedUsers || 0} blocked`, color: 'primary' },
    { icon: Wrench, label: 'Total Providers', value: String(stats.totalProviders || 0), trend: `${stats.pendingProviders || 0} pending`, color: 'secondary' },
    { icon: CalendarCheck, label: 'Total Bookings', value: String(stats.totalBookings || 0), trend: `${stats.activeBookings || 0} active`, color: 'success' },
    { icon: IndianRupee, label: 'Revenue', value: `₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}`, trend: `${stats.totalReports || 0} reports`, color: 'warning' },
  ];

  const maxRevenue = revenueByMonth.length > 0
    ? Math.max(...revenueByMonth.map((d) => d.revenue))
    : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Dashboard</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Welcome back, Admin. Here's what's happening today.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <StatCard
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              trend={stat.trend}
            />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark">
                Revenue (Last 6 Months)
              </h2>
              <Badge variant="success">
                <TrendingUp className="h-3 w-3" />
                Live
              </Badge>
            </div>
            {revenueByMonth.length === 0 ? (
              <EmptyState
                icon={IndianRupee}
                title="No revenue data"
                description="Revenue will appear here once payments are made."
              />
            ) : (
              <div className="flex items-end gap-2 h-48">
                {revenueByMonth.map((item) => (
                  <div key={item._id} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      ₹{(item.revenue / 1000).toFixed(1)}k
                    </span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-primary-600 to-secondary-500"
                      style={{ height: `${Math.max((item.revenue / maxRevenue) * 100, 4)}%` }}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item._id?.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="p-6">
            <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-4">
              Top Providers
            </h2>
            {topProviders.length === 0 ? (
              <EmptyState icon={Wrench} title="No providers yet" description="Providers will appear here." />
            ) : (
              <div className="space-y-4">
                {topProviders.map((provider) => (
                  <div key={provider._id} className="flex items-center gap-3">
                    <Avatar
                      src={provider}
                      name={provider.businessName || 'P'}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink-light dark:text-ink-dark truncate">
                        {provider.businessName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {provider.jobsCompleted || 0} jobs completed
                      </p>
                    </div>
                    <Badge variant="success">{provider.rating || '0.0'} ★</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark">
              Recent Bookings
            </h2>
          </div>
          {recentBookings.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No bookings yet" description="Bookings will appear here." />
          ) : (
            <Table columns={columns} data={recentBookings} />
          )}
        </Card>
      </motion.div>
    </div>
  );
}

export default AdminDashboard;