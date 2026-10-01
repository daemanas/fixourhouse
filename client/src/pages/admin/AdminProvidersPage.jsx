import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Search, CheckCircle2, Ban, AlertTriangle, ShieldCheck,
  Loader2, Star, Eye, Calendar, Filter, ChevronDown, RefreshCw,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import Textarea from '../../components/ui/Textarea';
import { getAdminProviders, updateProviderStatus } from '../../services/adminService';

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

const getKycStatus = (provider) => String(
  provider.kycStatus ?? provider.verificationStatus ?? (provider.isVerified ? 'verified' : 'pending')
).toLowerCase();

const getAccountStatus = (provider) => String(
  provider.accountStatus ?? provider.userId?.status ?? 'active'
).toLowerCase();

export function AdminProvidersPage() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [ratingDistribution, setRatingDistribution] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionReason, setActionReason] = useState('');

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: pagination.page, limit: 10 };
      if (search) params.q = search;
      if (ratingFilter) params.rating = ratingFilter;
      if (statusFilter) params.verificationStatus = statusFilter;
      if (accountStatusFilter) params.accountStatus = accountStatusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await getAdminProviders(params);
      const data = res.data?.data || {};
      setProviders(data.providers || []);
      setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
      setRatingDistribution(data.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
      if (data.categories) setCategories(data.categories);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load providers';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, ratingFilter, statusFilter, accountStatusFilter, categoryFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleAction = (provider, type) => {
    setSelectedProvider(provider);
    setModalType(type);
    setActionReason('');
  };

  const confirmAction = async () => {
    if (!selectedProvider) return;
    setActionLoading(true);
    try {
      const actionMap = {
        approve: { status: 'approved', message: 'Provider approved successfully' },
        re_review: { status: 'approved', message: 'Provider approved successfully' },
        reject: { status: 'rejected', message: 'Provider application rejected' },
        suspend: { status: 'suspended', message: 'Provider suspended' },
        block: { status: 'blocked', message: 'Provider blocked' },
        activate: { status: 'approved', message: 'Provider activated successfully' },
      };
      const action = actionMap[modalType];
      if (action) {
        const payload = { status: action.status };
        if (actionReason.trim()) payload.reason = actionReason.trim();
        await updateProviderStatus(selectedProvider._id, payload);
        toast.success(action.message);
        fetchProviders();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
      setSelectedProvider(null);
      setModalType(null);
      setActionReason('');
    }
  };

  const needsReason = ['reject', 'suspend', 'block'].includes(modalType);

  const columns = [
    {
      key: 'name', label: 'Provider',
      render: (row) => (
        <div className="flex items-center gap-3 min-w-[200px] cursor-pointer hover:opacity-80" onClick={() => navigate(`/admin/providers/${row._id}`)}>
          <Avatar src={row} name={row.businessName || 'P'} size="sm" />
          <div className="min-w-0">
            <p className="font-medium text-ink-light dark:text-ink-dark truncate">{row.businessName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{row.userId?.name ? `${row.userId.name} • ` : ''}{row.userId?.email || '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', label: 'Phone', render: (row) => <span className="text-sm whitespace-nowrap">{row.userId?.phone || '—'}</span> },
    { key: 'category', label: 'Category', render: (row) => row.category || '—' },
    { key: 'city', label: 'City / Area', render: (row) => row.location?.city || '—' },
    {
      key: 'verification', label: 'KYC Status',
      render: (row) => { const status = getKycStatus(row); const config = verificationStatusConfig[status] || { label: status, variant: 'neutral' }; return <Badge variant={config.variant}>{config.label}</Badge>; },
    },
    {
      key: 'accountStatus', label: 'Account Status',
      render: (row) => { const status = getAccountStatus(row); const config = accountStatusConfig[status] || { label: status, variant: 'neutral' }; return <Badge variant={config.variant}>{config.label}</Badge>; },
    },
    {
      key: 'rating', label: 'Rating',
      render: (row) => (<div className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /><span className="font-medium">{row.rating ? row.rating.toFixed(1) : '0.0'}</span><span className="text-xs text-gray-400">({row.reviewCount || 0})</span></div>),
    },
    {
      key: 'bookings', label: 'Bookings',
      render: (row) => (
        <div className="text-xs whitespace-nowrap">
          <span className="font-medium text-ink-light dark:text-ink-dark">{row.bookingsCount || 0} total</span>
          <div className="text-gray-500">
            <span className="text-emerald-600 dark:text-emerald-400">{row.completedBookingsCount || 0} comp</span> • <span className="text-rose-600 dark:text-rose-400">{row.cancelledBookingsCount || 0} canc</span> ({row.cancellationRate || 0}%)
          </div>
        </div>
      ),
    },
    { key: 'earnings', label: 'Earnings', render: (row) => <span className="whitespace-nowrap font-medium text-emerald-600 dark:text-emerald-400">₹{(row.totalEarnings || 0).toLocaleString('en-IN')}</span> },
    { key: 'created', label: 'Joined', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—' },
    {
      key: 'actions', label: 'Actions',
      render: (row) => {
        const kycStatus = getKycStatus(row);
        const accountStatus = getAccountStatus(row);
        const buttonClass = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50';
        const stopClick = (callback) => (event) => {
          event.stopPropagation();
          callback();
        };

        let statusButton;
        if (kycStatus === 'pending') {
          statusButton = <button type="button" onClick={stopClick(() => handleAction(row, 'approve'))} className={`${buttonClass} text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20`} aria-label="Approve provider" title="Approve"><CheckCircle2 className="h-4 w-4" /></button>;
        } else if (kycStatus === 'rejected') {
          statusButton = <button type="button" onClick={stopClick(() => handleAction(row, 're_review'))} className={`${buttonClass} text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20`} aria-label="Review provider again" title="Review"><RefreshCw className="h-4 w-4" /></button>;
        } else if (['verified', 'approved'].includes(kycStatus)) {
          statusButton = <button type="button" disabled className={`${buttonClass} text-success-600`} aria-label="Provider verified" title="Verified"><CheckCircle2 className="h-4 w-4" /></button>;
        } else {
          statusButton = <button type="button" disabled className={`${buttonClass} text-gray-400`} aria-label={`KYC status: ${kycStatus}`} title={kycStatus}><ShieldCheck className="h-4 w-4" /></button>;
        }

        let accountButton;
        if (accountStatus === 'active') {
          accountButton = <button type="button" onClick={stopClick(() => handleAction(row, 'suspend'))} className={`${buttonClass} text-warning-600 hover:bg-warning-50 dark:hover:bg-warning-900/20`} aria-label="Suspend provider account" title="Suspend"><AlertTriangle className="h-4 w-4" /></button>;
        } else if (['suspended', 'blocked'].includes(accountStatus)) {
          accountButton = <button type="button" onClick={stopClick(() => handleAction(row, 'activate'))} className={`${buttonClass} text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20`} aria-label="Activate provider account" title={accountStatus === 'blocked' ? 'Unblock' : 'Activate'}><ShieldCheck className="h-4 w-4" /></button>;
        } else {
          accountButton = <button type="button" disabled className={`${buttonClass} text-gray-400`} aria-label={`Account status: ${accountStatus}`} title={accountStatus}><Ban className="h-4 w-4" /></button>;
        }

        return <div className="flex w-[150px] min-w-[150px] items-center justify-center gap-2 whitespace-nowrap">
          <button type="button" onClick={stopClick(() => navigate(`/admin/providers/${row._id}`))} className={`${buttonClass} text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20`} aria-label="View provider details" title="View Details"><Eye className="h-4 w-4" /></button>
          {statusButton}
          {accountButton}
        </div>;
      },
    },
  ];

  const modalConfig = {
    approve: { title: 'Approve Provider', message: `Are you sure you want to approve ${selectedProvider?.businessName}?`, confirm: 'Approve', variant: 'primary' },
    re_review: { title: 'Review Provider', message: `Approve ${selectedProvider?.businessName} after reviewing the application again?`, confirm: 'Approve', variant: 'primary' },
    reject: { title: 'Reject Provider', message: `Are you sure you want to reject ${selectedProvider?.businessName}'s application?`, confirm: 'Reject', variant: 'danger' },
    suspend: { title: 'Suspend Provider', message: `Are you sure you want to suspend ${selectedProvider?.businessName}?`, confirm: 'Suspend', variant: 'danger' },
    block: { title: 'Block Provider', message: `Are you sure you want to block ${selectedProvider?.businessName}?`, confirm: 'Block', variant: 'danger' },
    activate: { title: 'Activate Provider', message: `Are you sure you want to activate ${selectedProvider?.businessName}?`, confirm: 'Activate', variant: 'primary' },
  };

  const clearFilters = () => { setSearch(''); setRatingFilter(null); setStatusFilter(''); setAccountStatusFilter(''); setCategoryFilter(''); setDateFrom(''); setDateTo(''); setPagination((p) => ({ ...p, page: 1 })); };
  const hasActiveFilters = search || ratingFilter || statusFilter || accountStatusFilter || categoryFilter || dateFrom || dateTo;

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Failed to load providers"
        description={error}
        action={<Button onClick={fetchProviders}>Try Again</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Provider Management</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">Manage registered service providers, verification, and performance</p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear Filters</Button>}
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchProviders}>Refresh</Button>
          <Button variant="outline" size="sm" icon={Filter} onClick={() => setShowFilters(!showFilters)}>Filters <ChevronDown className={`h-3.5 w-3.5 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} /></Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2"><Star className="h-4 w-4 text-secondary-500" /><span className="text-sm font-medium text-ink-light dark:text-ink-dark">Filter by rating:</span></div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => { setRatingFilter(ratingFilter === star ? null : star); setPagination((p) => ({ ...p, page: 1 })); }} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border transition-colors ${ratingFilter === star ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-ink-light dark:text-ink-dark'}`}>
                {star} <Star className="h-3 w-3 fill-amber-400 text-amber-400" /><span className="text-xs text-gray-400">({ratingDistribution[star] || 0})</span>
              </button>
            ))}
          </div>
        </div>
      </Card>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1"><Input placeholder="Search by name, phone or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} icon={Search} /></div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-ink-light dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-primary-500"><option value="">KYC Status</option><option value="pending">Pending</option><option value="approved">Verified</option><option value="rejected">Rejected</option><option value="suspended">Suspended</option><option value="blocked">Blocked</option></select>
          <select value={accountStatusFilter} onChange={(e) => { setAccountStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-ink-light dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-primary-500"><option value="">Account Status</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="blocked">Blocked</option></select>
        </div>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-col sm:flex-row gap-3">
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-ink-light dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-primary-500"><option value="">All Categories</option>{categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select>
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400 shrink-0" /><input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-ink-light dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-primary-500" /><span className="text-gray-400 text-sm">to</span><input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-ink-light dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          </motion.div>
        )}
      </div>

      {loading ? (<div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>) : providers.length === 0 ? (<EmptyState icon={Star} title="No providers found" description="Try adjusting your filters or search." />) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="p-6 overflow-x-auto">
            <Table columns={columns} data={providers} />
            {pagination.pages > 1 && (<div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800"><p className="text-sm text-gray-500 dark:text-gray-400">Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}>Previous</Button><Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}>Next</Button></div></div>)}
          </Card>
        </motion.div>
      )}

      <Modal isOpen={!!modalType} onClose={() => { setModalType(null); setActionReason(''); }} title={modalConfig[modalType]?.title || ''}>
        <p className="text-gray-600 dark:text-gray-300">{modalConfig[modalType]?.message}</p>
        {needsReason && (<div className="mt-4"><Textarea label="Reason (optional)" value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder={`Enter reason for ${modalType}...`} rows={3} /></div>)}
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => { setModalType(null); setActionReason(''); }}>Cancel</Button>
          <Button variant={modalConfig[modalType]?.variant === 'primary' ? 'primary' : 'danger'} onClick={confirmAction} disabled={actionLoading} loading={actionLoading}>{modalConfig[modalType]?.confirm}</Button>
        </div>
      </Modal>
    </div>
  );
}

export default AdminProvidersPage;
