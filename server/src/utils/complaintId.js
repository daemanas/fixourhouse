import ComplaintCounter from '../models/ComplaintCounter.js';

/**
 * Generate a human-readable, globally unique Complaint ID of the form
 * CMP-YYYY-NNNNN (e.g. CMP-2026-00125).
 *
 * A single atomic findOneAndUpdate({ $inc }) on a per-year counter guarantees
 * that two concurrent requests never receive the same sequence number, so the
 * unique index on `Complaint.complaintId` is never violated.
 */
export async function generateComplaintId() {
  const year = new Date().getFullYear();
  const counter = await ComplaintCounter.findOneAndUpdate(
    { year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `CMP-${year}-${String(counter.seq).padStart(5, '0')}`;
}

export default generateComplaintId;
