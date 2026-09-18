import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Loader2,
  IndianRupee,
  MessageSquareWarning,
  CalendarDays,
  User,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import {
  getAdminComplaint,
  updateAdminComplaint,
} from '../../services/complaintService';

const statusConfig = {
  open: { label: 'Open', variant: 'warning' },
  under_review: { label: 'Under Review', variant: 'primary' },
  waiting_for_provider: { label: 'Awaiting Provider', variant: 'secondary' },
  resolved: { label: 'Resolved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

const priorityConfig = {
  low: { label: 'Low', variant: 'neutral' },
  medium: { label: 'Medium', variant: 'secondary' },
  high: { label: 'High', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'danger' },
};

const refundStatusConfig = {
  none: { label: 'None', variant: 'neutral' },
  pending: { label: 'Pending', variant: 'warning' },
  completed: { label: 'Processed', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
};

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const DetailRow = ({ label, children }) => (
  <div className="flex flex-col gap-1 border-b border-gray-100 py-3 last:border-0 dark:border-gray-700 sm:flex-row sm:items-start sm:justify-between">
    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-sm text-ink-light dark:text-ink-dark sm:text-right">{children}</span>
  </div>
);

function Timeline({ complaint }) {
  const events = [];
  if (complaint.createdAt) events.push({ when: complaint.createdAt, text: 'Complaint filed by customer', who: complaint.customer?.name });
  if (complaint.providerResponse?.respondedAt) events.push({ when: complaint.providerResponse.respondedAt, text: 'Provider responded', who: complaint.provider?.businessName || complaint.provider?.userId?.name || booking?.providerId?.businessName || booking?.providerId?.userId?.name });
  if (complaint.status === 'under_review' && complaint.assignedTo) events.push({ when: complaint.updatedAt, text: 'Assigned for review', who: complaint.assignedTo?.name });
  if (complaint.resolvedAt) events.push({ when: complaint.resolvedAt, text: 'Admin decision recorded', who: complaint.adminDecision?.decidedBy?.name });
  if (!events.length) return <p className="text-sm text-gray-500">No activity yet.</p>;
  return (
    <ol className="relative space-y-4 border-l border-gray-200 pl-4 dark:border-gray-700">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary" />
          <p className="text-sm font-medium text-ink-light dark:text-ink-dark">{e.text}</p>
          <p className="text-xs text-gray-500">{e.who ? `${e.who} · ` : ''}{formatDate(e.when)}</p>
        </li>
      ))}
    </ol>
  );
}

const fmtAmount = (n) =>
  typeof n === 'number' ? `₹${n.toLocaleString('en-IN')}` : '—';


