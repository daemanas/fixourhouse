import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowUpDown,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Ellipsis,
  ImageOff,
  IndianRupee,
  Loader2,
  PauseCircle,
  Pencil,
  Plus,
  Search,
  Save,
  Star,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Modal from '../../components/ui/Modal';
import ImageUploadField from '../../components/ui/ImageUploadField';
import {
  getMyProviderProfile,
  getProviderStats,
  addService,
  updateService,
  deleteService,
} from '../../services/providerService';

import { getServiceTypes } from '../../services/serviceTypeService';
import { getCategories } from '../../services/categoryService';
import resolveAssetUrl from '../../utils/assetUrl';

const getServiceStatus = (service) => service.isActive === false ? 'inactive' : 'active';

const getCategoryName = (service, categories) => {
  const categoryValue = service.serviceCategoryId || service.categoryId;
  if (typeof categoryValue === 'object') return categoryValue?.name || '';
  return categories.find((category) => String(category._id) === String(categoryValue))?.name || '';
};

const formatDuration = (service) => {
  const minutes = Number(service.durationMinutes ?? service.duration);
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr${hours === 1 ? '' : 's'}`;
};

function ServiceCover({ service }) {
  const [failed, setFailed] = useState(false);
  const source = service.primaryImage || service.image || service.images?.[0] || '';
  const image = source ? resolveAssetUrl(source) : '';

  return image && !failed ? (
    <img
      src={image}
      alt={service.name || 'Service'}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  ) : (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
      {failed ? <ImageOff className="h-8 w-8" aria-hidden="true" /> : <Wrench className="h-9 w-9" aria-hidden="true" />}
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">LocalFix</span>
    </div>
  );
}

export function ServicesPage() {
  const [services, setServices] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('latest');
  const [openMenuId, setOpenMenuId] = useState(null);

  // File state for Add form and Edit form (File object or null)
  const [newImageFile, setNewImageFile] = useState(null);
  const [editImageFile, setEditImageFile] = useState(null);

  const [newService, setNewService] = useState({
    name: '',
    startingPrice: '',
    durationMinutes: '',
    discountPercentage: '0',
    description: '',
    serviceTypeId: '',
    serviceCategoryId: '',
  });

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, typeRes, catRes, statsRes] = await Promise.all([
        getMyProviderProfile(),
        getServiceTypes(),
        getCategories(),
        getProviderStats(),
      ]);

      const provider = res?.data?.data?.provider || {};
      const stats = statsRes?.data?.data?.stats || {};

      // The provider profile endpoint returns services, but the dashboard
      // rating is calculated by /providers/me/stats from real Review data.
      // Attach that real provider rating to each service only when the
      // service itself does not already have a rating.
      const providerRating = Number(stats.avgRating || provider.rating || 0);
      const providerReviewCount = Number(
        stats.totalReviews ?? provider.reviewCount ?? 0
      );

      const normalizedServices = (provider.services || []).map((service) => {
        const serviceRating = Number(service.rating || 0);
        const serviceReviewCount = Number(service.reviewCount || 0);

        return {
          ...service,
          rating: serviceRating > 0 ? serviceRating : providerRating,
          reviewCount:
            serviceReviewCount > 0 ? serviceReviewCount : providerReviewCount,
        };
      });

      setServices(normalizedServices);

      const types = typeRes?.data?.data?.serviceTypes || [];
      const cats = catRes?.data?.data?.categories || [];
      setServiceTypes(types);
      setCategories(cats);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load services.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleAdd = async (e) => {
    if (e) e.preventDefault();
    if (saving) return;

    const startingPrice = Number(newService.startingPrice);
    const durationMinutes =
      newService.durationMinutes === '' ? 0 : Number(newService.durationMinutes);
    const discountPercentage =
      newService.discountPercentage === '' ? 0 : Number(newService.discountPercentage);

    if (!newService.name.trim()) {
      toast.error('Service name is required');
      return;
    }

    if (
      newService.startingPrice === '' ||
      Number.isNaN(startingPrice) ||
      startingPrice < 0
    ) {
      toast.error('Enter a valid starting price (0 or more)');
      return;
    }

    if (Number.isNaN(durationMinutes) || durationMinutes < 0) {
      toast.error('Enter a valid duration in minutes');
      return;
    }

    if (
      Number.isNaN(discountPercentage) ||
      discountPercentage < 0 ||
      discountPercentage > 100
    ) {
      toast.error('Discount must be between 0 and 100%');
      return;
    }

    if (!newService.serviceTypeId) {
      toast.error('Please select a service type');
      return;
    }

    if (!newService.serviceCategoryId) {
      toast.error('Please select a service category');
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      formData.append('name', newService.name.trim());
      formData.append('startingPrice', String(startingPrice));
      formData.append('durationMinutes', String(durationMinutes));

      // Legacy aliases kept temporarily so older provider controllers do not
      // lose the submitted price/duration while the API is being migrated.
      formData.append('price', String(startingPrice));
      formData.append('duration', String(durationMinutes));
      formData.append('discountPercentage', String(discountPercentage));
      formData.append('serviceTypeId', newService.serviceTypeId);
      formData.append('serviceCategoryId', newService.serviceCategoryId);

      if (newService.description.trim()) {
        formData.append('description', newService.description.trim());
      }

      if (newImageFile instanceof File) {
        formData.append('image', newImageFile);
      }

      await addService(formData);
      await fetchServices();
      setNewService({
        name: '',
        startingPrice: '',
        durationMinutes: '',
        discountPercentage: '0',
        description: '',
        serviceTypeId: '',
        serviceCategoryId: '',
      });
      setNewImageFile(null);
      setShowAddForm(false);
      toast.success('Service added successfully');
    } catch (err) {
      console.error('Add service error:', err?.response?.data || err);
      toast.error(err.response?.data?.message || 'Failed to add service');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service) => {
    setEditingService({
      _id: service._id,
      name: service.name || '',
      startingPrice:
        service.startingPrice != null
          ? String(service.startingPrice)
          : service.price != null
            ? String(service.price)
            : '',
      durationMinutes:
        service.durationMinutes != null
          ? String(service.durationMinutes)
          : typeof service.duration === 'number'
            ? String(service.duration)
            : '',
      discountPercentage:
        service.discountPercentage != null
          ? String(service.discountPercentage)
          : '0',
      description: service.description || '',
      serviceTypeId: service.serviceTypeId?._id || service.serviceTypeId || '',
      serviceCategoryId:
        service.serviceCategoryId?._id ||
        service.serviceCategoryId ||
        service.categoryId?._id ||
        service.categoryId ||
        '',
      existingImage: service.primaryImage || service.image || '',
      imageWasCleared: false,
    });

    setEditImageFile(null);
  };

  const handleUpdate = async (e) => {
    if (e) e.preventDefault();
    if (updating || !editingService) return;

    const startingPrice = Number(editingService.startingPrice);
    const durationMinutes =
      editingService.durationMinutes === ''
        ? 0
        : Number(editingService.durationMinutes);
    const discountPercentage =
      editingService.discountPercentage === ''
        ? 0
        : Number(editingService.discountPercentage);

    if (!editingService.name.trim()) {
      toast.error('Service name is required');
      return;
    }

    if (
      editingService.startingPrice === '' ||
      Number.isNaN(startingPrice) ||
      startingPrice < 0
    ) {
      toast.error('Enter a valid starting price (0 or more)');
      return;
    }

    if (Number.isNaN(durationMinutes) || durationMinutes < 0) {
      toast.error('Enter a valid duration in minutes');
      return;
    }

    if (
      Number.isNaN(discountPercentage) ||
      discountPercentage < 0 ||
      discountPercentage > 100
    ) {
      toast.error('Discount must be between 0 and 100%');
      return;
    }

    if (!editingService.serviceTypeId) {
      toast.error('Please select a service type');
      return;
    }

    if (!editingService.serviceCategoryId) {
      toast.error('Please select a service category');
      return;
    }

    setUpdating(true);

    try {
      const formData = new FormData();

      formData.append('name', editingService.name.trim());
      formData.append('startingPrice', String(startingPrice));
      formData.append('durationMinutes', String(durationMinutes));

      // Legacy aliases for compatibility with an older provider controller.
      formData.append('price', String(startingPrice));
      formData.append('duration', String(durationMinutes));
      formData.append('discountPercentage', String(discountPercentage));
      formData.append('serviceTypeId', editingService.serviceTypeId);
      formData.append('serviceCategoryId', editingService.serviceCategoryId);
      formData.append('description', editingService.description.trim());

      if (editImageFile instanceof File) {
        formData.append('image', editImageFile);
      } else if (editingService.imageWasCleared) {
        formData.append('image', '');
        formData.append('primaryImage', '');
      } else if (editingService.existingImage) {
        formData.append('primaryImage', editingService.existingImage);
      }

      await updateService(editingService._id, formData);
      await fetchServices();
      setEditingService(null);
      setEditImageFile(null);
      toast.success('Service updated successfully');
    } catch (err) {
      console.error('Update service error:', err?.response?.data || err);
      toast.error(err.response?.data?.message || 'Failed to update service');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmDeleteId(id);
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
  };

  const confirmDelete = async (id) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await deleteService(id);
      const provider = res?.data?.data?.provider || {};
      setServices(provider.services || []);
      setConfirmDeleteId(null);
      toast.success('Service deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete service');
    } finally {
      setDeletingId(null);
    }
  };

  const serviceCounts = {
    total: services.length,
    active: services.filter((service) => getServiceStatus(service) === 'active').length,
    paused: services.filter((service) => service.status === 'paused').length,
    inactive: services.filter((service) => getServiceStatus(service) === 'inactive').length,
  };

  const visibleServices = [...services]
    .filter((service) => {
      const status = service.status === 'paused' ? 'paused' : getServiceStatus(service);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const search = searchTerm.trim().toLocaleLowerCase();
      const categoryName = getCategoryName(service, categories);
      const matchesSearch = !search || [service.name, service.description, categoryName]
        .filter(Boolean).join(' ').toLocaleLowerCase().includes(search);
      return matchesStatus && matchesSearch;
    })
    .sort((first, second) => {
      if (sortOrder === 'oldest') return new Date(first.createdAt || 0) - new Date(second.createdAt || 0);
      if (sortOrder === 'price-asc') return Number(first.startingPrice ?? first.price ?? 0) - Number(second.startingPrice ?? second.price ?? 0);
      if (sortOrder === 'price-desc') return Number(second.startingPrice ?? second.price ?? 0) - Number(first.startingPrice ?? first.price ?? 0);
      if (sortOrder === 'rating') return Number(second.rating || 0) - Number(first.rating || 0);
      return new Date(second.createdAt || 0) - new Date(first.createdAt || 0);
    });

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Wrench}
        title="Failed to load services"
        description={error}
        action={<Button onClick={fetchServices}>Try Again</Button>}
      />
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1400px] space-y-6 overflow-x-hidden pb-8 sm:space-y-7">
      <header className="flex min-w-0 items-center gap-3">
        <Link
          to="/provider/dashboard"
          aria-label="Back to provider dashboard"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-[28px]">My Services</h1>
          <p className="truncate text-sm text-slate-500 dark:text-gray-400 sm:text-[15px]">Manage the services you provide to customers</p>
        </div>
        <Button onClick={() => setShowAddForm((prev) => !prev)} className="shrink-0 rounded-xl bg-emerald-600 px-3.5 py-2.5 shadow-sm transition hover:bg-emerald-700 hover:shadow-md sm:px-5">
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span className="hidden sm:inline">{showAddForm ? 'Cancel' : 'Add Service'}</span>
          <span className="sm:hidden">{showAddForm ? 'Cancel' : 'Add'}</span>
        </Button>
      </header>

      <section className="grid grid-cols-4 gap-2 sm:gap-4" aria-label="Service statistics">
        {[
          {
            label: 'Total Services',
            value: serviceCounts.total,
            icon: Wrench,
            color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
          },
          {
            label: 'Active',
            value: serviceCounts.active,
            icon: CheckCircle2,
            color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
          },
          {
            label: 'Paused',
            value: serviceCounts.paused,
            icon: PauseCircle,
            color: 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
          },
          {
            label: 'Inactive',
            value: serviceCounts.inactive,
            icon: Ban,
            color: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300'
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white p-2.5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:shadow-sm sm:gap-3 sm:p-3.5 dark:border-gray-800">
            {/* বামপাশে Icon */}
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${color}`}>
              <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" aria-hidden="true" />
            </span>

            {/* ডানপাশে Value এবং Label (কলাম আকারে) */}
            <div className="flex min-w-0 flex-col">
              <p className="text-base font-bold leading-none tracking-tight text-slate-950 dark:text-white sm:text-xl">{value}</p>
              <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500 dark:text-gray-400 sm:text-xs">{label}</p>
            </div>
          </Card>
        ))}
      </section>

      <section className="flex w-full items-center gap-1.5 sm:gap-3" aria-label="Search and service filters">
        {/* Search Input - 50% Width */}
        <label className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 sm:left-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search..."
            aria-label="Search your services"
            className="input h-9 w-full rounded-xl border-slate-200 bg-white pl-8 pr-2 text-xs shadow-sm placeholder:text-slate-400 sm:h-10 sm:rounded-2xl sm:pl-10 sm:text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </label>

        {/* Status Select - 25% Width */}
        <label className="relative flex h-9 w-1/4 min-w-0 items-center justify-between gap-1 rounded-xl border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 shadow-sm sm:h-10 sm:rounded-2xl sm:px-3 sm:text-sm dark:border-gray-700 dark:bg-card-dark dark:text-gray-200">
          <span className="pointer-events-none truncate">
            {statusFilter === 'all' ? 'Status' : `${statusFilter[0].toUpperCase()}${statusFilter.slice(1)}`}
          </span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter services by status"
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400 sm:h-4 sm:w-4" aria-hidden="true" />
        </label>

        {/* Sort Select - 25% Width */}
        <label className="relative flex h-9 w-1/4 min-w-0 items-center justify-between gap-1 rounded-xl border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 shadow-sm sm:h-10 sm:rounded-2xl sm:px-3 sm:text-sm dark:border-gray-700 dark:bg-card-dark dark:text-gray-200">
          <div className="flex min-w-0 items-center gap-1">
            <ArrowUpDown className="hidden h-3.5 w-3.5 shrink-0 text-gray-500 sm:block sm:h-4 sm:w-4" aria-hidden="true" />
            <span className="pointer-events-none truncate">
              {({ latest: 'Sort', oldest: 'Oldest', 'price-asc': 'Price Low', 'price-desc': 'Price High', rating: 'Rating' })[sortOrder] || 'Sort'}
            </span>
          </div>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            aria-label="Sort services"
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="price-asc">Price Low to High</option>
            <option value="price-desc">Price High to Low</option>
            <option value="rating">Rating</option>
          </select>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400 sm:h-4 sm:w-4" aria-hidden="true" />
        </label>
      </section>

      {showAddForm && (
        <Card className="p-6">
          <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-4">
            Add New Service
          </h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Service Name"
              name="name"
              value={newService.name}
              onChange={(e) => setNewService((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. AC Repair"
              required
            />
            <Input
              label="Starting Price (₹)"
              name="startingPrice"
              type="number"
              min="0"
              value={newService.startingPrice}
              onChange={(e) => setNewService((prev) => ({ ...prev, startingPrice: e.target.value }))}
              placeholder="e.g. 499"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service Type
              </label>
              <select
                value={newService.serviceTypeId}
                onChange={(e) =>
                  setNewService((prev) => ({ ...prev, serviceTypeId: e.target.value, serviceCategoryId: '' }))
                }
                className="w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select Service Type</option>
                {serviceTypes.map((st) => (
                  <option key={st._id} value={st._id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={newService.serviceCategoryId}
                onChange={(e) =>
                  setNewService((prev) => ({ ...prev, serviceCategoryId: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select Category</option>
                {categories
                  .filter(
                    (c) =>
                      !newService.serviceTypeId ||
                      c.serviceTypeId?._id === newService.serviceTypeId ||
                      c.serviceTypeId === newService.serviceTypeId
                  )
                  .map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
            <Input
              label="Duration (minutes)"
              name="durationMinutes"
              type="number"
              min="0"
              value={newService.durationMinutes}
              onChange={(e) =>
                setNewService((prev) => ({ ...prev, durationMinutes: e.target.value }))
              }
              placeholder="e.g. 60"
            />
            <Input
              label="Discount (%)"
              name="discountPercentage"
              type="number"
              min="0"
              max="100"
              value={newService.discountPercentage}
              onChange={(e) =>
                setNewService((prev) => ({ ...prev, discountPercentage: e.target.value }))
              }
              placeholder="0"
            />
            <ImageUploadField
              label="Cover Image (optional)"
              value={newImageFile}
              onChange={setNewImageFile}
              disabled={saving}
              hint="JPG, PNG or WebP · max 5 MB"
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Description"
                name="description"
                value={newService.description}
                onChange={(e) => setNewService((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Describe this service..."
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {saving ? 'Adding...' : 'Add Service'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {services.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No services yet"
          description="Add your first service to start receiving bookings."
        />
      ) : visibleServices.length === 0 ? (
        <EmptyState icon={Search} title="No matching services" description="Try another search or status filter." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
          {visibleServices.map((service, index) => {
            const status = service.status === 'paused' ? 'paused' : getServiceStatus(service);
            const statusStyle = status === 'active'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-300'
              : status === 'paused'
                ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/25 dark:text-amber-300'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-900/25 dark:text-rose-300';
            const categoryName = getCategoryName(service, categories);
            const price = service.startingPrice ?? service.price;
            const duration = formatDuration(service);
            const rating = Number(service.rating || 0);
            const reviewCount = Number(service.reviewCount || 0);
            const bookingCount = service.bookingsCount;

            return (
              <motion.div
                key={service._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2) }}
                className="min-w-0"
              >
                <Card className="group relative flex h-full min-w-0 flex-col overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">

                  {/* Cover Image */}
                  <div className="relative aspect-[16/9] overflow-hidden rounded-t-2xl bg-slate-100 dark:bg-gray-800">
                    <ServiceCover service={service} />

                    {service.popular && (
                      <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/95 px-2 py-0.5 text-[9px] font-bold text-emerald-800 shadow-sm backdrop-blur dark:bg-gray-950/90 dark:text-emerald-300 sm:px-2.5 sm:py-1 sm:text-[10px]">
                        <Star className="h-3 w-3 fill-current" aria-hidden="true" /> Featured
                      </span>
                    )}

                    <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold shadow-sm sm:px-2.5 sm:py-1 sm:text-[10px] ${statusStyle}`}>
                        {status === 'active' ? 'Active' : status === 'paused' ? 'Paused' : 'Inactive'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenMenuId(openMenuId === service._id ? null : service._id)}
                        aria-label={`More actions for ${service.name}`}
                        aria-expanded={openMenuId === service._id}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white/95 text-gray-700 shadow-sm backdrop-blur transition hover:scale-105 dark:bg-gray-900/90 dark:text-gray-200"
                      >
                        <Ellipsis className="h-4 w-4" aria-hidden="true" />
                      </button>

                      {openMenuId === service._id && (
                        <div className="absolute right-0 top-8 z-20 w-32 rounded-xl border border-gray-100 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                          <button type="button" onClick={() => { setOpenMenuId(null); handleEdit(service); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button type="button" onClick={() => { setOpenMenuId(null); handleDelete(service._id); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/20">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-2.5 sm:p-4">
                    {/* Title */}
                    <h2 className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-slate-950 dark:text-white sm:text-base">
                      {service.name}
                    </h2>

                    {/* Description */}
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-gray-400 sm:mt-1 sm:text-xs">
                      {service.description || categoryName || ''}
                    </p>

                    {/* Category Tag */}
                    {categoryName && service.description && (
                      <p className="mt-0.5 truncate text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 sm:text-[11px]">
                        {categoryName}
                      </p>
                    )}

                    {/* Stats Section - Clean Flexible Layout */}
                    <div className="mt-2.5 flex items-center justify-between gap-1 rounded-xl border border-slate-100 bg-slate-50/80 px-2 py-2 dark:border-gray-800 dark:bg-gray-800/50 sm:gap-2 sm:px-2.5">
                      {/* Price */}
                      <div className="flex min-w-0 flex-col items-center">
                        {price !== undefined && price !== null && price !== '' ? (
                          <p className="flex items-center gap-0.5 text-[11px] font-extrabold text-slate-900 dark:text-white sm:text-xs">
                            <IndianRupee className="h-3 w-3 shrink-0" />{Number(price).toLocaleString('en-IN')}
                          </p>
                        ) : (
                          <p className="text-[11px] text-gray-400">—</p>
                        )}
                        <span className="text-[8px] font-medium uppercase text-slate-400 sm:text-[9px]">Price</span>
                      </div>

                      <div className="h-4 w-px bg-slate-200/80 dark:bg-gray-700" />

                      {/* Duration */}
                      <div className="flex min-w-0 flex-col items-center">
                        {duration ? (
                          <p className="flex items-center gap-0.5 text-[11px] font-extrabold text-slate-900 dark:text-white sm:text-xs">
                            <Clock className="h-3 w-3 shrink-0 text-gray-400" />{duration}
                          </p>
                        ) : (
                          <p className="text-[11px] text-gray-400">—</p>
                        )}
                        <span className="text-[8px] font-medium uppercase text-slate-400 sm:text-[9px]">Time</span>
                      </div>

                      <div className="h-4 w-px bg-slate-200/80 dark:bg-gray-700" />

                      {/* Rating */}
                      <div className="flex min-w-0 flex-col items-center">
                        {rating > 0 ? (
                          <p className="flex items-center gap-0.5 whitespace-nowrap text-[11px] font-extrabold text-slate-900 dark:text-white sm:text-xs">
                            <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                            {rating.toFixed(1)}
                          </p>
                        ) : (
                          <p className="whitespace-nowrap text-[10px] font-semibold text-slate-400 sm:text-[11px]">
                            New
                          </p>
                        )}
                        <span className="text-[8px] font-medium uppercase text-slate-400 sm:text-[9px]">
                          Rating
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 dark:border-gray-800">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(service)}
                        disabled={deletingId === service._id}
                        className="h-8 min-h-0 flex-1 rounded-lg px-2 text-xs shadow-none"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>

                      <Link
                        to="/provider/jobs"
                        title="View Bookings"
                        className="inline-flex h-8 min-h-0 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-50 px-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/35"
                      >
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {bookingCount !== undefined ? `Jobs (${bookingCount})` : 'Jobs'}
                        </span>
                      </Link>
                    </div>

                    {/* Delete Confirmation */}
                    {confirmDeleteId === service._id && (
                      <div className="mt-2 flex items-center justify-end gap-1.5 rounded-lg bg-rose-50 p-1.5 dark:bg-rose-900/10">
                        <span className="mr-auto truncate text-[10px] text-rose-700 dark:text-rose-300">Delete?</span>
                        <Button variant="danger" size="sm" onClick={() => confirmDelete(service._id)} disabled={deletingId === service._id} className="h-6 px-1.5 text-[10px]">
                          {deletingId === service._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelDelete} disabled={deletingId === service._id} className="h-6 px-1.5 text-[10px]">Cancel</Button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={!!editingService}
        onClose={() => {
          if (!updating) setEditingService(null);
        }}
        title="Edit Service"
        subtitle="Update the details of this service"
      >
        {editingService && (
          <form onSubmit={handleUpdate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Service Name"
              name="name"
              value={editingService.name}
              onChange={(e) =>
                setEditingService((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. AC Repair"
              required
            />
            <Input
              label="Starting Price (₹)"
              name="startingPrice"
              type="number"
              min="0"
              value={editingService.startingPrice}
              onChange={(e) =>
                setEditingService((prev) => ({ ...prev, startingPrice: e.target.value }))
              }
              placeholder="e.g. 499"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service Type
              </label>
              <select
                value={editingService.serviceTypeId}
                onChange={(e) =>
                  setEditingService((prev) => ({
                    ...prev,
                    serviceTypeId: e.target.value,
                    serviceCategoryId: '',
                  }))
                }
                className="w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select Service Type</option>
                {serviceTypes.map((st) => (
                  <option key={st._id} value={st._id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={editingService.serviceCategoryId}
                onChange={(e) =>
                  setEditingService((prev) => ({ ...prev, serviceCategoryId: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select Category</option>
                {categories
                  .filter(
                    (c) =>
                      !editingService.serviceTypeId ||
                      c.serviceTypeId?._id === editingService.serviceTypeId ||
                      c.serviceTypeId === editingService.serviceTypeId
                  )
                  .map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
            <Input
              label="Duration (minutes)"
              name="durationMinutes"
              type="number"
              min="0"
              value={editingService.durationMinutes}
              onChange={(e) =>
                setEditingService((prev) => ({ ...prev, durationMinutes: e.target.value }))
              }
              placeholder="e.g. 60"
            />
            <Input
              label="Discount (%)"
              name="discountPercentage"
              type="number"
              min="0"
              max="100"
              value={editingService.discountPercentage}
              onChange={(e) =>
                setEditingService((prev) => ({ ...prev, discountPercentage: e.target.value }))
              }
              placeholder="0"
            />
            <ImageUploadField
              label="Cover Image"
              value={editImageFile}
              onChange={setEditImageFile}
              onClear={() =>
                setEditingService((prev) => ({
                  ...prev,
                  existingImage: '',
                  imageWasCleared: true,
                }))
              }
              previewUrl={editingService.existingImage}
              disabled={updating}
              hint="Pick a new file to replace the existing image"
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Description"
                name="description"
                value={editingService.description}
                onChange={(e) =>
                  setEditingService((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
                placeholder="Describe this service..."
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingService(null)}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {updating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default ServicesPage;