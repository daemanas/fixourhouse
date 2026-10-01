import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowLeftRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Eye,
  Folder,
  Image as ImageIcon,
  Images,
  Lightbulb,
  Play,
  Plus,
  Star,
  Trash2,
  Upload,
  Video,
  Wrench,
  X,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import {
  deleteGalleryPhoto,
  getGallery,
  updateGalleryPhoto,
  uploadGalleryPhotos,
} from '../../services/galleryService';
import { resolveAssetUrl } from '../../utils/assetUrl';
import env from '../../config/env';

const CATEGORIES = [
  { id: 'work_photos', label: 'Work Photos', icon: ImageIcon },
  { id: 'before_after', label: 'Before & After', icon: ArrowLeftRight },
  { id: 'tools_equipment', label: 'Tools & Equipment', icon: Wrench },
  { id: 'others', label: 'Others', icon: Folder },
];
const ACCEPTED_IMAGES = env.ALLOWED_IMAGE_TYPES;
const MAX_IMAGE_BYTES = env.MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 10;
const ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,.mp4,.webm,image/jpeg,image/png,image/webp,video/mp4,video/webm';
const TIP_KEY = 'localfix-gallery-tip-dismissed-v1';

const categoryLabel = (category) => CATEGORIES.find((item) => item.id === category)?.label || 'Others';
const mediaIdentity = (src) => {
  try {
    return new URL(resolveAssetUrl(src), window.location.origin).pathname;
  } catch {
    return String(src || '');
  }
};
const formatBytes = (bytes) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return '';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

