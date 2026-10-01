import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronDown,
  Check,
  FileText,
  LayoutGrid,
  Search,
  Star,
  BadgeCheck,
  Wrench,
  X,
  MapPin,
  Calendar,
  IndianRupee,
  MessageSquare,
  Loader2,
  Phone,
  Eye,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import { getMyBookings, updateBookingStatus } from '../../services/bookingService';
import { getServiceById } from '../../services/serviceService';
import resolveAssetUrl from '../../utils/assetUrl';

const statusConfig = {
  pending: { label: 'New Request', className: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' },
  accepted: { label: 'Assigned', className: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300' },
  working: { label: 'In Progress', className: 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' },
  cancelled: { label: 'Cancelled', className: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' },
  rejected: { label: 'Rejected', className: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' },
};

const requestTabs = [
  { id: 'all', label: 'All', matches: () => true },
  { id: 'new', label: 'New', matches: (booking) => booking.status === 'pending' },
  { id: 'interested', label: 'Interested', matches: (booking) => booking.status === 'interested' },
  { id: 'assigned', label: 'Assigned', matches: (booking) => ['accepted', 'working'].includes(booking.status) },
  { id: 'completed', label: 'Completed', matches: (booking) => booking.status === 'completed' },
];

const getService = (booking) => booking.serviceSnapshot || booking.serviceId || {};
const getAddress = (booking) => booking.bookingAddress || booking.address || {};
const getCustomer = (booking) => {
  const customer = booking.customerId && typeof booking.customerId === 'object'
    ? booking.customerId
    : {};
  const snapshot = booking.customerSnapshot || {};
  return {
    ...snapshot,
    ...customer,
    name: customer.name || snapshot.name,
    phone: customer.phone || snapshot.phone,
  };
};

const getServiceImage = (booking) => {
  const snapshot = booking.serviceSnapshot || {};
  const serviceDocument = booking.serviceId && typeof booking.serviceId === 'object'
    ? booking.serviceId
    : {};
  const image = snapshot.primaryImage || snapshot.image || snapshot.images?.[0]
    || serviceDocument.primaryImage || serviceDocument.image || serviceDocument.images?.[0];
  return image ? resolveAssetUrl(image) : '';
};

const getBookingServiceId = (booking) => {
  const serviceId = booking.serviceId?._id || booking.serviceId || booking.serviceSnapshot?.serviceId;
  return serviceId ? String(serviceId) : '';
};

const getServiceType = (booking) => {
  const service = getService(booking);
  const type = service.serviceType || service.serviceTypeId || booking.serviceType;
  return typeof type === 'object' ? type?.name : type;
};

const getServiceCategory = (booking) => {
  const service = getService(booking);
  const category = service.serviceCategory || service.serviceCategoryId || service.category;
  return typeof category === 'object' ? category?.name : category;
};

const getLocation = (booking) => {
  const address = getAddress(booking);
  return [address.line1, address.city, address.state].filter(Boolean).join(', ');
};

const formatBookingDate = (date) => {
  if (!date) return '';
  const value = new Date(date);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDate = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const dayOffset = Math.round((startDate - startToday) / 86400000);
  if (dayOffset === 0) return 'Today';
  if (dayOffset === 1) return 'Tomorrow';
  return value.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatBookingTime = (time) => {
  if (!time) return '';
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return time;
  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

function ServiceImage({ booking, serviceName, hydratedImage, imageLookupComplete }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = getServiceImage(booking) || hydratedImage || '';

  if (!image && !imageLookupComplete) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" aria-label="Loading service image" />
      </div>
    );
  }

  return image && !imageFailed ? (
    <img
      src={image}
      alt={serviceName}
      loading="lazy"
      onError={() => setImageFailed(true)}
      className="h-full w-full object-cover"
    />
  ) : (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
      <Wrench className="h-9 w-9" strokeWidth={1.5} aria-hidden="true" />
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">LocalFix</span>
    </div>
  );
}

export function BookingRequestsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [serviceImages, setServiceImages] = useState({});
  useEffect(() => {
    if (selectedBooking) {
      console.log("BOOKING DETAILS:", selectedBooking);
    }
  }, [selectedBooking]);


  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyBookings({ status: 'pending' });
      setBookings(res.data.data.bookings || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load booking requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    let isCurrent = true;
    const serviceIds = [...new Set(bookings
      .filter((booking) => !getServiceImage(booking))
      .map(getBookingServiceId)
      .filter((id) => id && !Object.prototype.hasOwnProperty.call(serviceImages, id)))];

    if (serviceIds.length === 0) return undefined;

    Promise.all(serviceIds.map(async (serviceId) => {
      try {
        const response = await getServiceById(serviceId);
        const service = response.data?.data?.service;
        const image = service?.primaryImage || service?.image || service?.images?.[0] || '';
        return [serviceId, image ? resolveAssetUrl(image) : ''];
      } catch {
        return [serviceId, ''];
      }
    })).then((entries) => {
      if (isCurrent) {
        setServiceImages((current) => ({ ...current, ...Object.fromEntries(entries) }));
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [bookings, serviceImages]);

  const handleStatusUpdate = async (id, status) => {
    setActionLoading(id);
    try {
      await updateBookingStatus(id, status);
      toast.success(status === 'accepted' ? 'Booking accepted successfully' : 'Booking rejected');
      setBookings((prev) => prev.filter((b) => b._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${status} booking.`);
    } finally {
      setActionLoading(null);
    }
  };

  const locations = [...new Set(bookings.map((booking) => getAddress(booking).city).filter(Boolean))];
  const serviceTypes = [...new Set(bookings.map(getServiceType).filter(Boolean))];
  const tabCounts = Object.fromEntries(requestTabs.map((tab) => [
    tab.id,
    bookings.filter(tab.matches).length,
  ]));
  const visibleBookings = bookings.filter((booking) => {
    const customer = getCustomer(booking);
    const service = getService(booking);
    const address = getAddress(booking);
    const search = searchTerm.trim().toLocaleLowerCase();
    const matchesSearch = !search || [
      customer.name,
      service.serviceName,
      service.name,
      booking.serviceName,
      address.line1,
      address.city,
      address.state,
    ].filter(Boolean).join(' ').toLocaleLowerCase().includes(search);
    const matchesTab = requestTabs.find((tab) => tab.id === activeTab)?.matches(booking) ?? true;
    const matchesLocation = locationFilter === 'all' || address.city === locationFilter;
    const scheduled = booking.scheduledDate ? new Date(booking.scheduledDate) : null;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const matchesDate = dateFilter === 'all' || !scheduled || (
      dateFilter === 'upcoming' ? scheduled >= todayStart : scheduled < todayStart
    );
    const matchesType = serviceTypeFilter === 'all' || getServiceType(booking) === serviceTypeFilter;
    return matchesSearch && matchesTab && matchesLocation && matchesDate && matchesType;
  });

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4" aria-label="Loading booking requests">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="flex gap-2 overflow-hidden py-2">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="h-11 w-28 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
        {[0, 1, 2].map((item) => (
          <div key={item} className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-card-dark sm:p-4 md:grid-cols-[180px_minmax(0,1fr)_150px]">
            <div className="aspect-[4/3] animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800 md:aspect-auto md:min-h-48" />
            <div className="space-y-3 py-1">
              <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="space-y-3">
              <div className="h-8 w-24 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
              <div className="h-6 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Failed to load requests"
        description={error}
        action={<Button onClick={fetchBookings}>Try Again</Button>}
      />
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 overflow-x-hidden sm:space-y-6">
      <header className="flex min-w-0 items-center gap-3">
        {/* <Link
          to="/provider/dashboard"
          aria-label="Back to provider dashboard"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link> */}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold leading-tight text-ink-light dark:text-ink-dark sm:text-2xl">Booking Requests</h1>
          {/* <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400 sm:text-sm">New service requests from customers</p> */}
        </div>
        {/* <button
          type="button"
          onClick={() => setSearchOpen((open) => !open)}
          aria-label={searchOpen ? 'Close booking search' : 'Search booking requests'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-primary-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-primary-400"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </button> */}
        {/* <Link
          to="/provider/notifications"
          aria-label="Notifications"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-primary-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-primary-400"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-gray-900" aria-hidden="true" />
        </Link> */}
      </header>

      {searchOpen && (
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search customer, service or location"
            aria-label="Search booking requests"
            className="input h-11 rounded-xl pl-10 text-sm"
          />
        </label>
      )}

      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          {requestTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                disabled={tab.id !== 'all' && tabCounts[tab.id] === 0}
                aria-pressed={active}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition sm:min-h-11 sm:px-4 sm:text-sm ${active
                  ? 'border-primary-700 bg-primary-700 text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-gray-700 dark:bg-card-dark dark:text-gray-200 dark:hover:bg-gray-800'
                  }`}
              >
                {tab.label}
                <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                  {tabCounts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          <label className="relative flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-card-dark dark:text-gray-300">
            <MapPin className="h-4 w-4" aria-hidden="true" /> Location
            <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} aria-label="Filter by location" className="absolute inset-0 cursor-pointer opacity-0">
              <option value="all">All locations</option>
              {locations.map((location) => <option key={location} value={location}>{location}</option>)}
            </select>
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </label>

          <label className="relative flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-card-dark dark:text-gray-300">
            <CalendarDays className="h-4 w-4" aria-hidden="true" /> Date
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filter by date" className="absolute inset-0 cursor-pointer opacity-0">
              <option value="all">All dates</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </label>

          <label className={`relative flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-card-dark dark:text-gray-300 ${serviceTypes.length ? '' : 'opacity-60'}`}>
            <LayoutGrid className="h-4 w-4" aria-hidden="true" /> Service Type
            <select value={serviceTypeFilter} onChange={(event) => setServiceTypeFilter(event.target.value)} aria-label="Filter by service type" disabled={!serviceTypes.length} className="absolute inset-0 cursor-pointer opacity-0">
              <option value="all">All service types</option>
              {serviceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </label>

          <button
            type="button"
            onClick={() => visibleBookings[0] && setSelectedBooking(visibleBookings[0])}
            disabled={!visibleBookings.length}
            className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-primary-200 bg-white px-3 text-xs font-semibold text-primary-800 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-primary-900 dark:bg-card-dark dark:text-primary-300 dark:hover:bg-primary-900/20"
          >
            <FileText className="h-4 w-4" aria-hidden="true" /> View Details
          </button>
        </div>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No booking requests"
          description="You're all caught up! New customer requests will appear here."
        />
      ) : visibleBookings.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching requests"
          description="Try adjusting your search or filters."
        />
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {visibleBookings.map((booking, index) => {
            const customer = getCustomer(booking);
            const customerName = customer?.name || 'Customer';
            const customerPhone = customer?.phone;
            const service = getService(booking);
            const serviceName = service.serviceName || service.name || booking.serviceName || 'Service';
            const address = getAddress(booking);
            const locationStr = getLocation(booking);
            const statusInfo = statusConfig[booking.status] || statusConfig.pending;
            const rating = service.rating ?? service.averageRating;
            const reviewCount = service.reviewCount;
            const serviceCategory = getServiceCategory(booking);
            const isVerified = customer.isVerified === true || customer.verified === true;
            const serviceId = getBookingServiceId(booking);
            const imageLookupComplete = !serviceId
              || Object.prototype.hasOwnProperty.call(serviceImages, serviceId);

            return (
              <motion.div
                key={booking._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.2) }}
              >
                <Card className="overflow-hidden rounded-2xl p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4">
                  <div className="grid min-w-0 grid-cols-[clamp(112px,36vw,148px)_minmax(0,1fr)] gap-3 sm:gap-4 md:grid-cols-[170px_minmax(0,1fr)_155px]">
                    <div className="relative h-[154px] w-full self-start overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 sm:h-[168px] md:aspect-auto md:h-full md:min-h-[190px]">
                      <ServiceImage
                        booking={booking}
                        serviceName={serviceName}
                        hydratedImage={serviceImages[serviceId]}
                        imageLookupComplete={imageLookupComplete}
                      />
                      {serviceCategory && (
                        <span className="absolute bottom-2 left-2 max-w-[calc(100%-16px)] truncate rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-primary-800 shadow-sm dark:bg-gray-900/90 dark:text-primary-300">
                          {serviceCategory}
                        </span>
                      )}
                    </div>

                    <div className="col-start-2 min-w-0 py-0.5 md:col-start-auto">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <Avatar src={customer.avatar} name={customerName} size="sm" />
                            <h2 className="truncate text-base font-bold text-ink-light dark:text-ink-dark sm:text-lg">
                              {customerName}
                            </h2>
                            {isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary-600" aria-label="Verified customer" />}
                          </div>
                          <p className="mt-1 truncate pl-11 text-sm font-medium text-gray-700 dark:text-gray-200">{serviceName}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(booking)}
                          className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-primary-200 px-3 py-2 text-xs font-semibold text-primary-800 transition hover:bg-primary-50 dark:border-primary-900 dark:text-primary-300 dark:hover:bg-primary-900/20 sm:inline-flex"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" /> View Details
                        </button>
                      </div>

                      {rating !== undefined && rating !== null && Number.isFinite(Number(rating)) && (
                        <div className="mt-2 flex items-center gap-1.5 pl-11 text-xs text-gray-600 dark:text-gray-300">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                          <span className="font-semibold">{Number(rating).toFixed(1)}</span>
                          {reviewCount !== undefined && <span className="text-gray-400">({Number(reviewCount).toLocaleString('en-IN')} reviews)</span>}
                        </div>
                      )}

                      {locationStr && (
                        <p className="mt-3 flex min-w-0 items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <MapPin className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                          <span className="truncate">{locationStr}</span>
                        </p>
                      )}
                      <p className="mt-2 flex min-w-0 items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <Calendar className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                        <span className="truncate">
                          {[formatBookingDate(booking.scheduledDate), formatBookingTime(booking.scheduledTime)].filter(Boolean).join(', ') || 'Schedule not provided'}
                        </span>
                      </p>
                      {booking.notes && (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                          {booking.notes}
                        </p>
                      )}
                      {customerPhone && (
                        <a href={`tel:${customerPhone}`} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary-800 hover:underline dark:text-primary-300">
                          <Phone className="h-3.5 w-3.5" aria-hidden="true" /> {customerPhone}
                        </a>
                      )}
                    </div>

                    <aside className="col-span-2 flex min-w-0 flex-row items-center justify-between gap-3 border-t border-gray-100 pt-3 md:col-span-1 md:flex-col md:items-end md:justify-start md:border-0 md:pt-0">
                      <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                      {booking.amount !== undefined && booking.amount !== null && (
                        <span className="inline-flex items-center text-xl font-bold text-emerald-700 dark:text-emerald-400">
                          <IndianRupee className="h-4 w-4" aria-hidden="true" />
                          {Number(booking.amount).toLocaleString('en-IN')}
                        </span>
                      )}
                    </aside>

                    <div className="col-span-2 flex min-w-0 flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-800 md:col-span-3 md:justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(booking)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary-200 px-3 text-xs font-semibold text-primary-800 transition hover:bg-primary-50 dark:border-primary-900 dark:text-primary-300 dark:hover:bg-primary-900/20 sm:hidden"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" /> View Details
                      </button>
                      <Button
                        variant="outline"
                        onClick={() => handleStatusUpdate(booking._id, 'rejected')}
                        disabled={actionLoading === booking._id}
                        className="min-h-10 flex-1 rounded-lg border-rose-300 px-3 text-rose-700 hover:bg-rose-50 hover:text-rose-800 focus:ring-rose-500 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-900/20 sm:flex-none"
                      >
                        {actionLoading === booking._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        Decline
                      </Button>
                      <Button
                        variant="success"
                        onClick={() => handleStatusUpdate(booking._id, 'accepted')}
                        disabled={actionLoading === booking._id}
                        className="min-h-10 flex-1 rounded-lg px-4 sm:min-w-40"
                      >
                        {actionLoading === booking._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Accept Request
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal rendered outside the map loop */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Booking Details"
        subtitle={`Booking ID: ${selectedBooking?.bookingId || selectedBooking?._id || 'N/A'}`}
        size="lg"
      >
        {selectedBooking && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Service</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedBooking.serviceSnapshot?.serviceName ||
                    selectedBooking.serviceName ||
                    selectedBooking.serviceId?.name ||
                    'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                <p className="font-medium text-gray-900 dark:text-white">₹{selectedBooking.amount ?? 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Schedule Date</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedBooking.scheduledDate
                    ? new Date(selectedBooking.scheduledDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Schedule Time</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedBooking.scheduledTime || 'N/A'}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Service Location</p>
              <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                {selectedBooking.bookingAddress || selectedBooking.address ? (
                  <>
                    <p>{(selectedBooking.bookingAddress || selectedBooking.address).line1}</p>
                    {(selectedBooking.bookingAddress || selectedBooking.address).line2 && (
                      <p>{(selectedBooking.bookingAddress || selectedBooking.address).line2}</p>
                    )}
                    <p>
                      {(selectedBooking.bookingAddress || selectedBooking.address).city},{' '}
                      {(selectedBooking.bookingAddress || selectedBooking.address).state} -{' '}
                      {(selectedBooking.bookingAddress || selectedBooking.address).pincode}
                    </p>
                  </>
                ) : (
                  <p>Address not provided</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Customer</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {selectedBooking.customerSnapshot?.name || selectedBooking.customerId?.name || 'Not provided'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                📞 {selectedBooking.customerSnapshot?.phone || selectedBooking.customerId?.phone || 'Not provided'}
              </p>
            </div>

            {selectedBooking.notes && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Customer Notes</p>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{selectedBooking.notes}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Payment Method</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">{selectedBooking.paymentMethod || selectedBooking.payment?.method || 'N/A'}</p>
               </div>
               <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Payment Status</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">{selectedBooking.payment?.status || 'N/A'}</p>
               </div>
               <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Booking Status</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">{selectedBooking.status || 'N/A'}</p>
               </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default BookingRequestsPage;