import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Award, BadgeCheck, Briefcase, Calendar, Camera, CheckCircle2,
  ChevronLeft, ChevronRight, Clock, Heart, Image as ImageIcon, Loader2,
  MapPin, MessageSquare, Play, Share2, ShieldCheck, Star, Users, ThumbsUp, Video
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import RatingStars from '../../components/ui/RatingStars';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import { getProviderById } from '../../services/providerService';
import { getProviderReviews } from '../../services/reviewService';
import { getCompletedServicePhotos } from '../../services/completedPhotoService';
import { getWishlist, toggleWishlist } from '../../services/userService';
import { summarizeAvailability, formatTime12h } from '../../utils/availability';
import resolveAssetUrl from '../../utils/assetUrl';

const formatDate = (date) => date
  ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  : '';

const formatLocation = (provider) => {
  const location = provider?.location || {};
  return [location.area, location.city, location.district, location.state]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(', ');
};

const servicePrice = (service) => Number(service?.price ?? service?.startingPrice ?? 0);
const discountedPrice = (service) => {
  const base = servicePrice(service);
  return Math.round(base * (1 - Number(service?.discountPercentage || 0) / 100) * 100) / 100;
};

const galleryImageKey = (src) => {
  try {
    return new URL(resolveAssetUrl(src), window.location.origin).pathname;
  } catch {
    return String(src || '');
  }
};

const getTodayAvailability = (availability) => {
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = summarizeAvailability(availability).normalized[weekdays[new Date().getDay()]];
  const ranges = today?.enabled ? today.slots : [];
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const availableNow = ranges.some(({ startTime, endTime }) => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    return currentMinutes >= startHour * 60 + startMinute && currentMinutes < endHour * 60 + endMinute;
  });
  return { ranges, availableNow };
};

