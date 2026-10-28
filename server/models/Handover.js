const mongoose = require('mongoose');

const handoverSchema = new mongoose.Schema({
  auction: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true, unique: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: { type: Date },
  status: { type: String, enum: ['pending', 'scheduled', 'completed', 'failed'], default: 'pending' },
  sellerConfirmedAt: { type: Date },
  buyerConfirmedAt: { type: Date },
  completedAt: { type: Date },
  failureReason: { type: String, default: '' }
}, { timestamps: true });

handoverSchema.index({ seller: 1, status: 1 });
handoverSchema.index({ buyer: 1, status: 1 });

module.exports = mongoose.model('Handover', handoverSchema);
