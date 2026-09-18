import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../src/config/db.js';
import { buildRevenueReport, buildRevenueCsv } from '../src/utils/revenueReport.js';

const run = async () => {
  await connectDB();
  const report = await buildRevenueReport({ paymentStatus: 'all', page: 1, limit: 5 });
  console.log('SUMMARY', JSON.stringify(report.summary, null, 2));
  console.log('CHART_LEN', report.chart.length, 'FIRST', report.chart[0]);
  console.log('PROVIDERS', report.providerBreakdown.length, report.providerBreakdown[0]);
  console.log('TXNS', report.transactions.length, 'PAGE', report.pagination);
  console.log('TXN0', JSON.stringify(report.transactions[0], null, 2));
  const csv = await buildRevenueCsv({ paymentStatus: 'all' });
  console.log('CSV_FIRST_LINE', csv.csv.split('\n')[0]);
  console.log('CSV_ROWS', csv.csv.split('\n').length);
  // Inspect raw payment + booking amounts to confirm revenue logic sources
  const { default: mongoose } = await import('mongoose');
  const Payment = (await import('../src/models/Payment.js')).default;
  const Booking = (await import('../src/models/Booking.js')).default;
  const p = await Payment.findOne({ status: 'paid' });
  const b = p ? await Booking.findById(p.bookingId) : null;
  console.log('SAMPLE_PAYMENT', p && { amount: p.amount, commission: p.commission, status: p.status });
  console.log('SAMPLE_BOOKING_AMOUNT', b && b.amount);
  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