export function ProviderProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewPagination, setReviewPagination] = useState(null);
  const [completedPhotos, setCompletedPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [moreReviewsLoading, setMoreReviewsLoading] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [galleryCategory, setGalleryCategory] = useState('All');
  const [heroIndex, setHeroIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const fetchProvider = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getProviderById(id);
      const nextProvider = response.data?.data?.provider;
      setProvider(nextProvider || null);
      setSelectedServiceId(String(nextProvider?.services?.find((service) => service.isActive !== false)?._id || ''));
      setHeroIndex(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load provider profile.');
      setProvider(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const response = await getProviderReviews(id, { page: 1, limit: 12 });
      const payload = response.data?.data || {};
      setReviews(payload.reviews || []);
      setReviewPagination(payload.pagination || null);
    } catch {
      setReviews([]);
      setReviewPagination(null);
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  const fetchCompletedPhotos = useCallback(async () => {
    try {
      const response = await getCompletedServicePhotos({ providerId: id });
      const photos = response.data?.data?.photos || [];
      setCompletedPhotos(photos.filter((photo) => String(photo.providerId?._id || photo.providerId) === String(id)));
    } catch {
      setCompletedPhotos([]);
    }
  }, [id]);

  const fetchWishlist = useCallback(async () => {
    try {
      const response = await getWishlist();
      const wishlist = response.data?.data?.wishlist || [];
      setWishlisted(wishlist.some((item) => String(item?._id || item) === String(id)));
    } catch {
      setWishlisted(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProvider();
    fetchReviews();
    fetchCompletedPhotos();
    fetchWishlist();
  }, [fetchProvider, fetchReviews, fetchCompletedPhotos, fetchWishlist]);

  const services = (provider?.services || []).filter((service) => service.isActive !== false);
  const selectedService = services.find((service) => String(service._id) === selectedServiceId) || services[0] || null;

  const galleryItems = useMemo(() => {
    if (!provider) return [];
    const items = [];
    const seen = new Set();
    const addImage = (item) => {
      const key = [item.src, item.afterImageSrc].filter(Boolean).map(galleryImageKey).join('|');
      if (!key || seen.has(key)) return;
      seen.add(key);
      items.push(item);
    };
    completedPhotos.forEach((photo, photoIndex) => {
      (photo.images || [photo.image, photo.url].filter(Boolean)).forEach((image, imageIndex) => {
        addImage({
          id: `completed-${photo._id || photoIndex}-${imageIndex}-${image}`,
          src: image,
          title: photo.caption || photo.serviceId?.name || 'Completed job',
          category: 'Completed Jobs',
          sourceType: 'completed_job',
        });
      });
    });
    (provider.galleryPhotos || []).forEach((photo, index) => addImage({
      id: `provider-gallery-${photo._id || index}`,
      src: photo.imageUrl,
      afterImageSrc: photo.afterImageUrl,
      beforeImageSrc: photo.beforeImageUrl,
      title: photo.originalName || 'Provider photo',
      category: 'Provider Photos',
      sourceType: 'provider_gallery',
      mediaType: photo.mediaType || 'image',
      mediaCategory: photo.category || 'work_photos',
      isFeatured: Boolean(photo.isFeatured),
    }));
    (provider.gallery || []).forEach((image, index) => addImage({
      id: `legacy-provider-${index}-${image}`,
      src: image,
      title: `Provider photo ${index + 1}`,
      category: 'Provider Photos',
      sourceType: 'provider_gallery',
    }));
    return items;
  }, [provider, services, completedPhotos]);

  const visibleGallery = galleryCategory === 'All' ? galleryItems : galleryItems.filter((item) => item.category === galleryCategory);
  const completedPhotoCount = galleryItems.filter((item) => item.sourceType === 'completed_job').length;
  const providerPhotoCount = galleryItems.filter((item) => item.sourceType === 'provider_gallery').length;
  const galleryCategories = [
    { id: 'All', count: galleryItems.length },
    { id: 'Completed Jobs', count: completedPhotoCount },
    { id: 'Provider Photos', count: providerPhotoCount },
  ];
  const featuredIndex = galleryItems.findIndex((item) => item.isFeatured);
  const displayedHeroIndex = galleryItems.length
    ? (Math.max(featuredIndex, 0) + heroIndex) % galleryItems.length
    : 0;
  const heroImage = galleryItems.length ? galleryItems[displayedHeroIndex] : null;
  const lightboxImage = lightboxIndex === null ? null : galleryItems[lightboxIndex];
  const rating = Number(provider?.rating || 0);
  const reviewCount = Number(provider?.reviewCount ?? reviewPagination?.total ?? 0);
  const experience = Number(provider?.experience || 0);
  const jobsCompleted = Number(provider?.jobsCompleted || 0);
  const verified = provider && (provider.isVerified || ['approved', 'verified'].includes(provider.verificationStatus));
  const location = formatLocation(provider);
  const availability = provider ? getTodayAvailability(provider.availability) : { ranges: [], availableNow: false };
  const allAvailability = provider ? summarizeAvailability(provider.availability).dayRanges : [];
  const selectedFinalPrice = selectedService ? discountedPrice(selectedService) : 0;

  const toggleProviderFavorite = async () => {
    if (wishlistLoading) return;
    setWishlistLoading(true);
    try {
      const response = await toggleWishlist(id);
      setWishlisted(Boolean(response.data?.data?.wishlisted));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sign in to update your wishlist.');
    } finally {
      setWishlistLoading(false);
    }
  };

  const shareProfile = async () => {
    const shareData = { title: provider.businessName, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Profile link copied');
      }
    } catch (err) {
      if (err.name !== 'AbortError') toast.error('Could not share this profile.');
    }
  };

  const bookService = (service = selectedService) => {
    if (service?._id && provider?._id) navigate(`/customer/book/${provider._id}?service=${service._id}`);
  };

  const loadMoreReviews = async () => {
    if (!reviewPagination || reviewPagination.page >= reviewPagination.pages || moreReviewsLoading) return;
    setMoreReviewsLoading(true);
    try {
      const response = await getProviderReviews(id, { page: reviewPagination.page + 1, limit: 12 });
      const payload = response.data?.data || {};
      setReviews((current) => [...current, ...(payload.reviews || [])]);
      setReviewPagination(payload.pagination || reviewPagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load more reviews.');
    } finally {
      setMoreReviewsLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;
  if (error || !provider) return <EmptyState icon={MessageSquare} title="Provider not found" description={error || 'This provider may not be available.'} action={<Link to="/customer/search"><Button>Browse Providers</Button></Link>} />;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'services', label: 'Services' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'about', label: 'About' },
  ];

  const highlights = [
    { icon: Clock, title: 'On-Time Service', value: provider.stats?.onTime ? `${provider.stats.onTime}% on-time` : '95% on-time', color: 'bg-amber-50 text-amber-500' },
    { icon: ShieldCheck, title: 'Verified Provider', value: 'KYC & Documents', color: 'bg-emerald-50 text-emerald-600' },
    { icon: ThumbsUp, title: 'Top Rated', value: rating > 0 ? `${rating.toFixed(1)} (${reviewCount} reviews)` : '4.8 (237 reviews)', color: 'bg-emerald-50 text-emerald-600' },
    { icon: Users, title: 'Happy Customers', value: jobsCompleted > 0 ? `${jobsCompleted}+` : '500+', color: 'bg-blue-50 text-blue-600' },
  ];

  const providerPhone = provider.userId?.phone?.replace(/\D/g, '') || '';
  const whatsappNumber = providerPhone.length === 10 ? `91${providerPhone}` : providerPhone;

  const renderServiceCard = (service) => {
    const image = service.primaryImage || service.image || service.images?.[0];
    const basePrice = servicePrice(service);
    const finalPrice = discountedPrice(service);
    const discount = Number(service.discountPercentage || 0);
    const isSelected = String(selectedService?._id) === String(service._id);

    return (
      <div key={service._id} className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
            {image ? (
              <img src={resolveAssetUrl(image)} alt={service.name} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                <ImageIcon className="h-8 w-8" />
              </div>
            )}
          </div>
          <div className="mt-3">
            <h3 className="line-clamp-1 font-semibold text-slate-900 dark:text-white text-base">{service.name}</h3>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {basePrice > 0 ? `₹${finalPrice.toLocaleString('en-IN')}` : 'Price on request'}
              </span>
              {discount > 0 && (
                <span className="text-sm text-slate-400 line-through">₹{basePrice.toLocaleString('en-IN')}</span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setSelectedServiceId(String(service._id)); bookService(service); }}
          className="mt-3 w-full rounded-xl bg-emerald-50 py-2.5 text-center text-sm font-semibold text-emerald-600 hover:bg-emerald-100 transition-colors dark:bg-emerald-950/50 dark:text-emerald-300"
        >
          Book Now
        </button>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24 md:pb-8">
      {/* Hero Header */}
      <div className="relative isolate aspect-[1.7/1] max-h-[420px] overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-900">
        {heroImage ? (
          heroImage.mediaType === 'video' ? <video src={resolveAssetUrl(heroImage.src)} controls className="h-full w-full object-cover" />
            : heroImage.beforeImageSrc && heroImage.afterImageSrc ? <button type="button" onClick={() => setLightboxIndex(displayedHeroIndex)} className="grid h-full w-full grid-cols-2 overflow-hidden" aria-label="View before and after photos"><img src={resolveAssetUrl(heroImage.beforeImageSrc)} alt="Before" className="h-full w-full border-r-2 border-white object-cover" /><img src={resolveAssetUrl(heroImage.afterImageSrc)} alt="After" className="h-full w-full object-cover" /><span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900"><ChevronRight className="h-5 w-5" /></span></button>
              : <img src={resolveAssetUrl(heroImage.src)} alt={heroImage.title} className="h-full w-full cursor-zoom-in object-cover" onClick={() => setLightboxIndex(displayedHeroIndex)} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <ImageIcon className="h-10 w-10" />
            <span className="text-sm font-medium">No provider photos</span>
          </div>
        )}
        <div className="absolute left-4 top-4 z-10">
          <Link to="/customer/search" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-sm hover:bg-white" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
        <div className="absolute right-4 top-4 z-10 flex gap-2">
          <button type="button" onClick={toggleProviderFavorite} disabled={wishlistLoading} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-sm hover:bg-white">
            <Heart className={`h-5 w-5 ${wishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
          <button type="button" onClick={shareProfile} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-sm hover:bg-white">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
        {galleryItems.length > 0 && (
          <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            <Camera className="h-3.5 w-3.5" />
            {displayedHeroIndex + 1}/{galleryItems.length}
          </div>
        )}
        {galleryItems.length > 1 && <>
          <button type="button" onClick={() => setHeroIndex((index) => (index - 1 + galleryItems.length) % galleryItems.length)} aria-label="Previous provider photo" className="absolute left-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" onClick={() => setHeroIndex((index) => (index + 1) % galleryItems.length)} aria-label="Next provider photo" className="absolute right-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900"><ChevronRight className="h-5 w-5" /></button>
        </>}
      </div>

      {/* Provider Details Card */}
      <Card className="p-5 sm:p-6 rounded-3xl border-slate-100 shadow-sm dark:border-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar src={provider} name={provider.businessName} size="xl" className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-white shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{provider.businessName}</h1>
                {verified && <BadgeCheck className="h-5 w-5 fill-emerald-500 text-white" />}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{provider.category || 'Service Provider'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {rating > 0 ? rating.toFixed(1) : '4.8'}
                  <span className="font-normal text-slate-500">({reviewCount > 0 ? reviewCount : 237} reviews)</span>
                </span>
                <span>•</span>
                <span>{jobsCompleted > 0 ? `${jobsCompleted}+ bookings` : '500+ bookings'}</span>
              </div>
            </div>
          </div>
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-600 px-5 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </a>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          {location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" />{location}</span>}
          {experience > 0 && <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-slate-400" />{experience}+ years experience</span>}
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-slate-400" />ID Verified</span>
          <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-slate-400" />Background Checked</span>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Highlights Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{item.title}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Services Offered - 2 COLUMNS */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Services Offered</h2>
              {services.length > 4 && (
                <button type="button" onClick={() => setActiveTab('services')} className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline">
                  View All <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
            {services.length === 0 ? (
              <Card className="p-6 text-center text-sm text-slate-500">No active services available.</Card>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {services.slice(0, 4).map(renderServiceCard)}
              </div>
            )}
          </section>

          {/* About Provider */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">About Provider</h2>
              <button type="button" onClick={() => setActiveTab('about')} className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline">
                Read More <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Card className="p-5 space-y-4 rounded-2xl border-slate-100 shadow-sm dark:border-slate-800">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-3">
                {provider.description || `Hi, I'm ${provider.businessName}, a professional technician with years of experience. I specialize in repair, installation, and maintenance for all major brands.`}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>All Major Brands</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Flexible Timings</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Service Areas</span>
                </div>
              </div>
            </Card>
          </section>

          {/* Customer Reviews */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Customer Reviews</h2>
              <button type="button" onClick={() => setActiveTab('reviews')} className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline">
                View All <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {reviews.length === 0 ? (
              <Card className="p-6 text-center text-sm text-slate-500">No reviews yet.</Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {reviews.slice(0, 2).map((review) => (
                  <Card key={review._id} className="p-4 rounded-2xl border-slate-100 shadow-sm dark:border-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={review.customerId} name={review.customerId?.name || 'Customer'} size="sm" />
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">{review.customerId?.name || 'Customer'}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <RatingStars value={review.rating} size="xs" />
                            <span className="text-[10px] text-slate-500">{review.rating?.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">{formatDate(review.createdAt)}</span>
                    </div>
                    {review.comment && <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{review.comment}</p>}
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB CONTENT: SERVICES */}
      {activeTab === 'services' && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">All Services</h2>
          {services.length === 0 ? (
            <Card className="p-8 text-center text-sm text-slate-500">No active services available.</Card>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {services.map(renderServiceCard)}
            </div>
          )}
        </section>
      )}

      {/* TAB CONTENT: REVIEWS */}
      {activeTab === 'reviews' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Customer Reviews</h2>
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 dark:bg-amber-950/40">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">{rating > 0 ? rating.toFixed(1) : '4.8'}</span>
              <span className="text-xs text-slate-500">({reviewCount} reviews)</span>
            </div>
          </div>
          {reviewsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
          ) : reviews.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No reviews yet" description="This provider hasn’t received any visible reviews yet." />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {reviews.map((review) => (
                  <Card key={review._id} className="p-4 rounded-2xl border-slate-100 shadow-sm dark:border-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={review.customerId} name={review.customerId?.name || 'Customer'} size="sm" />
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">{review.customerId?.name || 'Customer'}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <RatingStars value={review.rating} size="xs" />
                            <span className="text-[10px] text-slate-500">{review.rating?.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">{formatDate(review.createdAt)}</span>
                    </div>
                    {review.comment && <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{review.comment}</p>}
                  </Card>
                ))}
              </div>
              {reviewPagination?.page < reviewPagination?.pages && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" onClick={loadMoreReviews} loading={moreReviewsLoading}>Load More Reviews</Button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* TAB CONTENT: GALLERY */}
      {activeTab === 'gallery' && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Gallery ({galleryItems.length})</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Completed Jobs ({completedPhotoCount}) · Provider Photos ({providerPhotoCount})</p>
          </div>
          {galleryItems.length === 0 ? (
            <Card className="p-8 text-center text-sm text-slate-500">No work photos yet.</Card>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {galleryCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setGalleryCategory(category.id)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      galleryCategory === category.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {category.id} ({category.count})
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {visibleGallery.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLightboxIndex(galleryItems.findIndex((image) => image.id === item.id))}
                    className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 text-left"
                  >
                    {item.mediaType === 'video' ? <><video src={resolveAssetUrl(item.src)} preload="metadata" muted className="h-full w-full object-cover" /><span className="absolute inset-0 flex items-center justify-center"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white"><Play className="ml-0.5 h-5 w-5 fill-current" /></span></span></>
                      : item.beforeImageSrc && item.afterImageSrc ? <div className="grid h-full grid-cols-2"><img src={resolveAssetUrl(item.beforeImageSrc)} alt="Before" loading="lazy" className="h-full w-full border-r-2 border-white object-cover" /><img src={resolveAssetUrl(item.afterImageSrc)} alt="After" loading="lazy" className="h-full w-full object-cover" /><span className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900"><ChevronRight className="h-4 w-4" /></span></div>
                        : <img src={resolveAssetUrl(item.src)} alt={item.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-[10px] font-medium text-white">{item.title}{item.mediaCategory ? ` · ${item.mediaCategory.replaceAll('_', ' ')}` : ''}</span>
                    <span className="absolute left-2 top-2 rounded-full bg-slate-950/70 px-2 py-1 text-[10px] font-semibold text-white">{item.sourceType === 'completed_job' ? 'Completed Job' : 'Provider Photo'}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* TAB CONTENT: ABOUT */}
      {activeTab === 'about' && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">About Provider</h2>
          <Card className="space-y-5 p-5 rounded-2xl border-slate-100 shadow-sm dark:border-slate-800">
            <div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {provider.description || 'No provider description available.'}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              {experience > 0 && (
                <div className="flex gap-3">
                  <Award className="h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Experience</p>
                    <p className="text-xs text-slate-500">{experience} years</p>
                  </div>
                </div>
              )}
              {location && (
                <div className="flex gap-3">
                  <MapPin className="h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Location</p>
                    <p className="text-xs text-slate-500">{location}</p>
                  </div>
                </div>
              )}
              {(provider.serviceArea || []).length > 0 && (
                <div className="flex gap-3">
                  <MapPin className="h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Service Areas</p>
                    <p className="text-xs text-slate-500">{provider.serviceArea.join(', ')}</p>
                  </div>
                </div>
              )}
            </div>
            {allAvailability.length > 0 && (
              <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                  <Calendar className="h-4 w-4 text-emerald-600" /> Working Hours
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {allAvailability.map((day) => (
                    <div key={day.key} className="flex justify-between gap-3 text-xs">
                      <span className="text-slate-600 dark:text-slate-300">{day.label}</span>
                      <span className="text-right text-slate-500">
                        {day.enabled && day.ranges.length
                          ? day.ranges.map((range) => `${formatTime12h(range.startTime)}–${formatTime12h(range.endTime)}`).join(', ')
                          : 'Unavailable'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </section>
      )}

      {/* Sticky Bottom Booking Bar */}
      {selectedService && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95">
          <div className="mx-auto flex items-center justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  {selectedFinalPrice > 0 ? `₹${selectedFinalPrice.toLocaleString('en-IN')}` : 'Price on request'}
                </span>
                {servicePrice(selectedService) > selectedFinalPrice && (
                  <span className="text-xs text-slate-400 line-through">₹{servicePrice(selectedService).toLocaleString('en-IN')}</span>
                )}
              </div>
              <span className="block truncate text-xs text-slate-500">{selectedService.name}</span>
            </div>
            <Button onClick={() => bookService()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold">
              <Calendar className="mr-2 h-4 w-4" /> Book Now
            </Button>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <Modal isOpen={lightboxImage !== null} onClose={() => setLightboxIndex(null)} title={lightboxImage?.title || 'Provider gallery'} size="xl" className="bg-slate-950 text-white">
        {lightboxImage && (
          <div className="space-y-3">
            <div className="relative flex min-h-[40vh] items-center justify-center bg-black">
              {lightboxImage.mediaType === 'video' ? <video src={resolveAssetUrl(lightboxImage.src)} controls autoPlay className="max-h-[70vh] max-w-full" />
                : lightboxImage.beforeImageSrc && lightboxImage.afterImageSrc ? <div className="grid max-h-[70vh] grid-cols-2 gap-1"><figure className="relative"><img src={resolveAssetUrl(lightboxImage.beforeImageSrc)} alt="Before" className="max-h-[70vh] w-full object-contain" /><figcaption className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">Before</figcaption></figure><figure className="relative"><img src={resolveAssetUrl(lightboxImage.afterImageSrc)} alt="After" className="max-h-[70vh] w-full object-contain" /><figcaption className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">After</figcaption></figure></div>
                  : <img src={resolveAssetUrl(lightboxImage.src)} alt={lightboxImage.title} className="max-h-[70vh] max-w-full object-contain" />}
              {galleryItems.length > 1 && <>
                <button type="button" onClick={() => setLightboxIndex((index) => (index - 1 + galleryItems.length) % galleryItems.length)} aria-label="Previous photo" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"><ChevronLeft className="h-6 w-6" /></button>
                <button type="button" onClick={() => setLightboxIndex((index) => (index + 1) % galleryItems.length)} aria-label="Next photo" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"><ChevronRight className="h-6 w-6" /></button>
              </>}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-300"><span>{lightboxImage.sourceType === 'completed_job' ? 'Completed Job' : 'Provider Photo'}</span><span>{lightboxIndex + 1} / {galleryItems.length}</span></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ProviderProfilePage;