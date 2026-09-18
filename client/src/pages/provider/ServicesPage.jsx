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
import {
  getMyProviderProfile,
  addService,
  updateService,
  deleteService,
} from '../../services/providerService';

export function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [newService, setNewService] = useState({
    name: '',
    price: '',
    duration: '',
    description: '',
  });

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyProviderProfile();
      const provider = res?.data?.data?.provider || {};
      setServices(provider.services || []);
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
    const price = Number(newService.price);
    if (!newService.name.trim()) {
      toast.error('Service name is required');
      return;
    }
    if (newService.name.trim().length > 100) {
      toast.error('Service name cannot exceed 100 characters');
      return;
    }
    if (newService.price === '' || Number.isNaN(price) || price < 0) {
      toast.error('Enter a valid price (0 or more)');
      return;
    }
    if (newService.description.trim().length > 1000) {
      toast.error('Description cannot exceed 1000 characters');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: newService.name.trim(),
        price,
        duration: newService.duration.trim() || undefined,
        description: newService.description.trim() || undefined,
      };
      const res = await addService(payload);
      const provider = res?.data?.data?.provider || {};
      setServices(provider.services || []);
      setNewService({ name: '', price: '', duration: '', description: '' });
      setShowAddForm(false);
      toast.success('Service added successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add service');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service) => {
    setEditingService({
      _id: service._id,
      name: service.name || '',
      price: service.price != null ? String(service.price) : '',
      duration: service.duration || '',
      description: service.description || '',
    });
  };

  const handleUpdate = async (e) => {
    if (e) e.preventDefault();
    if (updating || !editingService) return;
    const price = Number(editingService.price);
    if (!editingService.name.trim()) {
      toast.error('Service name is required');
      return;
    }
    if (editingService.name.trim().length > 100) {
      toast.error('Service name cannot exceed 100 characters');
      return;
    }
    if (editingService.price === '' || Number.isNaN(price) || price < 0) {
      toast.error('Enter a valid price (0 or more)');
      return;
    }
    if (editingService.description.trim().length > 1000) {
      toast.error('Description cannot exceed 1000 characters');
      return;
    }
    setUpdating(true);
    try {
      const payload = {
        name: editingService.name.trim(),
        price,
        duration: editingService.duration.trim() || undefined,
        description: editingService.description.trim() || undefined,
      };
      const res = await updateService(editingService._id, payload);
      const provider = res?.data?.data?.provider || {};
      setServices(provider.services || []);
      setEditingService(null);
      toast.success('Service updated successfully');
    } catch (err) {
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
        action={
          <Button onClick={fetchServices}>Try Again</Button>
        }
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
              label="Price (₹)"
              name="price"
              type="number"
              min="0"
              value={newService.price}
              onChange={(e) => setNewService((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="e.g. 499"
              required
            />
            <Input
              label="Duration"
              name="duration"
              value={newService.duration}
              onChange={(e) => setNewService((prev) => ({ ...prev, duration: e.target.value }))}
              placeholder="e.g. 1-2 hours"
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
              <Card className="p-6">
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
                      {service.price ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                    <p className="font-semibold text-ink-light dark:text-ink-dark">
                      {service.duration || '—'}
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
              label="Price (₹)"
              name="price"
              type="number"
              min="0"
              value={editingService.price}
              onChange={(e) =>
                setEditingService((prev) => ({ ...prev, price: e.target.value }))
              }
              placeholder="e.g. 499"
              required
            />
            <Input
              label="Duration"
              name="duration"
              value={editingService.duration}
              onChange={(e) =>
                setEditingService((prev) => ({ ...prev, duration: e.target.value }))
              }
              placeholder="e.g. 1-2 hours"
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