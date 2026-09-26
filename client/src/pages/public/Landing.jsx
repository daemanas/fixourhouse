import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Star,
  Shield,
  Clock,
  Wrench,
  Sparkles,
  Home,
  Paintbrush,
  Zap,
  Droplets,
  Scissors,
  Hammer,
  Bug,
  ChevronDown,
  Phone,
  CheckCircle2,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import RatingStars from '../../components/ui/RatingStars';
import { useWebsiteSettings } from '../../context/WebsiteSettingsContext';
import resolveAssetUrl from '../../utils/assetUrl';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const categories = [
  { icon: Home, name: 'Home Cleaning', color: 'from-blue-500 to-cyan-500' },
  { icon: Wrench, name: 'Plumbing', color: 'from-sky-500 to-blue-600' },
  { icon: Zap, name: 'Electrical', color: 'from-amber-500 to-orange-600' },
  { icon: Paintbrush, name: 'Painting', color: 'from-pink-500 to-rose-600' },
  { icon: Hammer, name: 'Carpentry', color: 'from-emerald-500 to-green-600' },
  { icon: Droplets, name: 'Appliance Repair', color: 'from-violet-500 to-purple-600' },
  { icon: Bug, name: 'Pest Control', color: 'from-red-500 to-rose-600' },
  { icon: Scissors, name: 'Beauty & Salon', color: 'from-fuchsia-500 to-pink-600' },
];

const topProviders = [
  {
    name: 'Rajesh Kumar',
    service: 'Plumbing Expert',
    rating: 4.9,
    jobs: 1240,
    price: '₹350/hr',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
  },
  {
    name: 'Priya Sharma',
    service: 'Home Cleaning',
    rating: 4.8,
    jobs: 980,
    price: '₹250/hr',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
  },
  {
    name: 'Amit Patel',
    service: 'Electrician',
    rating: 4.9,
    jobs: 1560,
    price: '₹400/hr',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
  },
];

const testimonials = [
  {
    name: 'Sneha Reddy',
    role: 'Homeowner, Mumbai',
    text: 'Booked a plumber at 9 AM and he arrived by 11. Professional, clean, and the pricing was exactly as shown. LocalFix is a game changer!',
    rating: 5,
  },
  {
    name: 'Vikram Singh',
    role: 'Homeowner, Delhi',
    text: 'The electrician fixed a complex wiring issue in under an hour. The verification process gives me complete peace of mind.',
    rating: 5,
  },
  {
    name: 'Ananya Iyer',
    role: 'Homeowner, Bengaluru',
    text: 'Beautiful app, easy booking, and the salon service at home was premium quality. I recommend LocalFix to all my friends.',
    rating: 4,
  },
];

const faqs = [
  {
    question: 'How do I book a service?',
    answer: 'Simply search for the service you need, choose a verified provider, select your preferred time slot, and confirm your booking. You will receive real-time updates throughout the process.',
  },
  {
    question: 'Are the providers verified?',
    answer: 'Yes, every provider on LocalFix undergoes a thorough background verification including identity checks, experience validation, and customer reviews before they are approved.',
  },
  {
    question: 'What if I need to cancel?',
    answer: 'You can cancel your booking free of charge up to 2 hours before the scheduled time. Cancellations after that may incur a small fee as per our cancellation policy.',
  },
  {
    question: 'How do payments work?',
    answer: 'Payments are processed securely through our platform. You can pay online or in cash after the service is completed. All transactions are protected.',
  },
];

const stats = [
  { value: '10K+', label: 'Verified Providers' },
  { value: '50K+', label: 'Services Completed' },
  { value: '4.8★', label: 'Average Rating' },
  { value: '25+', label: 'Cities Covered' },
];

