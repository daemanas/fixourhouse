import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  X,
  Upload,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import {
  getGallery,
  uploadGalleryPhotos,
  deleteGalleryPhoto,
} from '../../services/galleryService';
import { resolveAssetUrl } from '../../utils/assetUrl';
import env from '../../config/env';

const ACCEPTED_TYPES = env.ALLOWED_IMAGE_TYPES; // jpeg, png, webp
const MAX_FILE_SIZE_MB = env.MAX_FILE_SIZE_MB; // 5
const MAX_FILE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_FILES = 10;
const ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';

export function GalleryPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Add-photos modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState([]); // { file, preview, name }
  const [uploading, setUploading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null); // gallery object
  const [deleting, setDeleting] = useState(false);

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const fileInputRef = useRef(null);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await getGallery();
      const data = res?.data?.data?.images || [];
      setImages(data);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Unable to load your gallery. Please try again.';
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  // ---- Add Photos modal ----------------------------------------------------
  const openModal = () => {
    setSelected([]);
    setModalError(null);
    setUploading(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (uploading) return; // prevent closing mid-upload
    setModalOpen(false);
  };

  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `"${file.name}" is not a supported format. Use JPG, JPEG, PNG or WebP.`;
    }
    if (file.size > MAX_FILE_BYTES) {
      return `"${file.name}" is larger than ${MAX_FILE_SIZE_MB} MB.`;
    }
    return null;
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file
    if (files.length === 0) return;

    const remaining = MAX_FILES - selected.length;
    if (remaining <= 0) {
      setModalError(`You can upload at most ${MAX_FILES} images at once.`);
      return;
    }

    const next = [];
    const errors = [];
    for (const file of files.slice(0, remaining)) {
      const err = validateFile(file);
      if (err) {
        errors.push(err);
        continue;
      }
      next.push({
        file,
        name: file.name,
        preview: URL.createObjectURL(file),
      });
    }
    if (errors.length) setModalError(errors[0]);
    else setModalError(null);

    setSelected((prev) => [...prev, ...next]);
  };

  const removeSelected = (idx) => {
    setSelected((prev) => {
      const target = prev[idx];
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== idx);
    });
    setModalError(null);
  };

  const handleUpload = async () => {
    if (selected.length === 0) {
      setModalError('Please select at least one image to upload.');
      return;
    }
    setUploading(true);
    setModalError(null);
    try {
      const res = await uploadGalleryPhotos(selected.map((s) => s.file));
      const uploaded = res?.data?.data?.images || [];
      setImages((prev) => [...uploaded, ...prev]);
      toast.success('Photos uploaded successfully.');
      selected.forEach((s) => s.preview && URL.revokeObjectURL(s.preview));
      setSelected([]);
      setModalOpen(false);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Unable to upload photos. Please try again.';
      setModalError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  // ---- Delete --------------------------------------------------------------
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGalleryPhoto(deleteTarget._id);
      setImages((prev) => prev.filter((img) => img._id !== deleteTarget._id));
      toast.success('Photo deleted successfully.');
      setLightboxIndex(null);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        'Unable to delete this photo. Please try again.';
      toast.error(msg);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ---- Lightbox navigation -------------------------------------------------
  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () =>
    setLightboxIndex((i) =>
      i === null ? i : (i - 1 + images.length) % images.length
    );
  const nextImage = () =>
    setLightboxIndex((i) => (i === null ? i : (i + 1) % images.length));

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex]);

  const lightboxImage = lightboxIndex !== null ? images[lightboxIndex] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Gallery</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Showcase your work to attract more customers
          </p>
        </div>
        <Button onClick={openModal}>
          <Plus className="h-4 w-4" />
          Add Photos
        </Button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && fetchError && (
        <div className="card p-6 text-center">
          <AlertCircle className="h-8 w-8 text-danger-500 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-300">{fetchError}</p>
          <Button className="mt-4" onClick={loadGallery}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !fetchError && images.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No photos yet"
          description="Upload photos of your completed work to build your professional gallery."
          action={
            <Button onClick={openModal}>
              <Plus className="h-4 w-4" />
              Add Photos
            </Button>
          }
        />
      ) : (
        !loading &&
        !fetchError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <motion.div
                key={image._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-[4/3]"
              >
                <img
                  src={resolveAssetUrl(image.imageUrl)}
                  alt={image.originalName || 'Gallery photo'}
                  className="h-full w-full object-cover cursor-pointer"
                  onClick={() => openLightbox(index)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                <button
                  type="button"
                  onClick={() => setDeleteTarget(image)}
                  aria-label="Delete photo"
                  className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-danger-500 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>
        ))}

      {/* ----------------------------- Add Photos Modal ----------------------------- */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Add Photos"
        subtitle="Upload photos of your completed work to showcase your services."
      >
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || selected.length >= MAX_FILES}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 py-8 text-gray-500 dark:text-gray-400 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Upload className="h-7 w-7" />
            <span className="text-sm font-medium">Click to select images</span>
            <span className="text-xs">
              JPG, JPEG, PNG, WEBP · up to {MAX_FILE_SIZE_MB} MB each · max {MAX_FILES}
            </span>
          </button>

          {selected.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {selected.map((item, idx) => (
                <div
                  key={`${item.name}-${idx}`}
                  className="relative rounded-xl overflow-hidden border border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800"
                >
                  <img
                    src={item.preview}
                    alt={item.name}
                    className="h-24 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeSelected(idx)}
                    disabled={uploading}
                    aria-label={`Remove ${item.name}`}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-danger-500 transition-colors disabled:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <p className="px-2 py-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    {item.name}
                  </p>
                </div>
              ))}
            </div>
          )}

          {modalError && (
            <div className="flex items-start gap-2 rounded-lg bg-danger-50 dark:bg-danger-900/20 px-3 py-2 text-sm text-danger-600 dark:text-danger-400">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={closeModal} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              loading={uploading}
              disabled={uploading || selected.length === 0}
            >
              {uploading ? 'Uploading...' : `Upload Photos (${selected.length})`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ----------------------------- Delete Confirmation ----------------------------- */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Delete this photo?"
        subtitle="Are you sure you want to permanently remove this photo from your gallery?"
        size="sm"
      >
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
            loading={deleting}
            disabled={deleting}
          >
            Delete
          </Button>
        </div>
      </Modal>

      {/* ----------------------------- Lightbox ----------------------------- */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              aria-label="Close preview"
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                aria-label="Previous photo"
                className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            <img
              src={resolveAssetUrl(lightboxImage.imageUrl)}
              alt={lightboxImage.originalName || 'Gallery photo'}
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                aria-label="Next photo"
                className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GalleryPage;

