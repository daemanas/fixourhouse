import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import ApiError from './ApiError.js';

/**
 * Process a refund for a booking's payment.
 *
 * This ONLY flips the Payment status to 'refunded' and mirrors that status onto
 * Booking.payment.status. It does NOT touch provider earnings, because:
 *   - revenueReport excludes refunded payments from gross and counts them as refunds
 *   - earnings util only sums payments with status 'paid'
 * So marking a payment as refunded removes it from both gross revenue and
 * provider earnings automatically — no double counting, no util changes required.
 *
 * Idempotent: if the payment is already refunded it returns { alreadyRefunded: true }.
 *
 * @param {string|mongoose.Types.ObjectId} bookingId - the Booking _id
 * @param {object} [opts]
 * @param {number} [opts.amount] - optional explicit refund amount (defaults to full payment amount)
 * @returns {Promise<{alreadyRefunded: boolean, payment: object, refundAmount: number}>}
 */
export async function processRefund(bookingId, { amount } = {}) {
  const payment = await Payment.findOne({ bookingId });
  if (!payment) {
    throw new ApiError(404, 'No payment record found for this booking.');
  }

  if (payment.status === 'refunded') {
    return { alreadyRefunded: true, payment, refundAmount: payment.amount };
  }

  const refundAmount = amount != null ? Number(amount) : payment.amount;
  if (Number.isNaN(refundAmount) || refundAmount < 0) {
    throw new ApiError(400, 'Invalid refund amount.');
  }

  payment.status = 'refunded';
  payment.refundedAt = new Date();
  await payment.save();

  // Mirror the refunded status onto the booking's embedded payment snapshot.
  await Booking.updateOne(
    { _id: bookingId },
    {
      $set: {
        'payment.status': 'refunded',
        'payment.refundedAt': payment.refundedAt,
      },
    }
  );

  return { alreadyRefunded: false, payment, refundAmount };
}
