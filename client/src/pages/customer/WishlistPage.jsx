import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Heart, Star, MapPin, Trash2, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { getWishlist, toggleWishlist } from '../../services/userService';

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

export function WishlistPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWishlist();
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
    try {
      await toggleWishlist(id);
      setItems((prev) => prev.filter((item) => item._id !== id));
      toast.success('Removed from wishlist');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove from wishlist');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">My Wishlist</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {items.length} saved {items.length === 1 ? 'provider' : 'providers'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-danger-500 mx-auto mb-3" />
          <p className="text-red-500 font-medium">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchWishlist}>
            Try Again
          </Button>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Save providers you like to book them later."
          action={
            <Link to="/customer/search">
              <Button>Explore Services</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="overflow-hidden hover:shadow-card transition-shadow">
                <div className="relative">
                  <div className="h-40 w-full bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900/30 dark:to-secondary-900/30 flex items-center justify-center">
                    <span className="text-5xl font-bold text-primary-600/30 dark:text-primary-400/30">
                      {(item.businessName || 'P').charAt(0)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemove(item._id)}
                    disabled={removingId === item._id}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur hover:bg-white dark:hover:bg-gray-900 transition-colors"
                    aria-label="Remove from wishlist"
                  >
                    {removingId === item._id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-danger-500" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-danger-500" />
                    )}
                  </button>
                  {item.isVerified && (
                    <Badge variant="success" className="absolute top-3 left-3">
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-ink-light dark:text-ink-dark">
                        {item.businessName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.category}</p>
                    </div>
                    <p className="font-bold text-ink-light dark:text-ink-dark">
                      {formatPrice(item)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-ink-light dark:text-ink-dark">
                        {item.rating?.toFixed(1) || '0.0'}
                      </span>
                      ({item.reviewCount || 0})
                    </span>
                    {formatLocation(item) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {formatLocation(item)}
                      </span>
                    )}
                  </div>
                  <div className="mt-4">
                    <Link to={`/customer/provider/${item._id}`}>
                      <Button fullWidth variant="outline">
                        View Profile
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default WishlistPage;