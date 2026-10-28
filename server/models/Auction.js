const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, sparse: true },
  category: { type: String, enum: ['bicycles', 'calculators', 'books', 'electronics', 'stationery', 'hostel essentials', 'other'], required: true },
  description: { type: String, required: true, trim: true },
  condition: { type: String, enum: ['new', 'like new', 'good', 'fair', 'needs repair'], required: true },
  images: [{ type: String }],
  startingPrice: { type: Number, required: true, min: 0 },
  minimumBidIncrement: { type: Number, required: true, min: 1 },
  currentPrice: { type: Number, required: true, min: 0 },
  currentLeader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  bidCount: { type: Number, default: 0 },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, required: true },
  originalEndTime: { type: Date },
  status: { type: String, enum: ['scheduled', 'active', 'awaiting seller decision', 'reserved', 'sold', 'unsold', 'cancelled', 'failed pickup'], default: 'scheduled' },
  provisionalWinner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedFinalPrice: { type: Number, default: 0 },
  outcome: { type: String, enum: ['pending', 'won', 'rejected', 'unsold', 'cancelled', 'failed pickup'], default: 'pending' },
  decisionAt: { type: Date },
  completedAt: { type: Date },
  cancellationReason: { type: String, default: '' }
}, { timestamps: true });

auctionSchema.index({ status: 1, endTime: 1 });
auctionSchema.index({ category: 1, status: 1 });
auctionSchema.index({ seller: 1, createdAt: -1 });
auctionSchema.index({ title: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('Auction', auctionSchema);
