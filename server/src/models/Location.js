import mongoose from 'mongoose';

// Self-referencing hierarchical location model.
//
// All entries live in one collection. Every document stores a `type` of
// 'country', 'state', 'district', or 'city' plus an optional `parentId` pointing to
// the enclosing parent node:
//   Country (parentId: null) -> State (parentId: countryId) -> District (parentId: stateId) -> City (parentId: districtId)
//
// City.parentId points directly to District._id.
const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['country', 'state', 'district', 'city'],
      required: [true, 'Location type is required'],
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      default: null,
    },
    code: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    autoIndex: false,
  }
);

locationSchema.index({ type: 1, parentId: 1 });
locationSchema.index(
  { type: 1, parentId: 1, name: 1 },
  { unique: true, name: 'uniq_location_type_parent_name' }
);
locationSchema.index({ parentId: 1 });

const Location = mongoose.model('Location', locationSchema);

export default Location;
