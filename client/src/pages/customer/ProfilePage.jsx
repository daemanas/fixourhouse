import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Bell,
  Settings,
  Camera,
  Pencil,
  Phone,
  MapPin,
  ChevronRight,
  CalendarCheck,
  Heart,
  User,
  Clock,
  Star,
  MessageSquareWarning,
  ShieldCheck,
  LogOut,
  Loader2,
  Mail,
  AlertCircle,
  Lock,
} from 'lucide-react';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LocationCascade from '../../components/common/LocationCascade';
import { updateMyProfile, getWishlist } from '../../services/userService';
import { getMyBookings } from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import env from '../../config/env';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user: authUser, refreshUser, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const fileInputRef = useRef(null);

  const [bookingCount, setBookingCount] = useState(0);
  const [savedProvidersCount, setSavedProvidersCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // Edit Profile Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
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
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (authUser) {
      setFormData({
        name: authUser.name || '',
        email: authUser.email || '',
        phone: authUser.phone || '',
        location: authUser.location || authUser.address || '',
      });
      if (authUser.locationData) {
        setLocationData(authUser.locationData);
      }
    }
  }, [authUser]);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const [bookingsRes, wishlistRes] = await Promise.allSettled([
          getMyBookings({ limit: 1 }),
          getWishlist(),
        ]);

        if (isMounted) {
          if (bookingsRes.status === 'fulfilled') {
            const total =
              bookingsRes.value?.data?.data?.pagination?.total ??
              bookingsRes.value?.data?.data?.bookings?.length ??
              0;
            setBookingCount(total);
          }
          if (wishlistRes.status === 'fulfilled') {
            const list = wishlistRes.value?.data?.data?.wishlist || [];
            setSavedProvidersCount(list.length);
          }
        }
      } catch (error) {
        console.error('Error fetching customer stats:', error);
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAvatarClick = () => {
    if (!avatarUploading) fileInputRef.current?.click();
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
      toast.error(`Image must be smaller than ${env.MAX_FILE_SIZE_MB}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => toast.error('Could not read the selected image');
    reader.onload = async () => {
      setAvatarUploading(true);
      try {
        const response = await updateMyProfile({ avatar: reader.result });
        toast.success(response?.data?.message || 'Profile photo updated');
        await refreshUser();
      } catch (error) {
        const serverMessage = error.response?.data?.message;
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

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formattedLoc =
        [locationData.city, locationData.district, locationData.state]
          .filter(Boolean)
          .join(', ') || formData.location;

      const response = await updateMyProfile({
        name: formData.name,
        email: formData.email,
        location: formattedLoc,
        locationData,
      });

      const updatedUser = response?.data?.data?.user;
      if (updatedUser) {
        setFormData({
          name: updatedUser.name || '',
          email: updatedUser.email || '',
          phone: updatedUser.phone || '',
          location: updatedUser.location || '',
        });
        if (updatedUser.locationData) {
          setLocationData(updatedUser.locationData);
        }
      }
      toast.success(response?.data?.message || 'Profile updated successfully');
      await refreshUser();
      setShowEditModal(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const user = authUser || {};

  const menuItems = [
    {
      id: 'personal-info',
      icon: User,
      iconColor: 'text-slate-800 dark:text-slate-200',
      title: 'Personal Information',
      description: 'Name, phone number, email',
      onClick: () => setShowEditModal(true),
    },
    {
      id: 'addresses',
      icon: MapPin,
      iconColor: 'text-slate-800 dark:text-slate-200',
      title: 'Addresses',
      description: 'Manage your saved addresses',
      onClick: () => navigate('/customer/settings'),
    },
    {
      id: 'saved-providers',
      icon: Heart,
      iconColor: 'text-red-500',
      title: 'Saved Providers',
      description: 'View and manage your favourite providers',
      onClick: () => navigate('/customer/wishlist'),
    },
    {
      id: 'booking-history',
      icon: Clock,
      iconColor: 'text-slate-800 dark:text-slate-200',
      title: 'Booking History',
      description: 'View all your past and upcoming bookings',
      onClick: () => navigate('/customer/bookings'),
    },
    {
      id: 'my-reviews',
      icon: Star,
      iconColor: 'text-amber-500',
      title: 'My Reviews',
      description: "Ratings and reviews you've given",
      onClick: () => navigate('/customer/bookings'),
    },
    {
      id: 'my-complaints',
      icon: MessageSquareWarning,
      iconColor: 'text-slate-800 dark:text-slate-200',
      title: 'My Complaints',
      description: 'View, track and manage your complaints',
      onClick: () => navigate('/customer/complaints'),
    },
    {
      id: 'privacy-security',
      icon: ShieldCheck,
      iconColor: 'text-slate-800 dark:text-slate-200',
      title: 'Privacy & Security',
      description: 'Manage your data and security settings',
      onClick: () => navigate('/customer/settings'),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 px-2 sm:px-4">
      {/* 1. PAGE HEADER */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-slate-800 dark:text-slate-200 cursor-pointer"
            aria-label="Go back"
          >
            <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            My Profile
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/customer/notifications')}
            className="relative p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900" />
            )}
          </button>

          <button
            onClick={() => navigate('/customer/settings')}
            className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 2. PROFILE SUMMARY CARD */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-b from-[#e8f6f0] via-[#f3faf7] to-white dark:from-emerald-950/25 dark:via-gray-900 dark:to-gray-900 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-5 w-full sm:w-auto">
            {/* 3. PROFILE IMAGE & CAMERA OVERLAY */}
            <div className="relative shrink-0">
              <Avatar
                src={user.avatar}
                name={user.name || 'User'}
                size="xl"
                className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-white dark:ring-gray-800 shadow-sm"
              />
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={avatarUploading}
                aria-label="Upload profile photo"
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700 transition-transform hover:scale-105 disabled:opacity-60 cursor-pointer"
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

            {/* Customer Details */}
            <div className="space-y-1.5 min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                {user.name || 'Customer'}
              </h2>

              {user.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{user.phone}</span>
                </div>
              )}

              {/* Fix Location UX Display */}
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="group flex items-start gap-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left cursor-pointer bg-emerald-50/50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-xl border border-emerald-100/60 dark:border-emerald-900/40 w-fit max-w-full"
              >
                <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="line-clamp-1 font-medium">
                  {user.location || user.address || 'Set location'}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* 4. EDIT PROFILE BUTTON */}
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="self-end sm:self-center shrink-0 rounded-full border border-emerald-600 bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 px-4 py-1.5 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        </div>

        {/* STATISTICS SECTION */}
        <div className="grid grid-cols-2 pt-4 border-t border-emerald-100/80 dark:border-emerald-900/30">
          {/* Total Bookings */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 pr-3 sm:pr-6">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                {loadingStats ? '...' : bookingCount}
              </div>
              <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                Total Bookings
              </div>
            </div>
          </div>

          {/* Saved Providers */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 pl-3 sm:pl-6 border-l border-emerald-200/60 dark:border-emerald-900/40">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0">
              <Heart className="h-7 w-7 text-red-500 fill-red-500" />
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                {loadingStats ? '...' : savedProvidersCount}
              </div>
              <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                Saved Providers
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 5. QUICK ACTIONS */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-3 sm:p-5 shadow-sm"
      >
        <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 text-center">
          {/* My Addresses */}
          <button
            type="button"
            onClick={() => navigate('/customer/settings')}
            className="flex flex-col items-center p-2 sm:p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
          >
            <div className="h-12 w-12 rounded-2xl bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <MapPin className="h-6 w-6" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
              My Addresses
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 hidden sm:inline">
              Home, Work etc.
            </span>
          </button>

          {/* My Complaints */}
          <button
            type="button"
            onClick={() => navigate('/customer/complaints')}
            className="flex flex-col items-center p-2 sm:p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
          >
            <div className="h-12 w-12 rounded-2xl bg-red-100/80 dark:bg-red-950/60 text-red-500 dark:text-red-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <AlertCircle className="h-6 w-6" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-500 transition-colors">
              My Complaints
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 hidden sm:inline">
              View & Manage
            </span>
          </button>

          {/* Saved Providers */}
          <button
            type="button"
            onClick={() => navigate('/customer/wishlist')}
            className="flex flex-col items-center p-2 sm:p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
          >
            <div className="h-12 w-12 rounded-2xl bg-amber-100/80 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Heart className="h-6 w-6" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
              Saved Providers
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 hidden sm:inline">
              View & Manage
            </span>
          </button>
        </div>
      </motion.div>

      {/* 6. PROFILE MENU */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-2 sm:p-3 shadow-sm divide-y divide-gray-100 dark:divide-gray-800/60"
      >
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <div
              key={item.id}
              onClick={item.onClick}
              className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-gray-800/50 rounded-2xl transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                <IconComponent className={`h-5 w-5 sm:h-6 sm:w-6 shrink-0 ${item.iconColor}`} />
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-emerald-600 transition-colors">
                    {item.title}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    {item.description}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 shrink-0 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
            </div>
          );
        })}
      </motion.div>

      {/* 8. LOGOUT */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <button
          type="button"
          onClick={handleLogout}
          className="w-full bg-red-50/90 hover:bg-red-100/90 dark:bg-red-950/35 dark:hover:bg-red-950/60 border border-red-100 dark:border-red-900/40 rounded-2xl p-4 sm:p-4.5 flex items-center justify-between text-red-600 dark:text-red-400 font-bold transition-colors shadow-sm cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <LogOut className="h-5 w-5 stroke-[2.5]" />
            <span className="text-base">Logout</span>
          </div>
          <ChevronRight className="h-5 w-5 stroke-[2.5]" />
        </button>
      </motion.div>

      {/* EDIT PROFILE MODAL (REDEFINED UI/UX) */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Profile"
        subtitle="Update your personal details and location"
        size="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-5 pt-1">
          {/* Form Fields Wrapper */}
          <div className="space-y-4">
            {/* Full Name Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="pl-10 h-11 bg-slate-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 rounded-xl transition-all"
                  placeholder="Enter full name"
                  required
                />
              </div>
            </div>

            {/* Email Address Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="pl-10 h-11 bg-slate-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 rounded-xl transition-all"
                  placeholder="yourname@domain.com"
                  required
                />
              </div>
            </div>

            {/* Phone Number Field (Disabled State Redesigned) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Phone Number
                </label>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Non-editable
                </span>
              </div>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  name="phone"
                  value={formData.phone}
                  className="pl-10 h-11 bg-slate-100 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-slate-500 dark:text-slate-400 cursor-not-allowed rounded-xl"
                  disabled
                />
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Location Details
              </label>
              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-gray-800/40 border border-slate-200/80 dark:border-gray-700/60 space-y-3">
                <LocationCascade
                  value={locationData}
                  onChange={setLocationData}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditModal(false)}
              className="px-5 rounded-xl border-gray-200 dark:border-gray-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={saving}
              className="px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ProfilePage;