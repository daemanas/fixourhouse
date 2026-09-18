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
  Heart,
  Wrench,
  Loader2,
  Briefcase,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import Avatar from '../../components/ui/Avatar';
import { getProviders } from '../../services/providerService';
import { getCategories } from '../../services/categoryService';
import { getWishlist, toggleWishlist } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';

const sortOptions = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price', label: 'Price: Low to High' },
  { value: 'jobs', label: 'Most Jobs Completed' },
  { value: 'newest', label: 'Newest' },
];

const formatPrice = (provider) => {
  const base = provider.pricing?.basePrice || provider.services?.[0]?.price;
  if (!base) return 'Price on request';
  return `₹${base}/hr`;
};

const formatLocation = (provider) => {
  const loc = provider.location;
  if (!loc) return '';
  return [loc.address, loc.city, loc.state].filter(Boolean).join(', ');
};

export function SearchPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'All Categories'
  );
  const [sortBy, setSortBy] = useState('rating');
  const [minRating, setMinRating] = useState(0);
  const [location, setLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [providers, setProviders] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [wishlist, setWishlist] = useState([]);

  // Load categories from backend
  useEffect(() => {
    let mounted = true;
    getCategories()
      .then((res) => {
        if (!mounted) return;
        const cats = res.data?.data?.categories || [];
        setCategories([{ name: 'All Categories', slug: 'all' }, ...cats]);
      })
      .catch(() => {
        // If categories fail to load, fall back to "All Categories" only
        if (mounted) setCategories([{ name: 'All Categories', slug: 'all' }]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Load real wishlist from backend for authenticated users
  useEffect(() => {
    if (!user) {
      setWishlist([]);
      return;
    }
    let mounted = true;
    getWishlist()
      .then((res) => {
        if (!mounted) return;
        const items = res.data?.data?.wishlist || [];
        setWishlist(items.map((p) => p._id));
      })
      .catch(() => {
        if (mounted) setWishlist([]);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    const category = searchParams.get('category');
    if (category) {
      const formatted = category
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      setSelectedCategory(formatted);
    }
  }, [searchParams]);

  const fetchProviders = useCallback(
    async (params = {}) => {
      setLoading(true);
      setError(null);
      try {
        const query = {};
        if (params.searchTerm || searchTerm) query.q = params.searchTerm || searchTerm;
        if (params.category && params.category !== 'All Categories') query.category = params.category;
        if (params.minRating) query.minRating = params.minRating;
        if (params.location) query.city = params.location;
        if (params.sortBy) query.sort = params.sortBy;
        query.page = params.page || page;
        query.limit = 9;

        const res = await getProviders(query);
        const { providers: data, pagination: pg } = res.data.data;
        setProviders(data);
        setPagination(pg);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load providers. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [selectedCategory, minRating, location, sortBy, page]
  );

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleToggleWishlist = async (id) => {
    if (!user) {
      toast.error('Please login to save providers to your wishlist');
      return;
    }
    try {
      const res = await toggleWishlist(id);
      const wishlisted = res.data?.data?.wishlisted;
      setWishlist((prev) =>
        wishlisted ? [...prev, id] : prev.filter((p) => p !== id)
      );
      toast.success(wishlisted ? 'Added to wishlist' : 'Removed from wishlist');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update wishlist');
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setPage(1);
    if (category === 'All Categories') {
      setSearchParams({});
    } else {
      setSearchParams({ category: category.toLowerCase().replace(/ /g, '-') });
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProviders({ page: 1 });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All Categories');
    setMinRating(0);
    setLocation('');
    setPage(1);
    setSearchParams({});
    fetchProviders({ page: 1, searchTerm: '', category: '', minRating: 0, location: '' });
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-secondary-700 p-8 text-white">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold">Find Trusted Professionals</h1>
          <p className="mt-2 text-white/80">Search by service, category, or provider name</p>
          <form onSubmit={handleSearch} className="mt-6 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for services, providers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 py-4 text-base bg-white dark:bg-gray-800 text-ink-light dark:text-ink-dark"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Category Tabs - loaded from backend */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {categories.map((cat) => {
          const active = selectedCategory === cat.name;
          return (
            <button
              key={cat._id || cat.slug || cat.name}
              onClick={() => handleCategoryChange(cat.name)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                active
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Wrench className="h-4 w-4" />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {showFilters && <X className="h-4 w-4" />}
          </Button>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {pagination.total} providers found
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                    Minimum Rating
                  </label>
                  <div className="flex gap-2">
                    {[0, 3, 4, 4.5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => {
                          setMinRating(rating);
                          setPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          minRating === rating
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {rating === 0 ? 'Any' : `${rating}+`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Enter your city"
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setPage(1);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button variant="outline" size="sm" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-red-500">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => fetchProviders()}>
            Try Again
          </Button>
        </Card>
      ) : providers.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No service providers found"
          description="Try adjusting your search or filters to find more providers."
          action={
            <Button onClick={handleClearFilters}>Clear Search</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider, i) => (
            <motion.div
              key={provider._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-6 hover:shadow-card transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={provider.userId?.avatar}
                      name={provider.businessName}
                      size="lg"
                      rounded="rounded-xl"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-ink-light dark:text-ink-dark">
                          {provider.businessName}
                        </h3>
                        {provider.isVerified && (
                          <Badge variant="success">Verified</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{provider.category}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-medium text-ink-light dark:text-ink-dark">
                          {provider.rating?.toFixed(1) || '0.0'}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({provider.reviewCount || 0} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleWishlist(provider._id)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Add to wishlist"
                  >
                    <Heart
                      className={`h-5 w-5 ${
                        wishlist.includes(provider._id)
                          ? 'fill-danger-500 text-danger-500'
                          : 'text-gray-400'
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  {formatLocation(provider) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {formatLocation(provider)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="h-4 w-4" /> {provider.experience || 0} yrs exp
                  </span>
                </div>

                {provider.services?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {provider.services.slice(0, 3).map((service) => (
                      <span
                        key={service._id || service.name}
                        className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300"
                      >
                        {service.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-ink-light dark:text-ink-dark">
                      {formatPrice(provider)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {provider.jobsCompleted?.toLocaleString() || 0} jobs completed
                    </p>
                  </div>
                  <Link to={`/customer/provider/${provider._id}`}>
                    <Button size="sm">View Profile</Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && providers.length > 0 && pagination.pages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={pagination.pages}
          onPageChange={(p) => {
            setPage(p);
            fetchProviders({ page: p });
          }}
        />
      )}
    </div>
  );
}

export default SearchPage;