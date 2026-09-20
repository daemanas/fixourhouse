import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Camera,
  CalendarClock,
  Clock,
  ArrowRight,
  IndianRupee,
  MapPin,
  Phone,
  Mail,
  Save,
  Star,
  Loader2,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Badge from '../../components/ui/Badge';
import { getMyProviderProfile, updateMyProviderProfile } from '../../services/providerService';
import { getCategories } from '../../services/categoryService';
import { useAuth } from '../../context/AuthContext';
import env from '../../config/env';
import Avatar from '../../components/ui/Avatar';
import LocationCascade from '../../components/common/LocationCascade';
import {
  normalizeAvailability,
  summarizeAvailability,
  formatTime12h,
} from '../../utils/availability';

export function ProviderProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  const fileInputRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    businessName: '',
    description: '',
    category: '',
    experience: '',
    city: '',
    area: '',
    basePrice: '',
    phone: '',
    email: '',
  });
  const [locationData, setLocationData] = useState({
    state: '',
    district: '',
    city: '',
    stateId: '',
    districtId: '',
    cityId: '',
  });
  // Availability is read from the backend (GET /providers/me/profile and
  // GET /providers/me/availability) — it is never edited on this page. The
  // page only ever DISPLAYS the single source of truth.
  const [availability, setAvailability] = useState(() => ({
    monday: { enabled: false, startTime: '', endTime: '' },
    tuesday: { enabled: false, startTime: '', endTime: '' },
    wednesday: { enabled: false, startTime: '', endTime: '' },
    thursday: { enabled: false, startTime: '', endTime: '' },
    friday: { enabled: false, startTime: '', endTime: '' },
    saturday: { enabled: false, startTime: '', endTime: '' },
    sunday: { enabled: false, startTime: '', endTime: '' },
  }));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [providerRating, setProviderRating] = useState(null);
  const [providerReviewCount, setProviderReviewCount] = useState(0);

  useEffect(() => {
    loadProfile();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(response?.data?.data?.categories || []);
    } catch {
      // Categories are a convenience list; the category still saves as free text.
    }
  };

  const applyProvider = (provider = {}) => {
    setProviderRating(provider.rating ?? null);
    setProviderReviewCount(provider.reviewCount ?? 0);
    setForm({
      businessName: provider.businessName || '',
      description: provider.description || '',
      category: provider.category || '',
      experience: provider.experience != null ? String(provider.experience) : '',
      city: provider.location?.city || '',
      area: provider.location?.address || '',
      basePrice: provider.pricing?.basePrice != null ? String(provider.pricing.basePrice) : '',
      phone: provider.userId?.phone || authUser?.phone || '',
      email: provider.userId?.email || authUser?.email || '',
    });
    setLocationData({
      state: provider.location?.state || '',
      district: provider.location?.district || '',
      city: provider.location?.city || '',
    });
    setAvailability(normalizeAvailability(provider.availability));
    setAvatarUrl(provider.userId?.avatar || authUser?.avatar || '');
  };

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMyProviderProfile();
      applyProvider(response?.data?.data?.provider);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to load profile.');
      // Profile may not exist yet; leave form blank
      setForm((prev) => ({
        ...prev,
        phone: authUser?.phone || '',
        email: authUser?.email || '',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errs = {};
    const experienceNum = form.experience === '' ? null : Number(form.experience);
    const basePriceNum = form.basePrice === '' ? null : Number(form.basePrice);

    if (!form.businessName.trim()) {
      errs.businessName = 'Business name is required';
    } else if (form.businessName.trim().length < 2) {
      errs.businessName = 'Business name must be at least 2 characters';
    }
    if (form.businessName.trim().length > 100) {
      errs.businessName = 'Business name cannot exceed 100 characters';
    }
    if (!form.category.trim()) {
      errs.category = 'Category is required';
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }
    if (!form.city.trim()) {
      errs.city = 'City is required';
    }
    if (!form.area.trim()) {
      errs.area = 'Service area is required';
    }
    if (experienceNum !== null && (Number.isNaN(experienceNum) || experienceNum < 0)) {
      errs.experience = 'Experience must be a number 0 or greater';
    }
    if (basePriceNum === null || Number.isNaN(basePriceNum) || basePriceNum < 0) {
      errs.basePrice = 'Base price is required and must be 0 or greater';
    }
    if (form.description.length > 1000) {
      errs.description = 'Description cannot exceed 1000 characters';
    }
    return errs;
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (saving) return; // prevent duplicate submissions
    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error('Please fix the highlighted fields before saving');
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        location: {
          country: locationData.country || 'India',
          state: locationData.state || undefined,
          district: locationData.district || undefined,
          city: locationData.city || form.city.trim(),
          address: form.area.trim(),
          countryId: locationData.countryId || undefined,
          stateId: locationData.stateId || undefined,
          districtId: locationData.districtId || undefined,
          cityId: locationData.cityId || undefined,
        },
        pricing: {
          basePrice: form.basePrice !== '' ? Number(form.basePrice) : undefined,
        },
        email: form.email.trim() || undefined,
      };
      const response = await updateMyProviderProfile(payload);
      const updatedProvider = response?.data?.data?.provider;
      const updatedUser = response?.data?.data?.user;
      if (updatedProvider) {
        applyProvider(updatedProvider);
      }
      if (updatedUser) {
        setForm((prev) => ({
          ...prev,
          email: updatedUser.email || prev.email,
        }));
        if (updatedUser.avatar) setAvatarUrl(updatedUser.avatar);
      }
      // Refresh the authenticated user so the sidebar/header and other identity
      // displays pick up the new display name, email and avatar immediately.
      try {
        await refreshUser();
      } catch {
        // Non-fatal: the save itself succeeded.
      }
      toast.success(response?.data?.message || 'Profile updated successfully');
    } catch (error) {
      const serverMessage = error.response?.data?.message;
      if (serverMessage && typeof serverMessage === 'string') {
        toast.error(serverMessage);
      } else {
        toast.error('Failed to update profile');
      }
      const serverErrors = error.response?.data?.errors;
      if (Array.isArray(serverErrors) && serverErrors.length > 0) {
        const fieldErrors = {};
        serverErrors.forEach((err) => {
          if (err?.field) fieldErrors[err.field] = err.message;
        });
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
      // Keep unsaved form data intact on failure.
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    if (!avatarUploading) fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    // Reset the input value so selecting the same file again still works.
    e.target.value = '';
    if (!file) return;

    if (!env.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please select a JPG, PNG or WebP image');
      return;
    }
    if (file.size > env.MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${env.MAX_FILE_SIZE_MB}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => toast.error('Could not read the selected image');
    reader.onload = async () => {
      setAvatarUploading(true);
      try {
        const response = await updateMyProviderProfile({ avatar: reader.result });
        const updatedUser = response?.data?.data?.user;
        if (updatedUser?.avatar) {
          setAvatarUrl(updatedUser.avatar);
        }
        try {
          await refreshUser();
        } catch {
          // Non-fatal.
        }
        toast.success(response?.data?.message || 'Profile photo updated');
      } catch (error) {
        const serverMessage = error.response?.data?.message;
        toast.error(
          typeof serverMessage === 'string' ? serverMessage : 'Failed to upload photo. Please try again.'
        );
      } finally {
        setAvatarUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-500 dark:text-gray-400">Loading profile...</span>
      </div>
    );
  }

  const avatarSummary = summarizeAvailability(availability);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">My Profile</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Manage your professional profile and public information
          </p>
        </div>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="p-6 text-center">
            <div className="relative inline-block">
              <Avatar
                src={avatarUrl || authUser?.avatar}
                name={form.businessName || authUser?.name || 'P'}
                size="xl"
              />
              <button
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleAvatarClick}
                type="button"
                disabled={avatarUploading}
                aria-label="Change profile photo"
              >
                {avatarUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <h2 className="mt-4 text-xl font-bold text-ink-light dark:text-ink-dark">
              {form.businessName || authUser?.name || 'Your Business'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {form.category || 'Service Provider'}
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span className="font-medium text-ink-light dark:text-ink-dark">
                {providerRating ? providerRating.toFixed(1) : '0.0'}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({providerReviewCount || 0} {providerReviewCount === 1 ? 'review' : 'reviews'})
              </span>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {form.category && <Badge variant="primary">{form.category}</Badge>}
            </div>
            <div className="mt-6 space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <MapPin className="h-4 w-4 text-gray-400" />
                {form.area || '--'}, {form.city || '--'}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <Phone className="h-4 w-4 text-gray-400" />
                {form.phone || '--'}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <Mail className="h-4 w-4 text-gray-400" />
                {form.email || '--'}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <IndianRupee className="h-4 w-4 text-gray-400" />
                <span>Base price:</span>
                <span className="font-medium text-ink-light dark:text-ink-dark">
                  {form.basePrice ? `₹${form.basePrice}` : '--'}
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                <Clock className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <span>
                  {avatarSummary.dayRanges.length === 0 ? (
                    'Availability not set yet - manage it from the Availability page.'
                  ) : (
                    <div className="space-y-1">
                      {avatarSummary.dayRanges.map((d) => (
                        <div key={d.key} className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-medium text-ink-light dark:text-ink-dark w-10">{d.short}</span>
                          {d.enabled && d.ranges.length > 0 ? (
                            <span>
                              {d.ranges.map((r, i) => (
                                <span key={i}>
                                  {i > 0 && <span className="text-gray-400"> / </span>}
                                  {formatTime12h(r.startTime)} - {formatTime12h(r.endTime)}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-gray-400">Unavailable</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Edit Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="p-6">
            <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-6">
              Professional Information
            </h2>
            <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Business Name"
                name="businessName"
                value={form.businessName}
                onChange={handleChange}
                error={errors.businessName}
                required
              />
              <div>
                <label className="label">Category</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  className={`input ${errors.category ? 'border-danger-500 focus:ring-danger-500' : ''}`}
                >
                  <option value="">Select primary category</option>
                  {form.category &&
                    !categories.some((cat) => cat.name === form.category) && (
                      <option value={form.category}>{form.category}</option>
                    )}
                  {categories.map((cat) => (
                    <option key={cat._id || cat.slug || cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  Your main type of work. Individual services are managed under My Services.
                </p>
                {errors.category && (
                  <p className="mt-1.5 text-sm text-danger-600 dark:text-danger-400">
                    {errors.category}
                  </p>
                )}
              </div>
              <Input
                label="Phone Number"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                disabled
              />
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                error={errors.email}
              />
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                  Business Location (State, District, City)
                </label>
                <LocationCascade
                  value={locationData}
                  onChange={(val) => {
                    setLocationData(val);
                    if (val.city) {
                      setForm((prev) => ({ ...prev, city: val.city }));
                    }
                  }}
                />
              </div>
              <Input
                label="Service Area"
                name="area"
                value={form.area}
                onChange={handleChange}
                error={errors.area}
                required
              />
              <Input
                label="Years of Experience"
                name="experience"
                type="number"
                min="0"
                value={form.experience}
                onChange={handleChange}
                error={errors.experience}
              />
              <Input
                label="Base Price (₹)"
                name="basePrice"
                type="number"
                min="0"
                value={form.basePrice}
                onChange={handleChange}
                error={errors.basePrice}
                required
              />
              <div className="sm:col-span-2">
                <div className="rounded-xl border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarClock className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    <h3 className="text-sm font-semibold text-ink-light dark:text-ink-dark">
                      Working Availability
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {avatarSummary.dayRanges.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No availability configured yet.</p>
                    ) : (
                      avatarSummary.dayRanges.map((d) => (
                        <div key={d.key} className="flex items-baseline gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-medium text-ink-light dark:text-ink-dark w-16">{d.label}</span>
                          {d.enabled && d.ranges.length > 0 ? (
                            <span>
                              {d.ranges.map((r, i) => (
                                <span key={i}>
                                  {i > 0 && <span className="text-gray-400"> / </span>}
                                  {formatTime12h(r.startTime)} - {formatTime12h(r.endTime)}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-gray-400">Unavailable</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-3">
                    <Link
                      to="/provider/availability"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      Manage Availability
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label="Bio / Description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe your services, experience and specialties..."
                  error={errors.description}
                />
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default ProviderProfilePage;