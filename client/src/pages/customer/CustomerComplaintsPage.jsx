import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
  Search,
  Bell,
  Plus,
  Calendar,
  MapPin,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  X,
  MessageSquare,
  Headphones,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import { getMyComplaints, createComplaint } from '../../services/complaintService';
import { getMyBookings } from '../../services/bookingService';
import { useNotifications } from '../../context/NotificationContext';
import resolveAssetUrl from '../../utils/assetUrl';

const categoryLabels = {
  service_quality: 'Service Quality',
  billing: 'Payment / Billing',
  provider_behavior: 'Provider Behavior',
  delay: 'Delay / Late Service',
  safety: 'Safety Concern',
  other: 'Other',
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
};

const getStatusPresentation = (statusStr) => {
  const st = (statusStr || '').toLowerCase();
  if (st === 'open') {
    return {
      label: 'Open',
      icon: AlertCircle,
      badgeClass:
        'bg-red-50 text-red-600 border border-red-200/80 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/60',
      iconColor: 'text-red-500 fill-red-100',
    };
  }
  if (st === 'under_review' || st === 'waiting_for_provider' || st === 'in_progress') {
    return {
      label:
        st === 'under_review'
          ? 'Under Review'
          : st === 'waiting_for_provider'
          ? 'Awaiting Provider'
          : 'In Progress',
      icon: Clock,
      badgeClass:
        'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
      iconColor: 'text-amber-500',
    };
  }
  if (st === 'resolved') {
    return {
      label: 'Resolved',
      icon: CheckCircle2,
      badgeClass:
        'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
      iconColor: 'text-emerald-600 fill-emerald-100',
    };
  }
  return {
    label: st === 'rejected' ? 'Rejected' : 'Closed',
    icon: XCircle,
    badgeClass:
      'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-gray-800 dark:text-slate-300 dark:border-gray-700',
    iconColor: 'text-slate-500',
  };
};

