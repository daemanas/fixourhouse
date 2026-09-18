import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, Users, Award, TrendingUp } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const values = [
  {
    icon: Shield,
    title: 'Trust & Safety',
    desc: 'Every provider is background-verified. Your safety is our top priority.',
  },
  {
    icon: Award,
    title: 'Quality Guaranteed',
    desc: 'We maintain high standards through continuous ratings and quality checks.',
  },
  {
    icon: Users,
    title: 'Community First',
    desc: 'We empower local professionals and support local economies.',
  },
  {
    icon: TrendingUp,
    title: 'Continuous Growth',
    desc: 'We constantly improve our platform to serve you better every day.',
  },
];

const milestones = [
  { year: '2023', title: 'LocalFix Founded', desc: 'Started with a vision to connect trusted local professionals with customers.' },
  { year: '2024', title: '10,000 Providers', desc: 'Reached 10,000 verified providers across 10 cities in India.' },
  { year: '2025', title: '50,000 Services', desc: 'Completed 50,000+ services with a 4.8★ average rating.' },
  { year: '2026', title: '25+ Cities', desc: 'Expanded to 25+ cities, becoming India\'s trusted local services platform.' },
];

export function About() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl sm:text-5xl font-bold text-ink-light dark:text-ink-dark">
              Our Mission
            </h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              To make professional home services accessible, reliable, and affordable for every household. We connect verified local experts with customers who need them — creating opportunities for providers and peace of mind for customers.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-ink-light dark:text-ink-dark">
              What We Stand For
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              The principles that guide everything we do.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="p-6 h-full text-center">
                  <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center mb-4">
                    <value.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-ink-light dark:text-ink-dark">{value.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{value.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Story / Milestones */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-ink-light dark:text-ink-dark">
              Our Journey
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              From a small idea to a nationwide platform.
            </p>
          </motion.div>
          <div className="relative">
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-border-light dark:bg-border-dark sm:-translate-x-px" />
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={milestone.year}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className={`relative flex items-start gap-6 sm:gap-0 ${
                    index % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'
                  }`}
                >
                  <div className="absolute left-4 sm:left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-primary-600 ring-4 ring-primary-100 dark:ring-primary-900/30" />
                  <div className={`ml-12 sm:ml-0 sm:w-1/2 ${index % 2 === 0 ? 'sm:pr-12' : 'sm:pl-12'}`}>
                    <Card className="p-6">
                      <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">{milestone.year}</span>
                      <h3 className="mt-1 font-semibold text-ink-light dark:text-ink-dark">{milestone.title}</h3>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{milestone.desc}</p>
                    </Card>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink-light dark:text-ink-dark">
              Ready to experience the LocalFix difference?
            </h2>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              Join thousands of happy customers and trusted providers today.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth/register?role=customer">
                <Button size="lg">Book a Service</Button>
              </Link>
              <Link to="/auth/register?role=provider">
                <Button size="lg" variant="outline">Become a Provider</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default About;