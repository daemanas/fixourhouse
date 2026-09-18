import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export function LegalLayout({ title, subtitle, updated, sections }) {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl font-bold text-ink-light dark:text-ink-dark">{title}</h1>
            {subtitle && (
              <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">{subtitle}</p>
            )}
            {updated && (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Last updated: {updated}</p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-10">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <h2 className="text-2xl font-semibold text-ink-light dark:text-ink-dark mb-4">
                  {section.heading}
                </h2>
                {Array.isArray(section.content) ? (
                  <ul className="space-y-3">
                    {section.content.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-600 dark:text-gray-300 leading-relaxed">
                        <ChevronRight className="h-5 w-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{section.content}</p>
                )}
              </motion.div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-16 p-8 rounded-2xl bg-primary-50 dark:bg-gray-800 text-center">
            <h3 className="text-xl font-semibold text-ink-light dark:text-ink-dark">
              Have questions about this policy?
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Our team is happy to help clarify any part of this document.
            </p>
            <Link
              to="/contact"
              className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LegalLayout;