import { useCallback, useEffect, useState } from 'react';
import { ImagePlus, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { useWebsiteSettings } from '../../context/WebsiteSettingsContext';
import { getAdminWebsiteSettings, saveWebsiteSettings, uploadWebsiteAsset } from '../../services/websiteSettingsService';
import resolveAssetUrl from '../../utils/assetUrl';

const emptySettings = {
  siteName: 'LocalFix',
  logoUrl: '',
  darkLogoUrl: '',
  faviconUrl: '',
  hero: {
    desktopImageUrl: '', mobileImageUrl: '', heading: '', subtitle: '',
    primaryButtonText: '', primaryButtonAction: '', secondaryButtonText: '',
    secondaryButtonAction: '', enabled: true, displayOrder: 0,
  },
  contact: {
    officialEmail: '', supportEmail: '', phone: '', whatsapp: '', officeAddress: '',
    city: '', state: '', country: 'India', postalCode: '', businessHours: '', mapUrl: '',
  },
  social: { facebook: '', instagram: '', youtube: '', linkedin: '', twitter: '' },
};

const mergeSettings = (settings = {}) => ({
  ...emptySettings,
  ...settings,
  hero: { ...emptySettings.hero, ...settings.hero },
  contact: { ...emptySettings.contact, ...settings.contact },
  social: { ...emptySettings.social, ...settings.social },
});

function Field({ label, value, onChange, type = 'text', ...props }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-ink-light dark:text-ink-dark">{label}</span>
      <Input type={type} value={value ?? ''} onChange={onChange} {...props} />
    </label>
  );
}

function ImageUpload({ label, value, onUpload, uploading, wide = false }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-ink-light dark:text-ink-dark">{label}</p>
      <div className={`flex min-h-24 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border-light bg-gray-50 dark:border-border-dark dark:bg-gray-800/50 ${wide ? 'aspect-[16/6]' : 'h-28'}`}>
        {value ? <img src={resolveAssetUrl(value)} alt={`${label} preview`} className="max-h-full max-w-full object-contain" /> : <span className="text-sm text-gray-500">No image selected</span>}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border-light px-3 py-2 text-sm font-medium text-ink-light hover:bg-gray-50 dark:border-border-dark dark:text-ink-dark dark:hover:bg-gray-800">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {uploading ? 'Uploading...' : 'Upload image'}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={onUpload} />
      </label>
      <p className="text-xs text-gray-500">JPG, PNG or WebP, maximum 5 MB</p>
    </div>
  );
}

