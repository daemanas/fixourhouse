import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Withdrawal from '../models/Withdrawal.js';

// Platform fee / commission rate that LocalFix applies when a job is completed.
// This is the same 15% used in bookingController.updateBookingStatus; the actual
// commission recorded on each Payment document remains the source of truth.
const PLATFORM_FEE_RATE = 0.15;

const safeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

/**
 * Compute a provider's earnings from real booking/payment/withdrawal data.
 *
 * - Only completed bookings generate earnings.
 * - Provider Earnings = Job Amount - Platform Fee.
 * - Available balance = total earnings - completed/processing withdrawals
 *   - pending withdrawal reservations.
 *
 * Every value is returned as a finite number (0 when no data exists) so the
 * frontend can never render NaN or Infinity.
 */
export const computeProviderEarnings = async (providerId) => {
  const [bookings, payments] = await Promise.all([
    Booking.find({ providerId })
      .sort({ createdAt: -1 })
      .populate('customerId', 'name')
      .select('bookingId status serviceName serviceSnapshot serviceId customerId amount commission providerEarning completedAt paymentMethod payment createdAt'),
    Payment.find({ providerId }).sort({ createdAt: -1 }),
  ]);
  const bookingById = new Map(bookings.map((booking) => [String(booking._id), booking]));
  const paymentBookingIds = new Set(payments.map((payment) => String(payment.bookingId)));

  const paymentTransactions = payments.flatMap((payment) => {
    const booking = bookingById.get(String(payment.bookingId));
    const paymentStatus = payment.status || 'pending';
    const bookingCancelled = ['cancelled', 'rejected'].includes(booking?.status);
    if (bookingCancelled && paymentStatus === 'pending') return [];
    const jobAmount = Math.max(0, safeNumber(payment.amount ?? booking?.amount));
    // Actual commission recorded on the Payment at completion time (source of
    // truth). Fall back to the booking's stored commission, then to the
    // configured platform rate for legacy records that predate Payment docs.
    const platformFee =
      payment && Number.isFinite(Number(payment.commission))
        ? safeNumber(payment.commission)
        : safeNumber(booking?.commission, Math.round(jobAmount * PLATFORM_FEE_RATE));
    const isEarning = paymentStatus === 'paid' && booking?.status === 'completed';
    const providerEarnings = isEarning ? Math.max(
      0,
      payment.providerEarning != null
        ? safeNumber(payment.providerEarning)
        : jobAmount - platformFee
    ) : 0;
    const paidAt =
      payment.paidAt || payment.refundedAt || payment.processedAt || payment.createdAt || booking?.completedAt || booking?.createdAt;

    let paymentMethod = booking?.paymentMethod || booking?.payment?.method || payment.method || 'cash';
    if (['card', 'upi', 'netbanking', 'wallet'].includes(paymentMethod)) {
      paymentMethod = 'online';
    }

    const refunded = paymentStatus === 'refunded';
    return {
      id: String(payment._id),
      bookingId: booking?._id ? String(booking._id) : String(payment.bookingId),
      paymentId: String(payment._id),
      date: paidAt,
      customer: booking?.customerId?.name || 'Customer',
      service: booking?.serviceName || booking?.serviceSnapshot?.serviceName || 'Service',
      jobAmount,
      platformFee: Math.max(0, platformFee),
      providerEarnings,
      amount: isEarning ? providerEarnings : refunded ? -jobAmount : jobAmount,
      paymentMethod,
      status: paymentStatus,
      type: refunded ? 'debit' : isEarning ? 'credit' : 'payment',
      countsAsEarnings: isEarning,
    };
  });

  // Preserve earnings for older completed bookings that predate Payment records.
  const legacyTransactions = bookings
    .filter((booking) =>
      booking.status === 'completed' &&
      !paymentBookingIds.has(String(booking._id)) &&
      (!booking.payment?.status || booking.payment.status === 'paid')
    )
    .map((booking) => {
      const jobAmount = Math.max(0, safeNumber(booking.amount));
      const platformFee = safeNumber(booking.commission, Math.round(jobAmount * PLATFORM_FEE_RATE));
      const providerEarnings = Math.max(0, jobAmount - platformFee);
      const paidAt = booking.completedAt || booking.payment?.paidAt || booking.createdAt;
      return {
        id: String(booking._id),
        bookingId: String(booking._id),
        paymentId: null,
        date: paidAt,
        customer: booking.customerId?.name || 'Customer',
        service: booking.serviceName || booking.serviceSnapshot?.serviceName || 'Service',
        jobAmount,
        platformFee: Math.max(0, platformFee),
        providerEarnings,
        amount: providerEarnings,
        paymentMethod: booking.paymentMethod || booking.payment?.method || 'cash',
        status: 'paid',
        type: 'credit',
        countsAsEarnings: true,
      };
    });

  const transactions = [...paymentTransactions, ...legacyTransactions]
    .sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0));

  const sum = (items, fn) => items.reduce((total, item) => total + fn(item), 0);
  const earningTransactions = transactions.filter((transaction) => transaction.countsAsEarnings);
  const totalEarnings = sum(earningTransactions, (t) => t.providerEarnings);

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const inRange = (date, start, end) => {
    const d = new Date(date);
    return d >= start && (!end || d < end);
  };

  const thisMonth = sum(
    earningTransactions.filter((t) => inRange(t.date, currentMonthStart)),
    (t) => t.providerEarnings
  );
  const lastMonthEarnings = sum(
    earningTransactions.filter((t) => inRange(t.date, prevMonthStart, currentMonthStart)),
    (t) => t.providerEarnings
  );

  const [withdrawalTotals, pendingTotals] = await Promise.all([
    Withdrawal.aggregate([
      { $match: { providerId, status: { $in: ['completed', 'processing'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Withdrawal.aggregate([
      { $match: { providerId, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const totalWithdrawn = withdrawalTotals[0]?.total || 0;
  const pendingWithdrawals = pendingTotals[0]?.total || 0;
  const availableBalance = Math.max(0, totalEarnings - totalWithdrawn - pendingWithdrawals);

  return {
    transactions,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    availableBalance: Math.round(availableBalance * 100) / 100,
    thisMonth: Math.round(thisMonth * 100) / 100,
    totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
    pendingWithdrawals: Math.round(pendingWithdrawals * 100) / 100,
    lastMonthEarnings: Math.round(lastMonthEarnings * 100) / 100,
  };
};

/**
 * Safe percentage change: ((current - previous) / previous) * 100.
 * Returns null (never NaN/Infinity) when the previous period is missing,
 * invalid, or zero so callers can render "No previous data" instead.
 */
export const safePercentageChange = (current, previous) => {
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p) || p <= 0) return null;
  return Math.round(((c - p) / p) * 1000) / 10;
};
