import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search,
  MessageSquareWarning,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import {
  getAdminComplaints,
  getAdminComplaintStats,
} from '../../services/complaintService';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'In Progress' },
  { value: 'waiting_for_provider', label: 'Awaiting Provider' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const statusConfig = {
  open: { label: 'Open', variant: 'warning' },
  under_review: { label: 'Under Review', variant: 'primary' },
  waiting_for_provider: { label: 'Awaiting Provider', variant: 'secondary' },
  resolved: { label: 'Resolved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

const priorityConfig = {
  low: { label: 'Low', variant: 'neutral' },
  medium: { label: 'Medium', variant: 'secondary' },
  high: { label: 'High', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'danger' },
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const getCustomerId = (complaint) => {
  if (!complaint) return null;
  const cust = complaint.customer;
  if (cust) {
    if (typeof cust === 'object' && cust._id) return String(cust._id);
    if (typeof cust === 'string' && cust.trim() && cust !== '[object Object]') return cust;
  }
  const bookingCust = complaint.booking?.customerId;
  if (bookingCust) {
    if (typeof bookingCust === 'object' && bookingCust._id) return String(bookingCust._id);
    if (typeof bookingCust === 'string' && bookingCust.trim() && bookingCust !== '[object Object]') return bookingCust;
  }
  return null;
};

const getProviderId = (complaint) => {
  if (!complaint) return null;
  const prov = complaint.provider;
  if (prov) {
    if (typeof prov === 'object' && prov._id) return String(prov._id);
    if (typeof prov === 'string' && prov.trim() && prov !== '[object Object]') return prov;
  }
  const bookingProv = complaint.booking?.providerId;
  if (bookingProv) {
    if (typeof bookingProv === 'object' && bookingProv._id) return String(bookingProv._id);
    if (typeof bookingProv === 'string' && bookingProv.trim() && bookingProv !== '[object Object]') return bookingProv;
  }
  return null;
};

const getCustomerName = (complaint) => {
  if (!complaint) return '—';
  if (typeof complaint.customer === 'object' && complaint.customer?.name) {
    return complaint.customer.name;
  }
  if (typeof complaint.booking?.customerId === 'object' && complaint.booking.customerId?.name) {
    return complaint.booking.customerId.name;
  }
  return '—';
};

const getProviderName = (complaint) => {
  if (!complaint) return '—';
  const prov = complaint.provider;
  if (typeof prov === 'object' && prov) {
    if (prov.businessName) return prov.businessName;
    if (prov.userId?.name) return prov.userId.name;
  }
  const bookingProv = complaint.booking?.providerId;
  if (typeof bookingProv === 'object' && bookingProv) {
    if (bookingProv.businessName) return bookingProv.businessName;
    if (bookingProv.userId?.name) return bookingProv.userId.name;
  }
  return '—';
};

function CustomerLink({ complaint }) {
  const customerId = getCustomerId(complaint);
  const name = getCustomerName(complaint);

  if (!customerId || name === '—') {
    return <span className="text-ink-light dark:text-ink-dark">{name}</span>;
  }

  return (
    <Link
      to={`/admin/customers/${customerId}`}
      className="group inline-flex items-center gap-1 font-medium text-primary hover:text-primary-600 dark:hover:text-primary-400 hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded transition-colors"
      aria-label={`View customer profile for ${name}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span>{name}</span>
      <ExternalLink className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

function ProviderLink({ complaint }) {
  const providerId = getProviderId(complaint);
  const name = getProviderName(complaint);

  if (!providerId || name === '—') {
    return <span className="text-ink-light dark:text-ink-dark">{name}</span>;
  }

  return (
    <Link
      to={`/admin/providers/${providerId}`}
      className="group inline-flex items-center gap-1 font-medium text-primary hover:text-primary-600 dark:hover:text-primary-400 hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded transition-colors"
      aria-label={`View provider profile for ${name}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span>{name}</span>
      <ExternalLink className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

const StatCard = ({ label, value, icon: Icon, accent }) => (
  <Card className="p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-ink-light dark:text-ink-dark">
          {value}
        </p>
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </Card>
);


export function AdminComplaintsPage() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 10, search, status, priority };
      const [listRes, statsRes] = await Promise.all([
        getAdminComplaints(params),
        getAdminComplaintStats(),
      ]);
      const listData = listRes.data?.data || listRes.data || {};
      const statsData = statsRes.data?.data || statsRes.data || {};
      // The list endpoint returns { complaints, pagination: { page, limit, total, pages } }.
      setComplaints(listData.complaints || []);
      setPage(listData.pagination?.page || 1);
      setPages(listData.pagination?.pages || 1);
      setTotal(listData.pagination?.total || 0);
      // The stats endpoint returns { stats: { total, byStatus, ... } }.
      setStats(statsData.stats || statsData);
    } catch (err) {
      // Surface the real API failure as an error state — never silently show 0.
      setError(err.response?.data?.message || 'Failed to load complaints');
      toast.error(err.response?.data?.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, [page, status, priority]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounce server-side search so we don't fire a request on every keystroke.
  useEffect(() => {
    if (!search) return;
    const t = setTimeout(() => fetchData(), 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    {
      key: 'complaintId',
      label: 'ID',
      render: (row) => (
        <span className="font-mono text-xs text-gray-500">
          {row.complaintId || row._id?.slice(-6)}
        </span>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (row) => <Badge variant="secondary">{row.category}</Badge>,
    },
    { key: 'customer', label: 'Customer', render: (row) => <CustomerLink complaint={row} /> },
    { key: 'provider', label: 'Provider', render: (row) => <ProviderLink complaint={row} /> },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => (
        <Badge variant={priorityConfig[row.priority]?.variant || 'neutral'}>
          {priorityConfig[row.priority]?.label || row.priority}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={statusConfig[row.status]?.variant || 'primary'}>
          {statusConfig[row.status]?.label || row.status}
        </Badge>
      ),
    },
    { key: 'createdAt', label: 'Filed', render: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/complaints/${row._id}`)}>
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">
          Complaints & Disputes
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Review customer complaints, gather provider responses, and make
          decisions with optional refunds.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total" value={stats.total} icon={MessageSquareWarning} accent="bg-primary/10 text-primary" />
          <StatCard label="Open" value={(stats.byStatus?.open || 0) + (stats.byStatus?.under_review || 0) + (stats.byStatus?.waiting_for_provider || 0)} icon={AlertCircle} accent="bg-yellow-100 text-yellow-600" />
          <StatCard label="In Progress" value={stats.byStatus?.under_review || 0} icon={AlertCircle} accent="bg-blue-100 text-blue-600" />
          <StatCard label="Resolved" value={stats.byStatus?.resolved || 0} icon={AlertCircle} accent="bg-green-100 text-green-600" />
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">Search</label>
            <Input
              placeholder="Search ID, customer, provider..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              icon={Search}
            />
          </div>
          <div className="sm:w-48">
            <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
            <Select options={STATUS_OPTIONS} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} />
          </div>
          <div className="sm:w-48">
            <label className="mb-1 block text-xs font-medium text-gray-500">Priority</label>
            <Select options={PRIORITY_OPTIONS} value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading complaints...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-2 p-10 text-red-600">
            <AlertCircle className="h-5 w-5" /> {error}
          </div>
        ) : (
          <Table columns={columns} data={complaints} emptyMessage="No complaints found." />
        )}
        {!loading && !error && pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-700">
            <span className="text-sm text-gray-500"> {total} total · Page {page} of {pages} </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminComplaintsPage;
