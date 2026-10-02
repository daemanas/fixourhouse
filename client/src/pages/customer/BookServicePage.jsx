import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Calendar as CalendarIcon,
  MapPin,
  Star,
  CheckCircle2,
  Loader2,
  CreditCard,
  Wallet,
  Banknote,
  Info,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Sparkles,
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
  { id: 'card', label: 'Credit / Debit Card', description: 'Pay securely via card', icon: CreditCard },
  { id: 'upi', label: 'UPI / Wallet', description: 'GPay, PhonePe, Paytm', icon: Wallet },
  { id: 'cash', label: 'Cash on Service', description: 'Pay after service completion', icon: Banknote },
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

  // Quick date helper
  const handleQuickDateSelect = (daysToAdd) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysToAdd);
    setSelectedDate(targetDate.toISOString().split('T')[0]);
  };

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading booking options...</p>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <EmptyState
        icon={Info}
        title="Provider not found"
        description={error || 'This provider may not be available at the moment.'}
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

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Back Link */}
      <div className="flex items-center justify-between">
        <Link
          to={`/customer/provider/${providerId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Provider</span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/50 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800">
          <ShieldCheck className="h-3.5 w-3.5 text-primary-600" />
          Secure Checkout
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Form Steps */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* STEP 1: Select Service */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="p-6 border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-5">
                <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 font-bold text-xs">
                  1
                </span>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Select Service</h2>
              </div>

              {services.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">
                  This provider hasn't added any services yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {services.map((service) => {
                    const isSelected = selectedService?._id === service._id;
                    const basePrice = Number(service.price ?? service.startingPrice ?? 0);
                    const discount = Number(service.discountPercentage || 0);
                    const finalPrice = Math.round(basePrice * (1 - discount / 100) * 100) / 100;

                    return (
                      <button
                        type="button"
                        key={service._id}
                        onClick={() => setSelectedService(service)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all relative flex items-start justify-between gap-4 ${
                          isSelected
                            ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-950/20 ring-1 ring-primary-600/30'
                            : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <CheckCircle2
                            className={`h-5 w-5 shrink-0 mt-0.5 transition-colors ${
                              isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-300 dark:text-gray-700'
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white text-base">
                              {service.name}
                            </p>
                            {service.duration && (
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                                <Clock className="h-3 w-3 inline" /> {service.duration}
                              </p>
                            )}
                            {service.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                {service.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-bold text-gray-900 dark:text-white text-base">
                            ₹{finalPrice}
                          </p>
                          {discount > 0 && (
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-xs text-gray-400 line-through">₹{basePrice}</span>
                              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                                {discount}% OFF
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </motion.div>

          {/* STEP 2: Date & Time Schedule */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="p-6 border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-5">
                <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 font-bold text-xs">
                  2
                </span>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Schedule Service</h2>
              </div>

              <div className="space-y-5">
                {/* Quick Date Shortcuts */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Select Date
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => handleQuickDateSelect(0)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        selectedDate === todayStr
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDateSelect(1)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        selectedDate === tomorrowStr
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      Tomorrow
                    </button>
                  </div>

                  <div className="relative">
                    <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={todayStr}
                      className="pl-10 h-11 text-sm rounded-xl"
                    />
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Available Time Slots
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {timeSlots.map((slot) => {
                      const isSelected = selectedTime === slot;
                      return (
                        <button
                          type="button"
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                            isSelected
                              ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/20'
                              : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* STEP 3: Address Details */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card className="p-6 border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-5">
                <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 font-bold text-xs">
                  3
                </span>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Service Location</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    Street Address / House No.
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Textarea
                      rows={2}
                      placeholder="Flat no, House name, Street address, Landmark"
                      value={address.line1}
                      onChange={(e) => setAddress((prev) => ({ ...prev, line1: e.target.value }))}
                      className="pl-10 text-sm rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                      City
                    </label>
                    <Input
                      placeholder="e.g. Kolkata"
                      value={address.city}
                      onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
                      className="h-11 text-sm rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                      State
                    </label>
                    <Input
                      placeholder="e.g. West Bengal"
                      value={address.state}
                      onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
                      className="h-11 text-sm rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                      Pincode
                    </label>
                    <Input
                      placeholder="6-digit pincode"
                      value={address.pincode}
                      onChange={(e) =>
                        setAddress((prev) => ({ ...prev, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))
                      }
                      inputMode="numeric"
                      className="h-11 text-sm rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    Instructions / Notes (Optional)
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Provide any additional details or requirements for the provider"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-sm rounded-xl"
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* STEP 4: Payment Method */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card className="p-6 border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 mb-5">
                <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 font-bold text-xs">
                  4
                </span>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Payment Method</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.id;
                  return (
                    <button
                      type="button"
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-950/20 ring-1 ring-primary-600/30'
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Icon
                          className={`h-6 w-6 ${
                            isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
                          }`}
                        />
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-primary-600 bg-primary-600' : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{method.label}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{method.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Right Column: Booking Summary Card */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:sticky lg:top-6"
          >
            <Card className="p-6 border border-gray-100 dark:border-gray-800 shadow-md rounded-2xl bg-white dark:bg-gray-900">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                Booking Summary
              </h2>

              {/* Provider Info Card */}
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
                <Avatar
                  src={provider}
                  name={provider.businessName}
                  size="md"
                  rounded="rounded-xl"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {provider.businessName}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{providerRating.toFixed(1)}</span>
                    <span>({reviewCount} reviews)</span>
                  </div>
                  {locationStr && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{locationStr}</p>
                  )}
                </div>
              </div>

              {/* Selected Choices */}
              <div className="py-4 space-y-2.5 text-xs border-b border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Selected Service</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[150px] text-right">
                    {selectedService?.name || 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Date</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {selectedDate || 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Time Slot</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {selectedTime || 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Payment</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {paymentMethods.find((m) => m.id === paymentMethod)?.label || 'Not selected'}
                  </span>
                </div>
              </div>

              {/* Price Calculation */}
              <div className="py-4 border-b border-gray-100 dark:border-gray-800 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Base Price</span>
                  <span>₹{serviceBasePrice.toLocaleString('en-IN')}</span>
                </div>
                {discountPercentage > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Discount ({discountPercentage}%)</span>
                    <span>−₹{(serviceBasePrice - serviceCharge).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-dashed border-gray-200 dark:border-gray-800 font-semibold text-sm text-gray-900 dark:text-white">
                  <span>Payable Amount</span>
                  <span>₹{serviceCharge.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="py-4">
                <div className="flex justify-between items-baseline mb-4">
                  <span className="font-bold text-gray-900 dark:text-white">Total Amount</span>
                  <span className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">
                    ₹{total.toLocaleString('en-IN')}
                  </span>
                </div>

                <Button
                  fullWidth
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="rounded-xl shadow-lg shadow-primary-600/20 py-3 text-sm font-bold"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Confirming Booking...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      <span>Confirm Booking</span>
                    </div>
                  )}
                </Button>
              </div>

              {/* Footer Terms */}
              <div className="flex items-start gap-2 pt-2 text-[11px] text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400" />
                <p>
                  By clicking confirm, you accept our{' '}
                  <Link to="/terms" className="text-primary-600 dark:text-primary-400 hover:underline">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link to="/cancellation" className="text-primary-600 dark:text-primary-400 hover:underline">
                    Cancellation Policy
                  </Link>.
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