import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import ApiError from './ApiError.js';
import {
  GALLERY_ALLOWED_MIME,
  resolveGalleryExtension,
} from '../middlewares/upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Gallery uploads live under <server>/uploads/gallery so they are served by
// the existing `/uploads` static route and never collide with avatars.
export const GALLERY_UPLOAD_DIR = path.join(
  __dirname,
  '..',
  '..',
  'uploads',
  'gallery'
);

function ensureDirSync(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

// Persist an in-memory Multer file buffer and return its public relative URL.
export const saveGalleryFile = (file) => {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new ApiError(400, 'Invalid media upload.');
  }

  const ext = resolveGalleryExtension(file);
  if (!GALLERY_ALLOWED_MIME.has(file.mimetype)) {
    throw new ApiError(400, 'Only JPG, PNG, WebP, MP4 and WebM files are allowed.');
  }

  ensureDirSync(GALLERY_UPLOAD_DIR);

  const filename = `${Date.now()}-${crypto
    .randomBytes(6)
    .toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(GALLERY_UPLOAD_DIR, filename), file.buffer);

  return `/uploads/gallery/${filename}`;
};

// Remove a previously stored gallery file from disk. Safe to call even if the
// file is already missing (e.g. it was cleaned up out-of-band).
export const deleteGalleryFile = (imageUrl) => {
  if (!imageUrl || !imageUrl.startsWith('/uploads/gallery/')) return;
  try {
    const filename = path.basename(imageUrl);
    const fullPath = path.join(GALLERY_UPLOAD_DIR, filename);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch {
    // Best-effort cleanup: a failure here must not abort the DB deletion.
  }
};
