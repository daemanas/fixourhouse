import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bug,
  CalendarCheck,
  ChevronRight,
  Clock3,
  Droplets,
  Fan,
  Grid2X2,
  Hammer,
  Heart,
  Home,
  Laptop,
  Lock,
  MapPin,
  Paintbrush,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  Truck,
  WashingMachine,
  Wrench,
  Zap,
  Scissors,
  ChevronUp,
} from 'lucide-react';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useWebsiteSettings } from '../../context/WebsiteSettingsContext';
import { getCategories } from '../../services/categoryService';
import { getProviders } from '../../services/providerService';
import { getServices } from '../../services/serviceService';
import { getWishlist, toggleWishlist } from '../../services/userService';
import { resolveAssetUrl } from '../../utils/assetUrl';

const categoryThemes = [
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
];

const howItWorks = [
  { title: 'Search Service', description: 'Find the service you need', icon: Search, color: 'bg-emerald-50 text-emerald-700' },
  { title: 'Choose Provider', description: 'Compare and select a professional', icon: Star, color: 'bg-violet-50 text-violet-700' },
  { title: 'Book & Confirm', description: 'Pick a convenient date and time', icon: CalendarCheck, color: 'bg-green-50 text-green-700' },
  { title: 'Sit Back & Relax', description: 'Your service is taken care of', icon: ShieldCheck, color: 'bg-sky-50 text-sky-700' },
];

const trustBadgePoints = [
  { title: 'Verified Professionals', icon: ShieldCheck },
  { title: 'Safe & Secure Booking', icon: Lock },
  { title: 'On-Time Service', icon: Clock3 },
];

const getCategoryIcon = (name = '') => {
  const value = name.toLowerCase();
  if (/ac|air condition|cooling/.test(value)) return Fan;
  if (/clean/.test(value)) return Sparkles;
  if (/plumb|water/.test(value)) return Droplets;
  if (/electric/.test(value)) return Zap;
  if (/paint/.test(value)) return Paintbrush;
  if (/carpent|furniture/.test(value)) return Hammer;
  if (/appliance|washing|repair/.test(value)) return WashingMachine;
  if (/pest/.test(value)) return Bug;
  if (/salon|beauty/.test(value)) return Scissors;
  if (/pack|mover/.test(value)) return Truck;
  if (/laptop|computer/.test(value)) return Laptop;
  if (/home/.test(value)) return Home;
  return Wrench;
};

const categoryHref = (category) => {
  const id = category._id || category.id;
  return id
    ? `/customer/search?categoryId=${encodeURIComponent(id)}`
    : `/customer/search?q=${encodeURIComponent(category.name || '')}`;
};

const getProviderLocation = (provider) => {
  const location = provider.location || {};
  return [location.area || location.address, location.city, location.state]
    .filter(Boolean)
    .join(', ');
};

const getServiceCategory = (service) =>
  service.serviceCategoryId?.name || service.categoryId?.name || service.serviceTypeId?.name || 'Home service';

const getServiceImage = (service) =>
  service.primaryImage || service.images?.[0] || service.image || '';

