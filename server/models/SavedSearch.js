const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, trim: true, default: '' },
  query: { type: String, trim: true, default: '' },
  category: { type: String, default: '' },
  minPrice: { type: Number, min: 0 },
  maxPrice: { type: Number, min: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

savedSearchSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SavedSearch', savedSearchSchema);
