const mongoose = require('mongoose');

const farmerRatingSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerName: { type: String, required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  review: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Ensure one rating per order (already unique via orderId, but indexing for fast queries)
farmerRatingSchema.index({ farmerId: 1, buyerId: 1, orderId: 1 }, { unique: true });

module.exports = mongoose.model('FarmerRating', farmerRatingSchema);