export function AdminComplaintDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [status, setStatus] = useState('');
  const [adminDecision, setAdminDecision] = useState('');
  const [resolution, setResolution] = useState('');
  const [refundStatus, setRefundStatus] = useState('none');
  const [refundAmount, setRefundAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminComplaint(id);
      const data = res.data?.data || res.data;
      // The endpoint returns { complaint: {...} }.
      setComplaint(data?.complaint || data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load complaint');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const openDecision = (newStatus) => {
    setStatus(newStatus);
    // `adminDecision` is the *modal free-text note* (a string). The stored
    // `complaint.adminDecision` is an OBJECT, so never assign it directly into
    // this string state — extract the `note` field instead. This also keeps the
    // textarea value a valid string (React would throw on an object value).
    const ad = complaint?.adminDecision;
    const adNote =
      ad && typeof ad === 'object' ? ad.note || '' : typeof ad === 'string' ? ad : '';
    setAdminDecision(adNote);
    setResolution(
      complaint?.resolution ||
        (ad && typeof ad === 'object' ? ad.resolutionSummary || '' : '')
    );
    setRefundStatus(complaint?.refundStatus || 'none');
    setRefundAmount(complaint?.refundAmount != null ? String(complaint.refundAmount) : '');
    setModal('decision');
  };

  const submitDecision = async () => {
    // Always treat the modal input as a string before calling string methods.
    const note = typeof adminDecision === 'string' ? adminDecision : '';
    if (!note.trim()) { toast.error('Admin decision is required'); return; }
    const amount = Number(refundAmount);
    if ((refundStatus === 'pending' || refundStatus === 'completed') && (!amount || amount <= 0)) {
      toast.error('Refund amount must be greater than 0'); return;
    }
    try {
      setSaving(true);
      const payload = {
        status,
        adminDecision: note.trim(),
        resolution: (typeof resolution === 'string' ? resolution : '').trim(),
        refundStatus,
        refundAmount: refundStatus === 'none' ? 0 : amount,
      };
      const res = await updateAdminComplaint(id, payload);
      const upd = res.data?.data || res.data;
      setComplaint(upd?.complaint || upd);
      setModal(null);
      toast.success(`Complaint ${status === 'resolved' ? 'resolved' : 'updated'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update complaint');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading...
      </div>
    );
  }
  if (!complaint) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate('/admin/complaints')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <p className="text-gray-500">Complaint not found.</p>
      </div>
    );
  }

  const booking = complaint.booking;
  const payment = complaint.payment;

  // The backend stores `adminDecision` as an OBJECT (or null/undefined).
  // Normalize it once so the rest of the UI can safely read its fields without
  // ever rendering the whole object or calling string methods on it.
  const decisionData =
    complaint?.adminDecision && typeof complaint.adminDecision === 'object'
      ? complaint.adminDecision
      : null;
  const decisionText = decisionData?.decision || '—';
  const decidedByName =
    (decisionData?.decidedBy && (decisionData.decidedBy.name || decisionData.decidedBy)) ||
    '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/complaints')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-ink-light dark:text-ink-dark">
              Complaint {complaint.complaintId || complaint._id?.slice(-6)}
            </h1>
            <p className="text-sm text-gray-500">{formatDate(complaint.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={priorityConfig[complaint.priority]?.variant || 'neutral'}>
            {priorityConfig[complaint.priority]?.label || complaint.priority}
          </Badge>
          <Badge variant={statusConfig[complaint.status]?.variant || 'primary'}>
            {statusConfig[complaint.status]?.label || complaint.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <MessageSquareWarning className="h-5 w-5 text-primary" /> Complaint Details
            </h2>
            <DetailRow label="Category"><Badge variant="secondary">{complaint.category}</Badge></DetailRow>
            <DetailRow label="Customer">{complaint.customer?.name || '—'}</DetailRow>
            {/* Provider display name lives in `businessName` on the Provider model
                (nested `userId.name` fallback). If the direct ref is missing,
                resolve it through the linked booking's providerId. */}
            <DetailRow label="Provider">
              {complaint.provider?.businessName ||
                complaint.provider?.userId?.name ||
                booking?.providerId?.businessName ||
                booking?.providerId?.userId?.name ||
                '—'}
            </DetailRow>
            {/* Service is derived from the linked booking (booking.serviceId). Old
                complaints may not carry a populated `service` ref, so fall back to
                the booking's serviceId, then to the booking's stored serviceName. */}
            <DetailRow label="Service">
              {complaint.service?.name ||
                booking?.serviceId?.name ||
                booking?.serviceName ||
                '—'}
            </DetailRow>
            <DetailRow label="Booking">{booking?.bookingId || booking?._id?.slice(-6) || '—'}</DetailRow>
            <DetailRow label="Description">
              <p className="whitespace-pre-wrap text-left">{complaint.description}</p>
            </DetailRow>
            {complaint.evidence?.length > 0 && (
              <DetailRow label="Evidence">
                <div className="flex flex-wrap gap-2">
                  {complaint.evidence.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="text-primary underline">
                      File {i + 1}
                    </a>
                  ))}
                </div>
              </DetailRow>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Provider Response</h2>
            {complaint.providerResponse?.message ? (
              <div className="space-y-2">
                <p className="whitespace-pre-wrap">{complaint.providerResponse.message}</p>
                <p className="text-xs text-gray-500">
                  {complaint.providerResponse.respondedAt ? formatDate(complaint.providerResponse.respondedAt) : ''}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No provider response yet.</p>
            )}
          </Card>


          {complaint.status === 'resolved' || complaint.status === 'rejected' ? (
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <CheckCircle2 className="h-5 w-5 text-success" /> Resolution
              </h2>
              {/* Render the admin decision OBJECT FIELDS — never the object itself. */}
              <DetailRow label="Admin Decision">
                <p className="whitespace-pre-wrap text-left">{decisionText}</p>
              </DetailRow>
              <DetailRow label="Resolution Summary">
                <p className="whitespace-pre-wrap text-left">
                  {decisionData?.resolutionSummary || complaint.resolution || '—'}
                </p>
              </DetailRow>
              {decisionData?.note ? (
                <DetailRow label="Admin Note">
                  <p className="whitespace-pre-wrap text-left">{decisionData.note}</p>
                </DetailRow>
              ) : null}
              <DetailRow label="Refund">
                <Badge variant={refundStatusConfig[complaint.refundStatus]?.variant || 'neutral'}>
                  {refundStatusConfig[complaint.refundStatus]?.label || complaint.refundStatus}
                </Badge>
                {complaint.refundAmount > 0 ? ` · ${fmtAmount(complaint.refundAmount)}` : ''}
              </DetailRow>
              <DetailRow label="Refund Amount">
                {decisionData?.refundAmount != null ? fmtAmount(decisionData.refundAmount) : '—'}
              </DetailRow>
              <DetailRow label="Refund Processed">
                {typeof decisionData?.refundProcessed === 'boolean'
                  ? decisionData.refundProcessed
                    ? 'Yes'
                    : 'No'
                  : '—'}
              </DetailRow>
              <DetailRow label="Decision Date">{formatDate(decisionData?.decidedAt)}</DetailRow>
              <DetailRow label="Decided By">{decidedByName}</DetailRow>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <IndianRupee className="h-5 w-5 text-primary" /> Refund Context
            </h2>
            <DetailRow label="Booking Amount">{booking?.amount != null ? fmtAmount(booking.amount) : '—'}</DetailRow>
            <DetailRow label="Payment Status">
              {payment ? (
                <Badge variant={payment.status === 'paid' ? 'success' : payment.status === 'refunded' ? 'warning' : 'neutral'}>
                  {payment.status}
                </Badge>
              ) : '—'}
            </DetailRow>
            <DetailRow label="Current Refund">{fmtAmount(complaint.refundAmount)}</DetailRow>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <CalendarDays className="h-5 w-5 text-primary" /> Activity
            </h2>
            <Timeline complaint={complaint} />
          </Card>

          {complaint.status !== 'resolved' && complaint.status !== 'rejected' && (
            <Card className="p-5">
              <h2 className="mb-3 text-lg font-semibold">Actions</h2>
              <div className="flex flex-col gap-2">
                <Button onClick={() => openDecision('under_review')}>Mark In Progress</Button>
                <Button variant="success" onClick={() => openDecision('resolved')}>
                  <CheckCircle2 className="h-4 w-4" /> Resolve
                </Button>
                <Button variant="danger" onClick={() => openDecision('rejected')}>
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>



      <Modal isOpen={modal === 'decision'} onClose={() => setModal(null)} title={`Decision: ${status}`}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Admin Decision</label>
            <Textarea rows={3} value={adminDecision} onChange={(e) => setAdminDecision(e.target.value)} placeholder="Explain the admin decision..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Resolution Summary</label>
            <Textarea rows={2} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Short resolution note..." />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Refund Status</label>
            <Select options={[
              { value: 'none', label: 'No Refund' },
              { value: 'pending', label: 'Pending Refund' },
              { value: 'completed', label: 'Processed Refund' },
              { value: 'failed', label: 'Failed Refund' },
            ]} value={refundStatus} onChange={(e) => setRefundStatus(e.target.value)} />
          </div>
          {refundStatus !== 'none' && (
            <div>
              <label className="mb-1 block text-sm font-medium">Refund Amount (₹)</label>
              <Input type="number" min="0" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="0" />
              {payment?.status === 'refunded' && (
                <p className="mt-1 text-xs text-yellow-600">Payment already refunded. Selecting "Processed" (completed) will keep it refunded.</p>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={submitDecision} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Decision'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AdminComplaintDetailPage;

