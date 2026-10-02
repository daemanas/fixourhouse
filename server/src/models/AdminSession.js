import mongoose from 'mongoose';

const adminSessionSchema = new mongoose.Schema({
  tokenId: { type: String, required: true, unique: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

const AdminSession = mongoose.model('AdminSession', adminSessionSchema);

export default AdminSession;
