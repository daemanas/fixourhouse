import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Calendar,
  MapPin,
  Star,
  CheckCircle2,
  Loader2,
  CreditCard,
  Wallet,
  Banknote,
  Info,
  ArrowLeft,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import { getProviderById } from '../../services/providerService';
import { createBooking } from '../../services/bookingService';

const timeSlots = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00',
];

const paymentMethods = [
  { id: 'card', label: 'Credit/Debit Card', icon: CreditCard },
  { id: 'upi', label: 'UPI', icon: Wallet },
  { id: 'cash', label: 'Cash on Service', icon: Banknote },
];

export function BookServicePage() {
  const { providerId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedServiceId = searchParams.get('service');

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [address, setAddress] = useState({ line1: '', city: '', state: '', pincode: '' });
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);

  const fetchProvider = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProviderById(providerId);
      const data = res.data.data.provider;
      setProvider(data);
      const services = data.services || [];
      const defaultService =
        services.find((s) => s._id === selectedServiceId) || services[0] || null;
      setSelectedService(defaultService);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load provider details.');
    } finally {
      setLoading(false);
    }
  }, [providerId, selectedServiceId]);

  useEffect(() => {
    fetchProvider();
  }, [fetchProvider]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService) {
      toast.error('Please select a service');
      return;
    }
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }
    if (!selectedTime) {
      toast.error('Please select a time slot');
      return;
    }
    if (!address.line1.trim() || !address.city.trim() || !address.state.trim() || !address.pincode.trim()) {
      toast.error('Please fill in your complete address');
      return;
    }
    if (!/^[1-9]\d{5}$/.test(address.pincode)) {
      toast.error('Please enter a valid 6-digit pincode');
      return;
    }
    setSubmitting(true);
    try {
      await createBooking({
        providerId,
        serviceId: selectedService._id,
        scheduledDate: new Date(selectedDate).toISOString(),
        scheduledTime: selectedTime,
        address: {
          line1: address.line1,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
        },
        notes: notes || undefined,
        paymentMethod,
      });
      toast.success('Booking request sent successfully!');
      navigate('/customer/bookings');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to book service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <EmptyState
        icon={Info}
        title="Provider not found"
        description={error || 'This provider may not be available.'}
        action={
          <Link to="/customer/search">
            <Button>Browse Providers</Button>
          </Link>
        }
      />
    );
  }

  const services = provider.services || [];
  const serviceBasePrice = Number(selectedService?.price ?? selectedService?.startingPrice ?? 0);
  const discountPercentage = Number(selectedService?.discountPercentage ?? 0);
  const serviceCharge = Math.round(serviceBasePrice * (1 - discountPercentage / 100) * 100) / 100;
  const total = serviceCharge;
  const providerRating = provider.rating || 0;
  const reviewCount = provider.reviewCount || 0;
  const locationStr = [provider.location?.area, provider.location?.city, provider.location?.state]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6">
      <Link
        to={`/customer/provider/${providerId}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Provider
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Select Service */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-6">
              <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-4">Select Service</h2>
              {services.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  This provider hasn't added any services yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {services.map((service) => (
                    <button
                      key={service._id}
                      onClick={() => setSelectedService(service)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        selectedService?._id === service._id
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2
                          className={`h-5 w-5 ${
                            selectedService?._id === service._id
                              ? 'text-primary-600 dark:text-primary-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                        <div className="text-left">
                          <p className="font-medium text-ink-light dark:text-ink-dark">{service.name}</p>
                          {service.duration && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{service.duration}</p>
                          )}
                          {service.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-ink-light dark:text-ink-dark">₹{Math.round(Number(service.price ?? service.startingPrice ?? 0) * (1 - Number(service.discountPercentage || 0) / 100) * 100) / 100}</p>
                        {Number(service.discountPercentage) > 0 && <p className="text-xs text-gray-400 line-through">₹{Number(service.price ?? service.startingPrice ?? 0)}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Schedule */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="p-6">
              <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-4">Schedule</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                    Select Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                    Select Time Slot (24hr)
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedTime === slot
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Service Address */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-6">
              <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-4">Service Address</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                    Full Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Textarea
                      rows={2}
                      placeholder="House no, street, area, landmark"
                      value={address.line1}
                      onChange={(e) => setAddress((prev) => ({ ...prev, line1: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                      City
                    </label>
                    <Input
                      placeholder="City"
                      value={address.city}
                      onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                      State
                    </label>
                    <Input
                      placeholder="State"
                      value={address.state}
                      onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                      Pincode
                    </label>
                    <Input
                      placeholder="6-digit pincode"
                      value={address.pincode}
                      onChange={(e) =>
                        setAddress((prev) => ({ ...prev, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))
                      }
                      inputMode="numeric"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-light dark:text-ink-dark mb-2">
                    Additional Notes (Optional)
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Any special instructions for the provider"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Payment Method */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="p-6">
              <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-4">Payment Method</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        paymentMethod === method.id
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          paymentMethod === method.id
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-400'
                        }`}
                      />
                      <span className="text-sm font-medium text-ink-light dark:text-ink-dark">
                        {method.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Booking Summary */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:sticky lg:top-24"
          >
            <Card className="p-6">
              <h2 className="text-lg font-bold text-ink-light dark:text-ink-dark mb-4">Booking Summary</h2>

              <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                <Avatar
                  src={provider}
                  name={provider.businessName}
                  size="md"
                  rounded="rounded-xl"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-ink-light dark:text-ink-dark truncate">
                    {provider.businessName}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {providerRating.toFixed(1)} ({reviewCount} reviews)
                  </div>
                  {locationStr && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{locationStr}</p>
                  )}
                </div>
              </div>

              <div className="py-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Service</span>
                  <span className="font-medium text-ink-light dark:text-ink-dark">
                    {selectedService?.name || 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Date</span>
                  <span className="font-medium text-ink-light dark:text-ink-dark">
                    {selectedDate || 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Time</span>
                  <span className="font-medium text-ink-light dark:text-ink-dark">
                    {selectedTime || 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Payment</span>
                  <span className="font-medium text-ink-light dark:text-ink-dark">
                    {paymentMethods.find((m) => m.id === paymentMethod)?.label || 'Not selected'}
                  </span>
                </div>
              </div>

              <div className="py-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Provider offer</span>
                  <span className="text-ink-light dark:text-ink-dark">₹{serviceBasePrice.toLocaleString('en-IN')}</span>
                </div>
                {discountPercentage > 0 && <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Discount ({discountPercentage}%)</span>
                  <span className="text-emerald-700 dark:text-emerald-400">−₹{(serviceBasePrice - serviceCharge).toLocaleString('en-IN')}</span>
                </div>}
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-gray-500 dark:text-gray-400">Final payable price</span>
                  <span className="text-ink-light dark:text-ink-dark">₹{serviceCharge.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-ink-light dark:text-ink-dark">Total</span>
                  <span className="text-2xl font-bold text-ink-light dark:text-ink-dark">₹{total}</span>
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </Button>

              <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  By confirming, you agree to our{' '}
                  <Link to="/terms" className="text-primary-600 dark:text-primary-400 hover:underline">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link to="/cancellation" className="text-primary-600 dark:text-primary-400 hover:underline">
                    Cancellation Policy
                  </Link>
                </p>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default BookServicePage;