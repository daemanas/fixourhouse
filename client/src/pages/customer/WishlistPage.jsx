import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Search,
  Bell,
  Heart,
  Star,
  MapPin,
  Loader2,
  AlertTriangle,
  X,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { getServiceWishlist, toggleServiceWishlist } from '../../services/userService';
import { useNotifications } from '../../context/NotificationContext';
import resolveAssetUrl from '../../utils/assetUrl';

export function WishlistPage() {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getServiceWishlist();
      setItems(res.data?.data?.wishlist || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load wishlist. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleRemove = async (id) => {
    setRemovingId(id);
    // Optimistically remove item from UI
    setItems((prev) => prev.filter((item) => item._id !== id));
    try {
      await toggleServiceWishlist(id);
      toast.success('Removed from wishlist');
    } catch (err) {
      // Revert on error
      fetchWishlist();
      toast.error(err.response?.data?.message || 'Failed to remove from wishlist');
    } finally {
      setRemovingId(null);
    }
  };

  // Dynamic Category Counts
  const categoryCounts = useMemo(() => {
    const counts = {};
    items.forEach((item) => {
      const cat = item.serviceCategoryId?.name || item.categoryId?.name || item.serviceTypeId?.name || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [items]);

  const categoriesList = useMemo(() => {
    const cats = Object.keys(categoryCounts);
    return ['All', ...cats];
  }, [categoryCounts]);

  // Filtered Wishlist Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const cat = item.serviceCategoryId?.name || item.categoryId?.name || item.serviceTypeId?.name || 'General';
      const matchesCategory =
        selectedCategory === 'All' ||
        cat.toLowerCase() === selectedCategory.toLowerCase();

      const name = item.name || '';
      const providerName = item.providerId?.businessName || item.providerId?.name || item.providerId?.userId?.name || '';
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !query ||
        name.toLowerCase().includes(query) ||
        cat.toLowerCase().includes(query) ||
        providerName.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  const getServiceImage = (item) => {
    const source = item.primaryImage || item.image || item.images?.[0] || '';

    return source ? resolveAssetUrl(source) : '';
  };

  const getServicePrice = (item) => {
    const price = item.startingPrice ?? item.price;

    if (price !== undefined && price !== null && price !== '' && Number.isFinite(Number(price))) {
      return `₹${Number(price).toLocaleString('en-IN')}`;
    }
    return 'Price on request';
  };

  const getLocationText = (item) => {
    const loc = item.providerId?.location;
    if (!loc) return '';
    if (typeof loc === 'string') return loc;
    return [loc.area || loc.address, loc.city, loc.state].filter(Boolean).join(', ');
  };

  const getRating = (item) => {
    const val = Number(item.rating || 0);
    return Number.isFinite(val) && val > 0 ? val.toFixed(1) : '';
  };

  const getReviewCount = (item) => {
    const count = Number(item.reviewCount);
    return Number.isFinite(count) && count > 0 ? count : 0;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 px-2 sm:px-4">
      {/* 1. PAGE HEADER */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-slate-800 dark:text-slate-200 cursor-pointer"
            aria-label="Go back"
          >
            <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            My Wishlist
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setShowSearchInput((prev) => !prev)}
            className={`p-2.5 rounded-full transition-colors cursor-pointer ${
              showSearchInput || searchQuery
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-300'
            }`}
            aria-label="Search wishlist"
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/customer/notifications')}
            className="relative p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900" />
            )}
          </button>
        </div>
      </div>

      {/* SEARCH BAR EXPANDER */}
      {showSearchInput && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="relative"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved services or providers..."
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </motion.div>
      )}

      {/* 2. WISHLIST CATEGORY FILTERS */}
      {!loading && !error && items.length > 0 && (
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 -mx-2 px-2 sm:mx-0 sm:px-0">
          {categoriesList.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = cat === 'All' ? items.length : categoryCounts[cat] || 0;
            const label = cat === 'All' ? `All Services (${count})` : `${cat} (${count})`;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-300 border border-gray-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* LOADING & ERROR STATES */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center rounded-3xl">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-500 font-semibold">{error}</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={fetchWishlist}>
            Try Again
          </Button>
        </Card>
      ) : filteredItems.length === 0 ? (
        /* EMPTY WISHLIST STATE */
        <div className="bg-[#f0fdf6] dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-6 shadow-sm">
          <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
            <Heart className="h-7 w-7 fill-emerald-600 dark:fill-emerald-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            No more services in wishlist
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm">
            Explore our services and add your favourites here.
          </p>
          <button
            type="button"
            onClick={() => navigate('/customer/search')}
            className="mt-5 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-full text-sm transition-colors shadow-sm cursor-pointer"
          >
            Explore Services →
          </button>
        </div>
      ) : (
        /* 3. WISHLIST SERVICE GRID (2 COLUMNS) */
        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          {filteredItems.map((item, index) => {
            const serviceName = item.name || 'Local Service';
            const categoryName = item.serviceCategoryId?.name || item.categoryId?.name || item.serviceTypeId?.name || 'Service';
            const imageSrc = getServiceImage(item);
            const locationStr = getLocationText(item);
            const ratingStr = getRating(item);
            const reviewCountNum = getReviewCount(item);
            const priceStr = getServicePrice(item);
            const provider = item.providerId && typeof item.providerId === 'object' ? item.providerId : null;
            const providerName = provider?.businessName || provider?.name || provider?.userId?.name || 'Provider';
            const providerAvatar = provider;

            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* SERVICE IMAGE */}
                  <div className="relative aspect-[16/9] w-full bg-slate-100 dark:bg-gray-800 overflow-hidden">
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={serviceName}
                        onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
                        className="w-full h-full object-cover rounded-t-2xl sm:rounded-t-3xl"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-100 via-teal-100 to-emerald-200 dark:from-emerald-950 dark:via-teal-950 dark:to-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-extrabold text-lg sm:text-3xl p-2 sm:p-4 text-center">
                        {serviceName}
                      </div>
                    )}

                    {/* CATEGORY BADGE */}
                    <span className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-[#fff7ed] dark:bg-amber-950/80 text-[#9a3412] dark:text-amber-200 border border-amber-200/80 dark:border-amber-900/60 font-semibold text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-sm backdrop-blur-sm truncate max-w-[70%]">
                      {categoryName}
                    </span>

                    {/* FAVORITE / HEART BUTTON */}
                    <button
                      type="button"
                      onClick={() => handleRemove(item._id)}
                      disabled={removingId === item._id}
                      className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-md hover:scale-105 transition-transform cursor-pointer disabled:opacity-60"
                      aria-label="Remove from wishlist"
                    >
                      {removingId === item._id ? (
                        <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-red-500" />
                      ) : (
                        <Heart className="h-4 w-4 sm:h-5 sm:w-5 fill-red-500 text-red-500" />
                      )}
                    </button>
                  </div>

                  {/* SERVICE & PROVIDER INFO */}
                  <div className="p-3 sm:p-5 space-y-2 sm:space-y-3">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-lg line-clamp-1">
                      {serviceName}
                    </h3>

                    {/* Rating & Distance */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[11px] sm:text-sm">
                      {ratingStr && <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-400 text-amber-400 shrink-0" />
                        <span className="font-bold text-slate-900 dark:text-white">
                          {ratingStr}
                        </span>
                        {reviewCountNum > 0 && <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
                          ({reviewCountNum} reviews)
                        </span>}
                      </div>}

                      {locationStr && (
                        <div className="flex items-center gap-0.5 sm:gap-1 text-slate-500 dark:text-slate-400 truncate">
                          <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                          <span className="truncate">{locationStr}</span>
                        </div>
                      )}
                    </div>

                    {/* Provider Info & PRICE */}
                    <div className="flex items-center justify-between pt-1 sm:pt-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar
                          src={providerAvatar}
                          name={providerName}
                          size="sm"
                          className="h-7 w-7 sm:h-9 sm:w-9 rounded-full shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white text-[11px] sm:text-sm truncate">
                            {providerName}
                          </div>
                          <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                            {categoryName} Specialist
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-1 sm:pl-2">
                        <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-medium block">
                          From
                        </span>
                        <span className="text-sm sm:text-xl font-extrabold text-slate-900 dark:text-white block">
                          {priceStr}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="p-3 sm:p-5 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <Link
                    to={`/customer/service/${item._id}`}
                    className="w-full py-2 sm:py-2.5 px-2 sm:px-3 rounded-full bg-[#e8f6f0] dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] sm:text-sm hover:bg-[#d4eee2] dark:hover:bg-emerald-950/70 transition-colors text-center block cursor-pointer"
                  >
                    Details
                  </Link>
                  <Link
                    to={`/customer/service/${item._id}`}
                    className="w-full py-2 sm:py-2.5 px-2 sm:px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] sm:text-sm shadow-sm transition-colors text-center block cursor-pointer"
                  >
                    Book Now
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WishlistPage;