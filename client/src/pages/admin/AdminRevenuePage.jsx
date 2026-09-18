import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  IndianRupee,
  TrendingUp,
  Wallet,
  Percent,
  RefreshCw,
  AlertTriangle,
  Download,
  Search,
  Calendar,
  Receipt,
  Users,
  CircleDollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton, { SkeletonCard, SkeletonTable } from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { getAdminRevenue, exportAdminRevenueCsv } from '../../services/adminService';

// ---- Formatting helpers -------------------------------------------------
const formatINR = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const formatINRDecimal = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatShortDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ---- Date range presets -------------------------------------------------
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};
const daysAgo = (n) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  return d;
};
const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
};

const RANGE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom' },
];

// Compute a fresh date window each time a preset is (re)selected so the
// window never goes stale while the page is left open.
const getPresetRange = (id) => {
  switch (id) {
    case 'today':
      return { from: startOfToday(), to: endOfToday() };
    case '7d':
      return { from: daysAgo(7), to: endOfToday() };
    case '30d':
      return { from: daysAgo(30), to: endOfToday() };
    case 'month':
      return { from: startOfMonth(), to: endOfToday() };
    default:
      return { from: null, to: null };
  }
};


// ---- Inline SVG revenue chart (no external chart dependency) ------------
function RevenueChart({ data }) {
  if (!data || data.length === 0) return null;

  const width = 760;
  const height = 240;
  const padding = { top: 16, right: 16, bottom: 28, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxVal = Math.max(1, ...data.map((d) => Math.max(num(d.gross), num(d.net), num(d.refunds))));

  const x = (i) => padding.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v) => padding.top + innerH - (v / maxVal) * innerH;

  const linePath = (key) => data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(num(d[key]))}`).join(' ');

  const areaPath = (key) => {
    if (data.length === 0) return '';
    const top = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(num(d[key]))}`).join(' ');
    const last = x(data.length - 1);
    const first = x(0);
    return `${top} L ${last} ${padding.top + innerH} L ${first} ${padding.top + innerH} Z`;
  };

  const yTicks = [0, 1, 2, 3, 4].map((i) => Math.round((maxVal * i) / 4));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto text-gray-200 dark:text-gray-700"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Revenue trend chart"
    >
      {yTicks.map((t, i) => {
        const gy = padding.top + innerH - (i / 4) * innerH;
        return (
          <g key={i}>
            <line x1={padding.left} y1={gy} x2={width - padding.right} y2={gy} stroke="currentColor" strokeWidth="1" />
            <text x={padding.left - 8} y={gy + 4} textAnchor="end" className="fill-gray-400 dark:fill-gray-500 text-[10px]">
              {t >= 1000 ? `${(t / 1000).toFixed(t % 1000 ? 1 : 0)}k` : t}
            </text>
          </g>
        );
      })}

      <path d={areaPath('gross')} className="fill-primary-500/10" />
      <path d={areaPath('net')} className="fill-success-500/10" />
      <path d={linePath('gross')} fill="none" className="stroke-primary-500" strokeWidth="2.5" />
      <path d={linePath('net')} fill="none" className="stroke-success-500" strokeWidth="2.5" />

      {data.map((d, i) => {
        const show = data.length <= 15 || i % Math.ceil(data.length / 15) === 0 || i === data.length - 1;
        if (!show) return null;
        return (
          <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className="fill-gray-400 dark:fill-gray-500 text-[10px]">
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

// ---- Status badge for a payment row -------------------------------------
function PaymentStatusBadge({ status }) {
  const map = {
    paid: { variant: 'success', label: 'Paid' },
    refunded: { variant: 'danger', label: 'Refunded' },
    pending: { variant: 'warning', label: 'Pending' },
    failed: { variant: 'neutral', label: 'Failed' },
  };
  const cfg = map[status] || { variant: 'neutral', label: status || '—' };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export default function AdminRevenuePage() {
  const [rangeId, setRangeId] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Resolve the active date window into Date objects for the API.
  const { from, to } = useMemo(() => {
    if (rangeId === 'custom') {
      return {
        from: customFrom ? new Date(`${customFrom}T00:00:00`) : '',
        to: customTo ? new Date(`${customTo}T23:59:59.999`) : '',
      };
    }
    return getPresetRange(rangeId);
  }, [rangeId, customFrom, customTo]);

  const activePresetLabel = RANGE_PRESETS.find((p) => p.id === rangeId)?.label || 'Custom';

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        from: from ? from.toISOString() : '',
        to: to ? to.toISOString() : '',
        page,
        limit,
        search: search.trim(),
        paymentStatus: paymentStatus || '',
      };
      const res = await getAdminRevenue(params);
      // The API wraps the report in an envelope: { statusCode, data: {...}, ... }.
      // Store the inner `data` payload (matches the rest of the admin pages).
      setData(res.data.data);
    } catch (err) {
      console.error('Revenue report error:', err);
      toast.error(err?.response?.data?.message || 'Failed to load revenue report');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, page, limit, search, paymentStatus]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleRangeChange = (id) => {
    setRangeId(id);
    setPage(1);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setPaymentStatus(e.target.value);
    setPage(1);
  };

  const handlePageChange = (next) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAdminRevenueCsv({
        from: from ? from.toISOString() : '',
        to: to ? to.toISOString() : '',
        search: search.trim(),
        paymentStatus: paymentStatus || '',
      });
      toast.success('Revenue report exported');
    } catch (err) {
      console.error('CSV export error:', err);
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const summary = data?.summary || {};
  const chartData = data?.chart || [];
  const providers = data?.providerBreakdown || [];
  const transactions = data?.transactions || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 10, pages: 1 };

  const gross = num(summary.grossRevenue);
  const commission = num(summary.platformCommission);
  const net = num(summary.netRevenue);
  const providerEarnings = num(summary.providerEarnings);
  const refunds = num(summary.refunds);
  const transactionsCount = num(summary.totalTransactions);
  const refundCount = num(summary.refundCount);
  const paidCount = num(summary.totalBookings);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Revenue Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Platform earnings across all bookings and payments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" icon={RefreshCw} onClick={fetchReport} disabled={loading}>
            Refresh
          </Button>
          <Button variant="primary" icon={Download} onClick={handleExport} loading={exporting}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Range tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleRangeChange(preset.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              rangeId === preset.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom date pickers */}
      {rangeId === 'custom' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex flex-wrap items-end gap-4 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-gray-800 p-4"
        >
          <div className="w-40">
            <label className="label">From</label>
            <Input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }} max={customTo || undefined} />
          </div>
          <div className="w-40">
            <label className="label">To</label>
            <Input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setPage(1); }} min={customFrom || undefined} />
          </div>
        </motion.div>
      )}

      {/* Search + status filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search customer, provider, service..."
            value={search}
            onChange={handleSearch}
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={paymentStatus}
            onChange={handleStatusChange}
            placeholder="All Payments"
            options={[
              { value: 'paid', label: 'Paid' },
              { value: 'refunded', label: 'Refunded' },
              { value: 'pending', label: 'Pending' },
              { value: 'failed', label: 'Failed' },
            ]}
          />
        </div>
      </div>

      {/* Summary cards */}
      {loading && !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Gross Revenue" value={formatINR(gross)} icon={IndianRupee} color="primary" trendLabel={`${transactionsCount} payments`} />
          <StatCard title="Platform Commission" value={formatINR(commission)} icon={Percent} color="secondary" trendLabel="15% platform fee" />
          <StatCard title="Provider Earnings" value={formatINR(providerEarnings)} icon={Wallet} color="success" trendLabel="paid out to providers" />
          <StatCard title="Refunds" value={formatINR(refunds)} icon={ArrowDownRight} color="danger" trendLabel={`${refundCount} refunded`} />
          <StatCard title="Net Revenue" value={formatINR(net)} icon={CircleDollarSign} color="warning" trendLabel="after refunds" />
          <StatCard title="Transactions" value={transactionsCount.toLocaleString('en-IN')} icon={Receipt} color="primary" trendLabel={`${paidCount} paid · ${refundCount} refunded`} />
        </div>
      )}

      {/* Revenue trend chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-ink-light dark:text-ink-dark">Revenue Trend</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Daily gross vs. net over {activePresetLabel.toLowerCase()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-primary-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Gross</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-success-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Net</span>
              </div>
            </div>
          </div>

          {loading && !data ? (
            <Skeleton className="h-[240px] w-full" />
          ) : chartData.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No revenue data" description={`No payments recorded during ${activePresetLabel.toLowerCase()}.`} />
          ) : (
            <RevenueChart data={chartData} />
          )}
        </Card>
      </motion.div>

      {/* Provider earnings breakdown */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
        <Card className="p-6">
          <CardHeader title="Provider Earnings Breakdown" subtitle="Gross, commission and net paid to each provider" />
          <div className="mt-4">
            {loading && !data ? (
              <SkeletonTable rows={4} />
            ) : providers.length === 0 ? (
              <EmptyState icon={Users} title="No provider activity" description="Providers with payments in this period will appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light dark:border-border-dark">
                      <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Provider</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Gross</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Commission</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Net Earnings</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Bookings</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Refunds</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {providers.map((p) => (
                      <tr key={p.providerId || p.providerName} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4 font-medium text-ink-light dark:text-ink-dark">{p.providerName || 'Unknown Provider'}</td>
                        <td className="py-3 px-4 text-right text-ink-light dark:text-ink-dark">{formatINR(num(p.gross))}</td>
                        <td className="py-3 px-4 text-right text-secondary-600 dark:text-secondary-400">{formatINR(num(p.commission))}</td>
                        <td className="py-3 px-4 text-right font-semibold text-success-600 dark:text-success-400">{formatINR(num(p.net))}</td>
                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-300">{num(p.bookings)}</td>
                        <td className="py-3 px-4 text-right text-danger-600 dark:text-danger-400">{formatINR(num(p.refundAmount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Transaction history */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <Card className="overflow-hidden">
          <CardHeader
            title="Transaction History"
            subtitle={`${pagination.total} payments · bookings, payments and refunds`}
          />
          <div className="mt-2">
            {loading && !data ? (
              <SkeletonTable rows={6} />
            ) : transactions.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No transactions found"
                description={search || paymentStatus ? 'Try adjusting your search or filters.' : `No payments recorded during ${activePresetLabel.toLowerCase()}.`}
              />
            ) : (
              <Table
                columns={[
                  {
                    key: 'date',
                    header: 'Date',
                    render: (row) => <span className="text-gray-600 dark:text-gray-300">{formatDate(row.date)}</span>,
                  },
                  {
                    key: 'customer',
                    header: 'Customer',
                    render: (row) => <span className="font-medium text-ink-light dark:text-ink-dark">{row.customer?.name || '—'}</span>,
                  },
                  {
                    key: 'provider',
                    header: 'Provider',
                    render: (row) => <span className="text-gray-600 dark:text-gray-300">{row.provider?.businessName || '—'}</span>,
                  },
                  {
                    key: 'service',
                    header: 'Service',
                    render: (row) => <span className="text-gray-600 dark:text-gray-300">{row.serviceName || '—'}</span>,
                  },
                  {
                    key: 'amount',
                    header: 'Amount',
                    render: (row) => <span className="font-semibold text-ink-light dark:text-ink-dark">{formatINRDecimal(num(row.jobAmount))}</span>,
                  },
                  {
                    key: 'commission',
                    header: 'Commission',
                    render: (row) => <span className="text-secondary-600 dark:text-secondary-400">{formatINRDecimal(num(row.commission))}</span>,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => <PaymentStatusBadge status={row.status} />,
                  },
                ]}
                data={transactions}
                emptyState={
                  <EmptyState icon={Receipt} title="No transactions" description="No payments match the current filters." />
                }
              />
            )}
          </div>

          {transactions.length > 0 && (
            <div className="px-6 pb-6">
              <Pagination
                page={pagination.page}
                totalPages={pagination.pages}
                totalItems={pagination.total}
                pageSize={pagination.limit}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

