import LegalLayout from '../../components/common/LegalLayout';
import { useWebsiteSettings } from '../../context/WebsiteSettingsContext';
import { withDynamicContact } from '../../utils/websiteContent';

const sections = [
  {
    heading: '1. What Are Cookies?',
    content: [
      'Cookies are small text files stored on your device when you visit a website.',
      'They help websites remember your preferences and improve your browsing experience.',
      'Cookies can be "session" cookies (deleted when you close your browser) or "persistent" cookies (remain until they expire or are deleted).',
    ],
  },
  {
    heading: '2. Cookies We Use',
    content: [
      'Essential cookies: required for core functionality like login, security, and session management.',
      'Preference cookies: remember your settings such as language, theme, and location.',
      'Analytics cookies: help us understand how users interact with our platform to improve it.',
      'Marketing cookies: used (with your consent) to show relevant promotions and measure campaign effectiveness.',
    ],
  },
  {
    heading: '3. Third-Party Cookies',
    content: [
      'Analytics: we use privacy-focused analytics tools to understand platform usage.',
      'Payment: our payment partners may set cookies to process transactions securely.',
      'We do not allow third-party advertising cookies on our platform.',
    ],
  },
  {
    heading: '4. Managing Cookies',
    content: [
      'You can control cookies through your browser settings.',
      'Most browsers allow you to block or delete cookies.',
      'Disabling essential cookies may prevent you from logging in or using core features.',
      'You can opt out of analytics cookies at any time through your account settings.',
    ],
  },
  {
    heading: '5. Cookie Duration',
    content: [
      'Session cookies: deleted when you close your browser.',
      'Authentication cookies: expire after 30 days of inactivity.',
      'Preference cookies: persist for up to 1 year.',
      'Analytics cookies: persist for up to 2 years.',
    ],
  },
  {
    heading: '6. Updates to This Policy',
    content: [
      'We may update this Cookie Policy to reflect changes in our practices.',
      'Material changes will be communicated via email or in-app notification.',
      'The "Last updated" date at the top of this page indicates the latest revision.',
    ],
  },
  {
    heading: '7. Contact',
    content: [
      'For questions about our use of cookies, contact privacy@localfix.com.',
      'You may also write to us at: LocalFix Technologies, 123 MG Road, Bengaluru, Karnataka 560001, India.',
    ],
  },
];

export function CookiePolicy() {
  const { settings } = useWebsiteSettings();
  return (
    <LegalLayout
      title="Cookie Policy"
      subtitle="How we use cookies and similar technologies."
      updated="August 1, 2026"
      sections={withDynamicContact(sections, settings)}
    />
  );
}

export default CookiePolicy;