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
  const completedBookings = await Booking.find({
    providerId,
    status: 'completed',
  })
    .sort({ completedAt: -1, createdAt: -1 })
    .populate('customerId', 'name');

  const bookingIds = completedBookings.map((b) => b._id);
  const payments = bookingIds.length
    ? await Payment.find({ bookingId: { $in: bookingIds } })
    : [];
  const paymentByBooking = new Map(payments.map((p) => [String(p.bookingId), p]));

  const transactions = completedBookings.map((booking) => {
    const payment = paymentByBooking.get(String(booking._id));
    const jobAmount = Math.max(0, safeNumber(booking.amount));
    // Actual commission recorded on the Payment at completion time (source of
    // truth). Fall back to the booking's stored commission, then to the
    // configured platform rate for legacy records that predate Payment docs.
    const platformFee =
      payment && Number.isFinite(Number(payment.commission))
        ? safeNumber(payment.commission)
        : safeNumber(booking.commission, Math.round(jobAmount * PLATFORM_FEE_RATE));
    const providerEarnings = jobAmount - platformFee;
    const paidAt =
      payment?.paidAt || booking.completedAt || booking.payment?.paidAt || booking.createdAt;

    let paymentMethod = booking.paymentMethod || booking.payment?.method || 'cash';
    if (['card', 'upi', 'netbanking', 'wallet'].includes(paymentMethod)) {
      paymentMethod = 'online';
    }

    return {
      date: paidAt,
      customer: booking.customerId?.name || 'Customer',
      service: booking.serviceName || 'Service',
      jobAmount,
      platformFee: Math.max(0, platformFee),
      providerEarnings,
      paymentMethod,
      status: booking.status,
    };
  });

  const sum = (items, fn) => items.reduce((total, item) => total + fn(item), 0);
  const totalEarnings = sum(transactions, (t) => t.providerEarnings);

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const inRange = (date, start, end) => {
    const d = new Date(date);
    return d >= start && (!end || d < end);
  };

  const thisMonth = sum(
    transactions.filter((t) => inRange(t.date, currentMonthStart)),
    (t) => t.providerEarnings
  );
  const lastMonthEarnings = sum(
    transactions.filter((t) => inRange(t.date, prevMonthStart, currentMonthStart)),
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
