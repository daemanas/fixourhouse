import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { useWebsiteSettings } from '../../context/WebsiteSettingsContext';
import BrandLockup from './BrandLockup';

export function Footer() {
  const { settings } = useWebsiteSettings();
  const contact = settings?.contact || {};
  const social = settings?.social || {};
  const officeLocation = [contact.officeAddress, contact.city, contact.state, contact.country, contact.postalCode]
    .filter(Boolean)
    .join(', ');
  const socialLinks = [
    { key: 'facebook', label: 'Facebook', Icon: Facebook },
    { key: 'twitter', label: 'Twitter', Icon: Twitter },
    { key: 'instagram', label: 'Instagram', Icon: Instagram },
    { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
  ].filter((link) => social[link.key]);
  const companyLinks = [
    { to: '/about', label: 'About Us' },
    { to: '/contact', label: 'Contact' },
    { to: '/report-abuse', label: 'Report Abuse' },
  ];

  const legalLinks = [
    { to: '/privacy', label: 'Privacy Policy' },
    { to: '/terms', label: 'Terms of Service' },
    { to: '/refund', label: 'Refund Policy' },
    { to: '/cancellation', label: 'Cancellation Policy' },
    { to: '/cookie', label: 'Cookie Policy' },
  ];

  const categories = [
    'Home Cleaning',
    'Plumbing',
    'Electrical',
    'Painting',
    'Carpentry',
    'Appliance Repair',
    'Pest Control',
    'Beauty & Salon',
  ];

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2">
              <BrandLockup forceDark textClassName="text-white" />
            </Link>
            <p className="mt-4 text-sm text-gray-400 leading-relaxed">
              Your trusted marketplace for finding and booking verified local service providers. Quality service, guaranteed.
            </p>
            <div className="mt-6 space-y-3">
              {(contact.supportEmail || contact.officialEmail) && <a href={`mailto:${contact.supportEmail || contact.officialEmail}`} className="flex items-center gap-3 text-sm hover:text-white"><Mail className="h-4 w-4 text-primary-400" />{contact.supportEmail || contact.officialEmail}</a>}
              {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-sm hover:text-white"><Phone className="h-4 w-4 text-primary-400" />{contact.phone}</a>}
              {officeLocation && <div className="flex items-center gap-3 text-sm"><MapPin className="h-4 w-4 shrink-0 text-primary-400" /><span>{officeLocation}</span></div>}
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Company</h3>
            <ul className="mt-4 space-y-3">
              {companyLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Legal</h3>
            <ul className="mt-4 space-y-3">
              {legalLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Popular Services</h3>
            <ul className="mt-4 space-y-3">
              {categories.map((category) => (
                <li key={category}>
                  <Link
                    to={`/customer/search?category=${encodeURIComponent(category)}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Social + Bottom */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} {settings?.siteName || 'LocalFix'}. All rights reserved.</p>
            <div className="flex items-center gap-4">
              {socialLinks.map(({ key, label, Icon }) => <a key={key} href={social[key]} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-gray-800 transition-colors" aria-label={label}><Icon className="h-5 w-5" /></a>)}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;