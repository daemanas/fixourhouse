import { useState } from 'react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Modal from '../../ui/Modal';
import Badge from '../../ui/Badge';
import { Edit2 } from 'lucide-react';
import { createCategory, updateCategory } from '../../../services/categoryService';
import toast from 'react-hot-toast';

export default function CategoriesTab({ categories, serviceTypes, filterTypeId, setFilterTypeId, onRefresh, modalOpen, setModalOpen }) {
  const [editingCat, setEditingCat] = useState(null);
  const [form, setForm] = useState({ name: '', serviceTypeId: '', description: '', image: '', isPopular: false, isActive: true });
  const [submitting, setSubmitting] = useState(false);

  const openModal = (c = null) => {
    setEditingCat(c);
    setForm(c ? { name: c.name, serviceTypeId: c.serviceTypeId?._id || c.serviceTypeId || '', description: c.description || '', image: c.image || '', isPopular: !!c.isPopular, isActive: c.isActive !== false } : { name: '', serviceTypeId: serviceTypes[0]?._id || '', description: '', image: '', isPopular: false, isActive: true });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingCat) await updateCategory(editingCat._id, form);
      else await createCategory(form);
      toast.success('Category saved');
      setModalOpen(false);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <span className="text-sm font-medium">Filter by Type:</span>
        <select value={filterTypeId} onChange={(e) => setFilterTypeId(e.target.value)} className="px-3 py-1.5 border rounded-md text-sm bg-white dark:bg-gray-800">
          <option value="">All Types</option>
          {serviceTypes.map((st) => <option key={st._id} value={st._id}>{st.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((c) => (
          <Card key={c._id} className="p-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{c.name}</h3>
                  <p className="text-xs text-primary-600 font-medium">{c.serviceTypeId?.name || 'Unassigned'}</p>
                </div>
                <Badge variant={c.isActive ? 'success' : 'danger'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">{c.description || 'No description'}</p>
            </div>
            <div className="mt-4 pt-3 border-t flex justify-end">
              <Button variant="outline" size="sm" onClick={() => openModal(c)} className="flex gap-1">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingCat ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div>
            <label className="block text-sm font-medium mb-1">Service Type *</label>
            <select value={form.serviceTypeId} onChange={(e) => setForm({ ...form, serviceTypeId: e.target.value })} className="w-full p-2 border rounded text-sm bg-white dark:bg-gray-800" required>
              <option value="">Select Type</option>
              {serviceTypes.map((st) => <option key={st._id} value={st._id}>{st.name}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Image URL</label><Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></div>
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
