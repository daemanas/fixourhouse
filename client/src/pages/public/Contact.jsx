import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';

const contactInfo = [
  { icon: Phone, title: 'Phone', value: '+91 98765 43210', desc: 'Mon-Sat, 9AM-8PM' },
  { icon: Mail, title: 'Email', value: 'support@localfix.com', desc: 'We reply within 24 hours' },
  { icon: MapPin, title: 'Office', value: '123, MG Road, Bengaluru', desc: 'Karnataka, India 560001' },
  { icon: Clock, title: 'Hours', value: '9:00 AM - 8:00 PM', desc: 'Monday to Saturday' },
];

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl sm:text-5xl font-bold text-ink-light dark:text-ink-dark">Contact Us</h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Have a question or need help? We're here for you. Reach out and our team will get back to you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((info, index) => (
              <motion.div
                key={info.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="p-6 text-center h-full">
                  <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center mb-4">
                    <info.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-ink-light dark:text-ink-dark">{info.title}</h3>
                  <p className="mt-1 text-primary-600 dark:text-primary-400 font-medium">{info.value}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{info.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...{ initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } }} className="text-center mb-10">
            <h2 className="text-3xl font-bold text-ink-light dark:text-ink-dark">Send us a Message</h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400">Fill out the form and we'll get back to you shortly.</p>
          </motion.div>
          {submitted ? (
            <Card className="p-8 text-center">
              <div className="h-16 w-16 mx-auto rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-4">
                <Send className="h-8 w-8 text-success-600 dark:text-success-400" />
              </div>
              <h3 className="text-xl font-semibold text-ink-light dark:text-ink-dark">Message Sent!</h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Thank you for reaching out. Our team will respond within 24 hours.
              </p>
              <Button className="mt-6" onClick={() => setSubmitted(false)}>Send Another</Button>
            </Card>
          ) : (
            <Card className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">Full Name</label>
                    <Input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">Email</label>
                    <Input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">Subject</label>
                  <Input
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="How can we help?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">Message</label>
                  <Textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us more about your query..."
                  />
                </div>
                <Button type="submit" fullWidth size="lg">
                  <Send className="h-4 w-4" />
                  Send Message
                </Button>
              </form>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

export default Contact;