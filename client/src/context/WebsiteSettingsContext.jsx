import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getPublicWebsiteSettings } from '../services/websiteSettingsService';
import resolveAssetUrl from '../utils/assetUrl';

const WebsiteSettingsContext = createContext({ settings: null, loading: true, refresh: async () => {} });

export function WebsiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getPublicWebsiteSettings();
      const nextSettings = response.data?.data?.settings || null;
      setSettings(nextSettings);
      if (nextSettings?.siteName) document.title = nextSettings.siteName;
      if (nextSettings?.faviconUrl) {
        let icon = document.querySelector('link[rel~="icon"]');
        if (!icon) {
          icon = document.createElement('link');
          icon.rel = 'icon';
          document.head.appendChild(icon);
        }
        icon.href = resolveAssetUrl(nextSettings.faviconUrl);
      }
      return nextSettings;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <WebsiteSettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </WebsiteSettingsContext.Provider>
  );
}

export const useWebsiteSettings = () => useContext(WebsiteSettingsContext);