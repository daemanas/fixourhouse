import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search, UserX, UserCheck, AlertTriangle, Trash2, Loader2, Users } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import { getAdminUsers, updateUserStatus, deleteUser } from '../../services/adminService';

const statusConfig = {
  active: { label: 'Active', variant: 'success' },
  blocked: { label: 'Blocked', variant: 'danger' },
  suspended: { label: 'Suspended', variant: 'danger' },
  warning: { label: 'Warning', variant: 'warning' },
};

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: 10 };
      if (search) params.q = search;
      if (statusFilter) params.status = statusFilter;
      const res = await getAdminUsers(params);
      setUsers(res.data.data.users || []);
      setPagination(res.data.data.pagination || { page: 1, total: 0, pages: 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = (user, type) => {
    setSelectedUser(user);
    setModalType(type);
  };

  const confirmAction = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const actionMap = {
        block: { status: 'blocked', message: 'User blocked successfully' },
        unblock: { status: 'active', message: 'User unblocked successfully' },
        warn: { status: 'warning', message: 'Warning sent to user' },
      };
      const action = actionMap[modalType];
      if (action) {
        await updateUserStatus(selectedUser._id, { status: action.status });
        toast.success(action.message);
        fetchUsers();
      } else if (modalType === 'delete') {
        await deleteUser(selectedUser._id);
        toast.success('User deleted successfully');
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
      setSelectedUser(null);
      setModalType(null);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Customer',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar src={row.avatar} name={row.name || 'C'} size="sm" />
          <div>
            <p className="font-medium text-ink-light dark:text-ink-dark">{row.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{row.phone || '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'bookings', label: 'Bookings', render: (row) => row.bookingsCount || 0 },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={statusConfig[row.status]?.variant || 'primary'}>
          {statusConfig[row.status]?.label || row.status}
        </Badge>
      ),
    },
    {
      key: 'joined',
      label: 'Joined',
      render: (row) => new Date(row.createdAt).toLocaleDateString('en-IN'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.status === 'active' || row.status === 'warning' ? (
            <>
              <button
                onClick={() => handleAction(row, 'warn')}
                className="p-1.5 rounded-lg text-warning-600 hover:bg-warning-50 dark:hover:bg-warning-900/20"
                title="Warn user"
              >
                <AlertTriangle className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleAction(row, 'block')}
                className="p-1.5 rounded-lg text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                title="Block user"
              >
                <UserX className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => handleAction(row, 'unblock')}
              className="p-1.5 rounded-lg text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20"
              title="Unblock user"
            >
              <UserCheck className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => handleAction(row, 'delete')}
            className="p-1.5 rounded-lg text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20"
            title="Delete user"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const modalConfig = {
    block: { title: 'Block User', message: `Block ${selectedUser?.name}? They will not be able to log in.`, confirm: 'Block' },
    unblock: { title: 'Unblock User', message: `Unblock ${selectedUser?.name}?`, confirm: 'Unblock' },
    warn: { title: 'Warn User', message: `Send a warning to ${selectedUser?.name}?`, confirm: 'Send Warning' },
    delete: { title: 'Delete User', message: `Delete ${selectedUser?.name}? This action cannot be undone.`, confirm: 'Delete' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Customer Management</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Manage customer accounts, warnings, and blocks
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-ink-light dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
          <option value="suspended">Suspended</option>
          <option value="warning">Warning</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description="Try adjusting your filters or search."
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="p-6 overflow-x-auto">
            <Table columns={columns} data={users} />
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      )}

      <Modal
        isOpen={!!modalType}
        onClose={() => setModalType(null)}
        title={modalConfig[modalType]?.title || ''}
      >
        <p className="text-gray-600 dark:text-gray-300">
          {modalConfig[modalType]?.message}
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => setModalType(null)}>
            Cancel
          </Button>
          <Button
            variant={modalType === 'unblock' ? 'primary' : 'danger'}
            onClick={confirmAction}
            disabled={actionLoading}
          >
            {actionLoading ? 'Processing...' : modalConfig[modalType]?.confirm}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default AdminUsersPage;