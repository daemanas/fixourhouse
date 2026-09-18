/**
 * Admin Revenue Report builder.
 *
 * Derives all revenue / commission / refund / provider figures directly from the
 * Payment collection (each Payment carries the authoritative `commission` and
 * `amount`), mirroring src/utils/earnings.js. Refunds are Payment documents with
 * status === 'refunded' (dated by `refundedAt`). There is NO separate Refund
 * model and no 'pending' / 'failed' refund states in this project.
 */
import Payment from '../models/Payment.js';

const safeNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// Resolve the date period. Defaults to the last 30 days when neither bound is
// supplied. `to` is inclusive (extended to end-of-day).
function resolvePeriod(query) {
  let fromDate = query.from ? new Date(query.from) : null;
  let toDate = query.to ? new Date(query.to) : null;
  if (!fromDate || Number.isNaN(fromDate.getTime())) fromDate = null;
  if (!toDate || Number.isNaN(toDate.getTime())) toDate = null;
  if (!fromDate && !toDate) {
    toDate = new Date();
    fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  const dateFilter = {};
  if (fromDate) dateFilter.$gte = fromDate;
  if (toDate) {
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.$lte = end;
  }
  return { fromDate, toDate, dateFilter };
}

// Which payment statuses feed the transaction list.
function resolveListStatuses(status) {
  const s = (status || 'all').toString().toLowerCase();
  if (s === 'paid') return ['paid'];
  if (s === 'refunded') return ['refunded'];
  if (s === 'pending') return ['pending'];
  if (s === 'failed') return ['failed'];
  return ['paid', 'refunded']; // "all" → revenue-affecting transactions
}

// Common $project for transaction documents (used by JSON + CSV output).
const TRANSACTION_PROJECT = {
  _id: 0,
  paymentId: '$_id',
  bookingId: '$booking.bookingId',
  serviceName: { $ifNull: ['$booking.serviceName', '—'] },
  jobAmount: { $ifNull: ['$amount', 0] },
  commission: { $ifNull: ['$commission', 0] },
  providerEarnings: { $max: [{ $subtract: [{ $ifNull: ['$amount', 0] }, { $ifNull: ['$commission', 0] }] }, 0] },
  refundAmount: { $cond: [{ $eq: ['$status', 'refunded'] }, { $ifNull: ['$amount', 0] }, 0] },
  status: '$status',
  paymentMethod: { $ifNull: ['$method', '—'] },
  transactionId: { $ifNull: ['$transactionId', '—'] },
  date: '$eventDate',
  customer: {
    name: { $ifNull: ['$customer.name', '—'] },
    phone: '$customer.phone',
    email: '$customer.email',
    avatar: '$customer.avatar',
  },
  provider: {
    businessName: { $ifNull: ['$provider.businessName', 'Unknown Provider'] },
    category: '$provider.category',
  },
};

// Lookup bookings -> providers -> customers so names are available for list/search.
const LIST_LOOKUPS = [
  { $lookup: { from: 'bookings', localField: 'bookingId', foreignField: '_id', as: 'booking' } },
  { $unwind: { path: '$booking', preserveNullAndEmptyArrays: true } },
  { $lookup: { from: 'providers', localField: 'booking.providerId', foreignField: '_id', as: 'provider' } },
  { $unwind: { path: '$provider', preserveNullAndEmptyArrays: true } },
  { $lookup: { from: 'users', localField: 'booking.customerId', foreignField: '_id', as: 'customer' } },
  { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
];

// Build the base pipeline (match status + period + search) shared by list/CSV.
function buildListBase({ listStatuses, dateFilter, search }) {
  const base = [
    { $match: { status: { $in: listStatuses } } },
    {
      $addFields: {
        eventDate: {
          $cond: [
            { $eq: ['$status', 'refunded'] },
            { $ifNull: ['$refundedAt', '$createdAt'] },
            { $ifNull: ['$paidAt', '$createdAt'] },
          ],
        },
      },
    },
    ...(Object.keys(dateFilter).length ? [{ $match: { eventDate: dateFilter } }] : []),
    ...LIST_LOOKUPS,
  ];
  if (search) {
    base.push({
      $match: {
        $or: [
          { 'booking.bookingId': { $regex: search, $options: 'i' } },
          { 'booking.serviceName': { $regex: search, $options: 'i' } },
          { 'provider.businessName': { $regex: search, $options: 'i' } },
          { 'customer.name': { $regex: search, $options: 'i' } },
          { 'customer.phone': { $regex: search, $options: 'i' } },
        ],
      },
    });
  }
  return base;
}

// Sum paid vs refunded Payments in the period. Paid = revenue, refunded = refunds.
async function periodSummary(dateFilter) {
  const hasFilter = Object.keys(dateFilter).length > 0;
  const [paidAgg, refundAgg] = await Promise.all([
    Payment.aggregate([
      { $match: { status: 'paid', ...(hasFilter ? { paidAt: dateFilter } : {}) } },
      { $group: { _id: null, gross: { $sum: { $ifNull: ['$amount', 0] } }, commission: { $sum: { $ifNull: ['$commission', 0] } }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'refunded', ...(hasFilter ? { refundedAt: dateFilter } : {}) } },
      { $group: { _id: null, refunds: { $sum: { $ifNull: ['$amount', 0] } }, refundCount: { $sum: 1 } } },
    ]),
  ]);
  const paid = paidAgg[0] || { gross: 0, commission: 0, count: 0 };
  const refunded = refundAgg[0] || { refunds: 0, refundCount: 0 };
  const grossRevenue = safeNum(paid.gross);
  const platformCommission = Math.max(0, safeNum(paid.commission));
  const providerEarnings = Math.max(0, grossRevenue - platformCommission);
  const refunds = safeNum(refunded.refunds);
  const refundCount = safeNum(refunded.refundCount);
  const totalTransactions = safeNum(paid.count) + refundCount;
  const netRevenue = Math.max(0, grossRevenue - refunds);
  const refundRate = totalTransactions ? (refundCount / totalTransactions) * 100 : 0;
  const avgBookingValue = paid.count ? grossRevenue / paid.count : 0;
  return {
    grossRevenue, platformCommission, providerEarnings, refunds, refundCount,
    totalTransactions, totalBookings: safeNum(paid.count), netRevenue, refundRate, avgBookingValue,
  };
}

// Daily chart: gross paid, refunds, net, bookings per calendar day.
async function dailyChart(fromDate, toDate, dateFilter) {
  const hasFilter = Object.keys(dateFilter).length > 0;
  const [chartPaid, chartRef] = await Promise.all([
    Payment.aggregate([
      { $match: { status: 'paid', ...(hasFilter ? { paidAt: dateFilter } : {}) } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }, gross: { $sum: { $ifNull: ['$amount', 0] } }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'refunded', ...(hasFilter ? { refundedAt: dateFilter } : {}) } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$refundedAt' } }, refunds: { $sum: { $ifNull: ['$amount', 0] } }, count: { $sum: 1 } } },
    ]),
  ]);
  const paidByDay = new Map(chartPaid.map((d) => [d._id, d]));
  const refByDay = new Map(chartRef.map((d) => [d._id, d]));
  const days = [];
  const start = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()));
  const end = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate()));
  for (let cur = new Date(start); cur <= end; cur.setUTCDate(cur.getUTCDate() + 1)) {
    const key = cur.toISOString().slice(0, 10);
    const p = paidByDay.get(key) || { gross: 0, count: 0 };
    const r = refByDay.get(key) || { refunds: 0, count: 0 };
    days.push({
      date: key,
      label: new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
      gross: safeNum(p.gross),
      refunds: safeNum(r.refunds),
      net: Math.max(0, safeNum(p.gross) - safeNum(r.refunds)),
      bookings: safeNum(p.count),
      refundedBookings: safeNum(r.count),
    });
  }
  return days;
}

