import { useState, useEffect } from 'react';
import { resolveAssetUrl } from '../../utils/assetUrl';

const SIZES = {
  xs: 'h-8 w-8 text-xs',
  sm: 'h-9 w-9 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

/**
 * Reusable profile avatar. Shows the person's photo when available (backend
 * uploads are resolved against the API origin) and falls back to locally
 * rendered initials otherwise — no external avatar service required.
 */
export function Avatar({
  src,
  name = '',
  size = 'md',
  rounded = 'rounded-full',
  className = '',
  alt = '',
}) {
  const [failed, setFailed] = useState(false);
  const hasImage = Boolean(src) && !failed;

  // If the src changes (e.g. a new avatar was uploaded), the previous failure
  // state must not stick — retry the new URL so the replacement image renders.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const initials = (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  if (hasImage) {
    return (
      <img
        src={resolveAssetUrl(src)}
        alt={alt || name || 'avatar'}
        onError={() => setFailed(true)}
        className={`${SIZES[size]} ${rounded} object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${SIZES[size]} ${rounded} bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center font-semibold text-white shrink-0 ${className}`}
      aria-label={alt || name || 'avatar'}
      role="img"
    >
      {initials || 'U'}
    </div>
  );
}

export default Avatar;