export function AdminWebsiteSettingsPage() {
  const [form, setForm] = useState(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const { refresh } = useWebsiteSettings();

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAdminWebsiteSettings();
      setForm(mergeSettings(response.data?.data?.settings));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load website settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const updateRoot = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateGroup = (group, field, value) => setForm((current) => ({
    ...current,
    [group]: { ...current[group], [field]: value },
  }));

  const handleUpload = (kind, field, group) => async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Choose a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Images must be 5 MB or smaller.');
      return;
    }
    setUploading(kind);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Unable to read image file.'));
        reader.readAsDataURL(file);
      });
      const response = await uploadWebsiteAsset(kind, dataUrl);
      const assetUrl = response.data?.data?.assetUrl;
      if (group) updateGroup(group, field, assetUrl);
      else updateRoot(field, assetUrl);
      toast.success('Image uploaded. Save changes to publish it.');
    } catch (uploadError) {
      toast.error(uploadError.response?.data?.message || uploadError.message || 'Image upload failed.');
    } finally {
      setUploading('');
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await saveWebsiteSettings(form);
      setForm(mergeSettings(response.data?.data?.settings));
      await refresh();
      toast.success('Website settings saved.');
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Unable to save website settings.');
      toast.error(saveError.response?.data?.message || 'Unable to save website settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary-600" /></div>;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Website Management</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage public branding, homepage banner, contact details and social links.</p>
      </header>
      {error && <p role="alert" className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700 dark:bg-danger-900/20 dark:text-danger-300">{error}</p>}

      <Card className="space-y-6 p-6">
        <div>
          <h2 className="text-lg font-semibold text-ink-light dark:text-ink-dark">Branding</h2>
          <p className="mt-1 text-sm text-gray-500">Logo and browser icon used across LocalFix.</p>
        </div>
        <Field label="Website name" value={form.siteName} onChange={(event) => updateRoot('siteName', event.target.value)} required maxLength={80} />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <ImageUpload label="Logo" value={form.logoUrl} uploading={uploading === 'logo'} onUpload={handleUpload('logo', 'logoUrl')} />
          <ImageUpload label="Dark/light alternate logo" value={form.darkLogoUrl} uploading={uploading === 'darkLogo'} onUpload={handleUpload('darkLogo', 'darkLogoUrl')} />
          <ImageUpload label="Favicon" value={form.faviconUrl} uploading={uploading === 'favicon'} onUpload={handleUpload('favicon', 'faviconUrl')} />
        </div>
      </Card>

      <Card className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-light dark:text-ink-dark">Homepage hero banner</h2>
            <p className="mt-1 text-sm text-gray-500">Mobile uses its own image when available, otherwise the desktop image.</p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-ink-light dark:text-ink-dark">
            <input type="checkbox" checked={form.hero.enabled} onChange={(event) => updateGroup('hero', 'enabled', event.target.checked)} className="h-4 w-4 accent-primary-600" />
            Active
          </label>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ImageUpload label="Desktop banner" wide value={form.hero.desktopImageUrl} uploading={uploading === 'desktopBanner'} onUpload={handleUpload('desktopBanner', 'desktopImageUrl', 'hero')} />
          <ImageUpload label="Mobile banner (optional)" wide value={form.hero.mobileImageUrl} uploading={uploading === 'mobileBanner'} onUpload={handleUpload('mobileBanner', 'mobileImageUrl', 'hero')} />
        </div>
        {(form.hero.desktopImageUrl || form.hero.mobileImageUrl) && (
          <div className="overflow-hidden rounded-lg border border-border-light dark:border-border-dark">
            <picture>
              <source media="(max-width: 767px)" srcSet={resolveAssetUrl(form.hero.mobileImageUrl || form.hero.desktopImageUrl)} />
              <img src={resolveAssetUrl(form.hero.desktopImageUrl || form.hero.mobileImageUrl)} alt="Homepage banner preview" className="block max-h-80 w-full object-contain" />
            </picture>
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Heading" value={form.hero.heading} onChange={(event) => updateGroup('hero', 'heading', event.target.value)} maxLength={180} />
          <Field label="Display order" type="number" min="0" value={form.hero.displayOrder} onChange={(event) => updateGroup('hero', 'displayOrder', event.target.value)} />
          <label className="space-y-2 sm:col-span-2"><span className="text-sm font-medium text-ink-light dark:text-ink-dark">Subtitle</span><Textarea rows={3} value={form.hero.subtitle} onChange={(event) => updateGroup('hero', 'subtitle', event.target.value)} maxLength={1000} /></label>
          <Field label="Primary button text" value={form.hero.primaryButtonText} onChange={(event) => updateGroup('hero', 'primaryButtonText', event.target.value)} maxLength={60} />
          <Field label="Primary button URL/action" value={form.hero.primaryButtonAction} onChange={(event) => updateGroup('hero', 'primaryButtonAction', event.target.value)} placeholder="/customer/search" />
          <Field label="Secondary button text" value={form.hero.secondaryButtonText} onChange={(event) => updateGroup('hero', 'secondaryButtonText', event.target.value)} maxLength={60} />
          <Field label="Secondary button URL/action" value={form.hero.secondaryButtonAction} onChange={(event) => updateGroup('hero', 'secondaryButtonAction', event.target.value)} placeholder="/about" />
        </div>
      </Card>

      <Card className="space-y-6 p-6">
        <div><h2 className="text-lg font-semibold text-ink-light dark:text-ink-dark">Contact information</h2><p className="mt-1 text-sm text-gray-500">Displayed on the public contact page and footer.</p></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['officialEmail', 'Official email', 'email'], ['supportEmail', 'Support email', 'email'],
            ['phone', 'Phone number', 'tel'], ['whatsapp', 'WhatsApp number', 'tel'],
            ['city', 'City'], ['state', 'State'], ['country', 'Country'], ['postalCode', 'Postal / PIN code'],
            ['businessHours', 'Business hours'], ['mapUrl', 'Google Maps URL', 'url'],
          ].map(([field, label, type]) => <Field key={field} label={label} type={type || 'text'} value={form.contact[field]} onChange={(event) => updateGroup('contact', field, event.target.value)} />)}
          <label className="space-y-2 sm:col-span-2 lg:col-span-3"><span className="text-sm font-medium text-ink-light dark:text-ink-dark">Office address</span><Textarea rows={2} value={form.contact.officeAddress} onChange={(event) => updateGroup('contact', 'officeAddress', event.target.value)} /></label>
        </div>
      </Card>

      <Card className="space-y-5 p-6">
        <div><h2 className="text-lg font-semibold text-ink-light dark:text-ink-dark">Social links</h2><p className="mt-1 text-sm text-gray-500">Only links provided here appear in the public footer.</p></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Object.keys(form.social).map((field) => <Field key={field} label={field[0].toUpperCase() + field.slice(1)} type="url" value={form.social[field]} onChange={(event) => updateGroup('social', field, event.target.value)} placeholder="https://" />)}
        </div>
      </Card>

      <div className="flex justify-end"><Button type="submit" disabled={saving || Boolean(uploading)}><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Changes'}</Button></div>
    </form>
  );
}

export default AdminWebsiteSettingsPage;