import mongoose from 'mongoose';

// Atomic per-year sequence used to build human-readable, unique Complaint IDs
// of the form CMP-YYYY-XXXXX. A single findOneAndUpdate({ $inc }) guarantees
// no two concurrent requests receive the same sequence number.
const complaintCounterSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ComplaintCounter = mongoose.model(
  'ComplaintCounter',
  complaintCounterSchema
);

export default ComplaintCounter;
