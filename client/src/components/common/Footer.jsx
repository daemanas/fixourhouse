import { Link } from 'react-router-dom';
import { Wrench, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
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
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Local<span className="text-primary-400">Fix</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-gray-400 leading-relaxed">
              Your trusted marketplace for finding and booking verified local service providers. Quality service, guaranteed.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-primary-400" />
                <span>support@localfix.com</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-primary-400" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-primary-400" />
                <span>Mumbai, Maharashtra, India</span>
              </div>
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
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} LocalFix. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="p-2 rounded-lg hover:bg-gray-800 transition-colors" aria-label="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 rounded-lg hover:bg-gray-800 transition-colors" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 rounded-lg hover:bg-gray-800 transition-colors" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 rounded-lg hover:bg-gray-800 transition-colors" aria-label="LinkedIn">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;