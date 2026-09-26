import { Wrench } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useWebsiteSettings } from '../../context/WebsiteSettingsContext';
import resolveAssetUrl from '../../utils/assetUrl';

export function BrandLockup({ className = '', iconClassName = '', textClassName = '', forceDark = false }) {
  const { theme } = useTheme();
  const { settings } = useWebsiteSettings();
  const siteName = settings?.siteName || 'LocalFix';
  const logoUrl = (forceDark || theme === 'dark')
    ? settings?.darkLogoUrl || settings?.logoUrl
    : settings?.logoUrl || settings?.darkLogoUrl;

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      {logoUrl ? (
        <img src={resolveAssetUrl(logoUrl)} alt="" className={`max-h-10 max-w-40 object-contain ${iconClassName}`} />
      ) : (
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 ${iconClassName}`}>
          <Wrench className="h-5 w-5 text-white" />
        </span>
      )}
      <span className={`truncate text-xl font-bold ${textClassName}`}>{siteName}</span>
    </span>
  );
}

export default BrandLockup;