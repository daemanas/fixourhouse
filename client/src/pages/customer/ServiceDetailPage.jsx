import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Wrench,
  Star,
  Clock,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getServiceById, getServiceReviews } from '../../services/serviceService';
import { createBooking } from '../../services/bookingService';
import resolveAssetUrl from '../../utils/assetUrl';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';

const TIME_SLOTS = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
  '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM',
];

const toApiTime = (displayTime) => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(displayTime);
  if (!match) return displayTime;

  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
};

export function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState({
    line1: user?.locationData?.address || user?.location || '',
    city: user?.locationData?.city || '',
    state: user?.locationData?.state || '',
    pincode: user?.locationData?.pincode || '',
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getServiceById(id, { reviewPage: 1, reviewLimit: 3 });
        setData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load service details.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id]);

  const handleLoadMoreReviews = async () => {
    if (!data?.reviewPagination || data.reviewPagination.page >= data.reviewPagination.pages) return;
    setLoadingMoreReviews(true);
    try {
      const response = await getServiceReviews(id, {
        page: data.reviewPagination.page + 1,
        limit: 3,
      });
      const nextPage = response.data?.data;
      if (nextPage) {
        setData((current) => ({
          ...current,
          reviews: [...(current.reviews || []), ...(nextPage.reviews || [])],
          reviewPagination: nextPage.pagination,
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load more reviews.');
    } finally {
      setLoadingMoreReviews(false);
    }
  };

  const getCalculatedPrice = (rawPrice, discountPct) => {
    const basePrice = Number(rawPrice ?? 0);
    const discount = Number(discountPct ?? 0);
    if (discount > 0) {
      const discounted = basePrice * (1 - discount / 100);
      return Math.round(discounted * 100) / 100;
    }
    return basePrice;
  };

  const buildProviderSelection = (offer) => {
    const providerService = offer.providerService || {};
    const basePrice = Number(offer.price ?? providerService.price ?? data.service.startingPrice ?? data.service.price ?? 0);
    const offerDiscount = Number(providerService.discountPercentage || offer.discountPercentage || data.service.discountPercentage || 0);
    const provider = offer.provider || {};

    return {
      provider,
      selectedServiceId: String(offer.serviceId || data.service._id),
      selectedProviderId: String(provider._id || provider),
      selectedProviderServiceId: String(offer.providerServiceId || providerService._id || ''),
      providerService,
      basePrice,
      discountPercentage: offerDiscount,
      price: getCalculatedPrice(basePrice, offerDiscount),
      duration: providerService.durationMinutes || offer.duration || data.service.durationMinutes,
    };
  };

  const handleOpenBooking = (providerTier = null) => {
    if (!user) {
      toast.error('Please sign in as a customer to book services');
      navigate('/auth/login');
      return;
    }

    const providersOfferingService = Array.isArray(data?.providersOfferingService)
      ? data.providersOfferingService
      : Array.isArray(data?.providers)
        ? data.providers
        : [];

    const discountPercentage = Number(data?.service?.discountPercentage ?? 0);
    let targetProvider = providerTier;

    if (!targetProvider) {
      if (providersOfferingService.length > 0) {
        targetProvider = buildProviderSelection(providersOfferingService[0]);
      } else if (data?.service?.providerId) {
        const p = data.service.providerId;
        const rawP = Number(data.service.startingPrice ?? data.service.price ?? 0);
        targetProvider = {
          provider: typeof p === 'object' ? p : { _id: p },
          selectedServiceId: String(data.service._id),
          selectedProviderId: String(typeof p === 'object' ? p._id : p),
          selectedProviderServiceId: '',
          providerService: data.service,
          basePrice: rawP,
          discountPercentage,
          price: getCalculatedPrice(rawP, discountPercentage),
          duration: data.service.durationMinutes,
        };
      }
    }

    if (!targetProvider || (!targetProvider.selectedProviderId && !targetProvider.provider?._id)) {
      toast.error('No local provider is currently available for this service.');
      return;
    }

    setSelectedProvider(targetProvider);
    setIsBookingOpen(true);
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      toast.error('Please select date and time slot');
      return;
    }
    if (!address.line1 || !address.city || !address.state || !address.pincode) {
      toast.error('Please fill in complete address details');
      return;
    }
    if (!/^[1-9]\d{5}$/.test(address.pincode)) {
      toast.error('Please enter a valid 6-digit Indian pincode');
      return;
    }

    const providerId = selectedProvider?.selectedProviderId || selectedProvider?.provider?._id;
    if (!providerId) {
      toast.error('No provider selected or available.');
      return;
    }

    setBookingLoading(true);
    try {
      await createBooking({
        providerId,
        serviceId: selectedProvider?.selectedServiceId || selectedProvider?.serviceId || data.service._id,
        providerServiceId: selectedProvider?.selectedProviderServiceId || selectedProvider?.providerServiceId || undefined,
        scheduledDate: new Date(selectedDate).toISOString(),
        scheduledTime: toApiTime(selectedTime),
        address,
        notes: notes || undefined,
        paymentMethod,
      });
      toast.success('Booking request placed successfully!');
      setIsBookingOpen(false);
      navigate('/customer/bookings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place booking.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-7 px-3 py-5 sm:px-4 lg:px-6" aria-label="Loading service details">
        <div className="h-4 w-52 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="aspect-[4/3] animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="space-y-4 py-2">
            <div className="h-5 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-10 w-4/5 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="h-12 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
        <div className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        <div className="grid grid-cols-2 gap-3"><div className="aspect-[4/3] animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" /><div className="aspect-[4/3] animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" /></div>
        <div className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  if (error || !data || !data.service) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <Card className="p-8 text-center bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400">Service Not Found</h2>
          <p className="text-sm text-red-600 dark:text-red-300 mt-2">{error || 'The requested service catalog item does not exist.'}</p>
          <Link to="/customer/search" className="inline-block mt-4">
            <Button variant="outline">Return to Catalog Search</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const {
    service,
    completedPhotos = [],
    reviews = [],
    ratingBreakdown = {},
  } = data;

  const providersOfferingService = Array.isArray(data.providersOfferingService)
    ? data.providersOfferingService
    : Array.isArray(data.providers)
      ? data.providers
      : [];

  const exactServicePhotos = completedPhotos.filter((photoRecord) =>
    String(photoRecord.serviceId?._id || photoRecord.serviceId) === String(service._id)
  );

  const completedPhotoItems = exactServicePhotos
    .flatMap((photoRecord) => {
      const imagePaths = Array.isArray(photoRecord.images) && photoRecord.images.length > 0
        ? photoRecord.images
        : [photoRecord.url || photoRecord.imageUrl || photoRecord.path].filter(Boolean);

      return imagePaths.map((imagePath, index) => ({
        ...photoRecord,
        _id: `${photoRecord._id || 'completed-photo'}-${index}`,
        title: photoRecord.caption || 'Completed work photo',
        description: photoRecord.caption || '',
        url: resolveAssetUrl(imagePath),
      }));
    })
    .filter((photo) => photo.url);

  const averageRating = Number(
    data.averageRating ??
    service.averageRating ??
    service.rating ??
    0
  );

  const safeAverageRating = Number.isFinite(averageRating) ? averageRating : 0;
  const totalReviews = Number(data.reviewPagination?.total ?? service.reviewCount ?? reviews.length);

  const startingPrice = Number(
    service.startingPrice ??
    service.price ??
    0
  );

  const discountPercentage = Number(service.discountPercentage ?? 0);
  const hasDiscount = discountPercentage > 0;

  const finalStartingPrice = getCalculatedPrice(startingPrice, discountPercentage);
  const finalPrice = finalStartingPrice;

  const serviceImage = service.primaryImage || service.image || service.images?.[0] || '';
  const serviceImageUrl = serviceImage ? resolveAssetUrl(serviceImage) : '';

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-8 sm:pb-12 px-3 sm:px-4 lg:px-6">

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 overflow-x-auto whitespace-nowrap scrollbar-hide pb-1">
        <Link to="/customer/search" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
          Services Catalog
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>{service.serviceCategoryId?.name || 'Category'}</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-ink-light dark:text-ink-dark truncate max-w-[180px] sm:max-w-xs">{service.name}</span>
      </nav>

      {/* Hero Header Section */}
      <div className="grid grid-cols-1 items-start gap-5 sm:gap-7 lg:grid-cols-2 lg:gap-8">
        <div className="lg:col-span-1">
          <div className="relative w-full max-w-xl mx-auto lg:max-w-none rounded-2xl sm:rounded-3xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 aspect-[4/3] sm:aspect-[16/11] lg:aspect-square shadow-sm">
            {serviceImageUrl ? (
              <img
                src={serviceImageUrl}
                alt={service.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <Wrench className="h-16 w-16 stroke-1 mb-2" />
                <span className="text-xs">No preview image available</span>
              </div>
            )}
            {hasDiscount && (
              <div className="absolute top-4 right-4 bg-red-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-md">
                {discountPercentage}% OFF
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-4 sm:space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {service.serviceCategoryId?.name && (
              <Badge variant="primary">{service.serviceCategoryId.name}</Badge>
            )}
            {service.serviceTypeId?.name && (
              <Badge variant="outline">{service.serviceTypeId.name}</Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight text-ink-light dark:text-ink-dark break-words">
            {service.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-ink-light dark:text-ink-dark">{safeAverageRating.toFixed(1)}</span>
              <span>({totalReviews} reviews)</span>
            </div>

            {service.durationMinutes && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>Estimated ~{service.durationMinutes} mins</span>
              </div>
            )}
          </div>

          <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-[15px] leading-6 pt-1 sm:pt-2 break-words">
            {service.description}
          </p>

          <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-card-dark border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
            <div>
              <span className="text-xs text-gray-400 block">Catalog Price</span>
              <span className="mt-0.5 block text-sm font-semibold text-ink-light dark:text-ink-dark">₹{startingPrice.toLocaleString('en-IN')}</span>
              {hasDiscount && <span className="mt-1 block text-xs text-emerald-700 dark:text-emerald-400">{discountPercentage}% discount</span>}
              <span className="mt-1 block text-xs text-gray-400">Final catalog price</span>
              <span className="block text-2xl font-bold text-primary-600 dark:text-primary-400">₹{finalPrice.toLocaleString('en-IN')}</span>
            </div>
            <div className="text-left sm:text-right text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="h-4 w-4" /> Verified Local Fix Guarantee
              </span>
              <p className="mt-0.5">Transparent pricing & upfront quotes</p>
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => handleOpenBooking()}
          >
            Book Service
          </Button>
        </div>
      </div>

      {/* About Section */}
      <section className="space-y-3 border-t border-gray-100 pt-6 dark:border-gray-800" aria-labelledby="about-service-heading">
        <h2 id="about-service-heading" className="text-xl font-bold text-ink-light dark:text-ink-dark">About This Service</h2>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-card-dark sm:p-6">
          {service.description ? (
            <>
              <p className={`whitespace-pre-line text-sm leading-6 text-gray-600 dark:text-gray-300 sm:text-[15px] ${descriptionExpanded ? '' : 'line-clamp-4'}`}>
                {service.description}
              </p>
              {service.description.length > 260 && (
                <button
                  type="button"
                  onClick={() => setDescriptionExpanded((current) => !current)}
                  className="mt-3 min-h-9 text-sm font-semibold text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300"
                >
                  {descriptionExpanded ? 'Read Less' : 'Read More'}
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No service description has been provided yet.</p>
          )}
        </div>
      </section>

      {/* Completed Work Photo Gallery */}
      <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-xl font-bold text-ink-light dark:text-ink-dark flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary-500" />
            Completed Job Photos ({completedPhotoItems.length})
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real photos uploaded by verified local providers after completing work for this service.
          </p>
        </div>

        {completedPhotoItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800">
            <span className="block font-medium">No completed work photos yet.</span>
            <span className="mt-1 block">Verified providers will add photos after completing this service.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {completedPhotoItems.slice(0, 2).map((photo, index) => {
              const remainingPhotos = completedPhotoItems.length - 2;
              const isLastVisiblePhoto = index === 1 && remainingPhotos > 0;

              return (
                <button
                  type="button"
                  key={photo._id}
                  onClick={() => { setActivePhoto(photo); setActivePhotoIndex(index); }}
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-gray-100 bg-gray-100 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:bg-gray-800"
                  aria-label={isLastVisiblePhoto ? `View all ${completedPhotoItems.length} completed service photos` : `View completed service photo ${index + 1}`}
                >
                  <img
                    src={photo.url}
                    alt={photo.title || 'Completed work photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {!isLastVisiblePhoto && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end">
                      <p className="text-white text-xs font-semibold truncate">
                        {photo.title || 'Completed Work'}
                      </p>
                      <p className="text-gray-300 text-[10px] truncate">
                        {photo.providerId?.businessName || 'Provider Photo'}
                      </p>
                    </div>
                  )}

                  {isLastVisiblePhoto && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/55 group-hover:bg-black/65 transition-colors">
                      <span className="text-white text-sm font-bold sm:text-base">
                        +{remainingPhotos} More
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <section className="space-y-4 border-t border-gray-100 pt-6 dark:border-gray-800" aria-labelledby="available-providers-heading">
        <div>
          <h2 id="available-providers-heading" className="text-xl font-bold text-ink-light dark:text-ink-dark">Available Local Providers</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Compare verified providers offering this service.</p>
        </div>
        {providersOfferingService.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700">No local providers are available for this service yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {providersOfferingService.map((offer) => {
              const selection = buildProviderSelection(offer);
              const provider = offer.provider || {};
              const providerName = provider.businessName || provider.userId?.name || 'Local Specialist';
              const providerLocation = provider.location || {};
              const location = [providerLocation.city, providerLocation.district, providerLocation.state].filter(Boolean).join(', ');

              return (
                <Card key={selection.selectedProviderServiceId || selection.selectedProviderId} className="flex min-w-0 items-center gap-3 p-4">
                  <Avatar src={provider} name={providerName} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-ink-light dark:text-ink-dark">{providerName}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{Number(provider.rating || 0).toFixed(1)} ({Number(provider.reviewCount || 0)} reviews)</span>
                      {location && <span>{location}</span>}
                      {Number(provider.experience) > 0 && <span>{provider.experience} yrs experience</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-bold text-primary-700 dark:text-primary-300">₹{selection.price.toLocaleString('en-IN')}</span>
                      {selection.discountPercentage > 0 && <span className="text-xs text-gray-400 line-through">₹{selection.basePrice.toLocaleString('en-IN')}</span>}
                      <span className="text-xs text-gray-500 dark:text-gray-400">Provider offer</span>
                    </div>
                  </div>
                  <Button type="button" size="sm" onClick={() => handleOpenBooking(selection)}>Book</Button>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Customer Reviews Section */}
      <section className="space-y-6 border-t border-gray-100 pt-6 dark:border-gray-800" aria-labelledby="service-reviews-heading">
        <h2 className="text-xl sm:text-2xl font-bold text-ink-light dark:text-ink-dark">
          Customer Reviews &amp; Ratings ({totalReviews})
        </h2>

        <div className="grid grid-cols-1 gap-5 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-card-dark sm:p-6 md:grid-cols-3">
          <div className="flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 pr-0 md:pr-6 pb-4 md:pb-0">
            <span className="text-4xl font-extrabold text-ink-light dark:text-ink-dark">{safeAverageRating.toFixed(1)}</span>
            <div className="flex items-center gap-1 my-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${s <= Math.round(averageRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</span>
          </div>

          <div className="md:col-span-2 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingBreakdown[stars] || 0;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs">
                  <span className="w-12 shrink-0 text-gray-600 dark:text-gray-300 font-medium">{stars} stars</span>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="w-8 text-right text-gray-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {reviews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700">No customer reviews for this service yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <Card key={rev._id} className="p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar src={rev.customerId?.avatar} name={rev.customerId?.name} size="sm" />
                    <div>
                      <h4 className="text-xs font-bold text-ink-light dark:text-ink-dark">{rev.customerId?.name || 'Customer'}</h4>
                      <p className="text-[10px] text-gray-400">{new Date(rev.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">{rev.comment || 'No written comment.'}</p>
              </Card>
            ))}
          </div>
        )}

        {data.reviewPagination?.page < data.reviewPagination?.pages && (
          <div className="flex justify-center">
            <Button type="button" variant="outline" onClick={handleLoadMoreReviews} loading={loadingMoreReviews} disabled={loadingMoreReviews}>
              {reviews.length <= 3 ? 'View All Reviews' : 'Load More Reviews'}
            </Button>
          </div>
        )}
      </section>

      {/* Booking Modal */}
      {selectedProvider && (
        <Modal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          title={`Book ${service.name}`}
          subtitle={`Provider: ${selectedProvider.provider?.businessName || selectedProvider.provider?.userId?.name || 'Local Specialist'}`}
          size="lg"
        >
          <form onSubmit={handleCreateBooking} className="space-y-4 pt-2">
            {/* If multiple providers offer this service, allow choosing between them */}
            {providersOfferingService.length > 1 && (
              <Select
                label="Select Provider"
                options={providersOfferingService.map((offer) => {
                  const selection = buildProviderSelection(offer);
                  const p = offer.provider || {};
                  const pName = p.businessName || p.userId?.name || 'Local Specialist';
                  return {
                    value: String(p._id),
                    label: `${pName} - ₹${selection.price.toLocaleString('en-IN')}`,
                  };
                })}
                value={String(selectedProvider?.selectedProviderId || selectedProvider?.provider?._id || '')}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const offer = providersOfferingService.find(
                    (o) => String(o.provider?._id) === selectedId
                  );
                  if (offer) {
                    setSelectedProvider(buildProviderSelection(offer));
                  }
                }}
              />
            )}

            <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Avatar
                    src={selectedProvider.provider}
                    name={selectedProvider.provider?.businessName || selectedProvider.provider?.userId?.name || 'Provider'}
                    size="xs"
                  />
                  <span className="font-medium text-ink-light dark:text-ink-dark">
                    {selectedProvider.provider?.businessName || selectedProvider.provider?.userId?.name || 'Local Specialist'}
                  </span>
                </div>
                <span className="text-gray-400 block">Selected Service</span>
                <span className="block font-semibold text-ink-light dark:text-ink-dark">{selectedProvider.providerService?.name || service.name}</span>
                <span className="mt-1 block text-gray-400">Provider Offer Price</span>
                <span className="font-semibold text-sm text-ink-light dark:text-ink-dark">₹{Number(selectedProvider.basePrice ?? selectedProvider.price ?? 0).toLocaleString('en-IN')}</span>
                {Number(selectedProvider.discountPercentage) > 0 && <span className="ml-2 text-xs text-gray-400">{selectedProvider.discountPercentage}% off</span>}
                <span className="mt-1 block text-gray-400">Final Payable Price</span>
                <span className="font-bold text-sm text-primary-600 dark:text-primary-400">₹{Number(selectedProvider.price ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block">Est. Duration</span>
                <span className="font-semibold text-ink-light dark:text-ink-dark">~{selectedProvider.duration || service.durationMinutes || 60} mins</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <Input
                label="Select Date"
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />

              <Select
                label="Select Time Slot"
                required
                options={TIME_SLOTS.map((t) => ({ value: t, label: t }))}
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-ink-light dark:text-ink-dark uppercase tracking-wider">Service Location</h4>
              <Input
                label="Address Line 1"
                placeholder="Door/Flat No, Building, Street"
                required
                value={address.line1}
                onChange={(e) => setAddress({ ...address, line1: e.target.value })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <Input
                  label="City"
                  required
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                />
                <Input
                  label="State"
                  required
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                />
                <Input
                  label="Pincode"
                  required
                  maxLength={6}
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <Select
                label="Payment Method"
                options={[
                  { value: 'cash', label: 'Cash on Completion' },
                  { value: 'online', label: 'Online Payment (Razorpay / UPI)' },
                ]}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />

              <Textarea
                label="Special Instructions / Notes"
                placeholder="Any specific requests or requirements..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => setIsBookingOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={bookingLoading} className="w-full sm:w-auto">
                Confirm Booking
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Completed Work Lightbox Modal */}
      {activePhoto && (
        <Modal
          isOpen={!!activePhoto}
          onClose={() => setActivePhoto(null)}
          title={activePhoto.title || 'Completed Job Photo'}
          size="xl"
        >
          <div className="space-y-4">
            <div className="relative max-h-[60vh] rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={completedPhotoItems[activePhotoIndex]?.url || activePhoto.url}
                alt={
                  completedPhotoItems[activePhotoIndex]?.title ||
                  activePhoto.title ||
                  'Completed Job Photo'
                }
                className="max-h-[65vh] sm:max-h-[70vh] max-w-full w-auto object-contain"
              />

              {completedPhotoItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setActivePhotoIndex((prev) =>
                      prev === 0
                        ? completedPhotoItems.length - 1
                        : prev - 1
                    );
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-black/75 transition-colors"
                  aria-label="Previous photo"
                >
                  ‹
                </button>
              )}

              {completedPhotoItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setActivePhotoIndex((prev) =>
                      prev === completedPhotoItems.length - 1
                        ? 0
                        : prev + 1
                    );
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-black/75 transition-colors"
                  aria-label="Next photo"
                >
                  ›
                </button>
              )}
            </div>

            {completedPhotoItems.length > 1 && (
              <div className="text-center text-xs text-gray-400">
                {activePhotoIndex + 1} / {completedPhotoItems.length}
              </div>
            )}

            {completedPhotoItems[activePhotoIndex]?.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {completedPhotoItems[activePhotoIndex].description}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>
                Completed by:{' '}
                <strong className="text-ink-light dark:text-ink-dark">
                  {completedPhotoItems[activePhotoIndex]?.providerId?.businessName ||
                    'Provider'}
                </strong>
              </span>

              <span>
                {completedPhotoItems[activePhotoIndex]?.createdAt
                  ? new Date(
                    completedPhotoItems[activePhotoIndex].createdAt
                  ).toLocaleDateString()
                  : ''}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ServiceDetailPage;