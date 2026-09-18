import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// Resolve the uploads directory the same way galleryUpload does, so complaint
// evidence and gallery images live under the same public/uploads root.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// server/src/utils -> server -> uploads
const UPLOAD_BASE = path.resolve(__dirname, '../../uploads');
const COMPLAINT_DIR = path.join(UPLOAD_BASE, 'complaints');

function isImageFile(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
}

/**
 * Persist an uploaded complaint evidence file to disk and return a relative
 * path (e.g. "complaints/abc.jpg"). Mirrors galleryUpload.saveGalleryImages so
 * the static server and resolveAssetUrl on the client can resolve it.
 *
 * @param {Express.Multer.File} file
 * @returns {Promise<{path: string, originalName: string}>}
 */
export async function saveComplaintEvidence(file) {
  if (!file) throw new Error('No file provided');
  await fs.mkdir(COMPLAINT_DIR, { recursive: true });

  const ext = path.extname(file.originalname || '') || '.jpg';
  const filename = `${uuidv4()}${ext}`;
  const dest = path.join(COMPLAINT_DIR, filename);

  if (file.buffer) {
    await fs.writeFile(dest, file.buffer);
  } else if (file.path) {
    await fs.rename(file.path, dest);
  } else {
    throw new Error('Uploaded file has no usable content');
  }

  return {
    path: `complaints/${filename}`,
    originalName: file.originalname,
    isImage: isImageFile(filename),
  };
}

export { isImageFile };
