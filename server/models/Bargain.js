const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole:  { type: String, enum: ['buyer', 'farmer'], required: true },
  type:        { type: String, enum: ['offer', 'counter', 'accept', 'reject', 'text'], required: true },
  pricePerKg:  { type: Number, default: 0 },
  quantityKg:  { type: Number, default: 0 },
  totalPrice:  { type: Number, default: 0 },
  message:     { type: String, default: '' },
  timestamp:   { type: Date, default: Date.now }
}, { _id: true });

const bargainSchema = new mongoose.Schema({
  cropId:              { type: mongoose.Schema.Types.ObjectId, ref: 'Crop', required: true },
  cropName:            { type: String, required: true },
  cropImage:           { type: String, required: true },
  buyerId:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerName:           { type: String, required: true },
  farmerId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  farmerName:          { type: String, required: true },
  basePrice:           { type: Number, required: true },
  minQuantity:         { type: Number, required: true },
  availableQuantityKg: { type: Number, required: true },
  status:              { type: String, enum: ['active', 'accepted', 'rejected'], default: 'active' },
  messages:            [messageSchema],
  finalPrice:          { type: Number },
  finalQuantity:       { type: Number },
  orderId:             { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },

  // ── Turn-based fields ──
  // null = no message yet (buyer goes first)
  // 'buyer' = buyer just sent, farmer's turn
  // 'farmer' = farmer just sent, buyer's turn
  lastSenderRole: { type: String, enum: ['buyer', 'farmer', null], default: null },
}, { timestamps: true });

// ✅ PARTIAL unique index: only ONE active chat per buyer-farmer-crop
// Closed chats (accepted/rejected) don't count → buyer can start fresh
bargainSchema.index(
  { farmerId: 1, buyerId: 1, cropId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

module.exports = mongoose.model('Bargain', bargainSchema);