// Provider breakdown: earnings + refunds, sorted by provider earnings.
async function providerBreakdown(dateFilter) {
  const hasFilter = Object.keys(dateFilter).length > 0;
  const [providerPaid, providerRef] = await Promise.all([
    Payment.aggregate([
      { $match: { status: 'paid', ...(hasFilter ? { paidAt: dateFilter } : {}) } },
      { $lookup: { from: 'bookings', localField: 'bookingId', foreignField: '_id', as: 'booking' } },
      { $unwind: { path: '$booking', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'providers', localField: 'booking.providerId', foreignField: '_id', as: 'provider' } },
      { $unwind: { path: '$provider', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$booking.providerId',
          providerName: { $first: { $ifNull: ['$provider.businessName', 'Unknown Provider'] } },
          category: { $first: '$provider.category' },
          bookings: { $sum: 1 },
          gross: { $sum: { $ifNull: ['$amount', 0] } },
          commission: { $sum: { $ifNull: ['$commission', 0] } },
          providerEarnings: { $sum: { $max: [{ $subtract: [{ $ifNull: ['$amount', 0] }, { $ifNull: ['$commission', 0] }] }, 0] } },
        },
      },
    ]),
    Payment.aggregate([
      { $match: { status: 'refunded', ...(hasFilter ? { refundedAt: dateFilter } : {}) } },
      { $lookup: { from: 'bookings', localField: 'bookingId', foreignField: '_id', as: 'booking' } },
      { $unwind: { path: '$booking', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'providers', localField: 'booking.providerId', foreignField: '_id', as: 'provider' } },
      { $unwind: { path: '$provider', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$booking.providerId', refundAmount: { $sum: { $ifNull: ['$amount', 0] } }, refundCount: { $sum: 1 } } },
    ]),
  ]);
  const refundByProvider = new Map(providerRef.map((d) => [String(d._id), d]));
  return providerPaid
    .map((p) => {
      const rf = refundByProvider.get(String(p._id)) || { refundAmount: 0, refundCount: 0 };
      return {
        providerId: p._id,
        providerName: p.providerName,
        category: p.category || '—',
        bookings: safeNum(p.bookings),
        gross: safeNum(p.gross),
        commission: Math.max(0, safeNum(p.commission)),
        providerEarnings: Math.max(0, safeNum(p.providerEarnings)),
        refundAmount: safeNum(rf.refundAmount),
        refundCount: safeNum(rf.refundCount),
        net: Math.max(0, safeNum(p.gross) - safeNum(rf.refundAmount)),
      };
    })
    .sort((a, b) => b.providerEarnings - a.providerEarnings)
    .slice(0, 10);
}

export async function buildRevenueReport(query = {}) {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 10, 100);
  const skip = (page - 1) * limit;
  const search = (query.search || '').toString().trim();
  const paymentStatus = (query.paymentStatus || 'all').toString().toLowerCase();

  const { fromDate, toDate, dateFilter } = resolvePeriod(query);
  const listStatuses = resolveListStatuses(paymentStatus);
  const listBase = buildListBase({ listStatuses, dateFilter, search });

  const [summary, chart, providerRows, facet] = await Promise.all([
    periodSummary(dateFilter),
    dailyChart(fromDate, toDate, dateFilter),
    providerBreakdown(dateFilter),
    Payment.aggregate([
      ...listBase,
      { $project: TRANSACTION_PROJECT },
      { $sort: { date: -1 } },
      { $facet: { data: [{ $skip: skip }, { $limit: limit }], total: [{ $count: 'count' }] } },
    ]),
  ]);

  const transactions = (facet[0] && facet[0].data) || [];
  const totalTxns = (facet[0] && facet[0].total[0] && facet[0].total[0].count) || 0;

  return {
    summary: {
      grossRevenue: num(summary.grossRevenue),
      platformCommission: num(summary.platformCommission),
      providerEarnings: num(summary.providerEarnings),
      refunds: num(summary.refunds),
      refundCount: num(summary.refundCount),
      totalTransactions: num(summary.totalTransactions),
      totalBookings: num(summary.totalBookings),
      netRevenue: num(summary.netRevenue),
      refundRate: num(summary.refundRate),
      avgBookingValue: num(summary.avgBookingValue),
    },
    chart: chart.map((d) => ({
      date: d.date, label: d.label,
      gross: num(d.gross), refunds: num(d.refunds), net: num(d.net),
      bookings: num(d.bookings), refundedBookings: num(d.refundedBookings),
    })),
    providerBreakdown: providerRows.map((p) => ({
      providerId: p.providerId, providerName: p.providerName, category: p.category,
      bookings: num(p.bookings), gross: num(p.gross), commission: num(p.commission),
      providerEarnings: num(p.providerEarnings), refundAmount: num(p.refundAmount),
      refundCount: num(p.refundCount), net: num(p.net),
    })),
    transactions: transactions.map((t) => ({
      paymentId: t.paymentId, bookingId: t.bookingId, serviceName: t.serviceName,
      jobAmount: num(t.jobAmount), commission: num(t.commission),
      providerEarnings: num(t.providerEarnings), refundAmount: num(t.refundAmount),
      status: t.status, paymentMethod: t.paymentMethod, transactionId: t.transactionId,
      date: t.date, customer: t.customer, provider: t.provider,
    })),
    pagination: { page, limit, total: num(totalTxns), pages: Math.ceil(num(totalTxns) / limit) },
    filters: {
      from: fromDate ? fromDate.toISOString() : null,
      to: toDate ? toDate.toISOString() : null,
      search, paymentStatus,
    },
  };
}

// Stand-alone CSV builder (export=csv). Returns the CSV string + filename.
export async function buildRevenueCsv(query = {}) {
  const search = (query.search || '').toString().trim();
  const paymentStatus = (query.paymentStatus || 'all').toString().toLowerCase();
  const { fromDate, toDate, dateFilter } = resolvePeriod(query);
  const listStatuses = resolveListStatuses(paymentStatus);
  const listBase = buildListBase({ listStatuses, dateFilter, search });
  const docs = await Payment.aggregate([
    ...listBase,
    { $project: TRANSACTION_PROJECT },
    { $project: { date: 0 } },
  ]);
  const header = [
    'Booking ID', 'Service', 'Customer', 'Provider', 'Job Amount',
    'Commission', 'Provider Earnings', 'Refund Amount', 'Status',
    'Payment Method', 'Transaction ID', 'Date',
  ];
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = docs.map((d) =>
    [
      d.bookingId, d.serviceName, d.customer?.name, d.provider?.businessName,
      d.jobAmount, d.commission, d.providerEarnings, d.refundAmount,
      d.status, d.paymentMethod, d.transactionId,
      d.date ? new Date(d.date).toISOString() : '',
    ]
      .map(esc)
      .join(',')
  );
  const csv = [header.join(','), ...rows].join('\n');
  const fname = `localfix-revenue-${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, fname };
}

