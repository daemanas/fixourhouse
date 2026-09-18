import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Save, Shield, Percent, Bell, Globe } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

export function AdminSettingsPage() {
  const [commissionRate, setCommissionRate] = useState('20');
  const [currency, setCurrency] = useState('INR');
  const [supportEmail, setSupportEmail] = useState('support@localfix.com');
  const [notifications, setNotifications] = useState({
    newProvider: true,
    newReport: true,
    newWithdrawal: true,
    systemAlerts: true,
  });

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  const toggleNotification = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Settings</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Platform configuration and preferences
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Percent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink-light dark:text-ink-dark">
                Commission Settings
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure platform commission and currency
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Commission Rate (%)
              </label>
              <Input
                type="number"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                placeholder="20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: 'INR', label: 'INR (₹)' },
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' },
                ]}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink-light dark:text-ink-dark">
                Platform Settings
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                General platform configuration
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Support Email
              </label>
              <Input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@localfix.com"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink-light dark:text-ink-dark">
                Notification Preferences
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose which admin notifications to receive
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { key: 'newProvider', label: 'New provider applications' },
              { key: 'newReport', label: 'New reports filed' },
              { key: 'newWithdrawal', label: 'New withdrawal requests' },
              { key: 'systemAlerts', label: 'System alerts and warnings' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-3 border-b border-border-light dark:border-border-dark last:border-0"
              >
                <span className="text-sm font-medium text-ink-light dark:text-ink-dark">
                  {item.label}
                </span>
                <button
                  type="button"
                  onClick={() => toggleNotification(item.key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications[item.key] ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  aria-label={`Toggle ${item.label}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications[item.key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink-light dark:text-ink-dark">
                Security
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Security and access control settings
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { key: 'twoFactor', label: 'Require two-factor authentication for admins' },
              { key: 'ipRestriction', label: 'Restrict admin access to whitelisted IPs' },
              { key: 'auditLogs', label: 'Enable detailed audit logs' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-3 border-b border-border-light dark:border-border-dark last:border-0"
              >
                <span className="text-sm font-medium text-ink-light dark:text-ink-dark">
                  {item.label}
                </span>
                <button
                  type="button"
                  onClick={() => toggleNotification(item.key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications[item.key] ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  aria-label={`Toggle ${item.label}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications[item.key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}

export default AdminSettingsPage;
