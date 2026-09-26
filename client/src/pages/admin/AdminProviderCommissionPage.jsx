import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import {
  createCommissionOffer,
  deleteCommissionOffer,
  getCommissionConfiguration,
  saveDefaultCommission,
  updateCommissionOffer,
} from '../../services/commissionService';

const blankOffer = {
  name: '',
  commissionRate: '0',
  durationDays: '30',
  appliesTo: 'newProviders',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  isActive: true,
};

const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';

function Field({ label, children }) {
  return <label className="block space-y-2"><span className="text-sm font-medium text-ink-light dark:text-ink-dark">{label}</span>{children}</label>;
}

export function AdminProviderCommissionPage() {
  const [defaultRate, setDefaultRate] = useState('');
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState(blankOffer);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [error, setError] = useState('');

  const loadConfiguration = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getCommissionConfiguration();
      setDefaultRate(String(response.data?.data?.settings?.defaultRate ?? ''));
      setOffers(response.data?.data?.offers || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load commission configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfiguration(); }, [loadConfiguration]);

  const saveRate = async (event) => {
    event.preventDefault();
    setSavingDefault(true);
    setError('');
    try {
      const response = await saveDefaultCommission(Number(defaultRate));
      setDefaultRate(String(response.data?.data?.settings?.defaultRate ?? defaultRate));
      toast.success('Default commission saved.');
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Unable to save the default commission.');
    } finally {
      setSavingDefault(false);
    }
  };

  const resetForm = () => {
    setForm({ ...blankOffer, startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10) });
    setEditingId('');
  };

  const editOffer = (offer) => {
    setEditingId(offer._id);
    setForm({
      name: offer.name,
      commissionRate: String(offer.commissionRate),
      durationDays: String(offer.durationDays),
      appliesTo: offer.appliesTo,
      startDate: new Date(offer.startDate).toISOString().slice(0, 10),
      endDate: new Date(offer.endDate).toISOString().slice(0, 10),
      isActive: offer.isActive,
    });
  };

  const submitOffer = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      commissionRate: Number(form.commissionRate),
      durationDays: Number(form.durationDays),
    };
    try {
      if (editingId) await updateCommissionOffer(editingId, payload);
      else await createCommissionOffer(payload);
      await loadConfiguration();
      resetForm();
      toast.success(editingId ? 'Offer updated.' : 'Offer created.');
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Unable to save the commission offer.');
    } finally {
      setSaving(false);
    }
  };

  const toggleOffer = async (offer) => {
    try {
      await updateCommissionOffer(offer._id, { isActive: !offer.isActive });
      setOffers((current) => current.map((item) => item._id === offer._id ? { ...item, isActive: !item.isActive } : item));
      toast.success(`Offer ${offer.isActive ? 'deactivated' : 'activated'}.`);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Unable to update offer status.');
    }
  };

  const removeOffer = async (offer) => {
    if (!window.confirm(`Delete the commission offer "${offer.name}"?`)) return;
    try {
      await deleteCommissionOffer(offer._id);
      setOffers((current) => current.filter((item) => item._id !== offer._id));
      if (editingId === offer._id) resetForm();
      toast.success('Offer deleted.');
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Unable to delete offer.');
    }
  };

  if (loading) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Provider Commission</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Configure the platform rate and time-limited provider offers.</p>
      </header>
      {error && <p role="alert" className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700 dark:bg-danger-900/20 dark:text-danger-300">{error}</p>}

      <Card className="p-6">
        <form onSubmit={saveRate} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Field label="Default provider commission (%)">
            <Input aria-label="Default provider commission percentage" type="number" min="0" max="100" step="0.01" required value={defaultRate} onChange={(event) => setDefaultRate(event.target.value)} className="sm:max-w-48" />
          </Field>
          <Button type="submit" disabled={savingDefault || defaultRate === ''}><Save className="h-4 w-4" />{savingDefault ? 'Saving...' : 'Save Commission'}</Button>
        </form>
      </Card>

      <Card className="p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-ink-light dark:text-ink-dark">Commission offers</h2><p className="mt-1 text-sm text-gray-500">New-provider offers begin when an eligible provider registers.</p></div>
          {editingId && <Button type="button" variant="outline" size="sm" onClick={resetForm}><X className="h-4 w-4" />Cancel edit</Button>}
        </div>
        <form onSubmit={submitOffer} className="grid gap-4 border-b border-border-light pb-6 dark:border-border-dark sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Offer name"><Input required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="New Provider Welcome Offer" /></Field>
          <Field label="Commission (%)"><Input type="number" min="0" max="100" step="0.01" required value={form.commissionRate} onChange={(event) => setForm({ ...form, commissionRate: event.target.value })} /></Field>
          <Field label="Duration (days)"><Input type="number" min="1" max="3650" step="1" required value={form.durationDays} onChange={(event) => setForm({ ...form, durationDays: event.target.value })} /></Field>
          <Field label="Applies to"><Select value={form.appliesTo} onChange={(event) => setForm({ ...form, appliesTo: event.target.value })} options={[{ value: 'newProviders', label: 'New providers' }, { value: 'allProviders', label: 'All providers' }]} /></Field>
          <Field label="Offer starts"><Input type="date" required value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></Field>
          <Field label="Offer ends"><Input type="date" required value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm font-medium text-ink-light dark:text-ink-dark"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="h-4 w-4 accent-primary-600" />Active</label>
          <div className="sm:col-span-2 lg:col-span-3"><Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{editingId ? 'Save Offer' : 'Create Offer'}</Button></div>
        </form>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead><tr className="border-b border-border-light text-left dark:border-border-dark">{['Offer name', 'Commission', 'Duration', 'Applies to', 'Start date', 'End date', 'Status', 'Actions'].map((column) => <th key={column} className="whitespace-nowrap px-3 py-3 text-xs font-semibold uppercase text-gray-500">{column}</th>)}</tr></thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {offers.map((offer) => (
                <tr key={offer._id}>
                  <td className="px-3 py-4 text-sm font-medium text-ink-light dark:text-ink-dark">{offer.name}</td>
                  <td className="px-3 py-4 text-sm">{offer.commissionRate}%</td>
                  <td className="px-3 py-4 text-sm">{offer.durationDays} days</td>
                  <td className="px-3 py-4 text-sm">{offer.appliesTo === 'newProviders' ? 'New providers' : 'All providers'}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">{formatDate(offer.startDate)}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">{formatDate(offer.endDate)}</td>
                  <td className="px-3 py-4"><button type="button" onClick={() => toggleOffer(offer)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${offer.isActive ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>{offer.isActive ? 'Active' : 'Inactive'}</button></td>
                  <td className="px-3 py-4"><div className="flex items-center gap-1"><button type="button" aria-label={`Edit ${offer.name}`} onClick={() => editOffer(offer)} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><Pencil className="h-4 w-4" /></button><button type="button" aria-label={`Delete ${offer.name}`} onClick={() => removeOffer(offer)} className="rounded-md p-2 text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/20"><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>
              ))}
              {offers.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-500">No commission offers have been created.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default AdminProviderCommissionPage;