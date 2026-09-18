import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, CalendarCheck, Loader2, AlertTriangle, Eye, RefreshCw,
  X, Phone, Mail, Clock, User as UserIcon, Building2,
  Package, CreditCard, RotateCcw,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import Avatar from '../../components/ui/Avatar';
import { getAdminBookings, getAdminBookingDetail } from '../../services/adminService';

// UI filter labels -> real DB values (no invented statuses). "Refunded" maps to
// the Payment status 'refunded' (there is no 'refunded' booking status here).
const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'working', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

const BOOKING_STATUS_CONFIG = {
  pending: { label: 'Pending', variant: 'warning' },
  accepted: { label: 'Accepted', variant: 'primary' },
  working: { label: 'In Progress', variant: 'primary' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'Pending', variant: 'warning' },
  paid: { label: 'Paid', variant: 'success' },
  refunded: { label: 'Refunded', variant: 'neutral' },
  failed: { label: 'Failed', variant: 'danger' },
};

const EMPTY_COUNTS = {
  all: 0, pending: 0, accepted: 0, working: 0, completed: 0, cancelled: 0, refunded: 0,
};

const safe = (v, fallback = 'Not available') => {
  if (v === null || v === undefined || v === '') return fallback;
  if (typeof v === 'number' && Number.isNaN(v)) return fallback;
  return v;
};

const formatCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN')}`;
};

const formatDate = (value) => {
  if (!value) return 'Not available';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Not available';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return 'Not available';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Not available';
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const formatTime = (value) => {
  if (!value) return '';
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value).trim());
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
  }
  return String(value);
};

