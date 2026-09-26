import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Bell, Globe, Percent } from 'lucide-react';
import Card from '../../components/ui/Card';

export function AdminSettingsPage() {
  const [notifications, setNotifications] = useState({
    newProvider: true,
    newReport: true,
    newWithdrawal: true,
    systemAlerts: true,
  });

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

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/admin/website-settings" className="group">
          <Card className="flex h-full items-center gap-4 p-5 transition-colors group-hover:border-primary-300 dark:group-hover:border-primary-700">
            <Globe className="h-6 w-6 shrink-0 text-primary-600 dark:text-primary-400" />
            <span className="min-w-0 flex-1"><span className="block font-semibold text-ink-light dark:text-ink-dark">Website Management</span><span className="mt-1 block text-sm text-gray-500">Branding, homepage banner and public contact details</span></span>
            <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-1" />
          </Card>
        </Link>
        <Link to="/admin/provider-commission" className="group">
          <Card className="flex h-full items-center gap-4 p-5 transition-colors group-hover:border-primary-300 dark:group-hover:border-primary-700">
            <Percent className="h-6 w-6 shrink-0 text-primary-600 dark:text-primary-400" />
            <span className="min-w-0 flex-1"><span className="block font-semibold text-ink-light dark:text-ink-dark">Provider Commission</span><span className="mt-1 block text-sm text-gray-500">Default rate and time-limited commission offers</span></span>
            <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-1" />
          </Card>
        </Link>
      </div>

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

    </div>
  );
}

export default AdminSettingsPage;
