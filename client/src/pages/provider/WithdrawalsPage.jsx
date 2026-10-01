import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Loader2,
  Search,
  Wallet,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { getProviderEarnings } from '../../services/providerService';
import { getMyWithdrawals } from '../../services/withdrawalService';

const PAGE_SIZE = 10;

const formatINR = (value) => {
  const amount = Number(value);
  return `₹${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-IN')}`;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getErrorMessage = (error) => {
  const message = error?.response?.data?.message;
  return typeof message === 'string' ? message : 'Could not load transaction history.';
};

export function WithdrawalsPage() {
  const [earnings, setEarnings] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [earningsResponse, withdrawalsResponse] = await Promise.all([
        getProviderEarnings(),
        getMyWithdrawals(),
      ]);
      setEarnings(earningsResponse.data?.data?.earnings || null);
      setWithdrawals(withdrawalsResponse.data?.data?.withdrawals || []);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const transactions = useMemo(() => {
    const paymentTransactions = (earnings?.transactions || []).map((transaction, index) => ({
      id: transaction.id || transaction.paymentId || `${transaction.bookingId || 'booking'}-${index}`,
      type: transaction.type === 'debit' ? 'withdrawal' : transaction.type === 'credit' ? 'credit' : 'payment',
      title: transaction.type === 'debit' ? 'Payment Refund' : 'Booking Payment',
      description: [transaction.service, transaction.customer].filter(Boolean).join(' · '),
      date: transaction.date,
      amount: Number(transaction.amount ?? transaction.providerEarnings ?? 0),
      status: transaction.status || 'paid',
      reference: transaction.transactionId || transaction.bookingId,
    }));

    const withdrawalTransactions = withdrawals.map((withdrawal) => ({
      id: `withdrawal-${withdrawal._id}`,
      type: 'withdrawal',
      title: withdrawal.method === 'upi' ? 'Withdrawal via UPI' : 'Withdrawal to Bank',
      description: withdrawal.method === 'upi' ? 'UPI payout' : 'Bank transfer',
      date: withdrawal.createdAt,
      amount: -Math.abs(Number(withdrawal.amount || 0)),
      status: withdrawal.status,
      reference: withdrawal.transactionId || withdrawal._id,
    }));

    return [...paymentTransactions, ...withdrawalTransactions]
      .sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0));
  }, [earnings, withdrawals]);

  const statusOptions = [...new Set(transactions.map((transaction) => transaction.status).filter(Boolean))].sort();
  const filteredTransactions = transactions.filter((transaction) => {
    if (typeFilter !== 'all' && transaction.type !== typeFilter) return false;
    if (statusFilter !== 'all' && transaction.status !== statusFilter) return false;
    if (monthFilter !== 'all') {
      const [year, month] = monthFilter.split('-').map(Number);
      const date = new Date(transaction.date);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() + 1 !== month) return false;
    }

    const query = search.trim().toLocaleLowerCase();
    return !query || [transaction.title, transaction.description, transaction.reference]
      .filter(Boolean).join(' ').toLocaleLowerCase().includes(query);
  });

  const pageCount = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageTransactions = filteredTransactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 overflow-x-hidden pb-8 sm:space-y-6">
      <header className="flex items-center gap-3">
        <Link to="/provider/earnings" aria-label="Back to Earnings & Wallet" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">Transaction History</h1>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400 sm:text-sm">Real earnings and payout activity</p>
        </div>
        <Link to="/provider/earnings" aria-label="Bank and payout settings" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
          <Wallet className="h-5 w-5" aria-hidden="true" />
        </Link>
      </header>

      {loading ? (
        <div className="space-y-3" aria-label="Loading transactions">
          <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}</div>
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : error ? (
        <EmptyState icon={FileText} title="Failed to load transactions" description={error} action={<Button onClick={fetchHistory}>Try Again</Button>} />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3" aria-label="Wallet totals">
            {[
              { label: 'Available Balance', value: earnings?.availableBalance, color: 'text-emerald-700 dark:text-emerald-300' },
              { label: 'Total Withdrawn', value: earnings?.totalWithdrawn, color: 'text-sky-700 dark:text-sky-300' },
              { label: 'Pending Payouts', value: earnings?.pendingWithdrawals, color: 'text-amber-700 dark:text-amber-300' },
            ].map((item) => <Card key={item.label} className="rounded-2xl p-4 shadow-sm"><p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p><p className={`mt-1 text-xl font-bold ${item.color}`}>{formatINR(item.value)}</p></Card>)}
          </section>

          <section className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_180px]">
              <label className="relative block min-w-0"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" /><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search transactions..." aria-label="Search transactions" className="input h-11 rounded-xl pl-10" /></label>
              <label className="relative flex h-11 min-w-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-card-dark dark:text-gray-200"><Filter className="h-4 w-4" aria-hidden="true" /><select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }} aria-label="Filter by transaction type" className="min-w-0 flex-1 appearance-none bg-transparent outline-none"><option value="all">All types</option><option value="credit">Credits</option><option value="withdrawal">Withdrawals</option></select></label>
              <label className="relative flex h-11 min-w-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-card-dark dark:text-gray-200"><CalendarDays className="h-4 w-4" aria-hidden="true" /><input type="month" value={monthFilter === 'all' ? '' : monthFilter} onChange={(event) => { setMonthFilter(event.target.value || 'all'); setPage(1); }} aria-label="Filter transactions by month" className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label>
            </div>

            <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><div className="flex w-max gap-2">{['all', ...statusOptions].map((status) => <button key={status} type="button" onClick={() => { setStatusFilter(status); setPage(1); }} aria-pressed={statusFilter === status} className={`min-h-9 shrink-0 rounded-full px-3.5 text-xs font-semibold capitalize ${statusFilter === status ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>{status === 'all' ? 'All statuses' : status}</button>)}</div></div>
          </section>

          {pageTransactions.length === 0 ? (
            <Card className="rounded-2xl p-2 sm:p-4"><EmptyState icon={Wallet} title="No transactions found" description="Try another filter or check back after your next completed job." /></Card>
          ) : (
            <section className="space-y-2" aria-label="Provider transactions">
              {pageTransactions.map((transaction) => {
                const isCredit = transaction.type === 'credit';
                const statusText = transaction.status === 'paid' ? 'Credited' : transaction.status === 'completed' ? 'Transferred' : transaction.status === 'processing' ? 'Processing' : transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1);
                const statusClass = ['paid', 'credited', 'completed'].includes(transaction.status) ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : ['pending', 'processing'].includes(transaction.status) ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300';
                const DirectionIcon = isCredit ? ArrowUpRight : ArrowDownRight;
                return (
                  <Card key={transaction.id} className="flex min-w-0 items-center gap-3 rounded-2xl p-3 shadow-sm sm:gap-4 sm:p-4">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${isCredit ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300'}`}><DirectionIcon className="h-5 w-5" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{transaction.title}</span><span className="mt-0.5 block truncate text-xs text-gray-600 dark:text-gray-300">{transaction.description || '—'}</span><span className="mt-0.5 block truncate text-[10px] text-gray-400">{formatDateTime(transaction.date)}</span>{transaction.reference && <span className="mt-0.5 block truncate text-[9px] text-gray-400">Ref: {transaction.reference}</span>}</span>
                    <span className="flex shrink-0 flex-col items-end gap-1"><span className={`text-sm font-bold sm:text-base ${isCredit ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>{isCredit ? '+ ' : '− '}{formatINR(Math.abs(transaction.amount))}</span><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${statusClass}`}>{statusText}</span></span>
                  </Card>
                );
              })}
              {pageCount > 1 && <div className="flex items-center justify-center gap-3 pt-3"><Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}><ChevronLeft className="h-4 w-4" />Previous</Button><span className="text-xs text-gray-500">Page {safePage} of {pageCount}</span><Button variant="outline" size="sm" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>Next<ChevronRight className="h-4 w-4" /></Button></div>}
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default WithdrawalsPage;