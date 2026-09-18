import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft, CheckCircle2, XCircle, Ban, AlertTriangle, ShieldCheck,
  Loader2, Star, Calendar, MapPin, Mail, Phone, Clock, DollarSign,
  Briefcase, MessageSquare, AlertCircle, FileText, Download, Check, X,
  FileCheck, Shield, ExternalLink, RefreshCw, UserCheck, TrendingUp, Percent
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import Textarea from '../../components/ui/Textarea';
import StatCard from '../../components/ui/StatCard';
import {
  getAdminProviderDetail,
  updateProviderStatus,
  updateProviderDocumentStatus
} from '../../services/adminService';
import { resolveAssetUrl } from '../../utils/assetUrl';
import {
  summarizeAvailability,
  formatTimeRange,
} from '../../utils/availability';

const verificationStatusConfig = {
  approved: { label: 'Verified', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  rejected: { label: 'Rejected', variant: 'danger' },
  suspended: { label: 'Suspended', variant: 'danger' },
  blocked: { label: 'Blocked', variant: 'danger' },
};

const accountStatusConfig = {
  active: { label: 'Active', variant: 'success' },
  suspended: { label: 'Suspended', variant: 'warning' },
  blocked: { label: 'Blocked', variant: 'danger' },
};

export function AdminProviderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [bookingFilter, setBookingFilter] = useState('all');

  // Status Action Modal
  const [modalType, setModalType] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionReason, setActionReason] = useState('');

  // KYC Document Action Modal
  const [docModal, setDocModal] = useState(null);
  const [docActionReason, setDocActionReason] = useState('');

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminProviderDetail(id);
      setData(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch provider detail');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleAction = (type) => {
    setModalType(type);
    setActionReason('');
  };

  const confirmAction = async () => {
    if (!data?.provider) return;
    setActionLoading(true);
    try {
      const actionMap = {
        approve: { status: 'approved', message: 'Provider approved successfully' },
        reject: { status: 'rejected', message: 'Provider application rejected' },
        suspend: { status: 'suspended', message: 'Provider account suspended' },
        block: { status: 'blocked', message: 'Provider account blocked' },
        activate: { status: 'approved', message: 'Provider account activated' },
      };
      const action = actionMap[modalType];
      if (action) {
        const payload = { status: action.status };
        if (actionReason.trim()) payload.reason = actionReason.trim();
        await updateProviderStatus(data.provider._id, payload);
        toast.success(action.message);
        fetchDetail();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
      setModalType(null);
      setActionReason('');
    }
  };

  const handleDocAction = (doc, actionType) => {
    setDocModal({ doc, type: actionType });
    setDocActionReason('');
  };

  const confirmDocAction = async () => {
    if (!docModal?.doc || !data?.provider) return;
    setActionLoading(true);
    try {
      const verified = docModal.type === 'approve';
      await updateProviderDocumentStatus(
        data.provider._id,
        docModal.doc._id,
        { verified, note: docActionReason.trim() }
      );
      toast.success(`Document ${status} successfully`);
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update document status');
    } finally {
      setActionLoading(false);
      setDocModal(null);
      setDocActionReason('');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!data || !data.provider) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Provider Not Found"
        description="The requested provider details could not be found."
        action={<Button onClick={() => navigate('/admin/providers')}>Back to Providers</Button>}
      />
    );
  }

  const { provider, services = [], bookings = [], reviews = [], withdrawals = [], complaints = [], earnings = {}, bookingStatusCounts = {}, totalBookings = 0 } = data;
  const user = provider.userId || {};

  const cancelledBookings = (bookingStatusCounts.cancelled || 0) + (bookingStatusCounts.rejected || 0);
  const cancellationRate = totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : '0.0';

  // Real earnings aggregates derived from the transaction list returned by the API.
  const grossRevenue = (earnings.transactions || []).reduce((sum, t) => sum + (t.jobAmount || 0), 0);
  const totalCommission = (earnings.transactions || []).reduce((sum, t) => sum + (t.platformFee || 0), 0);

  const modalConfig = {
    approve: { title: 'Approve Provider', message: `Approve ${provider.businessName}'s provider account?`, confirm: 'Approve', variant: 'primary' },
    reject: { title: 'Reject Provider', message: `Reject ${provider.businessName}'s provider application?`, confirm: 'Reject', variant: 'danger' },
    suspend: { title: 'Suspend Provider', message: `Suspend ${provider.businessName}'s account?`, confirm: 'Suspend', variant: 'danger' },
    block: { title: 'Block Provider', message: `Block ${provider.businessName}'s account?`, confirm: 'Block', variant: 'danger' },
    activate: { title: 'Activate Provider', message: `Re-activate ${provider.businessName}'s account?`, confirm: 'Activate', variant: 'primary' },
  };

  const filteredBookings = bookingFilter === 'all'
    ? bookings
    : bookings.filter((b) => b.status === bookingFilter);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/admin/providers')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-ink-light dark:hover:text-ink-dark transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Providers
        </button>
        <div className="flex items-center gap-2">
          {provider.verificationStatus === 'pending' && (
            <>
              <Button variant="primary" icon={CheckCircle2} onClick={() => handleAction('approve')}>
                Approve Account
              </Button>
              <Button variant="danger" icon={XCircle} onClick={() => handleAction('reject')}>
                Reject Account
              </Button>
            </>
          )}
          {provider.verificationStatus === 'approved' && (
            <>
              <Button variant="outline" icon={AlertTriangle} onClick={() => handleAction('suspend')}>
                Suspend
              </Button>
              <Button variant="danger" icon={Ban} onClick={() => handleAction('block')}>
                Block
              </Button>
            </>
          )}
          {(provider.verificationStatus === 'blocked' || provider.verificationStatus === 'suspended') && (
            <Button variant="primary" icon={ShieldCheck} onClick={() => handleAction('activate')}>
              Activate Account
            </Button>
          )}
        </div>
      </div>

      {/* Provider Profile Summary Header Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <Avatar src={user.avatar} name={provider.businessName} size="xl" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">
                  {provider.businessName}
                </h1>
                <Badge variant={verificationStatusConfig[provider.verificationStatus]?.variant || 'neutral'}>
                  KYC: {verificationStatusConfig[provider.verificationStatus]?.label || provider.verificationStatus}
                </Badge>
                <Badge variant={accountStatusConfig[user.status || 'active']?.variant || 'neutral'}>
                  Account: {accountStatusConfig[user.status || 'active']?.label || user.status}
                </Badge>
              </div>
              <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mt-0.5">
                {provider.category || 'General Service Provider'}
              </p>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {user.phone || 'N/A'}</span>
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {user.email || 'N/A'}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {provider.location?.city || provider.location?.address || 'N/A'}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Joined {provider.createdAt ? new Date(provider.createdAt).toLocaleDateString('en-IN') : 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 pt-4 md:pt-0 md:pl-6 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right">
              <div className="flex items-center gap-1 text-amber-500 font-bold text-lg">
                <Star className="h-5 w-5 fill-amber-400" /> {provider.rating ? provider.rating.toFixed(1) : '0.0'}
              </div>
              <p className="text-xs text-gray-400">{provider.reviewCount || reviews.length || 0} customer reviews</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                ₹{(earnings.totalEarnings || 0).toLocaleString('en-IN')}
              </span>
              <p className="text-xs text-gray-400">Total Net Earnings</p>
            </div>
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Total Bookings" value={totalBookings} icon={Briefcase} color="primary" />
        <StatCard title="Completed" value={bookingStatusCounts.completed || 0} icon={CheckCircle2} color="success" />
        <StatCard title="Cancelled" value={cancelledBookings} icon={XCircle} color="danger" />
        <StatCard title="Cancellation Rate" value={`${cancellationRate}%`} icon={Percent} color="warning" />
        <StatCard title="Gross Revenue" value={`₹${grossRevenue.toLocaleString('en-IN')}`} icon={DollarSign} color="secondary" />
        <StatCard title="Avg Rating" value={provider.rating ? provider.rating.toFixed(1) : '0.0'} icon={Star} color="secondary" />
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 flex overflow-x-auto gap-2 pb-px scrollbar-none">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'services', label: `Services (${services.length})` },
          { id: 'bookings', label: `Bookings (${totalBookings})` },
          { id: 'earnings', label: 'Earnings' },
          { id: 'reviews', label: `Reviews (${reviews.length})` },
          { id: 'complaints', label: `Complaints (${complaints.length})` },
          { id: 'kyc', label: `KYC & Verification (${provider.documents?.length || 0})` },
          { id: 'payouts', label: `Payout History (${withdrawals.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10'
                : 'border-transparent text-gray-500 hover:text-ink-light dark:hover:text-ink-dark'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-ink-light dark:text-ink-dark flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary-600" /> Business Info
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400 block text-xs uppercase tracking-wider font-semibold">Description</span>
                <p className="mt-1 text-ink-light dark:text-ink-dark">{provider.description || 'No description provided.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <span className="text-gray-400 block text-xs uppercase tracking-wider font-semibold">Base Price / Hourly</span>
                  <p className="font-semibold text-primary-600 dark:text-primary-400">₹{provider.pricing?.hourlyRate || provider.pricing?.basePrice || 0}/hr</p>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs uppercase tracking-wider font-semibold">Experience</span>
                  <p className="font-semibold text-ink-light dark:text-ink-dark">{provider.experience || 0} Years</p>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-gray-400 block text-xs uppercase tracking-wider font-semibold">Service Area & Radius</span>
                <p className="font-semibold text-ink-light dark:text-ink-dark">
                  {provider.location?.address || provider.location?.city || 'Not specified'} ({provider.serviceRadius || provider.radius || 15} km radius)
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-ink-light dark:text-ink-dark flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary-600" /> Availability & Operational Hours
            </h3>
            {(() => {
              const { dayRanges } = summarizeAvailability(provider.availability);
              const configured = dayRanges.filter((d) => d.enabled && d.ranges.length > 0);
              if (configured.length === 0) {
                return (
                  <p className="text-sm text-gray-500">No availability schedule configured. Default: Monday - Saturday (09:00 AM - 07:00 PM)</p>
                );
              }
              return (
                <div className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                  {configured.map((d) => (
                    <div key={d.key} className="py-2 flex justify-between items-center gap-3">
                      <span className="font-medium text-ink-light dark:text-ink-dark capitalize">{d.label}</span>
                      <span className="text-xs px-2 py-1 rounded bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300 font-mono text-right">
                        {d.ranges.map((r) => formatTimeRange(r)).filter(Boolean).join(', ') || 'Available (hours not set)'}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>
        </div>
      )}

      {/* SERVICES TAB */}
      {activeTab === 'services' && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-4">Provided Services</h3>
          {services.length === 0 ? (
            <EmptyState icon={Briefcase} title="No Services Created" description="This provider has not added any services yet." />
          ) : (
            <Table
              columns={[
                { key: 'name', label: 'Service Name', render: (row) => <span className="font-medium">{row.name}</span> },
                { key: 'category', label: 'Category', render: (row) => row.category || row.categoryId?.name || 'Not specified' },
                { key: 'price', label: 'Price', render: (row) => <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{row.price}</span> },
                { key: 'duration', label: 'Duration', render: (row) => `${row.duration || 60} hours` },
                { key: 'status', label: 'Status', render: (row) => <Badge variant={row.isActive !== false ? 'success' : 'neutral'}>{row.isActive !== false ? 'Active' : 'Inactive'}</Badge> },
                { key: 'totalOrders', label: 'Total Orders', render: (row) => row.totalOrders || 0 },
                { key: 'createdAt', label: 'Added Date', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not available' },
              ]}
              data={services}
            />
          )}
        </Card>
      )}

      {/* BOOKINGS TAB */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {['all', 'pending', 'accepted', 'working', 'completed', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setBookingFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  bookingFilter === st
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <Card className="p-6">
            {filteredBookings.length === 0 ? (
              <EmptyState icon={Briefcase} title="No Bookings Found" description="No bookings match the selected status filter." />
            ) : (
              <Table
                columns={[
                  { key: 'id', label: 'Booking Ref', render: (row) => <span className="font-mono text-xs font-bold">#{row._id.slice(-6).toUpperCase()}</span> },
                  { key: 'customer', label: 'Customer', render: (row) => row.customerId?.name || 'Customer' },
                  { key: 'service', label: 'Service', render: (row) => row.serviceId?.name || row.serviceName || 'Service' },
                  { key: 'date', label: 'Date & Time', render: (row) => `${row.scheduledDate ? new Date(row.scheduledDate).toLocaleDateString('en-IN') : '—'} ${row.scheduledTime || ''}` },
                  { key: 'amount', label: 'Amount', render: (row) => <span className="font-semibold">₹{row.amount || 0}</span> },
                  { key: 'paymentStatus', label: 'Payment', render: (row) => <Badge variant={row.payment?.status === 'paid' ? 'success' : row.payment?.status === 'refunded' ? 'neutral' : 'warning'}>{row.payment?.status || 'pending'}</Badge> },
                  { key: 'status', label: 'Booking Status', render: (row) => <Badge variant={row.status === 'completed' ? 'success' : row.status === 'cancelled' ? 'danger' : 'warning'}>{row.status}</Badge> },
                ]}
                data={filteredBookings}
              />
            )}
          </Card>
        </div>
      )}

      {/* EARNINGS TAB */}
      {activeTab === 'earnings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Gross Revenue" value={`₹${grossRevenue.toLocaleString('en-IN')}`} icon={DollarSign} color="primary" />
            <StatCard title="Platform Commission" value={`₹${totalCommission.toLocaleString('en-IN')}`} icon={TrendingUp} color="secondary" />
            <StatCard title="Net Provider Payout" value={`₹${(earnings.totalEarnings || 0).toLocaleString('en-IN')}`} icon={CheckCircle2} color="success" />
            <StatCard title="Pending Payouts" value={`₹${(earnings.pendingWithdrawals || 0).toLocaleString('en-IN')}`} icon={Clock} color="warning" />
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-4">Payout Transaction Summary</h3>
            <div className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              <div className="py-3 flex justify-between">
                <span className="text-gray-500">Total Approved Withdrawals</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{(earnings.totalWithdrawn || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-gray-500">Pending Withdrawal Requests</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">₹{(earnings.pendingWithdrawals || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-gray-500">Available Wallet Balance</span>
                <span className="font-semibold text-primary-600 dark:text-primary-400">₹{((earnings.availableBalance != null ? earnings.availableBalance : provider.earnings?.available) || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* REVIEWS TAB */}
      {activeTab === 'reviews' && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <div className="text-center md:border-r border-gray-200 dark:border-gray-700 pr-0 md:pr-8">
              <div className="text-4xl font-extrabold text-amber-500">{provider.rating ? provider.rating.toFixed(1) : '0.0'}</div>
              <div className="flex justify-center gap-1 my-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`h-4 w-4 ${s <= Math.round(provider.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                ))}
              </div>
              <p className="text-xs text-gray-400">Based on {reviews.length} reviews</p>
            </div>

            <div className="flex-1 space-y-2 w-full">
              {[5, 4, 3, 2, 1].map((ratingVal) => {
                const count = reviews.filter((r) => Math.round(r.rating) === ratingVal).length;
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={ratingVal} className="flex items-center gap-3 text-xs">
                    <span className="w-8 font-medium">{ratingVal} ★</span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="w-8 text-right text-gray-400">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-ink-light dark:text-ink-dark">Customer Reviews</h4>
            {reviews.length === 0 ? (
              <EmptyState icon={Star} title="No Reviews Yet" description="This provider has not received any customer reviews." />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {reviews.map((rev) => (
                  <div key={rev._id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar src={rev.customerId?.avatar} name={rev.customerId?.name || 'Customer'} size="sm" />
                        <span className="font-medium text-sm text-ink-light dark:text-ink-dark">{rev.customerId?.name || 'Customer'}</span>
                      </div>
                      <span className="text-xs text-gray-400">{rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-IN') : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-3.5 w-3.5 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{rev.comment || rev.reviewText || 'No comments.'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* COMPLAINTS TAB */}
      {activeTab === 'complaints' && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-4">Customer Complaints & Reports</h3>
          {complaints.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No Complaints Found" description="This provider has a clean record with 0 reported issues." />
          ) : (
            <Table
              columns={[
                { key: 'id', label: 'Report Ref', render: (row) => <span className="font-mono text-xs font-bold">#{row._id.slice(-6).toUpperCase()}</span> },
                { key: 'reporter', label: 'Reported By', render: (row) => row.reporterId?.name || 'Customer' },
                { key: 'type', label: 'Subject / Type', render: (row) => <span className="font-medium capitalize">{row.type || 'Complaint'}</span> },
                { key: 'description', label: 'Details', render: (row) => <p className="text-xs max-w-xs truncate">{row.description}</p> },
                { key: 'status', label: 'Status', render: (row) => <Badge variant={row.status === 'resolved' ? 'success' : 'danger'}>{row.status}</Badge> },
                { key: 'date', label: 'Date', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN') : '—' },
              ]}
              data={complaints}
            />
          )}
        </Card>
      )}
      {/* KYC & VERIFICATION TAB */}
      {activeTab === 'kyc' && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink-light dark:text-ink-dark flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary-600" /> Submitted Verification Documents
            </h3>
            <Badge variant={verificationStatusConfig[provider.verificationStatus]?.variant || 'neutral'}>
              Overall Status: {verificationStatusConfig[provider.verificationStatus]?.label || provider.verificationStatus}
            </Badge>
          </div>

          {!provider.documents || provider.documents.length === 0 ? (
            <EmptyState icon={FileText} title="No Documents Uploaded" description="This provider has not submitted any KYC or verification documents yet." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {provider.documents.map((doc, idx) => (
                <div key={doc._id || idx} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3 bg-white dark:bg-gray-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-ink-light dark:text-ink-dark capitalize">{doc.type || doc.name || `Document #${idx + 1}`}</h4>
                      <p className="text-xs text-gray-400">Number: {doc.number || doc.documentNumber || 'N/A'}</p>
                    </div>
                    <Badge variant={doc.verified ? 'success' : 'warning'}>
                      {doc.verified ? 'approved' : 'pending'}
                    </Badge>
                  </div>

                  {doc.url && (
                    <a
                      href={resolveAssetUrl(doc.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline pt-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View / Download Document
                    </a>
                  )}

                  {doc.note && (
                    <p className="text-xs text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-950/30 p-2 rounded">
                      Reason: {doc.note}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <Button size="sm" variant="success" icon={Check} onClick={() => handleDocAction(doc, 'approve')}>
                      Approve Doc
                    </Button>
                    <Button size="sm" variant="danger" icon={X} onClick={() => handleDocAction(doc, 'reject')}>
                      Reject Doc
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* PAYOUT HISTORY TAB */}
      {activeTab === 'payouts' && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-4">Payout & Withdrawal Requests</h3>
          {withdrawals.length === 0 ? (
            <EmptyState icon={DollarSign} title="No Payout History" description="No withdrawal transactions found for this provider." />
          ) : (
            <Table
              columns={[
                { key: 'id', label: 'Payout ID', render: (row) => <span className="font-mono text-xs font-bold">#{row._id.slice(-6).toUpperCase()}</span> },
                { key: 'amount', label: 'Amount', render: (row) => <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{row.amount}</span> },
                { key: 'method', label: 'Payment Method', render: (row) => (row.method ? row.method.toUpperCase() : 'Bank Transfer') },
                { key: 'details', label: 'Payout Account / UPI', render: (row) => row.accountDetails?.upiId || row.accountDetails?.accountNumber || '—' },
                { key: 'status', label: 'Status', render: (row) => {
                  const variant = row.status === 'completed' ? 'success' : row.status === 'failed' || row.status === 'cancelled' || row.status === 'rejected' ? 'danger' : 'warning';
                  return <Badge variant={variant}>{row.status}</Badge>;
                } },
                { key: 'requestedAt', label: 'Requested Date', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN') : '—' },
                { key: 'processedAt', label: 'Processed Date', render: (row) => row.processedAt ? new Date(row.processedAt).toLocaleDateString('en-IN') : 'Pending' },
              ]}
              data={withdrawals}
            />
          )}
        </Card>
      )}

      {/* STATUS CHANGE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!modalType}
        onClose={() => { setModalType(null); setActionReason(''); }}
        title={modalConfig[modalType]?.title || 'Confirm Action'}
      >
        <p className="text-gray-600 dark:text-gray-300">{modalConfig[modalType]?.message}</p>
        {['reject', 'suspend', 'block'].includes(modalType) && (
          <div className="mt-4">
            <Textarea
              label="Reason (optional)"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder={`Reason for ${modalType}...`}
              rows={3}
            />
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => { setModalType(null); setActionReason(''); }}>Cancel</Button>
          <Button
            variant={modalConfig[modalType]?.variant === 'primary' ? 'primary' : 'danger'}
            onClick={confirmAction}
            loading={actionLoading}
          >
            {modalConfig[modalType]?.confirm}
          </Button>
        </div>
      </Modal>

      {/* KYC DOCUMENT ACTION MODAL */}
      <Modal
        isOpen={!!docModal}
        onClose={() => { setDocModal(null); setDocActionReason(''); }}
        title={`${docModal?.type === 'approve' ? 'Approve' : 'Reject'} Document`}
      >
        <p className="text-gray-600 dark:text-gray-300">
          Are you sure you want to {docModal?.type} document "{docModal?.doc?.name || docModal?.doc?.type}"?
        </p>
        {docModal?.type === 'reject' && (
          <div className="mt-4">
            <Textarea
              label="Rejection Reason"
              value={docActionReason}
              onChange={(e) => setDocActionReason(e.target.value)}
              placeholder="Specify why this document is invalid or rejected..."
              rows={3}
            />
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => { setDocModal(null); setDocActionReason(''); }}>Cancel</Button>
          <Button
            variant={docModal?.type === 'approve' ? 'primary' : 'danger'}
            onClick={confirmDocAction}
            loading={actionLoading}
          >
            Confirm {docModal?.type === 'approve' ? 'Approval' : 'Rejection'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default AdminProviderDetailPage;
