import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Search,
  MapPin,
  Star,
  SlidersHorizontal,
  X,
  Wrench,
  Loader2,
  Users,
  IndianRupee,
  Clock,
  ArrowRight,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { getServices } from '../../services/serviceService';
import { getServiceTypes } from '../../services/serviceTypeService';
import { getCategories } from '../../services/categoryService';
import { useAuth } from '../../context/AuthContext';

const sortOptions = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

export function SearchPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [serviceTypes, setServiceTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedServiceType, setSelectedServiceType] = useState(
    searchParams.get('serviceTypeId') || ''
  );
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('categoryId') || searchParams.get('category') || ''
  );
  const [sortBy, setSortBy] = useState('rating');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const [location, setLocation] = useState(
  () =>
    user?.locationData?.city ||
    user?.location ||
    searchParams.get('location') ||
    ''
);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [services, setServices] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [typeRes, catRes] = await Promise.all([
          getServiceTypes(),
          getCategories(),
        ]);
        setServiceTypes(typeRes.data.data.serviceTypes || []);
        setCategories(catRes.data.data.categories || []);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    fetchMetadata();
  }, []);

  const fetchServicesCatalog = useCallback(
    async (opts = {}) => {
      setLoading(true);
      setError(null);
      const currentPage = opts.page !== undefined ? opts.page : page;

      try {
        const params = {
          page: currentPage,
          limit: 9,
          sort: sortBy,
        };

        const q = (opts.searchTerm !== undefined ? opts.searchTerm : searchTerm).trim();
        if (q) params.q = q;

        const loc = (opts.location !== undefined ? opts.location : location).trim();
        if (loc) params.location = loc;

        const st = opts.serviceTypeId !== undefined ? opts.serviceTypeId : selectedServiceType;
        if (st) params.serviceTypeId = st;

        const cat = opts.categoryId !== undefined ? opts.categoryId : selectedCategory;
        if (cat) params.serviceCategoryId = cat;

        const minP = opts.minPrice !== undefined ? opts.minPrice : minPrice;
        if (minP) params.minPrice = minP;

        const maxP = opts.maxPrice !== undefined ? opts.maxPrice : maxPrice;
        if (maxP) params.maxPrice = maxP;

        const res = await getServices(params);
        const data = res.data.data;
        setServices(data.services || []);
        setPagination(data.pagination || { total: 0, pages: 1 });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch services.');
        setServices([]);
      } finally {
        setLoading(false);
      }
    },
    [page, searchTerm, location, selectedServiceType, selectedCategory, minPrice, maxPrice, sortBy]
  );

  useEffect(() => {
    fetchServicesCatalog();
  }, [fetchServicesCatalog]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchServicesCatalog({ page: 1 });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedServiceType('');
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setLocation('');
    setSortBy('rating');
    setPage(1);
    setSearchParams({});
    fetchServicesCatalog({
      page: 1,
      searchTerm: '',
      serviceTypeId: '',
      categoryId: '',
      minPrice: '',
      maxPrice: '',
      location: '',
    });
  };

  const activeFiltersCount =
    (selectedServiceType ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (minPrice || maxPrice ? 1 : 0) +
    (location ? 1 : 0);

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Search Header */}
      <div className="bg-white dark:bg-card-dark rounded-2xl p-3 sm:p-5 lg:p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <form onSubmit={handleSearchSubmit} className="space-y-3 sm:space-y-4">

          {/* =========================
              MOBILE / TABLET
              Search + Filters same row
            ========================= */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 lg:hidden">

            {/* Search */}
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="
                  w-full min-w-0
                  pl-10 pr-3 py-2.5
                  bg-gray-50 dark:bg-gray-800
                  border border-gray-200 dark:border-gray-700
                  rounded-xl
                  focus:ring-2 focus:ring-primary-500
                  focus:border-transparent
                  text-sm
                  text-ink-light dark:text-ink-dark
                  placeholder-gray-400
                "
              />
            </div>

            {/* Filters */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="
                relative
                shrink-0
                whitespace-nowrap
                px-3
              "
            >
              <SlidersHorizontal className="h-4 w-4 sm:mr-2" />

              <span className="hidden sm:inline">
                Filters
              </span>

              {activeFiltersCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-primary-500 text-white font-medium">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          {/* =========================
              MOBILE / TABLET
              Saved User Location
            ========================= */}
          <div className="lg:hidden">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

              <input
                type="text"
                value={location}
                readOnly
                aria-label="Saved location"
                placeholder="Location"
                className="
                  w-full
                  pl-10 pr-4 py-2.5
                  bg-gray-50 dark:bg-gray-800
                  border border-gray-200 dark:border-gray-700
                  rounded-xl
                  text-sm
                  text-ink-light dark:text-ink-dark
                  placeholder-gray-400
                  cursor-default
                "
              />
            </div>
          </div>

          {/* =========================
              DESKTOP
              Existing layout preserved
            ========================= */}
          <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_240px_auto_auto] gap-3">

            {/* Search */}
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="
                  w-full min-w-0
                  pl-10 pr-4 py-2.5
                  bg-gray-50 dark:bg-gray-800
                  border border-gray-200 dark:border-gray-700
                  rounded-xl
                  focus:ring-2 focus:ring-primary-500
                  focus:border-transparent
                  text-sm
                  text-ink-light dark:text-ink-dark
                  placeholder-gray-400
                "
              />
            </div>

            {/* Location */}
            <div className="relative min-w-0">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />

              <input
                type="text"
                placeholder="Location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="
                  w-full min-w-0
                  pl-10 pr-4 py-2.5
                  bg-gray-50 dark:bg-gray-800
                  border border-gray-200 dark:border-gray-700
                  rounded-xl
                  focus:ring-2 focus:ring-primary-500
                  focus:border-transparent
                  text-sm
                  text-ink-light dark:text-ink-dark
                  placeholder-gray-400
                "
              />
            </div>

            {/* Search Catalog */}
            <Button
              type="submit"
              className="w-full lg:w-auto whitespace-nowrap"
            >
              Search Catalog
            </Button>

            {/* Filters */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="relative w-full lg:w-auto whitespace-nowrap"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters

              {activeFiltersCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-primary-500 text-white font-medium">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          {/* Mobile search submit by Enter still works */}
          <button
            type="submit"
            className="hidden"
            aria-hidden="true"
            tabIndex="-1"
          >
            Search
          </button>

        </form>

        {/* =========================
            FILTER PANEL
          ========================= */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-4 mt-4 border-t border-gray-100 dark:border-gray-800"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">

                {/* Service Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Service Type
                  </label>

                  <select
                    value={selectedServiceType}
                    onChange={(e) => setSelectedServiceType(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-ink-light dark:text-ink-dark focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">All Types</option>

                    {serviceTypes.map((st) => (
                      <option key={st._id} value={st._id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>

                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-ink-light dark:text-ink-dark focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">All Categories</option>

                    {categories.map((c) => (
                      <option key={c._id || c.name} value={c._id || c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price Range (₹)
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-ink-light dark:text-ink-dark"
                    />

                    <span className="text-gray-400">-</span>

                    <input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-ink-light dark:text-ink-dark"
                    />
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sort By
                  </label>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-ink-light dark:text-ink-dark focus:ring-2 focus:ring-primary-500"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  Clear All Filters
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleSearchSubmit()}
                >
                  Apply Filters
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      
      {/* Catalog Services Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin mb-3 text-primary-500" />
          <p className="text-sm font-medium">Loading catalog services...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-center text-sm">
          {error}
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No services found"
          description="Try adjusting your search terms or filter criteria to find available services."
          actionLabel="Clear Filters"
          onAction={handleClearFilters}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
          {services.map((service, index) => {
            const startingPrice = Number(service.startingPrice ?? service.price ?? 0);
            const discountPercentage = Number(service.discountPercentage ?? 0);
            const hasDiscount = discountPercentage > 0;
            const finalStartingPrice = hasDiscount
              ? startingPrice * (1 - discountPercentage / 100)
              : startingPrice;
            const finalPrice = Math.round(finalStartingPrice * 100) / 100;

            return (
              <motion.div
                key={service._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.18) }}
              >
                <Card className="group h-full min-w-0 flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-card-dark p-0 shadow-sm hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200">
                  <div className="flex flex-1 flex-col">
                    {/* Service image */}
                    <div className="relative aspect-[1/1] sm:aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {service.primaryImage || service.images?.[0] ? (
                        <img
                          src={service.primaryImage || service.images[0]}
                          alt={service.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Wrench className="h-8 w-8 sm:h-12 sm:w-12 stroke-1" />
                        </div>
                      )}

                      {/* Soft image overlay */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />

                      {service.serviceCategoryId?.name && (
                        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 max-w-[70%]">
                          <Badge
                            variant="primary"
                            className="max-w-full truncate text-[9px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 sm:py-1 shadow-md backdrop-blur-sm"
                          >
                            {service.serviceCategoryId.name}
                          </Badge>
                        </div>
                      )}

                      {hasDiscount && (
                        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-red-500 text-white font-bold text-[9px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md shadow-md">
                          {discountPercentage}% OFF
                        </div>
                      )}
                    </div>

                    {/* Product information */}
                    <div className="flex flex-1 flex-col p-2.5 sm:p-4">
                      <div className="min-w-0">
                        <h3 className="text-[13px] sm:text-base lg:text-lg font-bold leading-snug text-ink-light dark:text-ink-dark line-clamp-2 min-h-[36px] sm:min-h-[44px]">
                          {service.name}
                        </h3>

                        {service.serviceTypeId?.name && (
                          <p className="text-[9px] sm:text-xs text-primary-600 dark:text-primary-400 font-semibold mt-1 truncate">
                            {service.serviceTypeId.name}
                          </p>
                        )}

                        <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-1.5 sm:mt-2 line-clamp-2 leading-relaxed min-h-[28px] sm:min-h-[34px]">
                          {service.description || 'Professional local service'}
                        </p>
                      </div>

                      {/* Compact service stats */}
                      <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[9px] sm:text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex min-w-0 items-center gap-1">
                          <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-primary-500" />
                          <span className="truncate">
                            {service.availableProvidersCount ?? service.providerCount ?? 0} providers
                          </span>
                        </div>

                        {service.durationMinutes && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-gray-400" />
                            <span>~{service.durationMinutes}m</span>
                          </div>
                        )}
                      </div>

                      {/* Rating */}
                      <div className="mt-2 flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-400 text-amber-400 shrink-0" />
                        <span className="text-[11px] sm:text-sm font-bold text-ink-light dark:text-ink-dark">
                          {Number(service.averageRating ?? service.rating ?? 0).toFixed(1)}
                        </span>
                        <span className="text-[9px] sm:text-xs text-gray-400 truncate">
                          ({service.reviewCount || 0})
                        </span>
                      </div>

                      {/* Price + CTA */}
                      <div className="mt-auto pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-end justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[9px] sm:text-[10px] text-gray-400 block">
                              Starting from
                            </span>
                            <div className="flex flex-wrap items-baseline gap-1">
                              <span className="text-sm sm:text-lg font-extrabold text-primary-600 dark:text-primary-400">
                                ₹{finalPrice}
                              </span>
                              {hasDiscount && (
                                <span className="text-[9px] sm:text-xs text-gray-400 line-through">
                                  ₹{startingPrice}
                                </span>
                              )}
                            </div>
                          </div>

                          <Link
                            to={`/customer/service/${service._id}`}
                            className="shrink-0"
                            aria-label={`View ${service.name}`}
                          >
                            <Button
                              size="sm"
                              className="h-8 sm:h-9 px-2.5 sm:px-3 text-[10px] sm:text-xs gap-1 whitespace-nowrap"
                            >
                              <span>View</span>
                              <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && services.length > 0 && pagination.pages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={pagination.pages}
          onPageChange={(p) => {
            setPage(p);
            fetchServicesCatalog({ page: p });
          }}
        />
      )}
    </div>
  );
}

export default SearchPage;