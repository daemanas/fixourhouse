import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Check,
  X,
  MapPin,
  Calendar,
  Clock,
  IndianRupee,
  MessageSquare,
  Loader2,
  Phone,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import { getMyBookings, updateBookingStatus } from '../../services/bookingService';

const statusConfig = {
  pending: { label: 'Pending', color: 'warning' },
  accepted: { label: 'Accepted', color: 'primary' },
  working: { label: 'Working', color: 'secondary' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'danger' },
  rejected: { label: 'Rejected', color: 'danger' },
};

export function BookingRequestsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

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

  const handleStatusUpdate = async (id, status) => {
    setActionLoading(id);
    try {
      await updateBookingStatus(id, { status });
      toast.success(status === 'accepted' ? 'Booking accepted successfully' : 'Booking rejected');
      setBookings((prev) => prev.filter((b) => b._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${status} booking.`);
    } finally {
      setActionLoading(null);
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
        title="Failed to load requests"
        description={error}
        action={
          <Button onClick={fetchBookings}>Try Again</Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">Booking Requests</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Review and respond to new booking requests
        </p>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No pending requests"
          description="You're all caught up! New booking requests will appear here."
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((booking, index) => {
            const customer = booking.customerId;
            const customerName = customer?.name || 'Customer';
            const customerAvatar = customer?.avatar;
            const customerPhone = customer?.phone;
            const service = booking.serviceId;
            const locationStr = [
              booking.address?.line1,
              booking.address?.city,
              booking.address?.state,
            ].filter(Boolean).join(', ');
            const scheduledDate = booking.scheduledDate
              ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '—';
            const statusInfo = statusConfig[booking.status] || statusConfig.pending;

            return (
              <motion.div
                key={booking._id}
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
                          <Badge variant={statusInfo.color}>{statusInfo.label}</Badge>
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
                        <Clock className="h-4 w-4 shrink-0" />
                        {booking.scheduledTime || '—'}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-ink-light dark:text-ink-dark">
                        <IndianRupee className="h-4 w-4 shrink-0" />
                        {booking.amount ?? 0}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        variant="success"
                        onClick={() => handleStatusUpdate(booking._id, 'accepted')}
                        disabled={actionLoading === booking._id}
                      >
                        {actionLoading === booking._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Accept
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleStatusUpdate(booking._id, 'rejected')}
                        disabled={actionLoading === booking._id}
                      >
                        {actionLoading === booking._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </div>

                  {booking.notes && (
                    <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-medium">Customer note: </span>
                        {booking.notes}
                      </p>
                    </div>
                  )}

                  {customerPhone && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Phone className="h-4 w-4" />
                      {customerPhone}
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default BookingRequestsPage;