function ServiceArtwork({ service, className = '' }) {
  const image = getServiceImage(service);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [image]);

  if (!image || imageFailed) {
    const Icon = getCategoryIcon(getServiceCategory(service));
    return (
      <div className={`flex items-center justify-center bg-emerald-50 text-emerald-700 ${className}`} aria-hidden="true">
        <Icon className="h-9 w-9" />
      </div>
    );
  }

  return (
    <img
      src={resolveAssetUrl(image)}
      alt={service.name || getServiceCategory(service)}
      onError={() => setImageFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

function SectionHeading({ title, to, linkLabel = 'View all' }) {
  const headingId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-title`;
  return (
    <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
      <h2 id={headingId} className="text-lg font-bold text-slate-900 sm:text-xl">
        {title}
      </h2>
      <Link
        to={to}
        className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
      >
        {linkLabel}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

function CardSkeleton({ count = 4, className = 'w-72 shrink-0' }) {
  return Array.from({ length: count }, (_, index) => (
    <div key={index} className={`animate-pulse rounded-xl border border-slate-100 bg-white p-4 h-80 ${className}`} aria-hidden="true">
      <div className="h-32 rounded-lg bg-slate-100" />
      <div className="mt-4 h-4 w-2/3 rounded bg-slate-100" />
      <div className="mt-2 h-3 w-full rounded bg-slate-100" />
    </div>
  ));
}

export function CustomerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useWebsiteSettings();
  const savedCity = user?.locationData?.city || user?.location || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [providers, setProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [favoriteSavingIds, setFavoriteSavingIds] = useState(() => new Set());

  const [showAllCategories, setShowAllCategories] = useState(false);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(false);
    try {
      const response = await getCategories();
      setCategories(response.data?.data?.categories || []);
    } catch {
      setCategories([]);
      setCategoriesError(true);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    try {
      const params = { page: 1, limit: 12, sort: 'newest' };
      if (savedCity) params.location = savedCity;
      const response = await getServices(params);
      setServices(response.data?.data?.services || []);
    } catch {
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  }, [savedCity]);

  const loadProviders = useCallback(async () => {
    setProvidersLoading(true);
    setProvidersError(false);
    try {
      const params = { page: 1, limit: 8, sort: 'rating' };
      if (savedCity) params.city = savedCity;
      let response = await getProviders(params);
      let results = response.data?.data?.providers || [];
      if (savedCity && results.length === 0) {
        response = await getProviders({ page: 1, limit: 8, sort: 'rating' });
        results = response.data?.data?.providers || [];
      }
      setProviders(results);
    } catch {
      setProviders([]);
      setProvidersError(true);
    } finally {
      setProvidersLoading(false);
    }
  }, [savedCity]);

  const loadFavorites = useCallback(async () => {
    try {
      const response = await getWishlist();
      const wishlist = response.data?.data?.wishlist || [];
      setFavoriteIds(new Set(wishlist.map((provider) => String(provider._id || provider.providerId?._id || provider.providerId || ''))));
    } catch {
      setFavoriteIds(new Set());
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadServices();
    loadProviders();
    loadFavorites();
  }, [loadCategories, loadServices, loadProviders, loadFavorites]);

  const offers = services
    .filter((service) => Number(service.discountPercentage) > 0)
    .slice(0, 8);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/customer/search?q=${encodeURIComponent(query)}` : '/customer/search');
  };

  const handleFavorite = async (providerId) => {
    const id = String(providerId);
    const wasFavorite = favoriteIds.has(id);
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (wasFavorite) next.delete(id);
      else next.add(id);
      return next;
    });
    setFavoriteSavingIds((current) => new Set(current).add(id));
    try {
      await toggleWishlist(id);
    } catch {
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (wasFavorite) next.add(id);
        else next.delete(id);
        return next;
      });
    } finally {
      setFavoriteSavingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const hero = settings?.hero || {};
  const managedHero = hero.enabled && Boolean(hero.desktopImageUrl || hero.mobileImageUrl);
  const heroAction = hero.primaryButtonAction?.startsWith('/') ? hero.primaryButtonAction : '/about';
  const displayedCategories = categories;

  const categoryItemsToDisplay = showAllCategories ? displayedCategories : displayedCategories.slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 overflow-hidden pb-4 sm:space-y-9">
      
      {/* HERO BANNER SECTION */}
      <section className="relative isolate overflow-hidden rounded-2xl bg-[#033b28] px-5 py-6 text-white sm:px-8 sm:py-8 lg:px-10" aria-labelledby="customer-home-hero-title">
        <div className="relative grid items-center gap-6 sm:grid-cols-2 lg:grid-cols-[1fr_240px_280px]">
          
          {/* Left Column: Icon Badge, Title, Subtitle, CTA */}
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#033b28] shadow-md">
                <ShieldCheck className="h-7 w-7 text-[#033b28]" aria-hidden="true" />
              </div>
              <h1 id="customer-home-hero-title" className="text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
                {hero.enabled && hero.heading ? (
                  hero.heading
                ) : (
                  <>
                    Verified &amp; Trusted <br />
                    <span className="text-emerald-400">Professionals</span>
                  </>
                )}
              </h1>
            </div>

            <p className="mt-2 text-sm font-medium text-emerald-100 sm:text-base">
              {hero.enabled && hero.subtitle ? hero.subtitle : 'Skilled · Background Checked · Reliable'}
            </p>

            <Link
              to={heroAction}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-[#033b28] transition-all hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#033b28]"
            >
              {hero.primaryButtonText || 'Learn More'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            {/* Mobile View Badges */}
            <div className="mt-5 grid gap-2.5 sm:hidden">
              {trustBadgePoints.map((point) => {
                const Icon = point.icon;
                return (
                  <div key={point.title} className="flex items-center gap-2.5 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#033b28]">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    {point.title}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Column: Default Icon/Graphic without Provider Image */}
          <div className="hidden h-full items-end justify-center sm:flex">
            {managedHero ? (
              <picture className="relative h-48 w-full sm:h-56 lg:h-64">
                <source media="(max-width: 767px)" srcSet={resolveAssetUrl(hero.mobileImageUrl || hero.desktopImageUrl)} />
                <img
                  src={resolveAssetUrl(hero.desktopImageUrl || hero.mobileImageUrl)}
                  alt={hero.heading || 'LocalFix service professionals'}
                  className="h-full w-full object-cover object-top rounded-t-2xl"
                />
              </picture>
            ) : (
              <div className="flex h-48 w-48 items-center justify-center rounded-t-full bg-white/10 text-emerald-100 lg:h-56 lg:w-56" aria-hidden="true">
                <ShieldCheck className="h-24 w-24" />
              </div>
            )}
          </div>

          {/* Right Column: Stacked Pill Badges */}
          <div className="hidden flex-col gap-3 sm:flex" aria-label="Service guarantees">
            {trustBadgePoints.map((point) => {
              const Icon = point.icon;
              return (
                <div
                  key={point.title}
                  className="flex items-center gap-3 rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-md transition-transform hover:scale-[1.02]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#033b28]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>{point.title}</span>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* SEARCH BAR */}
      <form onSubmit={handleSearch} className="flex gap-2.5" role="search" aria-label="Search services">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search for services (e.g. AC Repair, Cleaning, Plumber)"
            className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 sm:h-14 sm:text-base"
          />
        </label>
        <button
          type="button"
          onClick={() => navigate('/customer/search')}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:h-14 sm:w-14"
          aria-label="Browse services and filters"
        >
          <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
        </button>
      </form>

      {/* QUICK CATEGORIES */}
      <section aria-label="Quick service categories" className="min-w-0">
        {categoriesLoading ? (
          <div className="flex gap-4 overflow-hidden py-1" aria-label="Loading categories">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="w-20 shrink-0 animate-pulse text-center">
                <div className="mx-auto h-14 w-14 rounded-full bg-slate-200" />
                <div className="mx-auto mt-2 h-3 w-16 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : categoriesError ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <span>Categories are unavailable right now.</span>
            <button type="button" onClick={loadCategories} className="font-semibold text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
              Retry
            </button>
          </div>
        ) : displayedCategories.length > 0 ? (
          <div className="flex max-w-full gap-4 overflow-x-auto no-scrollbar pb-2 sm:gap-6">
            {displayedCategories.slice(0, 10).map((category, index) => {
              const Icon = getCategoryIcon(category.name);
              const theme = categoryThemes[index % categoryThemes.length];
              return (
                <Link
                  key={category._id || category.name}
                  to={categoryHref(category)}
                  className="group flex w-[76px] shrink-0 flex-col items-center gap-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                  <span className={`flex h-14 w-14 items-center justify-center rounded-full transition-transform group-hover:-translate-y-0.5 ${theme}`}>
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="line-clamp-2 text-xs font-medium leading-tight text-slate-800">{category.name}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-600">
            No service categories are available yet.{' '}
            <Link to="/customer/services" className="font-semibold text-emerald-700 hover:underline">
              Browse services
            </Link>
          </div>
        )}
      </section>

      {/* HOW IT WORKS SECTION */}
      <section aria-labelledby="how-it-works-title">
        <SectionHeading title="How It Works" to="/about" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {howItWorks.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className={`relative flex min-h-[130px] flex-col justify-between rounded-xl p-3 sm:p-4 ${step.color}`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white sm:h-7 sm:w-7">
                    {index + 1}
                  </span>
                  <Icon className="h-5 w-5 sm:h-7 sm:w-7 shrink-0" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 sm:text-sm md:text-base leading-tight">{step.title}</h3>
                  <p className="mt-1 text-[11px] text-slate-600 sm:text-xs leading-snug">{step.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* SPECIAL OFFERS SECTION */}
      {(servicesLoading || offers.length > 0) && (
        <section aria-labelledby="special-offers-title">
          <div className="mb-1 flex items-center justify-between gap-3">
            <SectionHeading title="Special Offers" to="/customer/services" />
          </div>
          <p className="-mt-3 mb-4 text-sm text-slate-600">Discounts published on real services available in your area.</p>
          {servicesLoading ? (
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              <CardSkeleton count={4} />
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {offers.map((service) => {
                const discount = Number(service.discountPercentage);
                const finalPrice = Number(service.finalPrice ?? service.startingPrice ?? service.price);
                return (
                  <article key={service._id} className="flex h-[310px] w-72 shrink-0 flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div>
                      <div className="relative h-36 overflow-hidden">
                        <ServiceArtwork service={service} className="h-full w-full" />
                        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">
                          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                          {discount}% off
                        </span>
                      </div>
                      <div className="p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{getServiceCategory(service)}</p>
                        <h3 className="mt-1 truncate font-bold text-slate-900">{service.name}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600">{service.description || `${getServiceCategory(service)} service`}</p>
                      </div>
                    </div>
                    <div className="p-4 pt-0">
                      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        {Number.isFinite(finalPrice) && finalPrice > 0 ? (
                          <span className="text-sm font-bold text-slate-900">From ₹{finalPrice.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-xs text-slate-500">Price shown</span>
                        )}
                        <Link
                          to={`/customer/service/${service._id}`}
                          className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                        >
                          View
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* BROWSE BY CATEGORY SECTION */}
      <section aria-labelledby="browse-by-category-title">
        <SectionHeading title="Browse by Category" to="/customer/services" />
        {categoriesLoading ? (
          <div className="grid grid-cols-4 gap-3">
            <CardSkeleton count={4} className="w-full h-24" />
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
            {categoryItemsToDisplay.map((category, index) => {
              const Icon = getCategoryIcon(category.name);
              const theme = categoryThemes[index % categoryThemes.length];
              return (
                <Link
                  key={category._id || category.name}
                  to={categoryHref(category)}
                  className="flex h-28 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-2 text-center transition hover:border-emerald-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:p-4"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${theme}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="line-clamp-1 w-full text-xs font-semibold text-slate-800 sm:text-sm">{category.name}</span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => setShowAllCategories((prev) => !prev)}
              className="flex h-28 min-w-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-2 text-center text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:p-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white sm:h-12 sm:w-12">
                {showAllCategories ? <ChevronUp className="h-5 w-5" aria-hidden="true" /> : <Grid2X2 className="h-5 w-5" aria-hidden="true" />}
              </span>
              <span className="text-xs font-semibold sm:text-sm">{showAllCategories ? 'Show Less' : 'More Services'}</span>
            </button>
          </div>
        ) : categoriesError ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
            Categories could not be loaded.{' '}
            <button type="button" onClick={loadCategories} className="font-semibold text-emerald-700 hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <EmptyState
            icon={Grid2X2}
            title="No categories available"
            description="Explore all current service listings instead."
            action={
              <Link to="/customer/services" className="font-semibold text-emerald-700 hover:underline">
                Explore all services
              </Link>
            }
          />
        )}
      </section>

      {/* NEARBY SERVICE PROVIDERS SECTION */}
      <section aria-labelledby="nearby-service-providers-title">
        <SectionHeading title="Nearby Service Providers" to="/customer/services" />
        {providersLoading ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            <CardSkeleton count={4} />
          </div>
        ) : providersError ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-8 text-center">
            <p className="text-sm text-slate-600">Nearby providers are unavailable right now.</p>
            <button
              type="button"
              onClick={loadProviders}
              className="min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              Retry
            </button>
          </div>
        ) : providers.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No nearby providers found"
            description="Explore available services to find a professional."
            action={
              <Link to="/customer/services" className="inline-flex min-h-10 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">
                Explore All Services
              </Link>
            }
          />
        ) : (
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {providers.map((provider) => {
              const providerId = String(provider._id);
              const isFavorite = favoriteIds.has(providerId);
              const name = provider.businessName || provider.userId?.name || 'Service professional';
              const rating = Number(provider.rating || 0);
              const reviewCount = Number(provider.reviewCount || 0);
              const location = getProviderLocation(provider);
              const experience = Number(provider.experience || 0);
              return (
                <article key={providerId} className="flex h-[280px] w-72 shrink-0 flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <Link to={`/customer/provider/${providerId}`} aria-label={`View ${name}'s profile`} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
                        <Avatar name={name} size="lg" alt={`${name} profile`} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleFavorite(providerId)}
                        disabled={favoriteSavingIds.has(providerId)}
                        aria-label={isFavorite ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
                        aria-pressed={isFavorite}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"
                      >
                        <Heart className={`h-5 w-5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} aria-hidden="true" />
                      </button>
                    </div>
                    <h3 className="mt-3 truncate font-bold text-slate-900" title={name}>
                      {name}
                    </h3>
                    <p className="mt-0.5 truncate text-sm text-slate-600">{provider.category || 'Local service professional'}</p>
                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <p className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden="true" />
                        {rating > 0 ? (
                          <>
                            <span className="font-semibold text-slate-800">{rating.toFixed(1)}</span>
                            {reviewCount > 0 && <span>({reviewCount})</span>}
                          </>
                        ) : (
                          <span>No reviews yet</span>
                        )}
                      </p>
                      {location && (
                        <p className="flex min-w-0 items-center gap-1.5">
                          <MapPin className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                          <span className="truncate" title={location}>
                            {location}
                          </span>
                        </p>
                      )}
                      {experience > 0 && (
                        <p className="flex items-center gap-1.5">
                          <Clock3 className="h-4 w-4 text-slate-500" aria-hidden="true" />
                          {experience}+ years experience
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/customer/provider/${providerId}`}
                    className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                  >
                    View Profile
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* EXCLUSIVE DEALS BANNER */}
      {offers.length > 0 && (
        <section className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Tag className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">Exclusive Deals &amp; Discounts</h2>
              <p className="mt-1 text-sm text-slate-700">Browse current discounts published on services in your area.</p>
            </div>
          </div>
          <Link
            to={`/customer/service/${offers[0]._id}`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-700 px-4 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
          >
            Explore deals
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      )}

    </div>
  );
}

export default CustomerDashboard;