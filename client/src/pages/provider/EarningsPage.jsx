import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock,
  FileText,
  Home,
  IndianRupee,
  Landmark,
  Settings,
  Star,
  Briefcase,
  UserRound,
  Wallet,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { TrendingUp } from 'lucide-react';

import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import { Link, useNavigate } from 'react-router-dom';
import { getMyBookings } from '../../services/bookingService';
import { getProviderEarnings, getProviderStats } from '../../services/providerService';
import { createWithdrawal } from '../../services/withdrawalService';
import { getMyWithdrawals } from '../../services/withdrawalService';

const formatINR = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN')}`;
};

const getMonthValue = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getMonthRanges = (monthValue) => {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(monthValue || '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const previousStart = new Date(year, month - 2, 1, 0, 0, 0, 0);
  const previousEnd = new Date(year, month - 1, 0, 23, 59, 59, 999);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    previousStartDate: previousStart.toISOString(),
    previousEndDate: previousEnd.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  };
};

const getErrorMessage = (error, fallback) => {
  const message = error?.response?.data?.message;
  return typeof message === 'string' ? message : fallback;
};

// Existing supported withdrawal methods (matches Withdrawal model enum values)
const withdrawalMethods = [
  { id: 'bank', label: 'Bank Transfer', icon: Landmark },
  { id: 'upi', label: 'UPI', icon: Wallet },
];

