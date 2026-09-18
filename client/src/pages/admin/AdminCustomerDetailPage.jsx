import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Ban, CheckCircle2, AlertTriangle, Loader2, Calendar, Star,
  MessageSquare, ShieldAlert, RotateCcw, Wallet,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import RatingStars from '../../components/ui/RatingStars';
import {
  getAdminCustomerDetail,
  updateCustomerStatus,
} from '../../services/adminService';

const statusConfig = {
  active: { label: 'Active', variant: 'success' },
  blocked: { label: 'Blocked', variant: 'danger' },
  suspended: { label: 'Suspended', variant: 'danger' },
  warning: { label: 'Warning', variant: 'warning' },
};

const tabs = [
  { id: 'bookings', label: 'Bookings', icon: Calendar },
  { id: 'cancelled', label: 'Cancelled', icon: Ban },
  { id: 'reviews', label: 'Reviews & Ratings', icon: Star },
  { id: 'complaints', label: 'Complaints', icon: ShieldAlert },
  { id: 'refunds', label: 'Refunds', icon: RotateCcw },
];

const bookingStatusBadge = (status) => {
  const map = {
    pending: 'warning', accepted: 'info', working: 'info', completed: 'success',
    cancelled: 'danger', rejected: 'danger',
  };
  return <Badge variant={map[status] || 'default'}>{status}</Badge>;
};

