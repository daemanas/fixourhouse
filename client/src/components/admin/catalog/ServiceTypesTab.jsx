import { useState } from 'react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Modal from '../../ui/Modal';
import Badge from '../../ui/Badge';
import { Edit2 } from 'lucide-react';
import { createServiceType, updateServiceType } from '../../../services/serviceTypeService';
import toast from 'react-hot-toast';

export default function ServiceTypesTab({ serviceTypes, onRefresh, modalOpen, setModalOpen }) {
  const [editingType, setEditingType] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', icon: '', isPopular: false, isActive: true });
  const [submitting, setSubmitting] = useState(false);

  const openModal = (t = null) => {
    setEditingType(t);
    setForm(t ? { name: t.name, description: t.description || '', icon: t.icon || '', isPopular: !!t.isPopular, isActive: t.isActive !== false } : { name: '', description: '', icon: '', isPopular: false, isActive: true });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingType) await updateServiceType(editingType._id, form);
      else await createServiceType(form);
      toast.success('Service type saved');
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving service type');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {serviceTypes.map((t) => (
          <Card key={t._id} className="p-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t.name}</h3>
                <Badge variant={t.isActive ? 'success' : 'danger'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t.description || 'No description'}</p>
            </div>
            <div className="mt-4 pt-3 border-t flex justify-end">
              <Button variant="outline" size="sm" onClick={() => openModal(t)} className="flex gap-1">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingType ? 'Edit Service Type' : 'Add Service Type'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><label className="block text-sm font-medium mb-1">Description</label><textarea className="w-full p-2 border rounded text-sm bg-white dark:bg-gray-800" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPopular} onChange={(e) => setForm({ ...form, isPopular: e.target.checked })} /> Popular</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" loading={submitting}>Save</Button></div>
        </form>
      </Modal>
    </div>
  );
}