export function EarningsPage() {
  const navigate = useNavigate();
  const [earnings, setEarnings] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [jobStats, setJobStats] = useState(null);
  const [cancelledCount, setCancelledCount] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthValue());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [hoveredBar, setHoveredBar] = useState(null);

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bank');
  const [withdrawError, setWithdrawError] = useState(null);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const monthRange = getMonthRanges(selectedMonth);
      if (!monthRange) throw new Error('Select a valid calendar month.');
      const res = await getProviderEarnings(monthRange);
      setEarnings(res.data.data.earnings);
      const [withdrawalsResult, statsResult, cancelledResult] = await Promise.allSettled([
        getMyWithdrawals(),
        getProviderStats(),
        getMyBookings({ status: 'cancelled', page: 1, limit: 1 }),
      ]);
      if (withdrawalsResult.status === 'fulfilled') {
        setWithdrawals(withdrawalsResult.value.data?.data?.withdrawals || []);
      }
      if (statsResult.status === 'fulfilled') {
        setJobStats(statsResult.value.data?.data?.stats || null);
      }
      if (cancelledResult.status === 'fulfilled') {
        setCancelledCount(cancelledResult.value.data?.data?.pagination?.total ?? 0);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load earnings.'));
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

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
      const message = getErrorMessage(err, 'Failed to submit withdrawal request.');
      setWithdrawError(message);
      toast.error(message);
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 pb-8" aria-label="Loading wallet">
        <div className="space-y-2">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-64 max-w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="h-40 animate-pulse rounded-2xl bg-emerald-100 dark:bg-emerald-900/20 sm:h-44" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[0, 1, 2, 3].map((index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
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

  const monthRange = getMonthRanges(selectedMonth);
  const period = earnings?.period;
  const transactions = period?.transactions || earnings?.transactions || [];
  const monthChangePercent = period?.monthChangePercent ?? null;
  const monthStart = monthRange ? new Date(monthRange.startDate) : null;
  const monthEnd = monthRange ? new Date(monthRange.endDate) : null;
  const monthWithdrawals = withdrawals.filter((withdrawal) => {
    const date = new Date(withdrawal.createdAt);
    return monthStart && monthEnd && Number.isFinite(date.getTime()) && date >= monthStart && date <= monthEnd;
  });

  const allTransactions = [
    ...transactions.map((transaction, index) => ({
      id: transaction.id || `credit-${transaction.date || index}-${index}`,
      type: transaction.type === 'debit' ? 'withdrawal' : transaction.type === 'credit' ? 'credit' : 'payment',
      title: transaction.type === 'debit' ? 'Payment Refund' : 'Booking Payment',
      description: [transaction.service, transaction.customer].filter(Boolean).join(' · '),
      date: transaction.date,
      amount: Number(transaction.amount ?? transaction.providerEarnings ?? 0),
      status: transaction.status || 'paid',
    })),
    ...monthWithdrawals.map((withdrawal) => ({
      id: `withdrawal-${withdrawal._id}`,
      type: 'withdrawal',
      title: withdrawal.method === 'upi' ? 'Withdrawal via UPI' : 'Withdrawal to Bank',
      description: withdrawal.method === 'upi' ? 'UPI withdrawal' : 'Bank transfer',
      date: withdrawal.createdAt,
      amount: -Number(withdrawal.amount || 0),
      status: withdrawal.status,
    })),
  ].sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0));

  const visibleTransactions = allTransactions.filter((transaction) => {
    if (transactionFilter === 'credits') return transaction.type === 'credit';
    if (transactionFilter === 'withdrawals') return transaction.type === 'withdrawal';
    if (transactionFilter === 'pending') return ['pending', 'processing'].includes(transaction.status);
    if (transactionFilter === 'failed') return transaction.status === 'failed';
    return true;
  });

  const [selectedYear, selectedMonthNumber] = selectedMonth.split('-').map(Number);
  const daysInSelectedMonth = new Date(selectedYear, selectedMonthNumber, 0).getDate();
  const chartDays = Array.from({ length: daysInSelectedMonth }, (_, index) => {
    const dayNumber = index + 1;
    const date = new Date(selectedYear, selectedMonthNumber - 1, dayNumber);
    const key = `${selectedYear}-${String(selectedMonthNumber).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    return { date, key, amount: Number(period?.dailyEarnings?.[key] || 0) };
  });

  const chartMax = Math.max(...chartDays.map((day) => day.amount), 0);
  const chartSum = chartDays.reduce((sum, day) => sum + day.amount, 0);
  const overviewTotal = Number(period?.totalEarnings ?? 0);
  const chartFocus = hoveredBar || [...chartDays].reverse().find((day) => day.amount > 0) || chartDays[chartDays.length - 1] || null;
  const jobTiles = [
    { label: 'Total Jobs', value: jobStats?.totalBookings, icon: CalendarDays, tone: 'emerald' },
    { label: 'Completed', value: jobStats?.completedBookings, icon: Check, tone: 'blue' },
    { label: 'Ongoing', value: jobStats?.workingBookings, icon: Clock, tone: 'amber' },
    { label: 'Cancelled', value: cancelledCount, icon: XCircle, tone: 'rose' },
  ];

  const showPayoutHistory = () => {
    setTransactionFilter('withdrawals');
    document.getElementById('recent-transactions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4 overflow-x-hidden pb-24 sm:space-y-5 sm:pb-8">
      <header className="flex min-w-0 items-center gap-3 rounded-xl bg-white/90 p-2 border border-gray-100/50 shadow-xs dark:bg-gray-900/90 dark:border-gray-800/50 sm:sticky sm:top-16 sm:z-20 sm:backdrop-blur">
        {/* <button
          type="button"
          onClick={() => navigate('/provider/dashboard')}
          aria-label="Back to dashboard"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button> */}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
            Earnings &amp; Wallet
          </h1>
          {/* <p className="truncate text-xs text-gray-500 dark:text-gray-400 sm:text-sm">Track earnings, withdrawals and transactions</p> */}
        </div>
        {/* <button type="button" title="Earnings are calculated from completed jobs and processed withdrawals" aria-label="Earnings information" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
    <CircleHelp className="h-5 w-5" aria-hidden="true" />
  </button> */}
      </header>

      <section className="relative isolate overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20 sm:p-6 lg:p-7" aria-label="Available wallet balance">
        <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-white/40 dark:bg-emerald-900/10" />
        <div className="relative flex min-w-0 items-center gap-3 sm:gap-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-emerald-700 dark:bg-gray-900/60 dark:text-emerald-300 sm:h-16 sm:w-16">
            <Wallet className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-200 sm:text-sm">Available Balance <span title="Balance after completed withdrawals and pending withdrawal requests" className="cursor-help text-emerald-700/70">ⓘ</span></p>
            <p className="mt-1 truncate text-3xl font-bold tracking-normal text-gray-950 dark:text-white sm:text-4xl">{formatINR(earnings.availableBalance)}</p>
            <p className="mt-1 text-[11px] text-emerald-900/70 dark:text-emerald-200/70 sm:text-sm">You can withdraw this amount anytime</p>
          </div>
          <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex" aria-hidden="true">
            <div className="flex -rotate-6 items-center gap-2 rounded-xl border border-emerald-200/80 bg-white/70 px-3 py-2 text-emerald-700 shadow-sm dark:border-emerald-800 dark:bg-gray-900/40 dark:text-emerald-300"><IndianRupee className="h-5 w-5" /><span className="h-3 w-12 rounded bg-current/15" /></div>
            <div className="mr-6 flex rotate-3 items-center gap-2 rounded-xl border border-emerald-200/80 bg-white/70 px-3 py-2 text-emerald-700 shadow-sm dark:border-emerald-800 dark:bg-gray-900/40 dark:text-emerald-300"><Wallet className="h-5 w-5" /><span className="h-3 w-8 rounded bg-current/15" /></div>
          </div>
        </div>
        <Button onClick={handleWithdrawClick} className="relative mt-4 min-h-11 w-full rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 sm:absolute sm:bottom-6 sm:right-6 sm:mt-0 sm:w-auto sm:px-5 lg:bottom-7 lg:right-7">
          Withdraw <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3" aria-label="Earnings summary">
        {[
          { label: 'Total Earnings', value: formatINR(period?.totalEarnings), detail: new Date(selectedYear, selectedMonthNumber - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), icon: TrendingUp, style: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300', change: monthChangePercent },
          { label: 'Pending Payouts', value: formatINR(earnings.pendingWithdrawals), detail: `${withdrawals.filter((item) => item.status === 'pending').length} withdrawal requests`, icon: Clock, style: 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300' },
          { label: 'Total Withdrawn', value: formatINR(earnings.totalWithdrawn), detail: 'All time', icon: Banknote, style: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="flex min-w-0 items-center gap-3 rounded-2xl p-3.5 shadow-sm sm:p-4">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.style}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] text-gray-500 dark:text-gray-400">{item.label}</span>
                <span className="mt-0.5 block truncate text-lg font-bold text-gray-900 dark:text-white">{item.value}</span>
                <span className="block truncate text-[10px] text-gray-500 dark:text-gray-400">{item.detail}</span>
              </span>
              {item.change !== undefined && item.change !== null && <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${item.change >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300'}`}>{item.change >= 0 ? '+' : ''}{item.change}%</span>}
            </Card>
          );
        })}
      </section>


      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-card-dark sm:p-5" aria-labelledby="earnings-overview-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="earnings-overview-heading" className="text-base font-bold text-gray-900 dark:text-white sm:text-lg">Earnings Overview</h2>
          <label className="relative inline-flex min-h-9 items-center gap-2 rounded-full bg-gray-50 px-3 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => {
                if (event.target.value) {
                  setHoveredBar(null);
                  setSelectedMonth(event.target.value);
                }
              }}
              aria-label="Select earnings month and year"
              className="min-w-0 cursor-pointer bg-transparent text-xs font-semibold text-gray-800 outline-none dark:text-gray-100"
            />
            <ChevronDown className="pointer-events-none h-3.5 w-3.5" aria-hidden="true" />
          </label>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatINR(overviewTotal)}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{new Date(selectedYear, selectedMonthNumber - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} earnings</p>
            {monthChangePercent !== null && monthChangePercent !== undefined && <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${monthChangePercent >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300'}`}>{monthChangePercent >= 0 ? '↑ +' : '↓ '}{monthChangePercent}%</span>}
          </div>

          <div className="relative min-w-0">
            {chartFocus && (() => {
              const activeIndex = chartDays.findIndex(d => d.key === chartFocus.key);
              const safeIndex = activeIndex !== -1 ? activeIndex : 0;
              const positionPercent = chartDays.length > 1
                ? ((safeIndex + 0.5) / chartDays.length) * 100
                : 50;

              return (
                <div
                  className="pointer-events-none absolute -top-12 z-20 -translate-x-1/2 rounded-lg bg-emerald-800 px-3 py-1.5 text-center text-white shadow-md transition-all duration-150"
                  style={{ left: `${positionPercent}%` }}
                >
                  <p className="text-xs font-bold whitespace-nowrap">{formatINR(chartFocus.amount)}</p>
                  <p className="text-[10px] text-emerald-100 whitespace-nowrap">
                    {chartFocus.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              );
            })()}
            <div className="relative flex h-36 min-w-0 items-end gap-[3px] overflow-x-auto border-b border-gray-200 px-1 pt-8 dark:border-gray-700 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="img" aria-label={`Daily earnings chart, ${formatINR(chartSum)} in selected period`}>
              <div className="pointer-events-none absolute inset-x-0 top-9 flex h-[calc(100%-45px)] flex-col justify-between">
                {[0, 1, 2].map((line) => <span key={line} className="w-full border-t border-dashed border-gray-100 dark:border-gray-800" />)}
              </div>
              <div className="pointer-events-none absolute inset-y-9 left-1 z-[2] flex flex-col justify-between text-[8px] leading-none text-gray-400">
                <span>{formatINR(chartMax)}</span>
                <span>{formatINR(chartMax / 2)}</span>
                <span>₹0</span>
              </div>
              {chartDays.map((day) => {
                const height = chartMax > 0 ? Math.max(3, day.amount / chartMax * 84) : 3;
                const isSelected = chartFocus?.key === day.key;
                return (
                  <button
                    key={day.key}
                    type="button"
                    onMouseEnter={() => setHoveredBar(day)}
                    onFocus={() => setHoveredBar(day)}
                    onMouseLeave={() => setHoveredBar(null)}
                    onClick={() => setHoveredBar(day)}
                    onBlur={() => setHoveredBar(null)}
                    aria-label={`${day.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ${formatINR(day.amount)}`}
                    className={`relative z-[1] min-w-[5px] flex-1 rounded-t-[4px] transition-colors ${isSelected ? 'bg-emerald-700' : day.amount > 0 ? 'bg-emerald-400/80 hover:bg-emerald-600' : 'bg-emerald-100 dark:bg-emerald-900/40'}`}
                    style={{ height: `${height}px` }}
                  />
                );
              })}
            </div>
            <div className="mt-1 flex justify-between px-1 text-[9px] text-gray-400">
              {chartDays.length > 0 && <><span>{chartDays[0].date.getDate()}</span><span>{chartDays[Math.floor(chartDays.length / 3)]?.date.getDate()}</span><span>{chartDays[Math.floor(chartDays.length * 2 / 3)]?.date.getDate()}</span><span>{chartDays.at(-1)?.date.getDate()}</span></>}
            </div>
          </div>
        </div>
      </section>


      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3" aria-label="Job performance">
        {jobTiles.map(({ label, value, icon: Icon, tone }) => {
          const toneStyle = tone === 'emerald' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
            : tone === 'blue' ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300'
              : tone === 'amber' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300';
          return <Card key={label} className="flex min-w-0 items-center gap-2.5 rounded-xl p-3 shadow-sm sm:p-3.5"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneStyle}`}><Icon className="h-4.5 w-4.5" aria-hidden="true" /></span><span className="min-w-0"><span className="block truncate text-lg font-bold text-gray-900 dark:text-white">{value ?? '—'}</span><span className="block truncate text-[10px] text-gray-500 dark:text-gray-400">{label}</span></span></Card>;
        })}
      </section>

      <nav className="grid grid-cols-4 gap-2 sm:gap-3" aria-label="Wallet actions">
        {[
          { label: 'Withdraw Money', icon: Wallet, tone: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300', action: handleWithdrawClick },
          { label: 'Payout History', icon: FileText, tone: 'bg-sky-50 text-sky-800 dark:bg-sky-900/20 dark:text-sky-300', action: showPayoutHistory },
          { label: 'Bank Details', icon: Landmark, tone: 'bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-300', to: '/provider/settings' },
          { label: 'Payment Settings', icon: Settings, tone: 'bg-violet-50 text-violet-800 dark:bg-violet-900/20 dark:text-violet-300', to: '/provider/settings' },
        ].map(({ label, icon: Icon, tone, action, to }) => {
          const content = <><Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" /><span className="line-clamp-2 text-center text-[10px] font-semibold leading-3 sm:text-xs">{label}</span></>;
          return to ? <Link key={label} to={to} className={`flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl px-1 py-3 transition hover:-translate-y-0.5 ${tone}`}>{content}</Link> : <button key={label} type="button" onClick={action} className={`flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl px-1 py-3 transition hover:-translate-y-0.5 ${tone}`}>{content}</button>;
        })}
      </nav>

      <section id="recent-transactions" className="space-y-3" aria-labelledby="transactions-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="transactions-heading" className="text-lg font-bold text-gray-900 dark:text-white">Recent Transactions</h2>
          <Link to="/provider/withdrawals" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-800 hover:underline dark:text-emerald-300">View All <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>

        <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-2">
            {[
              ['all', 'All'], ['credits', 'Credits'], ['withdrawals', 'Withdrawals'], ['pending', 'Pending'], ['failed', 'Failed'],
            ].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setTransactionFilter(id)} aria-pressed={transactionFilter === id} className={`min-h-9 shrink-0 rounded-full px-3.5 text-xs font-semibold transition ${transactionFilter === id ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}>{label}</button>
            ))}
          </div>
        </div>

        {visibleTransactions.length === 0 ? (
          <Card className="rounded-2xl p-2 sm:p-4"><EmptyState icon={Wallet} title="No transactions found" description="Completed job earnings and withdrawal activity will appear here." /></Card>
        ) : (
          <div className="space-y-2">
            {visibleTransactions.map((transaction) => {
              const isCredit = transaction.type === 'credit';
              const isDebit = transaction.type === 'withdrawal';
              const statusLabel = transaction.status === 'credited' ? 'Credited'
                : transaction.status === 'completed' ? 'Transferred'
                  : transaction.status === 'processing' ? 'Processing'
                    : transaction.status === 'cancelled' ? 'Cancelled'
                      : transaction.status[0]?.toUpperCase() + transaction.status.slice(1);
              const statusStyle = ['credited', 'completed'].includes(transaction.status) ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                : ['pending', 'processing'].includes(transaction.status) ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300';
              const Icon = isCredit ? ArrowUpRight : isDebit ? ArrowDownRight : FileText;
              return (
                <Card key={transaction.id} className="flex min-w-0 items-center gap-3 rounded-2xl p-3 shadow-sm sm:gap-4 sm:p-4">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${isCredit ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : isDebit ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{transaction.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-gray-600 dark:text-gray-300">{transaction.description || '—'}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-gray-400">{transaction.date ? new Date(transaction.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`text-sm font-bold sm:text-base ${isCredit ? 'text-emerald-700 dark:text-emerald-400' : isDebit ? 'text-rose-700 dark:text-rose-400' : 'text-gray-700 dark:text-gray-300'}`}>{isCredit ? '+ ' : isDebit ? '− ' : ''}{formatINR(Math.abs(transaction.amount))}</span>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${statusStyle}`}>{statusLabel}</span>
                  </span>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-gray-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-4px_18px_rgba(16,24,40,0.06)] backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 sm:hidden" aria-label="Provider navigation">
        {[
          { label: 'Home', to: '/provider/dashboard', icon: Home },
          { label: 'Jobs', to: '/provider/jobs', icon: Briefcase },
          { label: 'Wallet', to: '/provider/earnings', icon: Wallet, active: true },
          { label: 'Reviews', to: '/provider/reviews', icon: Star },
          { label: 'Profile', to: '/provider/profile', icon: UserRound },
        ].map(({ label, to, icon: Icon, active }) => <Link key={label} to={to} aria-current={active ? 'page' : undefined} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-[9px] font-semibold ${active ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-400'}`}><Icon className={`h-5 w-5 ${active ? 'rounded-lg bg-emerald-50 p-0.5 dark:bg-emerald-900/20' : ''}`} aria-hidden="true" />{label}</Link>)}
      </nav>

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
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${isSelected
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${isSelected
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


