/**
 * ImageUploadField.jsx
 *
 * A reusable file-picker with instant preview. Replaces URL-input fields
 * for any image upload in the provider app.
 *
 * Props:
 *   label        {string}            – Label text above the field
 *   value        {File|null}         – Controlled File object (or null)
 *   onChange     {(File|null)=>void} – Called with the selected File (or null on clear)
 *   onClear      {()=>void}          – Called when a persisted preview is removed
 *   previewUrl   {string}            – Existing image URL shown as initial preview
 *   accept       {string}            – MIME types (default: "image/*")
 *   disabled     {boolean}
 *   hint         {string}            – Helper text below the field
 *   className    {string}
 */
import { useRef, useState, useEffect } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';

export default function ImageUploadField({
  label,
  value,
  onChange,
  onClear,
  previewUrl = '',
  accept = 'image/jpeg,image/png,image/webp',
  disabled = false,
  hint,
  className = '',
}) {
  const inputRef = useRef(null);
  // Local object URL for the picked file; falls back to the existing previewUrl prop
  const [localPreview, setLocalPreview] = useState('');

  // Revoke the previous object URL to avoid memory leaks
  useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setLocalPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setLocalPreview('');
    }
  }, [value]);

  const displayPreview = localPreview || previewUrl;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    onChange(file);
    // Reset the input so the same file can be re-selected after clearing
    e.target.value = '';
  };

  const handleClear = () => {
    const isNewFile = value instanceof File;
    onChange(null);
    setLocalPreview('');

    // Removing a newly picked replacement should reveal the persisted preview
    // again. Removing the persisted preview itself is an explicit clear action.
    if (!isNewFile) onClear?.();
  };

  const handleDrop = (e) => {
    if (disabled) return;
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    if (file) onChange(file);
  };

  const handleDragOver = (e) => {
    if (!disabled) e.preventDefault();
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}

      {displayPreview ? (
        /* Preview mode */
        <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <img
            src={displayPreview}
            alt="Preview"
            className="w-full max-h-48 object-cover"
          />
          {!disabled && (
            <div className="absolute top-2 right-2 flex gap-1.5">
              {/* Change button */}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/90 dark:bg-gray-800/90 shadow backdrop-blur-sm text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition"
              >
                <Upload className="h-3 w-3" />
                Change
              </button>
              {/* Clear button */}
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/90 dark:bg-gray-800/90 shadow backdrop-blur-sm text-danger-600 dark:text-danger-400 hover:bg-white dark:hover:bg-gray-700 transition"
              >
                <X className="h-3 w-3" />
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Drop-zone / picker mode */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition cursor-pointer select-none
            ${disabled
              ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/40 dark:hover:bg-primary-900/20'
            }`}
        >
          <ImageIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              <span className="text-primary-600 dark:text-primary-400">Click to upload</span>
              {' '}or drag &amp; drop
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              JPG, PNG or WebP · max 5 MB
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={handleFileChange}
        className="sr-only"
      />

      {hint && (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  );
}
