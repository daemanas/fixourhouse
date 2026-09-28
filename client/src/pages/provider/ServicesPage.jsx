import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, IndianRupee, Wrench, Loader2, Save, X } from 'lucide-react';
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
  addService,
  updateService,
  deleteService,
} from '../../services/providerService';

import { getServiceTypes } from '../../services/serviceTypeService';
import { getCategories } from '../../services/categoryService';

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
      const [res, typeRes, catRes] = await Promise.all([
        getMyProviderProfile(),
        getServiceTypes(),
        getCategories(),
      ]);
      const provider = res?.data?.data?.provider || {};
      setServices(provider.services || []);
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

      const res = await addService(formData);
      const provider = res?.data?.data?.provider || {};

      setServices(provider.services || []);
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

      const res = await updateService(editingService._id, formData);
      const provider = res?.data?.data?.provider || {};

      setServices(provider.services || []);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">My Services</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Manage the services you offer to customers
          </p>
        </div>
        <Button onClick={() => setShowAddForm((prev) => !prev)}>
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? 'Cancel' : 'Add Service'}
        </Button>
      </div>

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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service, index) => (
            <motion.div
              key={service._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="overflow-hidden">
                {(service.primaryImage || service.image) && (
                  <img
                    src={service.primaryImage || service.image}
                    alt={service.name || 'Service'}
                    className="w-full h-44 object-cover"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                      <Wrench className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink-light dark:text-ink-dark">
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {service.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  {service.popular && <Badge variant="success">Popular</Badge>}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
                    <p className="font-semibold text-ink-light dark:text-ink-dark flex items-center gap-1">
                      <IndianRupee className="h-4 w-4" />
                      {service.startingPrice ?? service.price ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                    <p className="font-semibold text-ink-light dark:text-ink-dark">
                      {service.durationMinutes != null ? `${service.durationMinutes} min` : service.duration || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Bookings</p>
                    <p className="font-semibold text-ink-light dark:text-ink-dark">
                      {service.bookingsCount ?? '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(service)}
                    disabled={deletingId === service._id}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  {confirmDeleteId === service._id ? (
                    <>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => confirmDelete(service._id)}
                        disabled={deletingId === service._id}
                      >
                        {deletingId === service._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelDelete}
                        disabled={deletingId === service._id}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(service._id)}
                      disabled={deletingId === service._id}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
            </motion.div>
          ))}
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