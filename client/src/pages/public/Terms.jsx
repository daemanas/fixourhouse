import LegalLayout from '../../components/common/LegalLayout';

const sections = [
  {
    heading: '1. Acceptance of Terms',
    content: [
      'By accessing or using LocalFix, you agree to be bound by these Terms of Service.',
      'If you do not agree to these terms, please do not use our platform.',
      'We may update these terms periodically. Continued use constitutes acceptance of the updated terms.',
    ],
  },
  {
    heading: '2. Eligibility',
    content: [
      'You must be at least 18 years old to use LocalFix.',
      'You must provide accurate, current, and complete information during registration.',
      'You are responsible for maintaining the confidentiality of your account credentials.',
      'You must not create multiple accounts or use the platform for any unlawful purpose.',
    ],
  },
  {
    heading: '3. Services',
    content: [
      'LocalFix is a marketplace connecting customers with independent service providers.',
      'We do not directly employ providers; they are independent contractors.',
      'Service quality, pricing, and completion are the responsibility of the provider.',
      'We facilitate bookings, payments, and dispute resolution between parties.',
    ],
  },
  {
    heading: '4. Bookings and Payments',
    content: [
      'Bookings are confirmed once the provider accepts and payment is authorized.',
      'Prices displayed are inclusive of applicable taxes unless stated otherwise.',
      'Payments are processed through our secure payment gateway.',
      'We charge a service fee on each completed booking.',
      'Refunds are processed according to our Refund Policy.',
    ],
  },
  {
    heading: '5. Provider Obligations',
    content: [
      'Providers must maintain accurate profiles, pricing, and availability.',
      'Providers must deliver services with reasonable skill and care.',
      'Providers must comply with all applicable laws and regulations.',
      'Providers must maintain valid insurance and required licenses.',
      'Providers must not engage in fraudulent or misleading practices.',
    ],
  },
  {
    heading: '6. Customer Obligations',
    content: [
      'Customers must provide accurate service location and contact details.',
      'Customers must ensure safe access to the service location.',
      'Customers must not request services that violate laws or platform policies.',
      'Customers must pay for services rendered as agreed.',
    ],
  },
  {
    heading: '7. Prohibited Conduct',
    content: [
      'Using the platform for any illegal or unauthorized purpose.',
      'Harassing, threatening, or abusing other users or providers.',
      'Attempting to circumvent platform fees or payment systems.',
      'Posting false, misleading, or defamatory content.',
      'Attempting to access other users\' accounts or data.',
      'Using automated tools to scrape or manipulate the platform.',
    ],
  },
  {
    heading: '8. Intellectual Property',
    content: [
      'All content on LocalFix, including logos, text, graphics, and software, is our property.',
      'You may not copy, modify, distribute, or create derivative works without permission.',
      'Providers retain ownership of their own content and service descriptions.',
    ],
  },
  {
    heading: '9. Limitation of Liability',
    content: [
      'LocalFix is provided "as is" without warranties of any kind.',
      'We are not liable for indirect, incidental, or consequential damages.',
      'Our total liability is limited to the amount you paid for the specific service.',
      'We are not responsible for the actions or omissions of independent providers.',
    ],
  },
  {
    heading: '10. Dispute Resolution',
    content: [
      'We encourage users to resolve disputes directly with providers first.',
      'If unresolved, contact our support team for mediation.',
      'Disputes not resolved through mediation will be subject to arbitration in Bengaluru, India.',
      'These terms are governed by the laws of India.',
    ],
  },
  {
    heading: '11. Termination',
    content: [
      'We may suspend or terminate accounts that violate these terms.',
      'You may delete your account at any time through your settings.',
      'Upon termination, you remain liable for any outstanding payments.',
    ],
  },
  {
    heading: '12. Contact',
    content: [
      'For questions about these terms, contact legal@localfix.com.',
      'Our registered office: LocalFix Technologies, 123 MG Road, Bengaluru, Karnataka 560001, India.',
    ],
  },
];

export function Terms() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="The terms and conditions governing your use of LocalFix."
      updated="August 1, 2026"
      sections={sections}
    />
  );
}

export default Terms;