export function AdminCustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');
  const [modalType, setModalType] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [warningText, setWarningText] = useState('');

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminCustomerDetail(id);
      setData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const openModal = (type) => {
    setModalType(type);
    setWarningText('');
  };

  const confirmAction = async () => {
    setActionLoading(true);
    try {
      let payload;
      if (modalType === 'warn') {
        if (!warningText.trim()) {
          toast.error('Please enter a warning message');
          setActionLoading(false);
          return;
        }
        payload = { warning: warningText.trim() };
      } else if (modalType === 'block') {
        payload = { status: 'blocked' };
      } else {
        payload = { status: 'active' };
      }
      await updateCustomerStatus(id, payload);
      toast.success(
        modalType === 'block'
          ? 'Customer blocked successfully'
          : modalType === 'unblock'
          ? 'Customer unblocked successfully'
          : 'Warning sent to customer'
      );
      setModalType(null);
      setWarningText('');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const bookingColumns = [
    { key: 'bookingId', label: 'Booking ID', render: (r) => <span className="font-mono text-xs text-gray-500 dark:text-gray-400">#{String(r._id).slice(-6)}</span> },
    { key: 'provider', label: 'Provider', render: (r) => <span className="text-gray-700 dark:text-gray-200">{r.providerId?.businessName || '—'}</span> },
    { key: 'service', label: 'Service', render: (r) => <span className="text-gray-600 dark:text-gray-300">{r.serviceId?.name || '—'}</span> },
    { key: 'amount', label: 'Amount', render: (r) => <span className="font-medium">₹{r.amount || 0}</span> },
    { key: 'date', label: 'Date', render: (r) => <span className="text-gray-500 dark:text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span> },
    { key: 'status', label: 'Status', render: (r) => bookingStatusBadge(r.status) },
  ];

  const reviewColumns = [
    { key: 'provider', label: 'Provider', render: (r) => <span className="text-gray-700 dark:text-gray-200">{r.providerId?.businessName || '—'}</span> },
    { key: 'rating', label: 'Rating', render: (r) => <RatingStars value={r.rating} size="sm" readonly /> },
    { key: 'comment', label: 'Comment', render: (r) => <span className="text-gray-600 dark:text-gray-300">{r.comment || '—'}</span> },
    { key: 'date', label: 'Date', render: (r) => <span className="text-gray-500 dark:text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span> },
  ];

  const complaintColumns = [
    { key: 'reporter', label: 'Reported By', render: (r) => <span className="text-gray-700 dark:text-gray-200">{r.reporterId?.name || (String(r.reporterId) === id ? 'This customer' : '—')}</span> },
    { key: 'type', label: 'Type', render: (r) => <span className="text-gray-600 dark:text-gray-300">{r.type || '—'}</span> },
    { key: 'description', label: 'Details', render: (r) => <span className="text-gray-500 dark:text-gray-400 text-xs">{r.description || '—'}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'resolved' ? 'success' : 'warning'}>{r.status}</Badge> },
    { key: 'date', label: 'Date', render: (r) => <span className="text-gray-500 dark:text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span> },
  ];

  const refundColumns = [
    { key: 'paymentId', label: 'Payment ID', render: (r) => <span className="font-mono text-xs text-gray-500 dark:text-gray-400">#{String(r._id).slice(-6)}</span> },
    { key: 'provider', label: 'Provider', render: (r) => <span className="text-gray-700 dark:text-gray-200">{r.providerId?.businessName || '—'}</span> },
    { key: 'amount', label: 'Refunded', render: (r) => <span className="font-medium text-rose-600 dark:text-rose-400">₹{r.amount || 0}</span> },
    { key: 'date', label: 'Date', render: (r) => <span className="text-gray-500 dark:text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span> },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <EmptyState icon={ShieldAlert} title="Customer not found" description="This account may have been removed." />
        <div className="flex justify-center mt-4">
          <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/admin/customers')}>Back to Customers</Button>
        </div>
      </Card>
    );
  }

  const { customer, stats, bookings, cancelledBookings, reviews, complaints, refunds } = data;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/admin/customers')}>Back</Button>
          <div className="flex items-center gap-3">
            <Avatar src={customer.avatar} name={customer.name || 'C'} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">{customer.name || '—'}</h1>
                <Badge variant={(statusConfig[customer.status] || statusConfig.active).variant}>
                  {(statusConfig[customer.status] || statusConfig.active).label}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}{customer.email ? ` · ${customer.email}` : ''}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {customer.status === 'active' ? (
            <Button variant="danger" icon={Ban} onClick={() => openModal('block')}>Block</Button>
          ) : (
            <Button variant="success" icon={CheckCircle2} onClick={() => openModal('unblock')}>Unblock</Button>
          )}
          <Button variant="outline" icon={AlertTriangle} onClick={() => openModal('warn')}>Warn</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Bookings" value={stats.totalBookings} icon={Calendar} />
        <StatCard title="Total Spent" value={`₹${stats.totalSpent}`} icon={Wallet} />
        <StatCard title="Avg Rating Given" value={`${stats.avgRatingGiven} ★`} icon={Star} />
        <StatCard title="Complaints Filed" value={stats.complaintsFiled} icon={MessageSquare} />
        <StatCard title="Completed" value={stats.completedBookings} icon={CheckCircle2} />
        <StatCard title="Refunds" value={stats.refundsCount} icon={RotateCcw} />
        <StatCard title="Reviews" value={stats.reviewsCount} icon={MessageSquare} />
        <StatCard title="Warnings" value={customer.warnings || 0} icon={AlertTriangle} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === t.id
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.id === 'cancelled' && cancelledBookings?.length ? (
              <Badge variant="danger">{cancelledBookings.length}</Badge>
            ) : null}
            {t.id === 'complaints' && complaints?.length ? (
              <Badge variant="warning">{complaints.length}</Badge>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === 'bookings' && (
        bookings?.length ? (
          <Card className="p-6 overflow-x-auto"><Table columns={bookingColumns} data={bookings} /></Card>
        ) : <Card className="p-6"><EmptyState icon={Calendar} title="No bookings" description="This customer hasn't booked any services yet." /></Card>
      )}

      {activeTab === 'cancelled' && (
        cancelledBookings?.length ? (
          <Card className="p-6 overflow-x-auto"><Table columns={bookingColumns} data={cancelledBookings} /></Card>
        ) : <Card className="p-6"><EmptyState icon={Ban} title="No cancelled bookings" description="No cancelled or rejected bookings on record." /></Card>
      )}

      {activeTab === 'reviews' && (
        reviews?.length ? (
          <Card className="p-6 overflow-x-auto"><Table columns={reviewColumns} data={reviews} /></Card>
        ) : <Card className="p-6"><EmptyState icon={Star} title="No reviews" description="This customer hasn't submitted any reviews." /></Card>
      )}

      {activeTab === 'complaints' && (
        complaints?.length ? (
          <Card className="p-6 overflow-x-auto"><Table columns={complaintColumns} data={complaints} /></Card>
        ) : <Card className="p-6"><EmptyState icon={ShieldAlert} title="No complaints" description="No complaints filed by or against this customer." /></Card>
      )}

      {activeTab === 'refunds' && (
        refunds?.length ? (
          <Card className="p-6 overflow-x-auto"><Table columns={refundColumns} data={refunds} /></Card>
        ) : <Card className="p-6"><EmptyState icon={RotateCcw} title="No refunds" description="No refunds have been processed for this customer." /></Card>
      )}

      <Modal
        isOpen={!!modalType}
        onClose={() => { setModalType(null); setWarningText(''); }}
        title={modalType === 'block' ? 'Block Customer' : modalType === 'unblock' ? 'Unblock Customer' : 'Warn Customer'}
      >
        <p className="text-gray-600 dark:text-gray-300">
          {modalType === 'block'
            ? 'Are you sure you want to block this customer? They will no longer be able to book services or log in.'
            : modalType === 'unblock'
            ? 'Are you sure you want to unblock this customer? Their account will be reactivated.'
            : 'Send a warning to this customer. This will be recorded on their account.'}
        </p>
        {modalType === 'warn' && (
          <div className="mt-4">
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-ink-light dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={warningText}
              onChange={(e) => setWarningText(e.target.value)}
              placeholder="Reason for warning..."
            />
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => { setModalType(null); setWarningText(''); }}>Cancel</Button>
          <Button
            variant={modalType === 'block' ? 'danger' : 'primary'}
            onClick={confirmAction}
            loading={actionLoading}
          >
            {actionLoading ? 'Processing...' : modalType === 'block' ? 'Block' : modalType === 'unblock' ? 'Unblock' : 'Send Warning'}
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
}

export default AdminCustomerDetailPage;