export function Landing() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState(0);
  const { settings } = useWebsiteSettings();
  const hero = settings?.hero || {};
  const managedHero = hero.enabled && Boolean(hero.heading || hero.desktopImageUrl || hero.mobileImageUrl);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="absolute inset-0 bg-[url('/images/hero-pattern.svg')] opacity-5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                Trusted by 50,000+ happy customers
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-ink-light dark:text-ink-dark leading-tight">
                {managedHero && hero.heading ? hero.heading : <>Professional services,<span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">{' '}right at your doorstep.</span></>}
              </h1>
              <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-lg">
                {managedHero && hero.subtitle ? hero.subtitle : 'Book verified, background-checked professionals for home, beauty, repair and more. Transparent pricing, guaranteed quality.'}
              </p>

              {/* Search Bar */}
              {managedHero && hero.primaryButtonText ? (
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to={hero.primaryButtonAction || '/customer/search'}><Button>{hero.primaryButtonText}</Button></Link>
                  {hero.secondaryButtonText && <Link to={hero.secondaryButtonAction || '/about'}><Button variant="outline">{hero.secondaryButtonText}</Button></Link>}
                </div>
              ) : <div className="mt-8 max-w-xl">
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-hover border border-border-light dark:border-border-dark">
                  <Search className="h-5 w-5 text-gray-400 ml-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a service..."
                    className="flex-1 bg-transparent outline-none text-ink-light dark:text-ink-dark placeholder-gray-400"
                  />
                  <Link to={`/customer/search?q=${encodeURIComponent(searchQuery)}`}>
                    <Button>Search</Button>
                  </Link>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Plumbing', 'Cleaning', 'Electrician', 'Painting'].map((tag) => (
                    <Link
                      key={tag}
                      to={`/customer/search?category=${encodeURIComponent(tag)}`}
                      className="px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-border-light dark:border-border-dark text-sm text-gray-600 dark:text-gray-300 hover:border-primary-500 hover:text-primary-600 transition-colors"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>}

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap gap-6">
                {[
                  { icon: Shield, text: 'Verified Providers' },
                  { icon: Clock, text: 'On-time Guarantee' },
                  { icon: Star, text: '4.8★ Average Rating' },
                ].map((badge) => (
                  <div key={badge.text} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <badge.icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    {badge.text}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Hero image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative mt-10 lg:mt-0"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                {managedHero && (hero.desktopImageUrl || hero.mobileImageUrl) ? (
                  <picture>
                    <source media="(max-width: 767px)" srcSet={resolveAssetUrl(hero.mobileImageUrl || hero.desktopImageUrl)} />
                    <img src={resolveAssetUrl(hero.desktopImageUrl || hero.mobileImageUrl)} alt={hero.heading || 'LocalFix services'} className="block h-auto max-h-[500px] w-full object-contain" />
                  </picture>
                ) : (
                  <>
                    <img
                      src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop"
                      alt="Professional service provider"
                      className="block h-auto max-h-[500px] w-full object-contain"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6 bg-white/95 dark:bg-gray-900/95 backdrop-blur rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-ink-light dark:text-ink-dark">Rajesh Kumar</p>
                          <p className="text-sm text-gray-500">Plumbing Expert</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <RatingStars value={5} size="sm" readOnly />
                          <span className="text-sm font-medium text-ink-light dark:text-ink-dark">4.9</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white dark:bg-gray-900 border-y border-border-light dark:border-border-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <motion.div key={stat.label} {...fadeUp} className="text-center">
                <p className="text-3xl font-bold text-ink-light dark:text-ink-dark">{stat.value}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-ink-light dark:text-ink-dark">
              Explore Services
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              From home repairs to beauty services, find the perfect professional for every need.
            </p>
          </motion.div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link to={`/customer/search?category=${encodeURIComponent(category.name)}`}>
                  <Card className="p-6 hover:shadow-hover transition-shadow group">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <category.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-ink-light dark:text-ink-dark">{category.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">Book now →</p>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Providers */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-ink-light dark:text-ink-dark">
                Top Rated Providers
              </h2>
              <p className="mt-3 text-gray-500 dark:text-gray-400">
                Our most trusted and highly-rated professionals.
              </p>
            </div>
            <Link to="/customer/search" className="hidden sm:block">
              <Button variant="outline">View All</Button>
            </Link>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topProviders.map((provider, index) => (
              <motion.div
                key={provider.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4">
                    <img
                      src={provider.image}
                      alt={provider.name}
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-ink-light dark:text-ink-dark">{provider.name}</h3>
                      <p className="text-sm text-gray-500">{provider.service}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <RatingStars value={provider.rating} size="sm" readOnly />
                        <span className="text-sm font-medium text-ink-light dark:text-ink-dark">{provider.rating}</span>
                        <span className="text-xs text-gray-400">({provider.jobs} jobs)</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-bold text-primary-600 dark:text-primary-400">{provider.price}</span>
                    <Link to={`/customer/provider/${provider.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      <Button size="sm" variant="outline">View Profile</Button>
                    </Link>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-ink-light dark:text-ink-dark">
              How LocalFix Works
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              Get professional service in just three simple steps.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Search & Select', desc: 'Browse verified providers, compare prices, and choose the perfect professional for your needs.' },
              { step: '02', title: 'Book & Schedule', desc: 'Pick a convenient time slot and confirm your booking. Get instant confirmation.' },
              { step: '03', title: 'Relax & Enjoy', desc: 'Your professional arrives on time, completes the job, and you rate your experience.' },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="relative"
              >
                <Card className="p-8 h-full">
                  <span className="text-5xl font-bold text-primary-100 dark:text-primary-900/30">{item.step}</span>
                  <h3 className="mt-4 text-xl font-semibold text-ink-light dark:text-ink-dark">{item.title}</h3>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">{item.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-ink-light dark:text-ink-dark">
              What Our Customers Say
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              Real experiences from real customers.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="p-6 h-full">
                  <RatingStars value={testimonial.rating} readOnly />
                  <p className="mt-4 text-gray-600 dark:text-gray-300 leading-relaxed">
                    "{testimonial.text}"
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">
                        {testimonial.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-ink-light dark:text-ink-dark">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-ink-light dark:text-ink-dark">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              Everything you need to know about LocalFix.
            </p>
          </motion.div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                    className="w-full flex items-center justify-between p-6 text-left"
                  >
                    <span className="font-semibold text-ink-light dark:text-ink-dark">{faq.question}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-6">
                      <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Download App CTA */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp}>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-secondary-700 p-12 lg:p-16 text-center">
              <div className="absolute inset-0 bg-[url('/images/cta-pattern.svg')] opacity-10" />
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-bold text-white">
                  Get the LocalFix App
                </h2>
                <p className="mt-4 text-white/80 max-w-xl mx-auto">
                  Book services on the go. Track your bookings in real-time and get exclusive app-only offers.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="white" size="lg">
                    <Phone className="h-5 w-5" />
                    Download for iOS
                  </Button>
                  <Button variant="white" size="lg">
                    <Phone className="h-5 w-5" />
                    Download for Android
                  </Button>
                </div>
                <div className="mt-8 flex flex-wrap justify-center gap-6 text-white/80 text-sm">
                  {['Free to download', 'Instant booking', 'Secure payments'].map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default Landing;