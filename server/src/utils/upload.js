import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import ApiError from './ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Project-wise uploads root: <server>/uploads
export const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

function ensureDirSync(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Decode a base64 data URL (e.g. "data:image/png;base64,iVBOR...") and write it to
 * disk under `uploads/avatars`. Returns the public relative URL ("/uploads/avatars/...").
 */
export const saveBase64Image = (dataUrl, options = {}) => {
  const { subDir = 'avatars', maxBytes = MAX_AVATAR_BYTES } = options;

  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    throw new ApiError(400, 'Invalid image. Expected a base64 image data URL.');
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new ApiError(400, 'Invalid image data.');
  }

  const mimeType = match[1];
  const extension = ALLOWED_MIME_TYPES.get(mimeType);
  if (!extension) {
    throw new ApiError(400, 'Only JPG, PNG and WebP images are allowed.');
  }

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) {
    throw new ApiError(400, 'Image data is empty.');
  }
  if (buffer.length > maxBytes) {
    throw new ApiError(400, 'Image is too large. Maximum size is 5 MB.');
  }

  const dir = path.join(UPLOADS_ROOT, subDir);
  ensureDirSync(dir);

  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
  fs.writeFileSync(path.join(dir, filename), buffer);

  return `/uploads/${subDir}/${filename}`;
};