export function CustomerComplaintsPage() {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Detail Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Raise Complaint Modal State
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [userBookings, setUserBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [complaintCategory, setComplaintCategory] = useState('service_quality');
  const [complaintPriority, setComplaintPriority] = useState('medium');
  const [complaintResolution, setComplaintResolution] = useState('redo_service');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyComplaints({ limit: 100 });
      const data = res?.data?.data || {};
      setComplaints(data.complaints || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Failed to load your complaints. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleOpenRaiseModal = async () => {
    setShowRaiseModal(true);
    setLoadingBookings(true);
    try {
      const res = await getMyBookings({ limit: 30 });
      const bookings = res?.data?.data?.bookings || [];
      setUserBookings(bookings);
      if (bookings.length > 0 && !selectedBookingId) {
        setSelectedBookingId(bookings[0]._id);
      }
    } catch {
      toast.error('Failed to load bookings for complaint selection.');
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleRaiseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBookingId) {
      toast.error('Please select a booking to dispute.');
      return;
    }
    if (!complaintDesc.trim() || complaintDesc.trim().length < 10) {
      toast.error('Please provide at least 10 characters in the description.');
      return;
    }

    setSubmittingComplaint(true);
    try {
      await createComplaint({
        bookingId: selectedBookingId,
        category: complaintCategory,
        priority: complaintPriority,
        requestedResolution: complaintResolution,
        description: complaintDesc.trim(),
      });

      toast.success('Complaint filed successfully! Our team will get back to you.');
      setShowRaiseModal(false);
      setComplaintDesc('');
      fetchComplaints();
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to submit complaint. Please try again.'
      );
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const statusCounts = useMemo(() => {
    const allCount = complaints.length;
    let openCount = 0;
    let inProgressCount = 0;
    let resolvedCount = 0;
    let closedCount = 0;

    complaints.forEach((c) => {
      const st = (c.status || '').toLowerCase();
      if (st === 'open') {
        openCount++;
      } else if (
        st === 'under_review' ||
        st === 'waiting_for_provider' ||
        st === 'in_progress'
      ) {
        inProgressCount++;
      } else if (st === 'resolved') {
        resolvedCount++;
      } else if (st === 'rejected' || st === 'closed') {
        closedCount++;
      } else {
        openCount++;
      }
    });

    return {
      All: allCount,
      Open: openCount,
      'In Progress': inProgressCount,
      Resolved: resolvedCount,
      Closed: closedCount,
    };
  }, [complaints]);

  const filterTabs = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const st = (c.status || '').toLowerCase();

      let matchesStatus = true;
      if (activeFilter === 'Open') {
        matchesStatus = st === 'open';
      } else if (activeFilter === 'In Progress') {
        matchesStatus =
          st === 'under_review' ||
          st === 'waiting_for_provider' ||
          st === 'in_progress';
      } else if (activeFilter === 'Resolved') {
        matchesStatus = st === 'resolved';
      } else if (activeFilter === 'Closed') {
        matchesStatus = st === 'rejected' || st === 'closed';
      }

      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesStatus;

      const complaintId = (c.complaintId || c._id || '').toLowerCase();
      const serviceName = (
        c.service?.name ||
        c.booking?.serviceId?.name ||
        ''
      ).toLowerCase();
      const providerName = (
        c.provider?.businessName ||
        c.provider?.userId?.name ||
        ''
      ).toLowerCase();
      const desc = (c.description || '').toLowerCase();

      const matchesSearch =
        complaintId.includes(query) ||
        serviceName.includes(query) ||
        providerName.includes(query) ||
        desc.includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [complaints, activeFilter, searchQuery]);

  const getServiceImage = (c) => {
    const source =
      c.service?.primaryImage ||
      c.service?.image ||
      c.service?.images?.[0] ||
      c.booking?.serviceId?.primaryImage ||
      c.booking?.serviceId?.image ||
      c.booking?.serviceSnapshot?.image;

    return source ? resolveAssetUrl(source) : '';
  };

  const getLocationStr = (c) => {
    const loc = c.provider?.location || c.booking?.address;
    if (!loc) return '';
    if (typeof loc === 'string') return loc;
    return (
      [loc.city, loc.district, loc.state].filter(Boolean).join(', ') ||
      loc.address ||
      ''
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12 px-2 sm:px-4">
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
            My Complaints
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setShowSearchInput((prev) => !prev)}
            className={`p-2.5 rounded-full transition-colors cursor-pointer ${
              showSearchInput || searchQuery
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-slate-700 dark:text-slate-300'
            }`}
            aria-label="Search complaints"
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

      {/* SEARCH BAR */}
      {showSearchInput && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="relative"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by service, complaint ID, or provider..."
            autoFocus
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </motion.div>
      )}

      {/* 2. HELP / RAISE COMPLAINT BANNER */}
      <div className="bg-gradient-to-r from-[#e8f6f0] to-[#f3faf7] dark:from-emerald-950/25 dark:to-gray-900 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
            <Headphones className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              Need Help?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5 max-w-sm">
              Facing any issue with a booking or service? Raise a complaint and we'll get back to you soon.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpenRaiseModal}
          className="shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-full text-sm transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          Raise a Complaint
        </button>
      </div>

      {/* 3. STATUS FILTER PILLS */}
      {!loading && !error && (
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 -mx-2 px-2 sm:mx-0 sm:px-0">
          {filterTabs.map((tab) => {
            const count = statusCounts[tab] ?? 0;
            const isSelected = activeFilter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFilter(tab)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-300 border border-gray-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50'
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* 4. COMPLAINTS LIST AREA */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Loading complaints...
          </p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchComplaints}>
            Try Again
          </Button>
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="h-16 w-16 bg-slate-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <MessageSquare className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No Complaints Found
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No results match "${searchQuery}". Try a different keywords.`
                : activeFilter !== 'All'
                ? `There are no complaints under the "${activeFilter}" filter.`
                : "You haven't filed any complaints yet."}
            </p>
          </div>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="rounded-xl"
            >
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredComplaints.map((c) => {
            const statusInfo = getStatusPresentation(c.status);
            const StatusIcon = statusInfo.icon;
            const serviceImg = getServiceImage(c);
            const serviceName =
              c.service?.name || c.booking?.serviceId?.name || 'Service Dispute';
            const providerName =
              c.provider?.businessName || c.provider?.userId?.name || 'Assigned Provider';
            const locationStr = getLocationStr(c);

            return (
              <motion.div
                key={c._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedComplaint(c)}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-900/60 rounded-2xl p-4 sm:p-5 transition-all shadow-sm hover:shadow-md cursor-pointer group space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-gray-800 overflow-hidden shrink-0 border border-slate-200/60 dark:border-gray-700/60">
                      {serviceImg ? (
                        <img
                          src={serviceImg}
                          alt={serviceName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold text-sm">
                          {serviceName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base group-hover:text-emerald-600 transition-colors truncate">
                        {serviceName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        ID: <span className="font-mono font-medium">{c.complaintId || c._id}</span>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${statusInfo.badgeClass}`}
                  >
                    <StatusIcon className={`h-3.5 w-3.5 ${statusInfo.iconColor}`} />
                    {statusInfo.label}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 bg-slate-50/80 dark:bg-gray-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-gray-800/80">
                  {c.description}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-50 dark:border-gray-800/60 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {providerName}
                    </span>
                    {locationStr && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">
                          {locationStr}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 shrink-0">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDateTime(c.createdAt)}</span>
                    <ChevronRight className="h-4 w-4 ml-1 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 5. RAISE COMPLAINT MODAL */}
      <Modal
        isOpen={showRaiseModal}
        onClose={() => setShowRaiseModal(false)}
        title="Raise a Complaint"
        subtitle="Dispute a service booking or submit feedback"
        size="lg"
      >
        <form onSubmit={handleRaiseSubmit} className="space-y-4 pt-1">
          {/* Booking Select */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Booking
            </label>
            {loadingBookings ? (
              <div className="h-11 rounded-xl bg-slate-100 dark:bg-gray-800 animate-pulse flex items-center px-4 text-xs text-slate-400">
                Loading recent bookings...
              </div>
            ) : userBookings.length === 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                No recent bookings found to raise a complaint for.
              </div>
            ) : (
              <select
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {userBookings.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.serviceId?.name || b.serviceSnapshot?.name || 'Booking'} — {b.bookingId || b._id}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Select */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Category
              </label>
              <select
                value={complaintCategory}
                onChange={(e) => setComplaintCategory(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {Object.entries(categoryLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Requested Resolution */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Requested Resolution
              </label>
              <select
                value={complaintResolution}
                onChange={(e) => setComplaintResolution(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="redo_service">Redo Service</option>
                <option value="refund">Full/Partial Refund</option>
                <option value="apology">Apology from Provider</option>
                <option value="other">Other Solution</option>
              </select>
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Priority
            </label>
            <div className="flex items-center gap-3">
              {['low', 'medium', 'high', 'urgent'].map((p) => (
                <label
                  key={p}
                  className={`flex-1 flex items-center justify-center py-2 px-3 rounded-xl border text-xs font-bold capitalize cursor-pointer transition-all ${
                    complaintPriority === p
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 text-emerald-600 dark:text-emerald-400'
                      : 'border-gray-200 dark:border-gray-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={p}
                    checked={complaintPriority === p}
                    onChange={(e) => setComplaintPriority(e.target.value)}
                    className="sr-only"
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Description
            </label>
            <Textarea
              rows={4}
              value={complaintDesc}
              onChange={(e) => setComplaintDesc(e.target.value)}
              placeholder="Explain the issue in detail (minimum 10 characters)..."
              className="bg-slate-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 rounded-xl"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRaiseModal(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submittingComplaint || !selectedBookingId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            >
              {submittingComplaint ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Complaint'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. DETAILS MODAL */}
      <Modal
        isOpen={!!selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        title="Complaint Details"
        subtitle={`ID: ${selectedComplaint?.complaintId || selectedComplaint?._id || ''}`}
        size="lg"
      >
        {selectedComplaint && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-gray-800">
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">
                  Status
                </span>
                <span className="font-bold text-slate-900 dark:text-white capitalize text-sm">
                  {selectedComplaint.status?.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block text-right">
                  Category
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {categoryLabels[selectedComplaint.category] || selectedComplaint.category}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                Description
              </span>
              <p className="text-sm text-slate-700 dark:text-slate-300 p-3 bg-slate-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800 whitespace-pre-wrap">
                {selectedComplaint.description}
              </p>
            </div>

            {selectedComplaint.resolutionNotes && (
              <div className="space-y-1">
                <span className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider">
                  Admin / Resolution Remarks
                </span>
                <p className="text-sm text-emerald-900 dark:text-emerald-200 p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  {selectedComplaint.resolutionNotes}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedComplaint(null)}
                className="rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default CustomerComplaintsPage;