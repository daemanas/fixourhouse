import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  Star,
  Clock,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ChevronRight,
  User,
  Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getServiceById } from '../../services/serviceService';
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

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getServiceById(id);
        setData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load service details.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id]);

  const handleOpenBooking = (providerTier) => {
    if (!user) {
      toast.error('Please sign in as a customer to book services');
      navigate('/auth/login');
      return;
    }
    setSelectedProvider(providerTier);
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

    setBookingLoading(true);
    try {
      await createBooking({
        providerId: selectedProvider.provider._id,
        serviceId: selectedProvider.serviceId || data.service._id,
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
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Loader2 className="h-10 w-10 animate-spin text-primary-500 mb-4" />
        <p className="text-sm font-medium">Loading service details...</p>
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

  const completedPhotoItems = completedPhotos
    .flatMap((photoRecord) => {
      const imagePaths = Array.isArray(photoRecord.images) && photoRecord.images.length > 0
        ? photoRecord.images
        : [photoRecord.url || photoRecord.imageUrl || photoRecord.path].filter(Boolean);

      return imagePaths.map((imagePath, index) => ({
        ...photoRecord,
        _id: `${photoRecord._id || 'completed-photo'}-${index}`,
        url: resolveAssetUrl(imagePath),
      }));
    })
    .filter((photo) => photo.url);

  // Backend currently returns providers in `data.providers`.
  // Keep support for the older `providersOfferingService` key as well.
  const providersOfferingService = Array.isArray(data.providersOfferingService)
    ? data.providersOfferingService
    : Array.isArray(data.providers)
      ? data.providers
      : [];

  // Normalize rating so the page works whether the API sends it as
  // data.averageRating, service.averageRating, service.rating, or only reviews.
  const reviewRatingAverage = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
    : 0;

  const averageRating = Number(
    data.averageRating ??
    service.averageRating ??
    service.rating ??
    reviewRatingAverage ??
    0
  );

  const safeAverageRating = Number.isFinite(averageRating) ? averageRating : 0;

  // Normalize price because older/newer API versions may use `startingPrice`
  // or `price`. This prevents the details page from rendering only `₹`.
  const startingPrice = Number(
    service.startingPrice ??
    service.price ??
    0
  );

  const discountPercentage = Number(service.discountPercentage ?? 0);
  const hasDiscount = discountPercentage > 0;

  const finalStartingPrice = hasDiscount
    ? startingPrice * (1 - discountPercentage / 100)
    : startingPrice;

  const finalPrice = Math.round(finalStartingPrice * 100) / 100;

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-7 lg:gap-8 items-start">
        <div className="lg:col-span-1">
          <div className="relative w-full max-w-xl mx-auto lg:max-w-none rounded-2xl sm:rounded-3xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 aspect-[4/3] sm:aspect-[16/11] lg:aspect-square shadow-sm">
            {service.primaryImage || service.images?.[0] ? (
              <img
                src={service.primaryImage || service.images[0]}
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

        <div className="lg:col-span-2 min-w-0 space-y-4 sm:space-y-5">
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
              <span>({reviews.length} reviews)</span>
            </div>

            {service.durationMinutes && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>Estimated ~{service.durationMinutes} mins</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-primary-500" />
              <span>{providersOfferingService.length} Local Providers Available</span>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-[15px] leading-6 pt-1 sm:pt-2 break-words">
            {service.description}
          </p>

          <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-card-dark border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
            <div>
              <span className="text-xs text-gray-400 block">Catalog Starting Price</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  ₹{finalPrice}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-gray-400 line-through">₹{startingPrice}</span>
                )}
              </div>
            </div>
            <div className="text-left sm:text-right text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="h-4 w-4" /> Verified Local Fix Guarantee
              </span>
              <p className="mt-0.5">Transparent pricing & upfront quotes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Available Local Providers Offering This Service */}
      <div className="space-y-4 sm:space-y-5 pt-5 sm:pt-7 border-t border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink-light dark:text-ink-dark">
            Available Local Providers ({providersOfferingService.length})
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Compare prices, ratings, and choose your preferred local specialist for this service.
          </p>
        </div>

        {providersOfferingService.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No active providers currently offer this service in your area.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {providersOfferingService.map(({ provider, serviceId, price, duration, description: customDesc }) => {
              if (!provider) return null;
              const pUser = provider.userId || {};
              const pName = provider.businessName || pUser.name || 'Local Fix Pro';
              const pAvatar = provider.avatar || pUser.avatar;
              const pRating = provider.rating || 0;
              const pReviews = provider.reviewCount || 0;
              const pPrice = Number(
                price ??
                provider.pricing?.startingPrice ??
                startingPrice ??
                0
              );

              return (
                <Card key={provider._id} className="group flex min-w-0 flex-col justify-between rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-card-dark p-4 sm:p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
                  <div className="space-y-3">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar src={pAvatar} name={pName} size="md" />
                        <div>
                          <h3 className="font-bold text-ink-light dark:text-ink-dark text-sm sm:text-[15px] line-clamp-1 break-words">
                            {pName}
                          </h3>
                          <div className="flex items-center gap-1 text-xs mt-0.5">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-semibold text-ink-light dark:text-ink-dark">{pRating.toFixed(1)}</span>
                            <span className="text-gray-400">({pReviews})</span>
                          </div>
                        </div>
                      </div>
                      {provider.isVerified && (
                        <Badge variant="success" className="text-[10px] py-0.5 px-1.5">
                          Verified
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      {provider.location?.city && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          <span>{provider.location.city}, {provider.location.state || ''}</span>
                        </div>
                      )}
                      {provider.experience && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{provider.experience} years experience</span>
                        </div>
                      )}
                    </div>

                    {customDesc && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg">
                        "{customDesc}"
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Offer Price</span>
                      <span className="text-base font-bold text-primary-600 dark:text-primary-400">
                        ₹{pPrice}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full sm:w-auto min-h-10"
                      onClick={() => handleOpenBooking({ provider, serviceId, price: pPrice })}
                    >
                      Book Service
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Work Photo Gallery (Proof of Completed Jobs) */}
      <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-xl font-bold text-ink-light dark:text-ink-dark flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary-500" />
            Completed Job Photo Gallery ({completedPhotoItems.length})
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real photos uploaded by verified local providers after completing work for this service.
          </p>
        </div>

        {completedPhotoItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 dark:bg-card-dark rounded-xl border border-gray-100 dark:border-gray-800">
            No completed job photos uploaded yet for this service catalog.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
            {completedPhotoItems.slice(0, 4).map((photo, index) => {
              const remainingPhotos = completedPhotoItems.length - 4;
              const isLastVisiblePhoto = index === 3 && remainingPhotos > 0;

              return (
                <div
                  key={photo._id}
                  onClick={() => {
                    if (isLastVisiblePhoto) {
                      // Open the first photo in the lightbox.
                      // All photos remain available through the gallery modal flow.
                      setActivePhoto(photo);
                    } else {
                      setActivePhoto(photo);
                    }
                  }}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer border border-gray-100 dark:border-gray-800"
                >
                  <img
                    src={photo.url}
                    alt={photo.title || 'Completed work photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Normal hover information */}
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

                  {/* More Photos Overlay */}
                  {isLastVisiblePhoto && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/55 group-hover:bg-black/65 transition-colors">
                      <span className="text-white text-sm sm:text-base font-bold px-4 py-2 rounded-lg bg-black/35 backdrop-blur-sm">
                        +{remainingPhotos} More
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Customer Reviews Section */}
      <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-gray-800">
        <h2 className="text-xl sm:text-2xl font-bold text-ink-light dark:text-ink-dark">
          Customer Reviews & Ratings ({reviews.length})
        </h2>

        {reviews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 bg-gray-50 dark:bg-card-dark p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
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
              <span className="text-xs text-gray-500">Based on {reviews.length} ratings</span>
            </div>

            <div className="md:col-span-2 space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = ratingBreakdown[stars] || 0;
                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
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
        )}

        {reviews.length === 0 ? (
          <p className="text-sm text-gray-500">No customer reviews yet for providers offering this service.</p>
        ) : (
          <div className="space-y-4">
            {reviews.slice(0, 6).map((rev) => (
              <Card key={rev._id} className="p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar src={rev.customerId?.avatar} name={rev.customerId?.name} size="sm" />
                    <div>
                      <h4 className="text-xs font-bold text-ink-light dark:text-ink-dark">{rev.customerId?.name || 'Customer'}</h4>
                      <p className="text-[10px] text-gray-400">{new Date(rev.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">{rev.comment}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

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
            <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div>
                <span className="text-gray-400 block">Service Base Fee</span>
                <span className="font-bold text-sm text-primary-600 dark:text-primary-400">₹{Number(selectedProvider.price ?? 0)}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block">Est. Duration</span>
                <span className="font-semibold text-ink-light dark:text-ink-dark">~{service.durationMinutes || 60} mins</span>
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

            {/* Main Image */}
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

              {/* Previous */}
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

              {/* Next */}
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

            {/* Photo counter */}
            {completedPhotoItems.length > 1 && (
              <div className="text-center text-xs text-gray-400">
                {activePhotoIndex + 1} / {completedPhotoItems.length}
              </div>
            )}

            {/* Description */}
            {completedPhotoItems[activePhotoIndex]?.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {completedPhotoItems[activePhotoIndex].description}
              </p>
            )}

            {/* Provider + Date */}
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