export function GalleryPage() {
  const [images, setImages] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showTip, setShowTip] = useState(() => localStorage.getItem(TIP_KEY) !== 'true');
  const [mediaDurations, setMediaDurations] = useState({});

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [uploadCategory, setUploadCategory] = useState('work_photos');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [modalError, setModalError] = useState(null);
  const fileInputRef = useRef(null);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editCategory, setEditCategory] = useState('work_photos');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const loadGallery = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setFetchError(null);
    try {
      const response = await getGallery();
      setImages(response?.data?.data?.images || []);
      setCompletedJobs(response?.data?.data?.completedJobs || []);
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to load your gallery. Please try again.';
      setFetchError(message);
      toast.error(message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const galleryItems = useMemo(() => {
    const items = [];
    const seen = new Set();
    const add = (item) => {
      const identity = [item.mediaType, item.beforeImageUrl, item.afterImageUrl, item.imageUrl]
        .filter(Boolean).map(mediaIdentity).join('|');
      if (!identity || seen.has(identity)) return;
      seen.add(identity);
      items.push(item);
    };

    completedJobs.forEach((record, recordIndex) => {
      (record.images || []).forEach((imageUrl, imageIndex) => add({
        _id: `completed-${record._id || recordIndex}-${imageIndex}`,
        imageUrl,
        originalName: record.caption || record.serviceId?.name || 'Completed job photo',
        mediaType: 'image',
        category: 'work_photos',
        sourceType: 'completed_job',
        bookingId: record.bookingId,
      }));
    });

    images.forEach((image) => add({
      ...image,
      mediaType: image.mediaType || 'image',
      category: image.category || 'work_photos',
      sourceType: 'provider_gallery',
    }));
    return items;
  }, [images, completedJobs]);

  const filterCategories = useMemo(() => {
    const available = new Set(CATEGORIES.map((category) => category.id));
    images.forEach((image) => available.add(image.category || 'work_photos'));
    return CATEGORIES.filter((category) => available.has(category.id));
  }, [images]);

  const filteredItems = galleryItems.filter((item) => (
    (categoryFilter === 'all' || item.category === categoryFilter)
    && (sourceFilter === 'all'
      || (sourceFilter === 'completed' && item.sourceType === 'completed_job')
      || (sourceFilter === 'provider' && item.sourceType === 'provider_gallery'))
  ));
  const categoryCounts = Object.fromEntries([
    ['all', galleryItems.length],
    ...filterCategories.map(({ id }) => [id, galleryItems.filter((item) => item.category === id).length]),
  ]);
  const completedCount = galleryItems.filter((item) => item.sourceType === 'completed_job').length;
  const providerCount = galleryItems.filter((item) => item.sourceType === 'provider_gallery').length;
  const lightboxItem = lightboxIndex === null ? null : filteredItems[lightboxIndex];
  const introImages = galleryItems.slice(0, 3);

  const revokeSelectedPreviews = (files = selected) => {
    files.forEach((file) => URL.revokeObjectURL(file.preview));
  };

  const openUploadModal = () => {
    setSelected([]);
    setUploadCategory('work_photos');
    setModalError(null);
    setUploadProgress(0);
    setModalOpen(true);
  };

  const closeUploadModal = () => {
    if (uploading) return;
    revokeSelectedPreviews();
    setSelected([]);
    setModalOpen(false);
  };

  const validateFile = (file) => {
    const isImage = ACCEPTED_IMAGES.includes(file.type);
    const isVideo = ['video/mp4', 'video/webm'].includes(file.type);
    if (!isImage && !isVideo) return `"${file.name}" is not a supported image or video.`;
    if (uploadCategory === 'before_after' && !isImage) return 'Before & After pairs must use images.';
    if (isImage && file.size > MAX_IMAGE_BYTES) return `"${file.name}" is larger than ${env.MAX_FILE_SIZE_MB} MB.`;
    if (isVideo && file.size > MAX_VIDEO_BYTES) return `"${file.name}" is larger than 25 MB.`;
    return null;
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const remaining = MAX_FILES - selected.length;
    if (remaining <= 0) {
      setModalError(`You can upload at most ${MAX_FILES} media files at once.`);
      return;
    }
    const valid = [];
    let firstError = null;
    files.slice(0, remaining).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        firstError ||= error;
      } else {
        valid.push({ file, name: file.name, size: file.size, type: file.type, preview: URL.createObjectURL(file) });
      }
    });
    setSelected((current) => [...current, ...valid]);
    setModalError(firstError);
  };

  const removeSelected = (index) => {
    setSelected((current) => {
      URL.revokeObjectURL(current[index]?.preview);
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
    setModalError(null);
  };

  const handleUpload = async () => {
    if (!selected.length) {
      setModalError('Select at least one media file to upload.');
      return;
    }
    if (uploadCategory === 'before_after' && selected.length !== 2) {
      setModalError('Select exactly two images for a Before & After pair.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setModalError(null);
    try {
      await uploadGalleryPhotos(selected.map((item) => item.file), {
        category: uploadCategory,
        onUploadProgress: (event) => {
          if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
      revokeSelectedPreviews();
      setSelected([]);
      setModalOpen(false);
      toast.success('Media uploaded successfully.');
      await loadGallery(false);
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to upload media. Please try again.';
      setModalError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (media, update) => {
    try {
      const response = await updateGalleryPhoto(media._id, update);
      const updated = response?.data?.data?.image;
      setImages((current) => current.map((image) => image._id === media._id ? { ...image, ...updated } : image));
      setOpenMenuId(null);
      toast.success(update.isFeatured ? 'Featured media updated.' : 'Gallery media updated.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update this media.');
    }
  };

  const saveCategory = async () => {
    if (!editTarget) return;
    setSavingEdit(true);
    try {
      const response = await updateGalleryPhoto(editTarget._id, { category: editCategory });
      const updated = response?.data?.data?.image;
      setImages((current) => current.map((image) => image._id === editTarget._id ? { ...image, ...updated } : image));
      setEditTarget(null);
      toast.success('Category updated.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not update the category.');
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteTarget.sourceType !== 'provider_gallery') return;
    setDeleting(true);
    try {
      await deleteGalleryPhoto(deleteTarget._id);
      setImages((current) => current.filter((image) => image._id !== deleteTarget._id));
      setDeleteTarget(null);
      setOpenMenuId(null);
      setLightboxIndex(null);
      toast.success('Media deleted.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Unable to delete this media.');
    } finally {
      setDeleting(false);
    }
  };

  const openViewer = (index) => {
    setOpenMenuId(null);
    setLightboxIndex(index);
  };
  const closeViewer = () => setLightboxIndex(null);
  const moveViewer = (direction) => setLightboxIndex((index) => (
    index === null || !filteredItems.length
      ? null
      : (index + direction + filteredItems.length) % filteredItems.length
  ));

  useEffect(() => {
    if (lightboxIndex === null) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') closeViewer();
      if (event.key === 'ArrowLeft') moveViewer(-1);
      if (event.key === 'ArrowRight') moveViewer(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, filteredItems.length]);

  const dismissTip = () => {
    localStorage.setItem(TIP_KEY, 'true');
    setShowTip(false);
  };

  const CategoryIcon = ({ category, mediaType }) => {
    if (mediaType === 'video') return <Video className="h-3.5 w-3.5" />;
    const Icon = CATEGORIES.find((item) => item.id === category)?.icon || ImageIcon;
    return <Icon className="h-3.5 w-3.5" />;
  };

  const renderPreview = (item, small = false) => {
    const className = small ? 'h-full w-full object-cover' : 'h-full w-full object-cover';
    if (item.beforeImageUrl && item.afterImageUrl) {
      return <div className="relative grid h-full grid-cols-2 overflow-hidden">
        <img src={resolveAssetUrl(item.beforeImageUrl)} alt="Before" className={`${className} border-r border-white/80`} loading="lazy" />
        <img src={resolveAssetUrl(item.afterImageUrl)} alt="After" className={className} loading="lazy" />
        <span className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-white/90 text-slate-900 shadow"><ArrowLeftRight className="h-4 w-4" /></span>
      </div>;
    }
    if (item.mediaType === 'video') {
      return <>
        <video src={resolveAssetUrl(item.imageUrl)} preload="metadata" muted className={className} onLoadedMetadata={(event) => setMediaDurations((current) => ({ ...current, [item._id]: event.currentTarget.duration }))} />
        <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white"><Play className="ml-0.5 h-6 w-6 fill-current" /></span></span>
        {mediaDurations[item._id] && <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-1 text-[10px] font-semibold text-white">{formatDuration(mediaDurations[item._id])}</span>}
      </>;
    }
    return <img src={resolveAssetUrl(item.imageUrl)} alt={item.originalName || 'Work photo'} loading="lazy" className={className} />;
  };

  const sourceLabel = (item) => item.sourceType === 'completed_job' ? 'Completed Job' : 'Provider Photo';

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8 sm:space-y-6">
      <header className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/provider/dashboard" aria-label="Back to provider dashboard" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="min-w-0"><h1 className="truncate text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">My Gallery</h1><p className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">Showcase your work and build customer trust</p></div>
        </div>
        <Button onClick={openUploadModal} className="min-h-10 shrink-0"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add Media</span><span className="sm:hidden">Add</span></Button>
      </header>

      {showTip && <section className="relative grid gap-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)_minmax(210px,0.65fr)] sm:items-center dark:border-emerald-950 dark:bg-slate-900">
        <div className="flex h-16 w-24 items-center -space-x-6 sm:h-20 sm:w-28">
          {introImages.length ? introImages.slice(0, 3).map((item, index) => <div key={item._id} className={`relative h-14 w-14 overflow-hidden rounded-xl border-2 border-white bg-emerald-50 shadow-sm dark:border-slate-900 ${index ? '-rotate-6' : 'z-10 rotate-3'}`}>{item.mediaType === 'video' ? <Video className="m-auto h-full w-6 text-emerald-700" /> : <img src={resolveAssetUrl(item.beforeImageUrl || item.imageUrl)} alt="Provider gallery preview" className="h-full w-full object-cover" />}</div>) : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"><Images className="h-6 w-6" /></div>}
        </div>
        <div className="min-w-0"><h2 className="font-semibold text-slate-950 dark:text-white">Show Your Best Work</h2><p className="mt-1 max-w-xl text-sm leading-5 text-slate-600 dark:text-slate-300">Add photos and videos of your work to build trust and attract more customers.</p></div>
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3 pr-10 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-100"><Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" /><div><p className="text-sm font-semibold">Tip</p><p className="mt-0.5 text-xs leading-5">Use clear, high-quality photos of your real work.</p></div></div>
        <button type="button" onClick={dismissTip} aria-label="Dismiss gallery tip" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-emerald-100 dark:hover:bg-emerald-900"><X className="h-4 w-4" /></button>
      </section>}

      {loading ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-[4/3] animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />)}</div> : fetchError ? <div className="rounded-xl border border-rose-200 bg-white p-6 text-center dark:border-rose-950 dark:bg-slate-900"><p className="text-sm text-slate-600 dark:text-slate-300">{fetchError}</p><Button className="mt-4" variant="outline" onClick={() => loadGallery()}>Retry</Button></div> : <>
        <section className="space-y-3" aria-label="Gallery filters">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">{[
            { id: 'all', label: 'All', count: categoryCounts.all || 0 },
            ...filterCategories.map(({ id, label }) => ({ id, label, count: categoryCounts[id] || 0 })),
          ].map((category) => <button key={category.id} type="button" onClick={() => { setCategoryFilter(category.id); setLightboxIndex(null); }} aria-pressed={categoryFilter === category.id} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${categoryFilter === category.id ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>{category.label} <span className={categoryFilter === category.id ? 'text-emerald-100' : 'text-slate-400'}>{category.count}</span></button>)}</div>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">{[{ id: 'all', label: `All Sources (${galleryItems.length})` }, { id: 'completed', label: `Completed Jobs (${completedCount})` }, { id: 'provider', label: `My Photos (${providerCount})` }].map((source) => <button key={source.id} type="button" onClick={() => { setSourceFilter(source.id); setLightboxIndex(null); }} aria-pressed={sourceFilter === source.id} className={`min-w-0 flex-1 truncate rounded-md px-2 py-2 text-[11px] font-semibold sm:text-xs ${sourceFilter === source.id ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-800 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>{source.label}</button>)}</div>
        </section>

        {galleryItems.length === 0 ? <EmptyState icon={Camera} title="Your gallery is empty" description="Add photos or videos of your work to help customers understand your expertise." action={<Button onClick={openUploadModal}><Plus className="h-4 w-4" />Add Media</Button>} /> : filteredItems.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">No media matches these filters.</p> : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {filteredItems.map((item, index) => {
              const CategoryIcon = item.mediaType === 'video' ? Video : (CATEGORIES.find((category) => category.id === item.category)?.icon || ImageIcon);
              return <motion.article key={item._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.15) }} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
                <button type="button" onClick={() => openViewer(index)} className="absolute inset-0 h-full w-full" aria-label={`View ${item.originalName || categoryLabel(item.category)}`}>
                  {renderPreview(item)}
                </button>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-2 pt-8" />
                <span className="absolute left-2 top-2 inline-flex max-w-[calc(100%-48px)] items-center gap-1.5 truncate rounded-full bg-white/95 px-2 py-1 text-[9px] font-semibold text-slate-800 shadow-sm sm:text-[10px]"><CategoryIcon className="h-3 w-3 shrink-0" />{item.mediaType === 'video' ? 'Work Video' : categoryLabel(item.category)}</span>
                {item.sourceType === 'completed_job' && <span className="absolute bottom-2 left-2 rounded-full bg-slate-950/70 px-2 py-1 text-[9px] font-semibold text-white">Completed Job</span>}
                {item.isFeatured && <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-bold text-slate-950"><Star className="h-3 w-3 fill-current" />Featured</span>}
                {item.sourceType === 'provider_gallery' && <div className="absolute right-2 top-2">
                  <button type="button" onClick={() => setOpenMenuId((current) => current === item._id ? null : item._id)} aria-label="Media actions" aria-expanded={openMenuId === item._id} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-sm hover:bg-white"><Ellipsis className="h-5 w-5" /></button>
                  {openMenuId === item._id && <div className="absolute right-0 top-9 z-20 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <button type="button" onClick={() => openViewer(index)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"><Eye className="h-3.5 w-3.5" />View</button>
                    {!item.beforeImageUrl && <button type="button" onClick={() => { setEditTarget(item); setEditCategory(item.category); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"><Folder className="h-3.5 w-3.5" />Edit Category</button>}
                    <button type="button" onClick={() => handleUpdate(item, { isFeatured: !item.isFeatured })} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"><Star className="h-3.5 w-3.5" />{item.isFeatured ? 'Remove Featured' : 'Set as Featured'}</button>
                    <button type="button" onClick={() => { setDeleteTarget(item); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950"><Trash2 className="h-3.5 w-3.5" />Delete</button>
                  </div>}
                </div>}
              </motion.article>;
            })}
          </div>
        )}
      </>}

      <Modal isOpen={modalOpen} onClose={closeUploadModal} title="Add Media" subtitle="Add real work photos or short videos to your provider gallery." size="lg">
        <div className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">Category
            <select value={uploadCategory} onChange={(event) => { setUploadCategory(event.target.value); setModalError(null); }} disabled={uploading} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
              {CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
          </label>
          {uploadCategory === 'before_after' && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">Choose exactly two images: first Before, then After.</p>}
          <input ref={fileInputRef} type="file" accept={uploadCategory === 'before_after' ? '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp' : ACCEPT_ATTR} multiple onChange={handleFileSelect} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || selected.length >= MAX_FILES} className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 text-slate-600 transition-colors hover:border-emerald-600 hover:bg-emerald-50/50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-emerald-950/30"><Upload className="h-6 w-6 text-emerald-700 dark:text-emerald-300" /><span className="text-sm font-semibold">Select photos or videos</span><span className="text-xs text-slate-500">JPG, PNG, WebP, MP4 or WebM · images up to 5 MB · videos up to 25 MB</span></button>
          {selected.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{selected.map((item, index) => <div key={`${item.name}-${index}`} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-900">{item.type.startsWith('video/') ? <video src={item.preview} muted controls className="h-full w-full object-cover" /> : <img src={item.preview} alt={item.name} className="h-full w-full object-cover" />}
              <button type="button" onClick={() => removeSelected(index)} disabled={uploading} aria-label={`Remove ${item.name}`} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/75 text-white"><X className="h-4 w-4" /></button>
            </div><div className="p-2"><p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">{item.name}</p><p className="text-[10px] text-slate-500">{formatBytes(item.size)}</p></div>
          </div>)}</div>}
          {uploading && <div className="space-y-1"><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-600 transition-[width]" style={{ width: `${uploadProgress}%` }} /></div><p className="text-right text-xs text-slate-500">Uploading {uploadProgress}%</p></div>}
          {modalError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">{modalError}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800"><Button variant="outline" onClick={closeUploadModal} disabled={uploading}>Cancel</Button><Button onClick={handleUpload} loading={uploading} disabled={!selected.length || uploading}><Upload className="h-4 w-4" />Upload Media ({selected.length})</Button></div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(editTarget)} onClose={() => !savingEdit && setEditTarget(null)} title="Edit Category" size="sm">
        <div className="space-y-4"><label className="block space-y-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">Category<select value={editCategory} onChange={(event) => setEditCategory(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">{CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditTarget(null)} disabled={savingEdit}>Cancel</Button><Button onClick={saveCategory} loading={savingEdit}>Save</Button></div></div>
      </Modal>

      <Modal isOpen={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)} title="Delete this media?" subtitle="This removes only the manually uploaded provider media. Completed-job photos remain attached to their booking." size="sm">
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button><Button variant="danger" onClick={confirmDelete} loading={deleting}>Delete</Button></div>
      </Modal>

      <AnimatePresence>{lightboxItem && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/95 p-4" onClick={closeViewer}>
        <button type="button" onClick={closeViewer} aria-label="Close viewer" className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
        <div className="absolute left-4 top-5 z-10 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white">{lightboxItem.mediaType === 'video' ? 'Work Video' : categoryLabel(lightboxItem.category)} · {sourceFilter === 'completed' || lightboxItem.sourceType === 'completed_job' ? 'Completed Job' : 'Provider Gallery'}</div>
        {filteredItems.length > 1 && <button type="button" onClick={(event) => { event.stopPropagation(); moveViewer(-1); }} aria-label="Previous media" className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white sm:left-6"><ChevronLeft className="h-6 w-6" /></button>}
        <div className="max-h-[85vh] max-w-[88vw]" onClick={(event) => event.stopPropagation()}>
          {lightboxItem.beforeImageUrl && lightboxItem.afterImageUrl ? <div className="grid max-h-[80vh] grid-cols-2 gap-1"><figure className="relative min-w-0"><img src={resolveAssetUrl(lightboxItem.beforeImageUrl)} alt="Before work" className="max-h-[80vh] w-full object-contain" /><figcaption className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-xs text-white">Before</figcaption></figure><figure className="relative min-w-0"><img src={resolveAssetUrl(lightboxItem.afterImageUrl)} alt="After work" className="max-h-[80vh] w-full object-contain" /><figcaption className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-xs text-white">After</figcaption></figure></div>
            : lightboxItem.mediaType === 'video' ? <video src={resolveAssetUrl(lightboxItem.imageUrl)} controls autoPlay className="max-h-[80vh] max-w-[88vw]" />
              : <img src={resolveAssetUrl(lightboxItem.imageUrl)} alt={lightboxItem.originalName || 'Gallery media'} className="max-h-[80vh] max-w-[88vw] object-contain" />}
        </div>
        {filteredItems.length > 1 && <button type="button" onClick={(event) => { event.stopPropagation(); moveViewer(1); }} aria-label="Next media" className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white sm:right-6"><ChevronRight className="h-6 w-6" /></button>}
        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white">{lightboxIndex + 1} / {filteredItems.length}</span>
      </motion.div>}</AnimatePresence>
    </div>
  );
}

export default GalleryPage;