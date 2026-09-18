import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Wallet, Plus, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';

const initialWithdrawals = [
  { id: 1, date: '28 Jul 2026', amount: 5000, method: 'Bank Transfer', status: 'completed', ref: 'WDR-2026-001' },
  { id: 2, date: '15 Jul 2026', amount: 3000, method: 'UPI', status: 'completed', ref: 'WDR-2026-002' },
  { id: 3, date: '01 Aug 2026', amount: 2000, method: 'Bank Transfer', status: 'pending', ref: 'WDR-2026-003' },
  { id: 4, date: '20 Jun 2026', amount: 4000, method: 'UPI', status: 'rejected', ref: 'WDR-2026-004' },
];

const statusConfig = {
  completed: { label: 'Completed', color: 'success', icon: CheckCircle2 },
  pending: { label: 'Processing', color: 'warning', icon: Clock },
  rejected: { label: 'Rejected', color: 'danger', icon: XCircle },
};

const columns = [
  { key: 'ref', label: 'Reference' },
  { key: 'date', label: 'Date' },
  { key: 'amount', label: 'Amount', render: (row) => `₹${row.amount.toLocaleString()}` },
  { key: 'method', label: 'Method' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => {
      const config = statusConfig[row.status];
      const Icon = config.icon;
      return (
        <Badge variant={config.variant}>
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      );
    },
  },
];

export function WithdrawalsPage() {
  const [withdrawals] = useState(initialWithdrawals);

  const handleRequest = () => {
    toast.success('Withdrawal request form coming soon');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Withdrawals</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Manage your withdrawal requests and history
          </p>
        </div>
        <Button onClick={handleRequest}>
          <Plus className="h-4 w-4" />
          Request Withdrawal
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Available Balance</p>
              <p className="text-xl font-bold text-ink-light dark:text-ink-dark">₹8,200</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success-50 dark:bg-success-900/20 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success-600 dark:text-success-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Withdrawn</p>
              <p className="text-xl font-bold text-ink-light dark:text-ink-dark">₹12,000</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-warning-50 dark:bg-warning-900/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-warning-600 dark:text-warning-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-xl font-bold text-ink-light dark:text-ink-dark">₹2,000</p>
            </div>
          </div>
        </Card>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="p-6">
          <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-4">
            Withdrawal History
          </h2>
          <Table columns={columns} data={withdrawals} />
        </Card>
      </motion.div>
    </div>
  );
}

export default WithdrawalsPage;
