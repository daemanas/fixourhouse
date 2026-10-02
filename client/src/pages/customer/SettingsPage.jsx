import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Bell,
  Lock,
  Globe,
  Shield,
  Loader2,
  Trash2,
  LogOut,
  Moon,
  Phone,
  Mail,
  Sun,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { changePassword } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export function SettingsPage() {
  const { user: authUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    bookingUpdates: true,
    promotions: false,
    reviews: true,
    reminders: true,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [language, setLanguage] = useState('en');

  const handleNotificationToggle = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    toast.success('Notification preferences updated');
  };

  const handlePasswordChange = (e) => {
    setPasswordData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setSavingPassword(true);
    try {
      const response = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success(response?.data?.message || 'Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const toggle = ({ checked, onChange, label, description }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium text-ink-light dark:text-ink-dark">{label}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Settings</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Manage your preferences, security, and account settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 lg:hidden">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              {theme === 'dark' ? <Moon className="h-5 w-5 text-primary-600 dark:text-primary-400" /> : <Sun className="h-5 w-5 text-primary-600 dark:text-primary-400" />}
            </div>
            <div><h2 className="text-lg font-bold text-ink-light dark:text-ink-dark">Appearance</h2><p className="text-sm text-gray-500 dark:text-gray-400">Choose your display theme</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800" role="group" aria-label="Display theme">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
            ].map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTheme(id)} aria-pressed={theme === id} className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors sm:text-sm ${theme === id ? 'bg-white text-emerald-800 shadow-sm dark:bg-gray-700 dark:text-emerald-300' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}><Icon className="h-4 w-4" />{label}</button>)}
          </div>
        </Card>

        {/* Notification Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark">
                Notification Preferences
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {toggle({
                checked: notifications.bookingUpdates,
                onChange: () => handleNotificationToggle('bookingUpdates'),
                label: 'Booking Updates',
                description: 'Get notified about booking status changes',
              })}
              {toggle({
                checked: notifications.reminders,
                onChange: () => handleNotificationToggle('reminders'),
                label: 'Service Reminders',
                description: 'Reminders before your scheduled services',
              })}
              {toggle({
                checked: notifications.reviews,
                onChange: () => handleNotificationToggle('reviews'),
                label: 'Reviews & Ratings',
                description: 'Notifications about reviews you receive',
              })}
              {toggle({
                checked: notifications.promotions,
                onChange: () => handleNotificationToggle('promotions'),
                label: 'Promotional Emails',
                description: 'Special offers and promotions from LocalFix',
              })}
            </div>
          </Card>
        </motion.div>

        {/* Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
                <Lock className="h-5 w-5 text-danger-600 dark:text-danger-400" />
              </div>
              <h2 className="text-lg font-semibold text-ink-light dark:text-ink-dark">
                Change Password
              </h2>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                  Current Password
                </label>
                <Input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                  New Password
                </label>
                <Input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" disabled={savingPassword} fullWidth>
                {savingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </Card>
        </motion.div>

        {/* Language & Region */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center">
                <Globe className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
              </div>
              <h2 className="text-lg font-semibold text-ink-light dark:text-ink-dark">
                Language & Region
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    toast.success('Language preference updated');
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-ink-light dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="mr">Marathi</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                  Currency
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-ink-light dark:text-ink-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
                  defaultValue="INR"
                >
                  <option value="INR">₹ INR - Indian Rupee</option>
                  <option value="USD">$ USD - US Dollar</option>
                </select>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Account Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
                <Shield className="h-5 w-5 text-warning-600 dark:text-warning-400" />
              </div>
              <h2 className="text-lg font-semibold text-ink-light dark:text-ink-dark">
                Account Actions
              </h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-ink-light dark:text-ink-dark">Phone Number</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{authUser?.phone || 'Not set'}</p>
                  </div>
                </div>
                <Badge variant="success">Registered</Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-ink-light dark:text-ink-dark">Email Address</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{authUser?.email || 'Not set'}</p>
                  </div>
                </div>
                {authUser?.email ? <Badge variant="primary">Registered</Badge> : <Badge variant="outline">Not set</Badge>}
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <Button variant="outline" fullWidth onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  Log Out
                </Button>
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => toast.error('Account deletion is not available. Please contact support.')}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default SettingsPage;