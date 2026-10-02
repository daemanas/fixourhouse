import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Bell,
  Lock,
  Globe,
  Sun,
  Moon,
  Shield,
  Wallet,
  LifeBuoy,
  AlertTriangle,
  Trash2,
  Eye,
  EyeOff,
  ChevronRight,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  Star,
  CreditCard,
  Landmark,
  CalendarClock,
  Loader2,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { changePassword } from '../../services/userService';
import {
  getProviderSettings,
  updateProviderSettings,
  deactivateProviderAccount,
  deleteProviderAccount,
} from '../../services/providerService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// Sensible defaults used until the backend settings are loaded for the first time.
const DEFAULT_SETTINGS = {
  language: 'English',
  currency: 'INR (â‚¹)',
  notifications: {
    newBookings: true,
    bookingUpdates: true,
    paymentAlerts: true,
    newReviews: true,
    jobCompletion: true,
    withdrawalStatus: true,
    availabilityReminders: true,
    marketingEmails: false,
  },
  appearance: {
    theme: 'light',
  },
  privacy: {
    profileVisibility: 'public',
    showPhone: true,
    showEmail: false,
    showServiceArea: true,
    allowCustomerContact: true,
    publicReviews: true,
  },
  payment: {
    payoutMethod: 'bank',
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    upiId: '',
    payoutSchedule: 'manual',
  },
};

