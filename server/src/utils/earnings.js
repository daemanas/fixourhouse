import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Withdrawal from '../models/Withdrawal.js';

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const recordedAmount = (...values) => {
  const value = values.find((candidate) => candidate !== null && candidate !== undefined && Number.isFinite(Number(candidate)));
  return value === undefined ? 0 : Math.max(0, Number(value));
};

const roundMoney = (value) => Math.round(value * 100) / 100;

/** Compute lifetime provider earnings, period totals, and withdrawable balance. */
export const computeProviderEarnings = async (providerId) => {
  const [bookings, payments] = await Promise.all([
    Booking.find({ providerId })
      .sort({ createdAt: -1 })
      .populate('customerId', 'name')
      .select('bookingId status serviceName serviceSnapshot serviceId customerId amount commission commissionAmount platformCommission completedAt paymentMethod payment createdAt')
      .lean(),
    Payment.find({ providerId }).sort({ createdAt: -1 }).lean(),
  ]);

  const bookingsById = new Map(bookings.map((booking) => [String(booking._id), booking]));
  const paymentBookingIds = new Set(payments.map((payment) => String(payment.bookingId)));

  const paymentTransactions = payments.map((payment) => {
    const booking = bookingsById.get(String(payment.bookingId));
    const status = payment.status || 'pending';
    const jobAmount = Math.max(0, safeNumber(payment.amount ?? booking?.amount));
    const platformFee = recordedAmount(
      payment.platformCommission,
      payment.commissionAmount,
      payment.commission,
      booking?.platformCommission,
      booking?.commissionAmount,
      booking?.commission
    );
    const paymentFee = recordedAmount(payment.paymentProcessingFee);
    const otherProviderFee = recordedAmount(payment.otherProviderFee);
    const isCompletedBooking = booking?.status === 'completed';
    const isPaidEarning = status === 'paid' && isCompletedBooking;
    const isRefundedEarning = status === 'refunded' && isCompletedBooking;
    const countsAsEarnings = isPaidEarning || isRefundedEarning;
    const refundAmount = isRefundedEarning
      ? recordedAmount(payment.refundAmount, payment.amount)
      : 0;
    const providerEarnings = countsAsEarnings
      ? jobAmount - platformFee - paymentFee - otherProviderFee - refundAmount
      : 0;
    const date = payment.paidAt || payment.refundedAt || booking?.completedAt || payment.createdAt || booking?.createdAt;
    let paymentMethod = booking?.paymentMethod || booking?.payment?.method || payment.method || 'cash';
    if (['card', 'upi', 'netbanking', 'wallet'].includes(paymentMethod)) paymentMethod = 'online';

    return {
      id: String(payment._id),
      bookingId: booking?._id ? String(booking._id) : String(payment.bookingId),
      paymentId: String(payment._id),
      date,
      customer: booking?.customerId?.name || 'Customer',
      service: booking?.serviceName || booking?.serviceSnapshot?.serviceName || 'Service',
      jobAmount,
      grossRevenue: countsAsEarnings ? jobAmount : 0,
      platformFee,
      paymentFee,
      otherProviderFee,
      refundAmount,
      providerEarnings,
      amount: isPaidEarning ? providerEarnings : isRefundedEarning ? -refundAmount : jobAmount,
      paymentMethod,
      status,
      type: isRefundedEarning ? 'debit' : isPaidEarning ? 'credit' : 'payment',
      countsAsEarnings,
    };
  });

  // Legacy completed bookings without Payment documents use only fees/refunds
  // actually stored on the booking snapshot; no commission rate is inferred.
  const legacyTransactions = bookings
    .filter((booking) => booking.status === 'completed' && !paymentBookingIds.has(String(booking._id)))
    .filter((booking) => ['paid', 'refunded'].includes(booking.payment?.status))
    .map((booking) => {
      const jobAmount = Math.max(0, safeNumber(booking.amount));
      const platformFee = recordedAmount(booking.platformCommission, booking.commissionAmount, booking.commission);
      const paymentFee = recordedAmount(booking.payment?.paymentProcessingFee);
      const otherProviderFee = recordedAmount(booking.payment?.otherProviderFee);
      const isRefunded = booking.payment.status === 'refunded';
      const refundAmount = isRefunded ? recordedAmount(booking.payment.refundAmount, jobAmount) : 0;
      const providerEarnings = jobAmount - platformFee - paymentFee - otherProviderFee - refundAmount;

      return {
        id: String(booking._id),
        bookingId: String(booking._id),
        paymentId: null,
        date: booking.payment?.paidAt || booking.payment?.refundedAt || booking.completedAt || booking.createdAt,
        customer: booking.customerId?.name || 'Customer',
        service: booking.serviceName || booking.serviceSnapshot?.serviceName || 'Service',
        jobAmount,
        grossRevenue: jobAmount,
        platformFee,
        paymentFee,
        otherProviderFee,
        refundAmount,
        providerEarnings,
        amount: isRefunded ? -refundAmount : providerEarnings,
        paymentMethod: booking.paymentMethod || booking.payment?.method || 'cash',
        status: isRefunded ? 'refunded' : 'paid',
        type: isRefunded ? 'debit' : 'credit',
        countsAsEarnings: true,
      };
    });

  const transactions = [...paymentTransactions, ...legacyTransactions]
    .sort((first, second) => new Date(second.date || 0) - new Date(first.date || 0));
  const earnedTransactions = transactions.filter((transaction) => transaction.countsAsEarnings);
  const sum = (items, field) => items.reduce((total, item) => total + safeNumber(item[field]), 0);

  const grossRevenue = sum(earnedTransactions, 'grossRevenue');
  const platformCommission = sum(earnedTransactions, 'platformFee');
  const paymentProcessingFees = sum(earnedTransactions, 'paymentFee');
  const otherProviderFees = sum(earnedTransactions, 'otherProviderFee');
  const refunds = sum(earnedTransactions, 'refundAmount');
  const lifetimeTotalEarnings = grossRevenue - platformCommission - paymentProcessingFees - otherProviderFees - refunds;

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentYearStart = new Date(now.getFullYear(), 0, 1);
  const inRange = (date, start, end) => {
    const value = new Date(date);
    return Number.isFinite(value.getTime()) && value >= start && (!end || value < end);
  };
  const currentMonthEarnings = earnedTransactions
    .filter((transaction) => inRange(transaction.date, currentMonthStart))
    .reduce((total, transaction) => total + safeNumber(transaction.providerEarnings), 0);
  const previousMonthEarnings = earnedTransactions
    .filter((transaction) => inRange(transaction.date, previousMonthStart, currentMonthStart))
    .reduce((total, transaction) => total + safeNumber(transaction.providerEarnings), 0);
  const thisYearEarnings = earnedTransactions
    .filter((transaction) => inRange(transaction.date, currentYearStart))
    .reduce((total, transaction) => total + safeNumber(transaction.providerEarnings), 0);

  const [completedWithdrawalTotals, heldWithdrawalTotals] = await Promise.all([
    Withdrawal.aggregate([
      { $match: { providerId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Withdrawal.aggregate([
      { $match: { providerId, status: { $in: ['pending', 'processing'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);
  const totalWithdrawn = safeNumber(completedWithdrawalTotals[0]?.total);
  const pendingWithdrawals = safeNumber(heldWithdrawalTotals[0]?.total);
  const availableBalance = Math.max(0, lifetimeTotalEarnings - totalWithdrawn - pendingWithdrawals);

  return {
    transactions,
    grossRevenue: roundMoney(grossRevenue),
    platformCommission: roundMoney(platformCommission),
    paymentProcessingFees: roundMoney(paymentProcessingFees),
    otherProviderFees: roundMoney(otherProviderFees),
    refunds: roundMoney(refunds),
    lifetimeTotalEarnings: roundMoney(lifetimeTotalEarnings),
    netEarnings: roundMoney(lifetimeTotalEarnings),
    totalEarnings: roundMoney(lifetimeTotalEarnings),
    currentMonthEarnings: roundMoney(currentMonthEarnings),
    previousMonthEarnings: roundMoney(previousMonthEarnings),
    thisYearEarnings: roundMoney(thisYearEarnings),
    thisMonth: roundMoney(currentMonthEarnings),
    lastMonthEarnings: roundMoney(previousMonthEarnings),
    availableBalance: roundMoney(availableBalance),
    totalWithdrawn: roundMoney(totalWithdrawn),
    pendingWithdrawals: roundMoney(pendingWithdrawals),
  };
};

export const safePercentageChange = (current, previous) => {
  const currentValue = Number(current);
  const previousValue = Number(previous);
  if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || previousValue <= 0) return null;
  return Math.round(((currentValue - previousValue) / previousValue) * 1000) / 10;
};