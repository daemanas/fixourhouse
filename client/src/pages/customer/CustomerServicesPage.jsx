import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  ChevronRight,
  Heart,
  ImageOff,
  MapPin,
  RefreshCw,
  Search,
  Star,
  Users,
  Wrench,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { getServiceWishlist, toggleServiceWishlist } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { redirectToLogin } from '../../utils/authRedirect';
import { getServices } from '../../services/serviceService';
import { getServiceTypes } from '../../services/serviceTypeService';
import resolveAssetUrl from '../../utils/assetUrl';
import toast from 'react-hot-toast';

const CATALOG_PAGE_SIZE = 100;

const groupAvailableServices = (serviceTypes, services) => {
  const activeTypes = serviceTypes.filter((type) => type.isActive !== false);
  const servicesByType = new Map(
    activeTypes.map((type) => [String(type._id), new Map()])
  );

  services.forEach((service) => {
    if (service.isActive === false || !service.name?.trim()) return;

    const serviceTypeId = typeof service.serviceTypeId === 'object'
      ? service.serviceTypeId?._id
      : service.serviceTypeId;
    const offerings = servicesByType.get(String(serviceTypeId));
    if (!offerings) return;

    const nameKey = service.name.trim().toLocaleLowerCase();
    if (!offerings.has(nameKey)) offerings.set(nameKey, service);
  });

  return activeTypes
    .map((type) => ({
      ...type,
      services: [...(servicesByType.get(String(type._id))?.values() || [])]
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((type) => type.services.length > 0);
};

function ServiceCard({ service, compact = false, isFavorite = false, onToggleFavorite }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imagePath = service.primaryImage || service.image || service.images?.[0] || '';
  const imageUrl = imagePath ? resolveAssetUrl(imagePath) : '';
  const price = service.startingPrice ?? service.price;
  const hasPrice = price !== undefined && price !== null && price !== '' && Number.isFinite(Number(price));
  const rating = Number(service.averageRating ?? service.rating ?? 0);
  const reviewCount = Number(service.reviewCount ?? 0);
  const providerCount = Number(service.providerCount ?? service.availableProvidersCount ?? 0);
  const provider = service.providerId && typeof service.providerId === 'object' ? service.providerId : null;
  const city = provider?.location?.city || provider?.location?.district;
  const providerLabel = providerCount > 0
    ? `${providerCount.toLocaleString('en-IN')} ${providerCount === 1 ? 'provider' : 'providers'}`
    : provider?.businessName || city;

  return (
    <article className={[
      'group relative h-full min-w-0 snap-start overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md dark:border-gray-800 dark:bg-card-dark dark:hover:border-primary-800',
      compact ? 'w-full' : 'w-[min(58vw,210px)] shrink-0 sm:w-[220px] lg:w-[236px]',
    ].join(' ')}>
      <Link
        to={`/customer/service/${service._id}`}
        aria-label={`View providers for ${service.name}`}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
          {imageUrl && !imageFailed ? (
            <img
              src={imageUrl}
              alt={service.name}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-50 text-primary-600 dark:bg-gray-800/80 dark:text-primary-400">
              {imageFailed ? <ImageOff className="h-7 w-7" /> : <Wrench className="h-8 w-8" />}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">LocalFix</span>
            </div>
          )}
        </div>

        <div className="flex min-h-[124px] flex-col px-3 pb-2 pt-2.5 sm:px-3.5">
          {rating > 0 && (
            <div className="mb-1.5 flex min-h-4 items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span className="font-semibold">{rating.toFixed(1)}</span>
              {reviewCount > 0 && <span className="text-gray-400">({reviewCount.toLocaleString('en-IN')})</span>}
            </div>
          )}

          <h3 className="min-h-10 text-sm font-semibold leading-5 text-ink-light dark:text-ink-dark line-clamp-2">
            {service.name}
          </h3>
          {hasPrice && (
            <p className="mt-1 text-sm font-bold text-ink-light dark:text-ink-dark">
              <span className="mr-1 text-[11px] font-medium text-gray-500">From</span>
              ₹{Number(price).toLocaleString('en-IN')}
            </p>
          )}
        </div>
      </Link>

      {onToggleFavorite && service._id && (
        <button
          type="button"
          onClick={(event) => onToggleFavorite(event, service._id)}
          aria-label={isFavorite ? 'Remove service from wishlist' : 'Add service to wishlist'}
          aria-pressed={isFavorite}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-500 shadow-sm transition hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-gray-900/90 dark:text-gray-300"
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} aria-hidden="true" />
        </button>
      )}

      {providerLabel && (
        <div className="mx-3 flex items-center gap-1.5 truncate border-t border-gray-100 py-2 text-[11px] text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:mx-3.5">
          {providerCount > 0 ? <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
          <span className="truncate">{providerLabel}</span>
        </div>
      )}

      <Link
        to={`/customer/service/${service._id}`}
        className="mx-3 mb-3 mt-auto flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-primary-700 px-2 text-xs font-semibold text-primary-800 transition-colors hover:bg-primary-700 hover:text-white dark:border-primary-500 dark:text-primary-300 dark:hover:bg-primary-600 dark:hover:text-white sm:mx-3.5"
      >
        Book Now <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </article>
  );
}

function ServiceSkeletonRow() {
  return (
    <section aria-hidden="true" className="space-y-4">
      <div className="h-6 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="flex gap-3 overflow-hidden sm:gap-4">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="w-[min(58vw,210px)] shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-card-dark sm:w-[220px] lg:w-[236px]">
            <div className="aspect-[4/3] animate-pulse bg-gray-200 dark:bg-gray-800" />
            <div className="space-y-2 p-3.5">
              <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-3 w-2/5 animate-pulse rounded bg-gray-100 dark:bg-gray-800/70" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MarketplaceHero() {
  return (
    <section className="relative isolate grid min-h-[208px] grid-cols-[1.1fr_.9fr] overflow-hidden rounded-2xl bg-[#eaf4f2] dark:bg-gray-800 sm:min-h-[236px] lg:min-h-[260px]" aria-label="LocalFix service marketplace">
      <div className="relative z-10 flex flex-col items-start justify-center px-5 py-6 sm:px-8 lg:px-10">
        <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-700 dark:bg-gray-900/70 dark:text-primary-300">
          <Wrench className="h-3 w-3" aria-hidden="true" /> LocalFix
        </span>
        <h2 className="max-w-md text-xl font-bold leading-tight text-gray-900 dark:text-white sm:text-2xl lg:text-3xl">
          Trusted local services, made simple.
        </h2>
        <p className="mt-2 max-w-sm text-xs leading-5 text-gray-600 dark:text-gray-300 sm:text-sm">
          Professional. Reliable. Hassle-free.
        </p>
        <Link
          to="/customer/search"
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary-700 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 sm:mt-5 sm:text-sm"
        >
          Book a service <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="relative min-h-full overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center bg-primary-100/70 text-primary-700 dark:bg-gray-700 dark:text-primary-300">
          <Wrench className="h-14 w-14 sm:h-20 sm:w-20" strokeWidth={1.25} aria-hidden="true" />
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#eaf4f2] to-transparent dark:from-gray-800" />
      </div>
    </section>
  );
}

function ServiceTypeRail({ groups }) {
  if (groups.length === 0) return null;

  return (
    <section id="service-types" className="min-w-0" aria-labelledby="service-types-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="service-types-heading" className="text-base font-bold text-ink-light dark:text-ink-dark sm:text-lg">
          Browse service types
        </h2>
        <span className="text-xs text-gray-400">{groups.length} available</span>
      </div>
      <div className="service-row-scrollbar flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 scroll-smooth sm:gap-3">
        {groups.map((group) => (
          <button
            key={group._id}
            type="button"
            onClick={() => document.getElementById(`service-type-${group._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="inline-flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:bg-card-dark dark:text-gray-200 dark:hover:border-primary-800 dark:hover:bg-primary-900/20 dark:hover:text-primary-300 sm:px-4"
          >
            <Wrench className="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            {group.name}
          </button>
        ))}
      </div>
    </section>
  );
}

function ServiceSection({ group, onViewAll, favorites, onToggleFavorite }) {
  const rowRef = useRef(null);

  return (
    <section className="min-w-0" aria-labelledby={`service-type-${group._id}`}>
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3 sm:mb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
            <Wrench className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 id={`service-type-${group._id}`} className="truncate text-lg font-bold text-ink-light dark:text-ink-dark sm:text-xl">
            {group.name}
          </h2>
        </div>
        {group.services.length > 2 && (
          <button
            type="button"
            onClick={() => onViewAll(group)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-400 dark:hover:bg-primary-900/20 sm:text-sm"
          >
            View all <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="relative min-w-0 border-t border-gray-200 pt-4 dark:border-gray-800 sm:pt-5">
        <div
          ref={rowRef}
          className="service-row-scrollbar flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 sm:gap-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {group.services.map((service) => (
            <ServiceCard
              key={service._id}
              service={service}
              isFavorite={favorites.has(String(service._id))}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
        {group.services.length > 2 && (
          <button
            type="button"
            onClick={() => rowRef.current?.scrollBy({ left: rowRef.current.clientWidth * 0.8, behavior: 'smooth' })}
            aria-label={`Scroll ${group.name} services to the right`}
            className="absolute right-0 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-sm transition hover:text-primary-600 dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-300 dark:hover:text-primary-400 sm:flex"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

export function CustomerServicesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [catalogGroups, setCatalogGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewAllGroup, setViewAllGroup] = useState(null);
  const [favoriteServiceIds, setFavoriteServiceIds] = useState(() => new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      setFavoriteServiceIds(new Set());
      return undefined;
    }
    let isCurrent = true;

    getServiceWishlist()
      .then((response) => {
        const wishlist = response.data?.data?.wishlist || [];
        if (isCurrent) {
          setFavoriteServiceIds(new Set(wishlist.map((service) => String(service._id))));
        }
      })
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let isCurrent = true;

    const loadCatalog = async (background = false) => {
      if (!background) {
        setLoading(true);
        setError('');
      }

      try {
        const [typeResponse, firstServicesResponse] = await Promise.all([
          getServiceTypes(),
          getServices({ page: 1, limit: CATALOG_PAGE_SIZE }),
        ]);

        const serviceTypes = typeResponse.data?.data?.serviceTypes || [];
        const firstCatalog = firstServicesResponse.data?.data || {};
        const totalPages = Math.max(1, Number(firstCatalog.pagination?.pages) || 1);
        const remainingResponses = totalPages > 1
          ? await Promise.all(
              Array.from({ length: totalPages - 1 }, (_, index) =>
                getServices({ page: index + 2, limit: CATALOG_PAGE_SIZE })
              )
            )
          : [];
        const services = [
          ...(firstCatalog.services || []),
          ...remainingResponses.flatMap((response) => response.data?.data?.services || []),
        ];

        if (isCurrent) {
          setCatalogGroups(groupAvailableServices(serviceTypes, services));
          setError('');
        }
      } catch (loadError) {
        if (isCurrent) {
          setError(loadError.response?.data?.message || 'Could not load available services.');
        }
      } finally {
        if (isCurrent && !background) setLoading(false);
      }
    };

    const refreshOnFocus = () => loadCatalog(true);
    loadCatalog();
    window.addEventListener('focus', refreshOnFocus);
    const refreshTimer = window.setInterval(refreshOnFocus, 60_000);

    return () => {
      isCurrent = false;
      window.removeEventListener('focus', refreshOnFocus);
      window.clearInterval(refreshTimer);
    };
  }, [reloadKey]);

  const serviceGroups = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
    if (!normalizedSearch) return catalogGroups;

    return catalogGroups
      .map((group) => ({
        ...group,
        services: group.services.filter((service) =>
          service.name.toLocaleLowerCase().includes(normalizedSearch)
        ),
      }))
      .filter((group) => group.services.length > 0);
  }, [catalogGroups, searchTerm]);

  const showAllServices = (group) => {
    const fullGroup = catalogGroups.find((catalogGroup) => catalogGroup._id === group._id);
    setViewAllGroup(fullGroup || group);
  };

  const handleToggleFavorite = async (event, serviceId) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated) {
      redirectToLogin(navigate, location);
      return;
    }

    const favoriteId = String(serviceId);
    const wasFavorite = favoriteServiceIds.has(favoriteId);

    setFavoriteServiceIds((current) => {
      const next = new Set(current);
      if (wasFavorite) next.delete(favoriteId);
      else next.add(favoriteId);
      return next;
    });

    try {
      await toggleServiceWishlist(favoriteId);
    } catch (favoriteError) {
      setFavoriteServiceIds((current) => {
        const next = new Set(current);
        if (wasFavorite) next.add(favoriteId);
        else next.delete(favoriteId);
        return next;
      });
      toast.error(favoriteError.response?.data?.message || 'Could not update your wishlist.');
    }
  };

  const allServices = useMemo(
    () => catalogGroups.flatMap((group) => group.services),
    [catalogGroups]
  );
  const popularServices = useMemo(
    () => allServices
      .filter((service) => service.popular === true || Number(service.bookingsCount) > 0)
      .sort((first, second) =>
        Number(second.popular === true) - Number(first.popular === true) ||
        Number(second.bookingsCount || 0) - Number(first.bookingsCount || 0) ||
        Number(second.averageRating || 0) - Number(first.averageRating || 0)
      ),
    [allServices]
  );
  const filteredPopularServices = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
    return normalizedSearch
      ? popularServices.filter((service) => service.name.toLocaleLowerCase().includes(normalizedSearch))
      : popularServices;
  }, [popularServices, searchTerm]);

  const popularGroup = filteredPopularServices.length > 0
    ? { _id: 'popular-services', name: 'Popular Services', services: filteredPopularServices }
    : null;

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-7 overflow-x-hidden sm:space-y-9">
      <header className="space-y-3">
        <label className="relative block w-full">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search for services..."
            aria-label="Search services by name"
            className="input h-12 rounded-xl border-transparent bg-gray-100 pl-12 pr-12 text-sm shadow-none focus:border-primary-300 dark:border-transparent dark:bg-gray-800 sm:h-14 sm:text-base"
          />
        </label>
        <div className="flex items-start justify-between gap-4 px-0.5">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              LocalFix Services
            </p>
            <h1 className="text-xl font-bold text-ink-light dark:text-ink-dark sm:text-2xl">Services</h1>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={loading}
            aria-label="Refresh services"
            className="shrink-0 px-2.5 sm:px-4"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="space-y-7 sm:space-y-9">
          <div className="h-52 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800 sm:h-60" />
          <div className="flex gap-2 overflow-hidden">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="h-11 w-32 shrink-0 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
            ))}
          </div>
          <ServiceSkeletonRow />
          <ServiceSkeletonRow />
        </div>
      ) : error ? (
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-red-200 bg-white p-5 dark:border-red-900 dark:bg-card-dark sm:flex-row sm:items-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <Button type="button" variant="outline" onClick={() => setReloadKey((value) => value + 1)}>
            Try again
          </Button>
        </div>
      ) : serviceGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-14 text-center dark:border-gray-700 dark:bg-card-dark">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
            <Wrench className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-ink-light dark:text-ink-dark">
            {searchTerm.trim() ? 'No matching services' : 'No services available right now.'}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm.trim() ? 'Try a different service name.' : 'Please check back soon.'}
          </p>
        </div>
      ) : (
        <div className="min-w-0 space-y-7 sm:space-y-9">
          <MarketplaceHero />
          <ServiceTypeRail groups={serviceGroups} />
          <div id="available-services" className="space-y-7 sm:space-y-9">
            {popularGroup && (
              <ServiceSection
                group={popularGroup}
                onViewAll={showAllServices}
                favorites={favoriteServiceIds}
                onToggleFavorite={handleToggleFavorite}
              />
            )}
            {serviceGroups.map((group) => (
              <ServiceSection
                key={group._id}
                group={group}
                onViewAll={showAllServices}
                favorites={favoriteServiceIds}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={Boolean(viewAllGroup)}
        onClose={() => setViewAllGroup(null)}
        title={viewAllGroup?.name}
        subtitle={viewAllGroup ? `${viewAllGroup.services.length} available services` : ''}
        size="xl"
      >
        {viewAllGroup && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {viewAllGroup.services.map((service) => {
              return (
                <ServiceCard
                  key={service._id}
                  service={service}
                  compact
                  isFavorite={favoriteServiceIds.has(String(service._id))}
                  onToggleFavorite={handleToggleFavorite}
                />
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default CustomerServicesPage;