// ON/OFF switch row used by the Notifications and Privacy sections.
function ToggleRow({ icon: Icon, label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3 pr-4">
        {Icon && <Icon className="h-5 w-5 text-gray-400 shrink-0" />}
        <div>
          <p className="font-medium text-ink-light dark:text-ink-dark">{label}</p>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// Password field with a show/hide toggle.
function PasswordField({ label, value, onChange, error, ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div className="w-full">
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className={`input pr-10 ${error ? 'border-danger-500 focus:ring-danger-500' : ''}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label={show ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm text-danger-600 dark:text-danger-400">{error}</p>}
    </div>
  );
}

export function ProviderSettingsPage() {
  const { logout } = useAuth();
  const { setTheme } = useTheme();
  const navigate = useNavigate();

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Load persisted settings on mount.
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProviderSettings();
      const fetched = res.data?.settings;
      if (fetched) {
        const merged = {
          ...DEFAULT_SETTINGS,
          ...fetched,
          notifications: { ...DEFAULT_SETTINGS.notifications, ...(fetched.notifications || {}) },
          appearance: { ...DEFAULT_SETTINGS.appearance, ...(fetched.appearance || {}) },
          privacy: { ...DEFAULT_SETTINGS.privacy, ...(fetched.privacy || {}) },
          payment: { ...DEFAULT_SETTINGS.payment, ...(fetched.payment || {}) },
        };
        setSettings(merged);
        if (['light', 'dark'].includes(merged.appearance?.theme)) setTheme(merged.appearance.theme);
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status !== 404) {
        toast.error(err?.response?.data?.message || 'Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  }, [setTheme]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateGroup = (group, patch) => {
    setSettings((prev) => ({ ...prev, [group]: { ...prev[group], ...patch } }));
  };

  const toggleNotification = (key) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: !prev.notifications[key] },
    }));
  };

  const togglePrivacy = (key) => {
    setSettings((prev) => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: !prev.privacy[key] },
    }));
  };

  const handleThemeChange = (theme) => {
    setTheme(theme);
    updateGroup('appearance', { theme });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateProviderSettings(settings);
      if (res.data?.settings) {
        const s = res.data.settings;
        setSettings((prev) => ({
          ...prev,
          ...s,
          notifications: { ...prev.notifications, ...(s.notifications || {}) },
          appearance: { ...prev.appearance, ...(s.appearance || {}) },
          privacy: { ...prev.privacy, ...(s.privacy || {}) },
          payment: { ...prev.payment, ...(s.payment || {}) },
        }));
      }
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const validatePassword = () => {
    const errors = {};
    if (!passwordForm.currentPassword) errors.currentPassword = 'Current password is required';
    if (!passwordForm.newPassword) errors.newPassword = 'New password is required';
    else if (passwordForm.newPassword.length < 6)
      errors.newPassword = 'New password must be at least 6 characters';
    if (passwordForm.newPassword !== passwordForm.confirmPassword)
      errors.confirmPassword = 'New passwords do not match';
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;
    setChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordErrors({});
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await deactivateProviderAccount();
      toast.success('Account deactivated');
      setShowDeactivateModal(false);
      logout();
      navigate('/auth/login');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to deactivate account');
    } finally {
      setDeactivating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProviderAccount();
      toast.success('Account deleted');
      setShowDeleteModal(false);
      logout();
      navigate('/auth/login');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  const helpItems = [
    { label: 'Help Center', description: 'Guides and frequently asked questions', to: '/about', icon: LifeBuoy },
    { label: 'Contact Support', description: 'Get in touch with our support team', to: '/contact', icon: MessageSquare },
    { label: 'Report a Problem', description: 'Report abuse, fraud or an issue', to: '/report-abuse', icon: AlertTriangle },
    { label: 'FAQ', description: 'Answers to common questions', to: '/about', icon: CheckCircle2 },
    { label: 'Terms & Conditions', description: 'Read our terms of service', to: '/terms', icon: Shield },
    { label: 'Privacy Policy', description: 'How we handle your data', to: '/privacy', icon: Lock },
  ];

  const sectionHeader = (icon, title, subtitle) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="h-10 w-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );

  const notificationItems = [
    { key: 'newBookings', label: 'New Booking Requests', icon: Bell },
    { key: 'bookingUpdates', label: 'Booking Status Updates', icon: Bell },
    { key: 'paymentAlerts', label: 'Payment & Earnings Alerts', icon: Bell },
    { key: 'newReviews', label: 'New Reviews', icon: Star },
    { key: 'jobCompletion', label: 'Job Completion Alerts', icon: CheckCircle2 },
    { key: 'withdrawalStatus', label: 'Withdrawal Status', icon: Wallet },
    { key: 'availabilityReminders', label: 'Availability Reminders', icon: CalendarClock },
    { key: 'marketingEmails', label: 'Marketing Emails', icon: Mail },
  ];

  const privacyItems = [
    { key: 'showPhone', label: 'Show Phone Number', description: 'Display your phone number on your public profile', icon: Phone },
    { key: 'showEmail', label: 'Show Email Address', description: 'Display your email address on your public profile', icon: Mail },
    { key: 'showServiceArea', label: 'Show Service Area', description: 'Let customers see the areas you serve', icon: MapPin },
    { key: 'allowCustomerContact', label: 'Allow Customer Contact', description: 'Allow customers to message you directly', icon: MessageSquare },
    { key: 'publicReviews', label: 'Public Reviews', description: 'Show your reviews publicly on your profile', icon: Star },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Settings</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Manage your preferences, security, and account settings
          </p>
        </div>
        <Button onClick={handleSave} loading={saving} disabled={saving} icon={CheckCircle2}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Preferences */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="p-6 h-full">
            {sectionHeader(<Globe className="h-5 w-5 text-primary-600 dark:text-primary-400" />, 'Preferences')}
            <div className="space-y-4">
              <Select
                label="Language"
                value={settings.language}
                onChange={(e) => updateGroup('language', { language: e.target.value })}
                options={[
                  { value: 'English', label: 'English' },
                  { value: 'Bengali', label: 'Bengali' },
                  { value: 'Hindi', label: 'Hindi' },
                ]}
              />
              <Select
                label="Currency"
                value={settings.currency}
                onChange={(e) => updateGroup('currency', { currency: e.target.value })}
                options={[
                  { value: 'INR (â‚¹)', label: 'INR (₹) - Indian Rupee' },
                  { value: 'USD ($)', label: 'USD ($) - US Dollar' },
                  // { value: 'EUR (â‚¬)', label: 'EUR (â‚¬) - Euro' },
                ]}
              />
            </div>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="p-6 h-full">
            {sectionHeader(<Bell className="h-5 w-5 text-primary-600 dark:text-primary-400" />, 'Notifications', 'Choose what updates you want to receive')}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {notificationItems.map((item) => (
                <ToggleRow
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  checked={settings.notifications[item.key]}
                  onChange={() => toggleNotification(item.key)}
                />
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Card className="p-6 h-full">
            {sectionHeader(<Lock className="h-5 w-5 text-danger-600 dark:text-danger-400" />, 'Security', 'Change your account password')}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <PasswordField
                label="Current Password"
                placeholder="Enter current password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                error={passwordErrors.currentPassword}
              />
              <PasswordField
                label="New Password"
                placeholder="Enter new password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                error={passwordErrors.newPassword}
              />
              <PasswordField
                label="Confirm New Password"
                placeholder="Confirm new password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                error={passwordErrors.confirmPassword}
              />
              <Button type="submit" disabled={changingPassword} loading={changingPassword} icon={Lock}>
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </Card>
        </motion.div>

        {/* Appearance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          <Card className="p-6 h-full">
            {sectionHeader(<Sun className="h-5 w-5 text-primary-600 dark:text-primary-400" />, 'Appearance', 'Customize how LocalFix looks')}
            <div className="space-y-3">
              {[
                { value: 'light', label: 'Light Mode', icon: Sun },
                { value: 'dark', label: 'Dark Mode', icon: Moon },
              ].map((opt) => {
                const active = settings.appearance.theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleThemeChange(opt.value)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                      active
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-border-light dark:border-border-dark hover:bg-hover-light dark:hover:bg-hover-dark'
                    }`}
                  >
                    <opt.icon className={`h-5 w-5 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
                    <span className="flex-1 text-left font-medium text-ink-light dark:text-ink-dark">{opt.label}</span>
                    {active && <CheckCircle2 className="h-5 w-5 text-primary-600" />}
                  </button>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* Privacy */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
          <Card className="p-6 h-full">
            {sectionHeader(<Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />, 'Privacy', 'Control what others can see')}
            <div className="space-y-4">
              <Select
                label="Profile Visibility"
                value={settings.privacy.profileVisibility}
                onChange={(e) => updateGroup('privacy', { profileVisibility: e.target.value })}
                options={[
                  { value: 'public', label: 'Public - Anyone can view your profile' },
                  { value: 'private', label: 'Private - Hidden from public search' },
                ]}
              />
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {privacyItems.map((item) => (
                  <ToggleRow
                    key={item.key}
                    icon={item.icon}
                    label={item.label}
                    description={item.description}
                    checked={settings.privacy[item.key]}
                    onChange={() => togglePrivacy(item.key)}
                  />
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Payment & Earnings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}>
          <Card className="p-6 h-full">
            {sectionHeader(<Wallet className="h-5 w-5 text-primary-600 dark:text-primary-400" />, 'Payment & Earnings', 'Manage how you get paid')}
            <div className="space-y-4">
              <Select
                label="Payout Method"
                value={settings.payment.payoutMethod}
                onChange={(e) => updateGroup('payment', { payoutMethod: e.target.value })}
                options={[
                  { value: 'bank', label: 'Bank Transfer' },
                  { value: 'upi', label: 'UPI' },
                ]}
              />

              {settings.payment.payoutMethod === 'bank' ? (
                <div className="space-y-4">
                  <Input
                    label="Account Holder Name"
                    icon={CreditCard}
                    placeholder="e.g. John Doe"
                    value={settings.payment.accountHolderName}
                    onChange={(e) => updateGroup('payment', { accountHolderName: e.target.value })}
                  />
                  <Input
                    label="Bank Name"
                    icon={Landmark}
                    placeholder="e.g. State Bank of India"
                    value={settings.payment.bankName}
                    onChange={(e) => updateGroup('payment', { bankName: e.target.value })}
                  />
                  <Input
                    label="Account Number"
                    placeholder="Bank account number"
                    value={settings.payment.accountNumber}
                    onChange={(e) => updateGroup('payment', { accountNumber: e.target.value })}
                  />
                  <Input
                    label="IFSC Code"
                    placeholder="e.g. SBIN0001234"
                    value={settings.payment.ifsc}
                    onChange={(e) => updateGroup('payment', { ifsc: e.target.value.toUpperCase() })}
                  />
                </div>
              ) : (
                <Input
                  label="UPI ID"
                  placeholder="e.g. yourname@bank"
                  value={settings.payment.upiId}
                  onChange={(e) => updateGroup('payment', { upiId: e.target.value })}
                />
              )}

              <Select
                label="Payout Schedule"
                value={settings.payment.payoutSchedule}
                onChange={(e) => updateGroup('payment', { payoutSchedule: e.target.value })}
                options={[
                  { value: 'manual', label: 'Manual - Withdraw on request' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
              />
            </div>
          </Card>
        </motion.div>

        {/* Help & Support */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 }}>
          <Card className="p-6 h-full">
            {sectionHeader(<LifeBuoy className="h-5 w-5 text-primary-600 dark:text-primary-400" />, 'Help & Support')}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {helpItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="flex items-center justify-between py-3 group"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-ink-light dark:text-ink-dark group-hover:text-primary-600">
                        {item.label}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600" />
                </Link>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.7 }}>
          <Card className="p-6 h-full border-danger-200 dark:border-danger-900">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-danger-600 dark:text-danger-400" />
              </div>
              <h2 className="text-lg font-bold text-danger-600 dark:text-danger-400">Danger Zone</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-ink-light dark:text-ink-dark">Deactivate Account</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Temporarily disable your account
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setShowDeactivateModal(true)}>
                  Deactivate
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <Trash2 className="h-5 w-5 text-danger-500" />
                  <div>
                    <p className="font-medium text-ink-light dark:text-ink-dark">Delete Account</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Permanently remove your account and data
                    </p>
                  </div>
                </div>
                <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Deactivate confirmation modal */}
      <Modal
        isOpen={showDeactivateModal}
        onClose={() => !deactivating && setShowDeactivateModal(false)}
        title="Deactivate account?"
        subtitle="You will be signed out and your account will be suspended. You can contact support to reactivate it."
      >
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button variant="outline" onClick={() => setShowDeactivateModal(false)} disabled={deactivating}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeactivate} loading={deactivating} icon={AlertTriangle}>
            {deactivating ? 'Deactivating...' : 'Yes, Deactivate'}
          </Button>
        </div>
      </Modal>

      {/* Delete confirmation modal â€” requires typing DELETE to confirm */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleting && setShowDeleteModal(false)}
        title="Delete account permanently?"
        subtitle="This action cannot be undone. All your data, profile and earnings history will be removed."
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Type <span className="font-semibold text-danger-600">DELETE</span> below to confirm.
          </p>
          <Input
            placeholder="DELETE"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
              disabled={deleteConfirmText !== 'DELETE' || deleting}
              icon={Trash2}
            >
              {deleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ProviderSettingsPage;
