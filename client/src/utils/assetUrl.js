import env from '../config/env';

/**
 * Resolve a backend-relative asset path (e.g. "/uploads/avatars/x.png") into an
 * absolute URL that renders from any origin. The API serves uploaded files at
 * /uploads, but a relative path in the client would point at the Vite origin —
 * so we prefix it with the API origin.
 */
export const resolveAssetUrl = (url) => {
  if (!url) return '';
  // Already absolute (https://..., //host/...)
  if (/^(https?:)?\/\//.test(url)) return url;
  if (url.startsWith('/')) {
    try {
      const { origin } = new URL(env.API_URL);
      return `${origin}${url}`;
    } catch {
      return url;
    }
  }
  return url;
};

export default resolveAssetUrl;