import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  IndianRupee,
  Wallet,
  TrendingUp,
  TrendingDown,
  Landmark,
  Banknote,
  AlertTriangle,
  Receipt,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { getProviderEarnings } from '../../services/providerService';
import { createWithdrawal } from '../../services/withdrawalService';

const formatINR = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN')}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const currentMonthLabel = () =>
  new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

// Existing supported withdrawal methods (matches Withdrawal model enum values)
const withdrawalMethods = [
  { id: 'bank', label: 'Bank Transfer', icon: Landmark },
  { id: 'upi', label: 'UPI', icon: Wallet },
];

const transactionColumns = [
  { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
  { key: 'customer', label: 'Customer' },
  { key: 'service', label: 'Service' },
  { key: 'jobAmount', label: 'Job Amount', render: (row) => formatINR(row.jobAmount) },
  { key: 'platformFee', label: 'Platform Fee', render: (row) => formatINR(row.platformFee) },
  {
    key: 'providerEarnings',
    label: 'Provider Earnings',
    render: (row) => <span className="font-semibold">{formatINR(row.providerEarnings)}</span>,
  },
  {
    key: 'paymentMethod',
    label: 'Payment Method',
    render: (row) => (
      <Badge variant="neutral">{row.paymentMethod === 'cash' ? 'Cash' : 'Online'}</Badge>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: () => <Badge variant="success">Completed</Badge>,
  },
];

export function EarningsPage() {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bank');
  const [withdrawError, setWithdrawError] = useState(null);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProviderEarnings();
      setEarnings(res.data.data.earnings);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load earnings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const handleWithdrawClick = () => {
    const balance = Number(earnings?.availableBalance || 0);
    if (balance <= 0) {
      toast.error('No funds available for withdrawal.');
      return;
    }
    setWithdrawAmount('');
    setWithdrawMethod('bank');
    setWithdrawError(null);
    setIsWithdrawOpen(true);
  };

  const closeWithdrawModal = () => {
    if (withdrawLoading) return;
    setIsWithdrawOpen(false);
  };

  const handleWithdrawSubmit = async () => {
    setWithdrawError(null);
    const amount = Number(withdrawAmount);
    const balance = Number(earnings?.availableBalance || 0);

    // Validate: non-empty, numeric, > 0, and <= available balance.
    if (!withdrawAmount || withdrawAmount.trim() === '' || !Number.isFinite(amount)) {
      setWithdrawError('Please enter a valid amount.');
      return;
    }
    if (amount <= 0) {
      setWithdrawError('Amount must be greater than 0.');
      return;
    }
    if (amount > balance) {
      setWithdrawError(`Amount cannot exceed your available balance (${formatINR(balance)}).`);
      return;
    }

    // Prevent duplicate requests while one is already processing.
    setWithdrawLoading(true);
    try {
      const res = await createWithdrawal({ amount, method: withdrawMethod });
      toast.success(res.data?.message || 'Withdrawal request submitted');
      setIsWithdrawOpen(false);
      fetchEarnings();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to submit withdrawal request.';
      setWithdrawError(message);
      toast.error(message);
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
          </div>
          <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
                  <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
                </div>
                <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-xl" />
              </div>
              <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
        <div className="card overflow-hidden">
          <div className="p-6 pb-4">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4 border-t border-border-light dark:border-border-dark">
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
                <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
              </div>
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Failed to load earnings"
        description={error}
        action={<Button onClick={fetchEarnings}>Try Again</Button>}
      />
    );
  }

  const transactions = earnings?.transactions || [];
  const monthChangePercent = earnings?.monthChangePercent;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Earnings</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Track your earnings and withdrawals
          </p>
        </div>
        <Button onClick={handleWithdrawClick}>
          <Wallet className="h-4 w-4" />
          Withdraw Funds
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Earnings"
          value={formatINR(earnings.totalEarnings)}
          icon={IndianRupee}
          color="primary"
          trendLabel="From completed jobs"
        />
        <StatCard
          title="Available Balance"
          value={formatINR(earnings.availableBalance)}
          icon={Wallet}
          color="success"
          trendLabel="Ready to withdraw"
        />
        <StatCard
          title="This Month"
          value={formatINR(earnings.thisMonth)}
          icon={TrendingUp}
          color="secondary"
          trend={monthChangePercent}
          trendLabel={
            monthChangePercent === null || monthChangePercent === undefined
              ? 'No previous data'
              : `${currentMonthLabel()} earnings`
          }
        />
        <StatCard
          title="Withdrawn"
          value={formatINR(earnings.totalWithdrawn)}
          icon={TrendingDown}
          color="warning"
          trendLabel="Total withdrawn"
        />
      </div>

      {/* Transaction history */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
            <div>
              <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark">
                Transaction History
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Provider Earnings = Job Amount − Platform Fee
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-1.5">
              <Receipt className="h-3.5 w-3.5" />
              {transactions.length} completed {transactions.length === 1 ? 'job' : 'jobs'}
            </div>
          </div>
          {transactions.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No transactions yet"
              description="Your earnings will appear here once you complete jobs."
            />
          ) : (
            <div className="mt-4">
              <Table columns={transactionColumns} data={transactions} />
            </div>
          )}
        </Card>
      </motion.div>

      {/* Withdrawal modal */}
      <Modal
        isOpen={isWithdrawOpen}
        onClose={closeWithdrawModal}
        title="Withdraw Funds"
        subtitle="Withdraw from your available earnings"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Wallet className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              Available Balance
            </div>
            <span className="text-lg font-bold text-primary-700 dark:text-primary-300">
              {formatINR(earnings.availableBalance)}
            </span>
          </div>

          <Input
            label="Withdrawal Amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={withdrawAmount}
            onChange={(e) => {
              setWithdrawAmount(e.target.value);
              if (withdrawError) setWithdrawError(null);
            }}
            placeholder="Enter amount"
            error={withdrawError}
            disabled={withdrawLoading}
            autoFocus
          />

          <div>
            <label className="label">Payment / Withdrawal Method</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {withdrawalMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = withdrawMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setWithdrawMethod(method.id)}
                    disabled={withdrawLoading}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isSelected
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    />
                    <span className="text-sm font-medium text-ink-light dark:text-ink-dark">
                      {method.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Bank transfers and UPI withdrawals are processed by LocalFix admin.
          </p>

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={closeWithdrawModal} disabled={withdrawLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleWithdrawSubmit}
              loading={withdrawLoading}
              disabled={!withdrawAmount}
            >
              <Banknote className="h-4 w-4" />
              Withdraw Funds
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default EarningsPage;


