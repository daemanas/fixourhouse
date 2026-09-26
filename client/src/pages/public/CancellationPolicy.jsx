import LegalLayout from '../../components/common/LegalLayout';
import { useWebsiteSettings } from '../../context/WebsiteSettingsContext';
import { withDynamicContact } from '../../utils/websiteContent';

const sections = [
  {
    heading: '1. Overview',
    content: [
      'This Cancellation Policy outlines the rules for cancelling bookings on LocalFix.',
      'Cancellation rules differ based on who initiates the cancellation and when it occurs.',
      'All cancellations are recorded and may affect your account standing.',
    ],
  },
  {
    heading: '2. Customer Cancellations',
    content: [
      'Free cancellation: more than 2 hours before the scheduled start time — full refund.',
      'Late cancellation: within 2 hours of the scheduled start time — 50% refund.',
      'No-show: customer unavailable at the scheduled time — no refund.',
      'Customers with frequent late cancellations may be subject to account restrictions.',
    ],
  },
  {
    heading: '3. Provider Cancellations',
    content: [
      'Providers may cancel a booking before accepting it without penalty.',
      'Cancellation after acceptance is strongly discouraged and affects provider ratings.',
      'Repeated cancellations may result in suspension of the provider account.',
      'Customers receive a full refund and priority re-booking when a provider cancels.',
    ],
  },
  {
    heading: '4. Platform Cancellations',
    content: [
      'LocalFix may cancel bookings in cases of suspected fraud or policy violations.',
      'We may cancel bookings due to force majeure events (natural disasters, strikes, etc.).',
      'In such cases, customers receive a full refund and are notified immediately.',
    ],
  },
  {
    heading: '5. How to Cancel',
    content: [
      'Go to "My Bookings" and select the booking you wish to cancel.',
      'Click "Cancel Booking" and select a reason.',
      'Confirm the cancellation — you will receive an immediate confirmation.',
      'Refunds, if applicable, are processed per our Refund Policy.',
    ],
  },
  {
    heading: '6. Rescheduling',
    content: [
      'Customers may reschedule a booking up to 2 hours before the scheduled time, subject to provider availability.',
      'Rescheduling is free for the first instance; subsequent reschedules may incur a fee.',
      'Providers may reschedule with customer consent and at least 2 hours notice.',
    ],
  },
  {
    heading: '7. Impact on Ratings',
    content: [
      'Customer cancellations do not affect provider ratings.',
      'Provider cancellations after acceptance may lower their reliability score.',
      'Frequent cancellations by either party may result in account warnings.',
    ],
  },
  {
    heading: '8. Contact',
    content: [
      'For cancellation-related assistance, contact support@localfix.com.',
      'Our team is available Monday to Saturday, 9 AM to 8 PM IST.',
    ],
  },
];

export function CancellationPolicy() {
  const { settings } = useWebsiteSettings();
  return (
    <LegalLayout
      title="Cancellation Policy"
      subtitle="Clear and fair rules for cancelling bookings."
      updated="August 1, 2026"
      sections={withDynamicContact(sections, settings)}
    />
  );
}

export default CancellationPolicy;