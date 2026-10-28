const mongoose = require('mongoose');

const autoBidRuleSchema = new mongoose.Schema({
  auction: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
  bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  maximumAmount: { type: Number, required: true, min: 1 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

autoBidRuleSchema.index({ auction: 1, isActive: 1, maximumAmount: -1 });
autoBidRuleSchema.index({ bidder: 1, auction: 1 }, { unique: true });

module.exports = mongoose.model('AutoBidRule', autoBidRuleSchema);
