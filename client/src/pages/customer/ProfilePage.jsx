import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Camera,
  Loader2,
  Calendar,
  BadgeCheck,
  ShieldCheck,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import { updateMyProfile } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import env from '../../config/env';

export function ProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
  });
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authUser) {
      setFormData({
        name: authUser.name || '',
        email: authUser.email || '',
        phone: authUser.phone || '',
        location: authUser.address || authUser.location || '',
      });
    }
    setLoading(false);
  }, [authUser]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await updateMyProfile({
        name: formData.name,
        email: formData.email,
        location: formData.location,
      });
      toast.success(response?.data?.message || 'Profile updated successfully');
      await refreshUser();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const user = authUser || {};

  const formatMemberSince = () => {
    if (!user.createdAt) return 'N/A';
    const date = new Date(user.createdAt);
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
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
        const response = await updateMyProfile({ avatar: reader.result });
        toast.success(response?.data?.message || 'Profile photo updated');
        await refreshUser();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">My Profile</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Manage your personal information and account settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-6 text-center">
              <div className="relative inline-block">
                <Avatar src={user.avatar} name={user.name || 'U'} size="xl" />
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-primary-600 text-white shadow-md hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="Change profile photo"
                  disabled={avatarUploading}
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
              <h2 className="mt-4 text-lg font-bold text-ink-light dark:text-ink-dark">
                {user.name}
              </h2>
              {user.status === 'active' && (
                <div className="mt-1 flex items-center justify-center gap-1">
                  <Badge variant="success" className="flex items-center gap-1">
                    <BadgeCheck className="h-3 w-3" /> Active
                  </Badge>
                </div>
              )}
              <div className="mt-4 space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <p className="flex items-center justify-center gap-2">
                  <Phone className="h-4 w-4" /> {user.phone}
                </p>
                <p className="flex items-center justify-center gap-2">
                  <Mail className="h-4 w-4" /> {user.email}
                </p>
                <p className="flex items-center justify-center gap-2">
                  <MapPin className="h-4 w-4" /> {formData.location || user.address || 'Not set'}
                </p>
                <p className="flex items-center justify-center gap-2">
                  <Calendar className="h-4 w-4" /> Member since {formatMemberSince()}
                </p>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Edit Profile Form */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="p-6">
              <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-6">
                Personal Information
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="pl-10"
                        disabled
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Phone number cannot be changed
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-6 mt-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-success-100 dark:bg-success-900/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-success-600 dark:text-success-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink-light dark:text-ink-dark">
                    Account Security
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Your account is protected with phone verification and secure password.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="success">Phone Registered</Badge>
                    {user.email && <Badge variant="primary">Email Registered</Badge>}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;