const StatusBadge = ({ status, config }) => {
  const cfg = config[status] || { label: status, variant: 'neutral' };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

export function AdminBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [detailBooking, setDetailBooking] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      const res = await getAdminBookings(params);
      const data = res.data?.data || {};
      setBookings(data.bookings || []);
      setPagination(data.pagination || { page: 1, limit: pagination.limit, total: 0, pages: 1 });
      if (data.counts) setCounts({ ...EMPTY_COUNTS, ...data.counts });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPagination((p) => ({ ...p, page: 1 }));
  };
  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setPagination((p) => ({ ...p, page: 1 }));
  };
  const clearSearch = () => {
    setSearch('');
    setPagination((p) => ({ ...p, page: 1 }));
  };
  const openDetails = async (booking) => {
    setDetailBooking(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await getAdminBookingDetail(booking._id || booking.bookingId);
      setDetailBooking(res.data?.data?.booking || null);
    } catch (err) {
      setDetailError(err.response?.data?.message || 'Failed to load booking details.');
    } finally {
      setDetailLoading(false);
    }
  };
  const closeDetails = () => setDetailBooking(null);

  const columns = [
    {
      key: 'customer',
      label: 'Customer',
      render: (row) => (
        <div className="flex items-center gap-3 min-w-[180px]">
          <Avatar src={row.customer?.avatar} name={row.customer?.name || 'Customer'} size="sm" />
          <div className="min-w-0">
            <p className="font-medium truncate">{safe(row.customer?.name, 'Unknown')}</p>
            {row.customer?.phone && <p className="text-xs text-gray-500 dark:text-gray-400">{row.customer.phone}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'provider',
      label: 'Provider',
      render: (row) => {
        const provider = row.provider || {};
        const user = provider.userId || {};
        return (
          <button
            type="button"
            onClick={() => row.provider?._id && navigate(`/admin/providers/${row.provider._id}`)}
            className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
          >
            <Avatar src={user.avatar} name={provider.businessName || 'Provider'} size="sm" />
            <span className="font-medium truncate max-w-[160px]">{safe(provider.businessName, 'Unknown')}</span>
          </button>
        );
      },
    },
    {
      key: 'service',
      label: 'Service',
      render: (row) => <span className="text-gray-700 dark:text-gray-200">{safe(row.service?.name, 'Service')}</span>,
    },
    {
      key: 'date',
      label: 'Date',
      render: (row) => (
        <div className="whitespace-nowrap">
          <div>{row.scheduledDate ? formatDate(row.scheduledDate) : 'Not available'}</div>
          {row.scheduledTime && (
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(row.scheduledTime)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      render: (row) => <span className="font-semibold">{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'commission',
      label: 'Commission',
      render: (row) => <span className="text-rose-600 dark:text-rose-400">{formatCurrency(row.commission)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} config={BOOKING_STATUS_CONFIG} />,
    },
    {
      key: 'paymentStatus',
      label: 'Payment Status',
      render: (row) => <StatusBadge status={row.payment?.status || 'pending'} config={PAYMENT_STATUS_CONFIG} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <Button variant="outline" size="sm" onClick={() => openDetails(row)}>
          <Eye className="h-4 w-4" />
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Booking Management</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            View and manage all platform bookings — customers, providers, services, payments and refunds.
          </p>
        </div>
        <Button variant="outline" onClick={fetchBookings} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.value;
          const count = f.value === '' ? counts.all : (counts[f.value] ?? 0);
          return (
            <button
              key={f.value || 'all'}
              type="button"
              onClick={() => handleStatusChange(f.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                active
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-primary-400'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 ${active ? 'text-white/80' : 'text-gray-400'}`}>({count})</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Input
            placeholder="Search by booking ID, customer, provider, or service..."
            value={search}
            onChange={handleSearchChange}
            leftIcon={<Search className="h-4 w-4" />}
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-danger-500 mx-auto mb-3" />
          <p className="text-red-500 font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchBookings}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </Card>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No bookings found"
          description="No bookings match the current filters or search. Try adjusting them."
          action={
            (search || statusFilter) ? (
              <Button variant="outline" onClick={() => { clearSearch(); handleStatusChange(''); }}>
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="p-0 overflow-hidden">
            <Table columns={columns} data={bookings} />
          </Card>
          <Pagination
            page={pagination.page}
            totalPages={pagination.pages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
          />
        </motion.div>
      )}

      <Modal
        isOpen={!!detailBooking || detailLoading || !!detailError}
        onClose={closeDetails}
        title={detailBooking ? `Booking ${detailBooking.bookingId}` : 'Booking Details'}
        subtitle={detailBooking ? 'Full booking, customer, provider, service and payment information' : ''}
        size="xl"
      >
        {detailLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : detailError ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-10 w-10 text-danger-500 mx-auto mb-3" />
            <p className="text-red-500 font-medium">{detailError}</p>
            <Button variant="outline" className="mt-4" onClick={closeDetails}>Close</Button>
          </div>
        ) : detailBooking ? (
          <BookingDetailContent booking={detailBooking} />
        ) : null}
      </Modal>
    </div>
  );
}

function DetailSection({ title, icon: Icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="h-4 w-4 text-primary-600 dark:text-primary-400" />}
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, children }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span className="font-medium text-ink-light dark:text-ink-dark text-right break-words">
        {children || safe(value)}
      </span>
    </div>
  );
}

function BookingDetailContent({ booking }) {
  const customer = booking.customer || {};
  const provider = booking.provider || {};
  const providerUser = provider.userId || {};
  const service = booking.service || {};
  const payment = booking.payment || {};
  const isRefunded = payment.status === 'refunded';

  const customerAddress =
    [customer.address?.line1, customer.address?.city, customer.address?.state, customer.address?.pincode]
      .filter(Boolean)
      .join(', ') || null;

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={booking.status} config={BOOKING_STATUS_CONFIG} />
        <StatusBadge status={payment.status || 'pending'} config={PAYMENT_STATUS_CONFIG} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DetailSection title="Booking Information" icon={CalendarCheck}>
          <DetailRow label="Booking ID" value={booking.bookingId} />
          <DetailRow label="Booking Status">
            <StatusBadge status={booking.status} config={BOOKING_STATUS_CONFIG} />
          </DetailRow>
          <DetailRow label="Payment Status">
            <StatusBadge status={payment.status || 'pending'} config={PAYMENT_STATUS_CONFIG} />
          </DetailRow>
          <DetailRow label="Scheduled Date" value={booking.scheduledDate ? formatDate(booking.scheduledDate) : null} />
          <DetailRow label="Scheduled Time" value={booking.scheduledTime ? formatTime(booking.scheduledTime) : null} />
          <DetailRow label="Created Date" value={formatDateTime(booking.createdAt)} />
        </DetailSection>

        <DetailSection title="Customer" icon={UserIcon}>
          <div className="flex items-center gap-3 mb-2">
            <Avatar src={customer.avatar} name={customer.name || 'Customer'} size="md" />
            <div>
              <p className="font-semibold">{safe(customer.name, 'Unknown')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {customer._id ? `#${String(customer._id).slice(-6)}` : ''}
              </p>
            </div>
          </div>
          <DetailRow label="Phone" value={customer.phone}>
            {customer.phone ? (
              <a href={`tel:${customer.phone}`} className="flex items-center gap-1 hover:text-primary-600">
                <Phone className="h-3.5 w-3.5" /> {customer.phone}
              </a>
            ) : safe(null)}
          </DetailRow>
          <DetailRow label="Email" value={customer.email}>
            {customer.email ? (
              <a href={`mailto:${customer.email}`} className="flex items-center gap-1 hover:text-primary-600">
                <Mail className="h-3.5 w-3.5" /> {customer.email}
              </a>
            ) : safe(null)}
          </DetailRow>
          <DetailRow label="Address" value={customerAddress} />
        </DetailSection>

        <DetailSection title="Provider" icon={Building2}>
          <div className="flex items-center gap-3 mb-2">
            <Avatar src={providerUser.avatar} name={provider.businessName || 'Provider'} size="md" />
            <div>
              <p className="font-semibold">{safe(provider.businessName, 'Unknown')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {provider._id ? `#${String(provider._id).slice(-6)}` : ''}
              </p>
            </div>
          </div>
          <DetailRow label="Phone" value={providerUser.phone}>
            {providerUser.phone ? (
              <a href={`tel:${providerUser.phone}`} className="flex items-center gap-1 hover:text-primary-600">
                <Phone className="h-3.5 w-3.5" /> {providerUser.phone}
              </a>
            ) : safe(null)}
          </DetailRow>
          <DetailRow label="Email" value={providerUser.email}>
            {providerUser.email ? (
              <a href={`mailto:${providerUser.email}`} className="flex items-center gap-1 hover:text-primary-600">
                <Mail className="h-3.5 w-3.5" /> {providerUser.email}
              </a>
            ) : safe(null)}
          </DetailRow>
          <DetailRow label="Service Category" value={provider.category} />
          <DetailRow label="Service Area" value={[provider.location?.city, provider.location?.state].filter(Boolean).join(', ')} />
        </DetailSection>

        <DetailSection title="Service" icon={Package}>
          <DetailRow label="Service Name" value={service.name} />
          <DetailRow label="Category" value={service.category} />
          <DetailRow label="Price" value={formatCurrency(booking.amount)} />
        </DetailSection>

        <DetailSection title="Payment" icon={CreditCard}>
          <DetailRow label="Booking Amount" value={formatCurrency(booking.amount)} />
          <DetailRow label="Commission" value={formatCurrency(booking.commission)}>
            <span className="text-rose-600 dark:text-rose-400">{formatCurrency(booking.commission)}</span>
          </DetailRow>
          <DetailRow label="Provider Earnings (Net)" value={formatCurrency(booking.providerEarnings)} />
          <DetailRow label="Payment Method" value={payment.method} />
          <DetailRow label="Payment Status">
            <StatusBadge status={payment.status || 'pending'} config={PAYMENT_STATUS_CONFIG} />
          </DetailRow>
          <DetailRow label="Transaction ID" value={payment.transactionId} />
          {payment.paidAt && <DetailRow label="Paid At" value={formatDateTime(payment.paidAt)} />}
        </DetailSection>
      </div>

      {isRefunded && (
        <DetailSection title="Refund Information" icon={RotateCcw}>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
            <DetailRow label="Refund Amount" value={formatCurrency(payment.amount)} />
            <DetailRow label="Refund Status">
              <StatusBadge status="refunded" config={PAYMENT_STATUS_CONFIG} />
            </DetailRow>
            <DetailRow label="Refund Date" value={formatDateTime(payment.refundedAt)} />
            <DetailRow label="Transaction / Reference ID" value={payment.transactionId} />
          </div>
        </DetailSection>
      )}

      <DetailSection title="Timeline" icon={Clock}>
        {booking.timeline && booking.timeline.length > 0 ? (
          <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-2 space-y-4">
            {booking.timeline.map((t, idx) => (
              <li key={idx} className="ml-4">
                <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary-500" />
                <p className="text-sm font-medium capitalize">{safe(t.status)}</p>
                {t.note && <p className="text-xs text-gray-500 dark:text-gray-400">{t.note}</p>}
                {t.timestamp && <p className="text-xs text-gray-400">{formatDateTime(t.timestamp)}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No timeline events recorded.</p>
        )}
      </DetailSection>
    </div>
  );
}

export default AdminBookingsPage;