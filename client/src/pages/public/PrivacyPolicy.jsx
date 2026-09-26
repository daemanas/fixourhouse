import LegalLayout from '../../components/common/LegalLayout';
import { useWebsiteSettings } from '../../context/WebsiteSettingsContext';
import { withDynamicContact } from '../../utils/websiteContent';

const sections = [
  {
    heading: '1. Information We Collect',
    content: [
      'Personal information: name, phone number, email address, and profile photo when you register.',
      'Service information: booking history, service preferences, and communications with providers.',
      'Payment information: processed securely through our payment partners. We do not store full card details.',
      'Device information: IP address, browser type, device identifiers for security and analytics purposes.',
      'Location data: when permitted, to show nearby providers and relevant service availability.',
    ],
  },
  {
    heading: '2. How We Use Your Information',
    content: [
      'To provide, maintain, and improve our marketplace services.',
      'To process bookings, payments, and support requests.',
      'To verify providers and maintain platform trust and safety.',
      'To send service updates, notifications, and promotional communications you have opted into.',
      'To detect, prevent, and address fraud, abuse, and security issues.',
      'To comply with legal obligations and enforce our terms of service.',
    ],
  },
  {
    heading: '3. Information Sharing',
    content: [
      'We share necessary information with providers only as needed to fulfill your booking.',
      'We share data with payment processors solely to complete transactions.',
      'We may share aggregated, anonymized statistics for research and analytics.',
      'We never sell your personal information to third parties.',
      'We may disclose information when required by law, court order, or to protect the rights and safety of our users and platform.',
    ],
  },
  {
    heading: '4. Data Security',
    content: [
      'All data is encrypted in transit using TLS/SSL protocols.',
      'Passwords are hashed using industry-standard bcrypt algorithms.',
      'Access to personal data is restricted to authorized personnel only.',
      'We conduct regular security audits and vulnerability assessments.',
      'In the event of a data breach, affected users will be notified within 72 hours.',
    ],
  },
  {
    heading: '5. Your Rights',
    content: [
      'Access and receive a copy of your personal data.',
      'Correct any inaccurate or incomplete information.',
      'Request deletion of your account and associated data.',
      'Withdraw consent for marketing communications at any time.',
      'Lodge a complaint with your local data protection authority.',
      'To exercise any of these rights, contact our support team at support@localfix.com.',
    ],
  },
  {
    heading: '6. Cookies',
    content: [
      'We use essential cookies to keep you logged in and maintain session security.',
      'Analytics cookies help us understand how users interact with our platform.',
      'Preference cookies remember your settings such as language and theme.',
      'You can control cookies through your browser settings. Disabling essential cookies may affect platform functionality.',
    ],
  },
  {
    heading: '7. Data Retention',
    content: [
      'Account information is retained while your account is active.',
      'Booking records are retained for 7 years to comply with tax regulations.',
      'Deleted accounts have personal data removed within 30 days, except where legal retention applies.',
      'Log files are retained for 6 months for security analysis.',
    ],
  },
  {
    heading: '8. Children\'s Privacy',
    content: [
      'LocalFix is not intended for individuals under 18 years of age.',
      'We do not knowingly collect personal information from minors.',
      'If we discover we have collected data from a minor, we will delete it promptly.',
    ],
  },
  {
    heading: '9. Changes to This Policy',
    content: [
      'We may update this policy periodically to reflect changes in our practices or legal requirements.',
      'Material changes will be communicated via email or in-app notification 14 days in advance.',
      'Continued use of the platform after changes constitutes acceptance of the updated policy.',
    ],
  },
  {
    heading: '10. Contact Us',
    content: [
      'For privacy-related inquiries, contact our Data Protection Officer at privacy@localfix.com.',
      'Write to us at: LocalFix Technologies, 123 MG Road, Bengaluru, Karnataka 560001, India.',
      'We respond to all privacy requests within 30 days.',
    ],
  },
];

export function PrivacyPolicy() {
  const { settings } = useWebsiteSettings();
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How we collect, use, and protect your personal information."
      updated="August 1, 2026"
      sections={withDynamicContact(sections, settings)}
    />
  );
}

export default PrivacyPolicy;