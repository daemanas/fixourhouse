import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  MapPin,
  Calendar,
  Clock,
  IndianRupee,
  Play,
  CheckCircle2,
  Phone,
  MessageSquare,
  Loader2,
  CreditCard,
  Banknote,
  Upload,
  Wallet,
  Camera,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import ImageUploadField from '../../components/ui/ImageUploadField';
import { getMyBookings, updateBookingStatus } from '../../services/bookingService';
import { uploadCompletedServicePhotos } from '../../services/completedPhotoService';

const statusConfig = {
  accepted: { label: 'Accepted', color: 'primary' },
  working: { label: 'Working', color: 'secondary' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'danger' },
  rejected: { label: 'Rejected', color: 'danger' },
};

const tabs = [
  { key: 'all', label: 'All Jobs' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'working', label: 'Working' },
  { key: 'completed', label: 'Completed' },
];

const paymentMethods = [
  { id: 'online', label: 'Online Payment', icon: CreditCard },
  { id: 'cash', label: 'Cash Payment', icon: Banknote },
];

const paymentLabels = {
  online: 'Online',
  cash: 'Cash',
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export function JobsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [startModalJob, setStartModalJob] = useState(null);
  const [bookingIdInput, setBookingIdInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [completeModalJob, setCompleteModalJob] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [photoModalJob, setPhotoModalJob] = useState(null);
  // Real File objects for the two required photos (plus optional extras)
  const [photoFiles, setPhotoFiles] = useState([null, null]);
  const [photoCaption, setPhotoCaption] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const openPhotoModal = (job) => {
    setPhotoModalJob(job);
    setPhotoFiles([null, null]);
    setPhotoCaption('');
  };

  const handleUploadPhotos = async (e) => {
    if (e) e.preventDefault();
    const validFiles = photoFiles.filter(Boolean);
    if (validFiles.length < 2) {
      toast.error('At least 2 photos are required');
      return;
    }
    setUploadingPhotos(true);
    try {
      const formData = new FormData();
      formData.append('bookingId', photoModalJob._id);
      if (photoCaption.trim()) formData.append('caption', photoCaption.trim());
      
      validFiles.forEach((file) => {
        formData.append('photos', file);
      });

      await uploadCompletedServicePhotos(formData);
      toast.success('Completed work photos uploaded successfully!');
      setPhotoModalJob(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photos');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyBookings();
      const allBookings = res.data.data.bookings || [];
      // Provider jobs: accepted, working, completed (exclude pending/rejected/cancelled)
      const activeJobs = allBookings.filter((b) =>
        ['accepted', 'working', 'completed'].includes(b.status)
      );
      setJobs(activeJobs);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filteredJobs = activeTab === 'all' ? jobs : jobs.filter((j) => j.status === activeTab);

  const openCompleteModal = (job) => {
    setCompleteModalJob(job);
    setSelectedPaymentMethod(null);
  };

  const closeCompleteModal = () => {
    if (completeLoading) return;
    setCompleteModalJob(null);
    setSelectedPaymentMethod(null);
  };

  // Complete the job: the provider must first select how the customer paid
  // (Online/Cash). The backend validates the payment method, transitions the
  // booking from 'working' to 'completed' and returns the updated booking,
  // which is used to refresh the UI immediately.
  const handleCompleteJob = async () => {
    if (completeLoading || !completeModalJob) return;
    if (!selectedPaymentMethod) return;

    setCompleteLoading(true);
    try {
      const res = await updateBookingStatus(completeModalJob._id, {
        status: 'completed',
        paymentMethod: selectedPaymentMethod,
      });
      const updatedBooking = res.data?.data?.booking;
      const paymentLabel = paymentLabels[selectedPaymentMethod] || selectedPaymentMethod;
      toast.success(`Job completed successfully. Payment recorded as ${paymentLabel}.`);
      setJobs((prev) =>
        prev.map((j) =>
          j._id === completeModalJob._id
            ? updatedBooking || {
              ...j,
              status: 'completed',
              paymentMethod: selectedPaymentMethod,
              completedAt: new Date().toISOString(),
            }
            : j
        )
      );
      closeCompleteModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete the job. Please try again.');
    } finally {
      setCompleteLoading(false);
    }
  };

  const openStartModal = (job) => {
    setStartModalJob(job);
    setBookingIdInput('');
    setVerifyError(null);
  };

  const closeStartModal = () => {
    setStartModalJob(null);
    setBookingIdInput('');
    setVerifyError(null);
  };

  // Verify the customer's Booking ID on the backend before moving the job to 'working'.
  // All status changes are performed only by the backend; this handler just submits
  // the entered ID together with the booking for server-side verification.
  const handleStartJob = async () => {
    if (verifyLoading || !startModalJob) return;

    const enteredBookingId = bookingIdInput.trim();
    if (!enteredBookingId) {
      setVerifyError('Please enter the Booking ID provided by the customer.');
      return;
    }

    setVerifyLoading(true);
    setVerifyError(null);
    try {
      await updateBookingStatus(startModalJob._id, {
        status: 'working',
        bookingId: enteredBookingId,
      });
      toast.success('Job started');
      setJobs((prev) =>
        prev.map((j) => (j._id === startModalJob._id ? { ...j, status: 'working' } : j))
      );
      closeStartModal();
    } catch (err) {
      setBookingIdInput('');
      setVerifyError(
        err.response?.data?.message || 'Failed to start job. Please try again.'
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Failed to load jobs"
        description={error}
        action={
          <Button onClick={fetchJobs}>Try Again</Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">My Jobs</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Manage your current and completed jobs
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.key
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredJobs.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No jobs found"
          description="Jobs in this category will appear here."
        />
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job, index) => {
            const customer = job.customerId;
            const customerName = customer?.name || 'Customer';
            const customerAvatar = customer?.avatar;
            const customerPhone = customer?.phone;
            const service = job.serviceId;
            const locationStr = [
              job.address?.line1,
              job.address?.city,
              job.address?.state,
            ].filter(Boolean).join(', ');
            const scheduledDate = job.scheduledDate
              ? new Date(job.scheduledDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
              : '—';
            const statusInfo = statusConfig[job.status] || { label: job.status, color: 'primary' };

            return (
              <motion.div
                key={job._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar
                        src={customerAvatar}
                        name={customerName}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-ink-light dark:text-ink-dark">
                            {customerName}
                          </h3>
                          <Badge variant={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {service?.name || 'Service'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{locationStr || 'Address not provided'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="h-4 w-4 shrink-0" />
                        {scheduledDate}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Phone className="h-4 w-4 shrink-0" />
                        {customerPhone || '—'}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-ink-light dark:text-ink-dark">
                        <IndianRupee className="h-4 w-4 shrink-0" />
                        {job.amount ?? 0}
                      </div>
                      {job.status === 'completed' && (
                        <>
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Wallet className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              Payment: {paymentLabels[job.paymentMethod] || '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Clock className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              Completed: {formatDateTime(job.completedAt)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {job.status === 'accepted' && (
                        <Button
                          variant="primary"
                          onClick={() => openStartModal(job)}
                          disabled={actionLoading === job._id}
                        >
                          {actionLoading === job._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          Start Job
                        </Button>
                      )}
                      {job.status === 'working' && (
                        <Button
                          variant="success"
                          onClick={() => openCompleteModal(job)}
                          disabled={actionLoading === job._id}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Complete Job
                        </Button>
                      )}
                      {job.status === 'completed' && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Completed
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPhotoModal(job)}
                          >
                            <Camera className="h-4 w-4" />
                            Add Work Photos
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Start Job — Booking ID Verification Modal */}
      <Modal
        isOpen={!!startModalJob}
        onClose={() => {
          if (!verifyLoading) closeStartModal();
        }}
        title="Start Job"
        subtitle="Booking ID verification required"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Enter the Booking ID provided by the customer to start this job.
          </p>
          <Input
            label="Booking ID"
            value={bookingIdInput}
            onChange={(e) => {
              setBookingIdInput(e.target.value);
              if (verifyError) setVerifyError(null);
            }}
            placeholder="e.g. LF-XXXXXXXXXXXX"
            error={verifyError}
            disabled={verifyLoading}
            autoFocus
            maxLength={64}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !verifyLoading) handleStartJob();
            }}
          />
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={closeStartModal} disabled={verifyLoading}>
              Cancel
            </Button>
            <Button onClick={handleStartJob} loading={verifyLoading}>
              Verify & Start Job
            </Button>
          </div>
        </div>
      </Modal>

      {/* Complete Job — Payment Method Modal */}
      <Modal
        isOpen={!!completeModalJob}
        onClose={closeCompleteModal}
        title="Complete Job"
        subtitle="How did the customer pay for this service?"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedPaymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedPaymentMethod(method.id)}
                  disabled={completeLoading}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${isSelected
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  <Icon
                    className={`h-5 w-5 ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
                      }`}
                  />
                  <span className="text-sm font-medium text-ink-light dark:text-ink-dark">
                    {method.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={closeCompleteModal} disabled={completeLoading}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleCompleteJob}
              disabled={!selectedPaymentMethod}
              loading={completeLoading}
            >
              Confirm & Complete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Upload Completed Work Photos Modal */}
      <Modal
        isOpen={!!photoModalJob}
        onClose={() => {
          if (!uploadingPhotos) setPhotoModalJob(null);
        }}
        title="Upload Completed Work Photos"
        subtitle="Select at least 2 photos showcasing the finished service"
      >
        <form onSubmit={handleUploadPhotos} className="space-y-4">
          <ImageUploadField
            label="Photo 1 *"
            value={photoFiles[0]}
            onChange={(file) => setPhotoFiles((prev) => { const next = [...prev]; next[0] = file; return next; })}
            disabled={uploadingPhotos}
          />
          <ImageUploadField
            label="Photo 2 *"
            value={photoFiles[1]}
            onChange={(file) => setPhotoFiles((prev) => { const next = [...prev]; next[1] = file; return next; })}
            disabled={uploadingPhotos}
          />
          <Input
            label="Caption (Optional)"
            value={photoCaption}
            onChange={(e) => setPhotoCaption(e.target.value)}
            placeholder="e.g. Cleaned filter and recharged AC coolant"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPhotoModalJob(null)}
              disabled={uploadingPhotos}
            >
              Cancel
            </Button>
            <Button type="submit" loading={uploadingPhotos}>
              <Upload className="h-4 w-4" />
              Upload Photos
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default JobsPage;