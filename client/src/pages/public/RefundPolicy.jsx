import LegalLayout from '../../components/common/LegalLayout';

const sections = [
  {
    heading: '1. Overview',
    content: [
      'This Refund Policy explains how refunds are handled for bookings made through LocalFix.',
      'Refunds are processed based on the stage of the booking and the reason for cancellation.',
      'All refunds are credited back to the original payment method within 5-7 business days.',
    ],
  },
  {
    heading: '2. Full Refund Eligibility',
    content: [
      'Booking cancelled by the customer more than 2 hours before the scheduled start time.',
      'Booking cancelled by the provider for any reason.',
      'Provider fails to arrive within 30 minutes of the scheduled time without prior notice.',
      'Service not delivered as described and provider unable to rectify the issue.',
      'Duplicate or erroneous charges on your account.',
    ],
  },
  {
    heading: '3. Partial Refund Eligibility',
    content: [
      'Booking cancelled by the customer within 2 hours of the scheduled start time: 50% refund.',
      'Service completed but with minor quality issues: up to 30% refund at our discretion.',
      'Provider arrived but service was incomplete due to customer unavailability: 25% refund.',
    ],
  },
  {
    heading: '4. Non-Refundable Situations',
    content: [
      'Service fully completed and customer satisfied with the outcome.',
      'Cancellation after the provider has started the service.',
      'Customer fails to provide access to the service location.',
      'Refund requests made more than 7 days after the booking date.',
      'Services that violate our terms of service or applicable laws.',
    ],
  },
  {
    heading: '5. How to Request a Refund',
    content: [
      'Go to "My Bookings" in your account and select the relevant booking.',
      'Click "Request Refund" and provide a reason for the request.',
      'Our support team will review your request within 24-48 hours.',
      'You will be notified of the decision via email and in-app notification.',
      'Approved refunds are processed within 5-7 business days.',
    ],
  },
  {
    heading: '6. Payment Method Refunds',
    content: [
      'UPI payments: refunded to the same UPI ID within 5-7 business days.',
      'Card payments: refunded to the original card within 7-10 business days.',
      'Wallet payments: credited to your LocalFix wallet instantly upon approval.',
      'Cash payments: refunded via bank transfer after verification of bank details.',
    ],
  },
  {
    heading: '7. Dispute Resolution',
    content: [
      'If you disagree with a refund decision, you may appeal within 7 days.',
      'Appeals are reviewed by our senior support team.',
      'For unresolved disputes, contact our grievance officer at grievance@localfix.com.',
      'We aim to resolve all disputes within 15 business days.',
    ],
  },
  {
    heading: '8. Contact',
    content: [
      'For refund-related queries, contact support@localfix.com.',
      'Our support team is available Monday to Saturday, 9 AM to 8 PM IST.',
    ],
  },
];

export function RefundPolicy() {
  return (
    <LegalLayout
      title="Refund Policy"
      subtitle="Our commitment to fair and transparent refunds."
      updated="August 1, 2026"
      sections={sections}
    />
  );
}

export default RefundPolicy;