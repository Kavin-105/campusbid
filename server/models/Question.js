const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  auction: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
  askedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: String, required: true, trim: true },
  status: { type: String, enum: ['open', 'answered'], default: 'open' }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
