import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Send } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';

const reportTypes = [
  { value: 'fraud', label: 'Fraud / Scam' },
  { value: 'abuse', label: 'Abuse / Harassment' },
  { value: 'copyright', label: 'Copyright Infringement' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'privacy', label: 'Privacy Violation' },
  { value: 'other', label: 'Other' },
];

export function ReportAbuse() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    reportType: 'fraud',
    targetId: '',
    description: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-danger-500 to-danger-600 flex items-center justify-center mb-6">
              <ShieldAlert className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-ink-light dark:text-ink-dark">Report Abuse</h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Help us keep LocalFix safe. Report any fraudulent, abusive, or inappropriate activity on our platform.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Report Form */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {submitted ? (
            <Card className="p-8 text-center">
              <div className="h-16 w-16 mx-auto rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mb-4">
                <Send className="h-8 w-8 text-success-600 dark:text-success-400" />
              </div>
              <h3 className="text-xl font-semibold text-ink-light dark:text-ink-dark">Report Submitted</h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Thank you for helping us keep LocalFix safe. Our trust & safety team will review your report within 48 hours.
              </p>
              <Button className="mt-6" onClick={() => setSubmitted(false)}>Submit Another Report</Button>
            </Card>
          ) : (
            <Card className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">Your Name</label>
                    <Input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">Your Email</label>
                    <Input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">Report Type</label>
                    <Select
                      value={form.reportType}
                      onChange={(e) => setForm({ ...form, reportType: e.target.value })}
                      options={reportTypes}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                      Target ID (Provider/Booking ID)
                    </label>
                    <Input
                      value={form.targetId}
                      onChange={(e) => setForm({ ...form, targetId: e.target.value })}
                      placeholder="e.g. PRV-12345"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">Description</label>
                  <Textarea
                    required
                    rows={6}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Please describe the issue in detail. Include dates, names, and any relevant information..."
                  />
                </div>
                <div className="p-4 rounded-xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
                  <p className="text-sm text-warning-700 dark:text-warning-300">
                    <strong>Note:</strong> False or malicious reports may result in account action. Please only submit genuine reports.
                  </p>
                </div>
                <Button type="submit" fullWidth size="lg" variant="danger">
                  <ShieldAlert className="h-4 w-4" />
                  Submit Report
                </Button>
              </form>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

export default ReportAbuse;