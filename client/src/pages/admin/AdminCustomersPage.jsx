import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search, Ban, CheckCircle2, AlertTriangle, Loader2, Users } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import Pagination from '../../components/ui/Pagination';
import {
  getAdminCustomers,
  updateCustomerStatus,
} from '../../services/adminService';

const statusConfig = {
  active: { label: 'Active', variant: 'success' },
  blocked: { label: 'Blocked', variant: 'danger' },
  suspended: { label: 'Suspended', variant: 'danger' },
  warning: { label: 'Warning', variant: 'warning' },
};

const statusFilterOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'suspended', label: 'Suspended' },
];

const modalConfig = {
  block: {
    title: 'Block Customer',
    message: 'Are you sure you want to block this customer? They will no longer be able to book services or log in.',
    confirm: 'Block',
    variant: 'danger',
    status: 'blocked',
  },
  unblock: {
    title: 'Unblock Customer',
    message: 'Are you sure you want to unblock this customer? Their account will be reactivated.',
    confirm: 'Unblock',
    variant: 'primary',
    status: 'active',
  },
  warn: {
    title: 'Warn Customer',
    message: 'Send a warning to this customer. This will be recorded on their account.',
    confirm: 'Send Warning',
    variant: 'primary',
    status: 'warning',
  },
};

export function AdminCustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [warningText, setWarningText] = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.q = search;
      if (statusFilter) params.status = statusFilter;
      const res = await getAdminCustomers(params);
      setCustomers(res.data.data.customers || []);
      const p = res.data.data.pagination || { page: 1, total: 0, pages: 1 };
      setTotalPages(p.pages);
      setTotalItems(p.total);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openModal = (customer, type) => {
    setSelected(customer);
    setModalType(type);
    setWarningText('');
  };

  const confirmAction = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const cfg = modalConfig[modalType];
      const payload = {};
      if (cfg.status === 'warning') {
        if (!warningText.trim()) {
          toast.error('Please enter a warning message');
          setActionLoading(false);
          return;
        }
        payload.warning = warningText.trim();
      } else {
        payload.status = cfg.status;
      }
      await updateCustomerStatus(selected._id, payload);
      toast.success(
        modalType === 'block'
          ? 'Customer blocked successfully'
          : modalType === 'unblock'
          ? 'Customer unblocked successfully'
          : 'Warning sent to customer'
      );
      setModalType(null);
      setSelected(null);
      setWarningText('');
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Customer',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar src={row.avatar} name={row.name || 'C'} size="sm" />
          <div className="min-w-0">
            <p className="font-medium text-ink-light dark:text-ink-dark truncate">{row.name || '—'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{row.phone || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (row) => <span className="text-gray-600 dark:text-gray-300">{row.email || '—'}</span>,
    },
    {
      key: 'bookings',
      label: 'Bookings',
      render: (row) => (
        <div className="text-center">
          <p className="font-medium text-ink-light dark:text-ink-dark">{row.bookingsCount || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.completedBookings || 0} done</p>
        </div>
      ),
    },
    {
      key: 'spent',
      label: 'Total Spent',
      render: (row) => (
        <span className="font-medium text-ink-light dark:text-ink-dark">₹{row.totalSpent || 0}</span>
      ),
    },
    {
      key: 'ratings',
      label: 'Avg Rating',
      render: (row) => (
        <span className="text-gray-600 dark:text-gray-300">
          {row.avgRatingGiven ? `${row.avgRatingGiven} ★` : '—'}
        </span>
      ),
    },
    {
      key: 'complaints',
      label: 'Complaints',
      render: (row) => (
        <span className="text-gray-600 dark:text-gray-300">{row.complaintsFiled || 0}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        const cfg = statusConfig[row.status] || statusConfig.active;
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/customers/${row._id}`)}>
            View
          </Button>
          {row.status === 'active' ? (
            <Button
              size="sm"
              variant="danger"
              icon={Ban}
              onClick={() => openModal(row, 'block')}
            >
              Block
            </Button>
          ) : (
            <Button
              size="sm"
              variant="success"
              icon={CheckCircle2}
              onClick={() => openModal(row, 'unblock')}
            >
              Unblock
            </Button>
          )}
          <Button size="sm" variant="ghost" icon={AlertTriangle} onClick={() => openModal(row, 'warn')}>
            Warn
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Customer Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View, search and manage customer accounts.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search by name, phone or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-ink-light dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {statusFilterOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : customers.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={Users}
              title="No customers found"
              description="Try adjusting your filters or search."
            />
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="p-6 overflow-x-auto">
              <Table columns={columns} data={customers} />
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={10}
                onPageChange={setPage}
              />
            </Card>
          </motion.div>
        )}
      </motion.div>

      <Modal
        isOpen={!!modalType}
        onClose={() => { setModalType(null); setSelected(null); setWarningText(''); }}
        title={modalConfig[modalType]?.title || ''}
      >
        <p className="text-gray-600 dark:text-gray-300">
          {modalConfig[modalType]?.message}
        </p>
        {modalType === 'warn' && (
          <div className="mt-4">
            <Input
              label="Warning message"
              value={warningText}
              onChange={(e) => setWarningText(e.target.value)}
              placeholder="Reason for warning..."
            />
          </div>
        )}
        {selected && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-sm text-ink-light dark:text-ink-dark font-medium">{selected.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{selected.phone}{selected.email ? ` · ${selected.email}` : ''}</p>
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => { setModalType(null); setSelected(null); setWarningText(''); }}
          >
            Cancel
          </Button>
          <Button
            variant={modalConfig[modalType]?.variant || 'primary'}
            onClick={confirmAction}
            loading={actionLoading}
          >
            {actionLoading ? 'Processing...' : modalConfig[modalType]?.confirm}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default AdminCustomersPage;
