import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Camera,
  CalendarClock,
  Clock3,
  ArrowRight,
  IndianRupee,
  MapPin,
  Phone,
  Mail,
  Save,
  Star,
  Loader2,
  Pencil,
  UserRound,
  Wrench,
  FileText,
  CreditCard,
  Settings,
  LockKeyhole,
  Bell,
  ShieldCheck,
  LogOut,
  BriefcaseBusiness,
  CheckCircle2,
} from 'lucide-react';

import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Badge from '../../components/ui/Badge';
import {
  getMyProviderProfile,
  updateMyProviderProfile,
} from '../../services/providerService';
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

const tabItems = [
  { id: 'personal', label: 'Personal Info', icon: UserRound },
  { id: 'services', label: 'Service Details', icon: Wrench },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'payouts', label: 'Bank & Payouts', icon: CreditCard },
];

export function ProviderProfilePage() {
  const { user: authUser, refreshUser } = useAuth();

  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

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
    country: 'India',
    state: '',
    district: '',
    city: '',
    countryId: '',
    stateId: '',
    districtId: '',
    cityId: '',
  });

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
  const [activeTab, setActiveTab] = useState('personal');

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
      // Category list is only a convenience for the profile form.
    }
  };

  const applyProvider = (provider = {}) => {
    setProviderRating(provider.rating ?? null);
    setProviderReviewCount(provider.reviewCount ?? 0);

    setForm({
      businessName: provider.businessName || '',
      description: provider.description || '',
      category: provider.category || '',
      experience:
        provider.experience != null ? String(provider.experience) : '',
      city: provider.location?.city || '',
      area: provider.location?.address || '',
      basePrice:
        provider.pricing?.basePrice != null
          ? String(provider.pricing.basePrice)
          : '',
      phone: provider.userId?.phone || authUser?.phone || '',
      email: provider.userId?.email || authUser?.email || '',
    });

    setLocationData({
      country: provider.location?.country || 'India',
      state: provider.location?.state || '',
      district: provider.location?.district || '',
      city: provider.location?.city || '',
      countryId: provider.location?.countryId || '',
      stateId: provider.location?.stateId || '',
      districtId: provider.location?.districtId || '',
      cityId: provider.location?.cityId || '',
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile.');

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

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const errs = {};
    const experienceNum =
      form.experience === '' ? null : Number(form.experience);
    const basePriceNum =
      form.basePrice === '' ? null : Number(form.basePrice);

    if (!form.businessName.trim()) {
      errs.businessName = 'Business name is required';
    } else if (form.businessName.trim().length < 2) {
      errs.businessName = 'Business name must be at least 2 characters';
    } else if (form.businessName.trim().length > 100) {
      errs.businessName = 'Business name cannot exceed 100 characters';
    }

    if (!form.category.trim()) {
      errs.category = 'Category is required';
    }

    if (
      form.email.trim() &&
      !/^\S+@\S+\.\S+$/.test(form.email.trim())
    ) {
      errs.email = 'Please enter a valid email address';
    }

    if (!form.city.trim()) {
      errs.city = 'City is required';
    }

    if (!form.area.trim()) {
      errs.area = 'Service area is required';
    }

    if (
      experienceNum !== null &&
      (Number.isNaN(experienceNum) || experienceNum < 0)
    ) {
      errs.experience = 'Experience must be a number 0 or greater';
    }

    if (
      basePriceNum === null ||
      Number.isNaN(basePriceNum) ||
      basePriceNum < 0
    ) {
      errs.basePrice = 'Base price is required and must be 0 or greater';
    }

    if (form.description.length > 1000) {
      errs.description = 'Description cannot exceed 1000 characters';
    }

    return errs;
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (saving) return;

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
          basePrice:
            form.basePrice !== '' ? Number(form.basePrice) : undefined,
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

        if (updatedUser.avatar) {
          setAvatarUrl(updatedUser.avatar);
        }
      }

      try {
        await refreshUser();
      } catch {
        // Non-fatal.
      }

      toast.success(
        response?.data?.message || 'Profile updated successfully'
      );
    } catch (err) {
      const serverMessage = err.response?.data?.message;

      toast.error(
        typeof serverMessage === 'string'
          ? serverMessage
          : 'Failed to update profile'
      );

      const serverErrors = err.response?.data?.errors;

      if (Array.isArray(serverErrors) && serverErrors.length > 0) {
        const fieldErrors = {};

        serverErrors.forEach((item) => {
          if (item?.field) {
            fieldErrors[item.field] = item.message;
          }
        });

        setErrors((prev) => ({
          ...prev,
          ...fieldErrors,
        }));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    if (!avatarUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    if (!env.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please select a JPG, PNG or WebP image');
      return;
    }

    if (file.size > env.MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(
        `Image must be smaller than ${env.MAX_FILE_SIZE_MB}MB`
      );
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      toast.error('Could not read the selected image');
    };

    reader.onload = async () => {
      setAvatarUploading(true);

      try {
        const response = await updateMyProviderProfile({
          avatar: reader.result,
        });

        const updatedUser = response?.data?.data?.user;

        if (updatedUser?.avatar) {
          setAvatarUrl(updatedUser.avatar);
        }

        try {
          await refreshUser();
        } catch {
          // Non-fatal.
        }

        toast.success(
          response?.data?.message || 'Profile photo updated'
        );
      } catch (err) {
        const serverMessage = err.response?.data?.message;

        toast.error(
          typeof serverMessage === 'string'
            ? serverMessage
            : 'Failed to upload photo. Please try again.'
        );
      } finally {
        setAvatarUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const scrollToEditor = () => {
    editorRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleTabClick = (id) => {
    setActiveTab(id);

    if (id === 'personal') {
      scrollToEditor();
      return;
    }

    if (id === 'services') {
      window.location.href = '/provider/services';
      return;
    }

    if (id === 'payouts') {
      window.location.href = '/provider/payouts';
      return;
    }

    toast('Documents section is available from your provider workspace.');
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-500">
          Loading profile...
        </span>
      </div>
    );
  }

  if (error && !form.businessName && !authUser) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
        {error}
      </div>
    );
  }

  const availabilitySummary = summarizeAvailability(availability);

  const displayName =
    form.businessName || authUser?.name || 'Your Business';

  const displayCategory =
    form.category || 'Service Provider';

  const displayLocation = [
    form.area,
    form.city,
    locationData.district,
    locationData.state,
  ]
    .filter(Boolean)
    .filter(
      (value, index, arr) => arr.indexOf(value) === index
    )
    .join(', ');

  return (
    <div className="min-h-full bg-slate-50/60 pb-10 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-7xl space-y-5 px-3 py-4 sm:px-5 sm:py-6 lg:px-8">

        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              My Profile
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
              Manage your account and settings
            </p>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
              <Settings className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Profile Hero */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="p-4 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">

              {/* Avatar */}
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="relative shrink-0">
                  <div className="rounded-full bg-slate-100 p-1.5 dark:bg-slate-800">
                    <Avatar
                      src={avatarUrl || authUser?.avatar}
                      name={displayName}
                      size="xl"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={avatarUploading}
                    className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-emerald-600 text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-900"
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

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-xl font-extrabold text-slate-950 dark:text-white sm:text-2xl">
                      {displayName}
                    </h2>

                    <Badge variant="success">
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Verified
                    </Badge>
                  </div>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {displayCategory}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((item) => (
                        <Star
                          key={item}
                          className={`h-4 w-4 ${
                            providerRating && item <= Math.round(providerRating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>

                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {providerRating
                        ? providerRating.toFixed(1)
                        : '0.0'}
                    </span>

                    <span className="text-sm text-slate-400">
                      ({providerReviewCount || 0} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact + Edit */}
              <div className="flex-1 lg:pl-2">
                <div className="grid grid-cols-1 gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="truncate">{form.phone || '--'}</span>
                  </div>

                  <div className="flex min-w-0 items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="truncate">
                      {displayLocation || '--'}
                    </span>
                  </div>

                  <div className="flex min-w-0 items-center gap-2 sm:col-span-2">
                    <Mail className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="truncate">{form.email || '--'}</span>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={scrollToEditor}
                className="shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="px-3 py-4 text-center">
                <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">
                  {form.experience || '0'}+
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-500 sm:text-xs">
                  Years Experience
                </div>
              </div>

              <div className="border-x border-emerald-100 px-3 py-4 text-center dark:border-emerald-900/40">
                <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">
                  {providerRating
                    ? providerRating.toFixed(1)
                    : '0.0'}
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-500 sm:text-xs">
                  Rating
                </div>
              </div>

              <div className="px-3 py-4 text-center">
                <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">
                  {providerReviewCount || 0}
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-500 sm:text-xs">
                  Reviews
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Profile Navigation */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-max gap-1">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* About Me */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-950 dark:text-white">
                  About Me
                </h2>
                <p className="text-xs text-slate-400">
                  Your professional introduction
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={scrollToEditor}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          </div>

          <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            {form.description ||
              'Add a short professional introduction describing your experience, services and specialties.'}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {form.category && (
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                {form.category}
              </span>
            )}

            {form.experience && (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {form.experience}+ years experience
              </span>
            )}

            {form.basePrice && (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                From ₹{form.basePrice}
              </span>
            )}
          </div>
        </motion.section>

        {/* Skills */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <h2 className="font-extrabold text-slate-950 dark:text-white">
                My Skills
              </h2>
            </div>

            <button
              type="button"
              onClick={scrollToEditor}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {form.category ? (
              <span className="rounded-full bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                {form.category}
              </span>
            ) : (
              <span className="text-sm text-slate-400">
                No skills added yet.
              </span>
            )}
          </div>
        </motion.section>

        {/* Service Area + Working Hours */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* Service Area */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between p-5 pb-3 sm:p-6 sm:pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <MapPin className="h-5 w-5" />
                </div>
                <h2 className="font-extrabold text-slate-950 dark:text-white">
                  Service Area
                </h2>
              </div>

              <button
                type="button"
                onClick={scrollToEditor}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            </div>

            <div className="mx-5 h-36 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-slate-100 to-emerald-100 dark:mx-6 dark:from-emerald-950/30 dark:via-slate-800 dark:to-emerald-950/20">
              <div className="flex h-full items-center justify-center">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-8 ring-emerald-500/5">
                  <MapPin className="h-10 w-10 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <p className="text-sm font-semibold leading-6 text-slate-800 dark:text-slate-200">
                {displayLocation || 'Service area not configured'}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Your customers can find you within this service area.
              </p>
            </div>
          </motion.section>

          {/* Working Hours */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Clock3 className="h-5 w-5" />
                </div>
                <h2 className="font-extrabold text-slate-950 dark:text-white">
                  Working Hours
                </h2>
              </div>

              <Link
                to="/provider/availability"
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>
            </div>

            <div className="mt-5 space-y-2.5">
              {availabilitySummary.dayRanges.map((day) => (
                <div
                  key={day.key}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="w-12 font-semibold text-slate-700 dark:text-slate-300">
                    {day.short}
                  </span>

                  {day.enabled && day.ranges.length > 0 ? (
                    <span className="flex-1 text-right text-slate-500 dark:text-slate-400">
                      {day.ranges.map((range, index) => (
                        <span key={index}>
                          {index > 0 && ' / '}
                          {formatTime12h(range.startTime)} -{' '}
                          {formatTime12h(range.endTime)}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="flex-1 text-right font-medium text-red-500">
                      Closed
                    </span>
                  )}
                </div>
              ))}
            </div>

            <Link
              to="/provider/availability"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
            >
              Manage Availability
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.section>
        </div>

        {/* Account Settings */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-950 dark:text-white">
                Account Settings
              </h2>
              <p className="text-xs text-slate-400">
                Manage your account preferences
              </p>
            </div>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex items-center gap-3 py-4">
              <LockKeyhole className="h-5 w-5 text-slate-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Change Password
                </p>
                <p className="text-xs text-slate-400">
                  Update your account password
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>

            <div className="flex items-center gap-3 py-4">
              <Bell className="h-5 w-5 text-slate-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Notifications
                </p>
                <p className="text-xs text-slate-400">
                  Manage your notification preferences
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>

            <div className="flex items-center gap-3 py-4">
              <ShieldCheck className="h-5 w-5 text-slate-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Privacy & Security
                </p>
                <p className="text-xs text-slate-400">
                  Review your account security settings
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </motion.section>

        {/* Editor */}
        <motion.div
          ref={editorRef}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="scroll-mt-6"
        >
          <Card className="overflow-hidden rounded-3xl border border-slate-200 p-0 shadow-sm dark:border-slate-800">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-5 dark:border-slate-800 dark:bg-slate-900/60 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">
                    Edit Professional Information
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Update the information customers see on your provider profile.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="hidden sm:inline-flex"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>

            <form
              onSubmit={handleSave}
              className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6"
            >
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
                  className={`input ${
                    errors.category
                      ? 'border-danger-500 focus:ring-danger-500'
                      : ''
                  }`}
                >
                  <option value="">Select primary category</option>

                  {form.category &&
                    !categories.some(
                      (cat) => cat.name === form.category
                    ) && (
                      <option value={form.category}>
                        {form.category}
                      </option>
                    )}

                  {categories.map((cat) => (
                    <option
                      key={cat._id || cat.slug || cat.name}
                      value={cat.name}
                    >
                      {cat.name}
                    </option>
                  ))}
                </select>

                {errors.category && (
                  <p className="mt-1.5 text-sm text-danger-600">
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
                <label className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-200">
                  Business Location
                </label>

                <LocationCascade
                  value={locationData}
                  onChange={(value) => {
                    setLocationData(value);

                    if (value.city) {
                      setForm((prev) => ({
                        ...prev,
                        city: value.city,
                      }));
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="mb-3 flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Working Availability
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {availabilitySummary.dayRanges.map((day) => (
                      <div
                        key={day.key}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="w-16 font-semibold text-slate-800 dark:text-slate-200">
                          {day.label}
                        </span>

                        {day.enabled && day.ranges.length > 0 ? (
                          <span className="text-slate-500 dark:text-slate-400">
                            {day.ranges.map((range, index) => (
                              <span key={index}>
                                {index > 0 && ' / '}
                                {formatTime12h(range.startTime)} -{' '}
                                {formatTime12h(range.endTime)}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            Unavailable
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <Link
                    to="/provider/availability"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    Manage Availability
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="sm:col-span-2">
                <Textarea
                  label="Bio / Description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Describe your services, experience and specialties..."
                  error={errors.description}
                />
              </div>

              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:hidden"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* Existing availability summary */}
        <div className="hidden">
          <IndianRupee />
          <Clock3 />
          <LogOut />
        </div>
      </div>
    </div>
  );
}

export default ProviderProfilePage;
