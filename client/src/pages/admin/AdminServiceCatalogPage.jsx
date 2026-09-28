import { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import ServiceTypesTab from '../../components/admin/catalog/ServiceTypesTab';
import CategoriesTab from '../../components/admin/catalog/CategoriesTab';
import { getServiceTypes } from '../../services/serviceTypeService';
import { getCategories } from '../../services/categoryService';
import { Plus, Layers, FolderTree } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminServiceCatalogPage() {
  const [activeTab, setActiveTab] = useState('types');
  const [loading, setLoading] = useState(true);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterTypeId, setFilterTypeId] = useState('');
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        getServiceTypes(),
        getCategories(filterTypeId ? { serviceTypeId: filterTypeId } : {}),
      ]);
      setServiceTypes(tRes.data.data.serviceTypes || []);
      setCategories(cRes.data.data.categories || []);
    } catch (err) {
      toast.error('Failed to load catalog data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterTypeId]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Service Catalog</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage platform Service Types and Categories</p>
        </div>
        <Button onClick={() => (activeTab === 'types' ? setTypeModalOpen(true) : setCatModalOpen(true))} className="flex gap-2">
          <Plus className="w-4 h-4" /> Add {activeTab === 'types' ? 'Service Type' : 'Category'}
        </Button>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 flex space-x-6">
        <button onClick={() => setActiveTab('types')} className={`py-3 px-1 border-b-2 font-medium text-sm flex gap-2 ${activeTab === 'types' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500'}`}>
          <Layers className="w-4 h-4" /> Service Types ({serviceTypes.length})
        </button>
        <button onClick={() => setActiveTab('categories')} className={`py-3 px-1 border-b-2 font-medium text-sm flex gap-2 ${activeTab === 'categories' ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500'}`}>
          <FolderTree className="w-4 h-4" /> Categories ({categories.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : activeTab === 'types' ? (
        <ServiceTypesTab
          serviceTypes={serviceTypes}
          onRefresh={fetchData}
          modalOpen={typeModalOpen}
          setModalOpen={setTypeModalOpen}
        />
      ) : (
        <CategoriesTab
          categories={categories}
          serviceTypes={serviceTypes}
          filterTypeId={filterTypeId}
          setFilterTypeId={setFilterTypeId}
          onRefresh={fetchData}
          modalOpen={catModalOpen}
          setModalOpen={setCatModalOpen}
        />
      )}
    </div>
  );
}
