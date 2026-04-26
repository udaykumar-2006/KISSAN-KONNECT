const mongoose = require('mongoose');

// PENDING_ADDRESS: order created but buyer hasn't submitted address yet
// AWAITING_ADVANCE_PAYMENT: address submitted, waiting for 15% payment
// CONFIRMED: advance paid, order active
// FARMER_CONFIRMED → READY_FOR_PICKUP → OUT_FOR_DELIVERY: farmer lifecycle
// DELIVERED: farmer marked delivered (buyer pays remaining 85% here)
// COMPLETED: fully paid and done
const orderStatusEnum = [
  'PENDING_ADDRESS',
  'AWAITING_ADVANCE_PAYMENT',
  'CONFIRMED',
  'FARMER_CONFIRMED',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
];

const paymentStatusEnum = ['PENDING', 'PARTIAL', 'FULL', 'ADVANCE_PAID', 'FULLY_PAID'];

const orderSchema = new mongoose.Schema({
  bargainId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Bargain' },
  cropId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Crop', required: true },
  cropName:       { type: String, required: true },
  cropImage:      { type: String, required: true },
  buyerId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerName:      { type: String, required: true },
  farmerId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  farmerName:     { type: String, required: true },
  pricePerKg:     { type: Number, required: true },
  quantityKg:     { type: Number, required: true },
  totalPrice:     { type: Number, required: true },
  advanceAmount:  { type: Number, required: true },
  remainingAmount:{ type: Number, required: true },
  advancePaid:    { type: Boolean, default: false },
  remainingPaid:  { type: Boolean, default: false },
  paymentStatus:  { type: String, enum: paymentStatusEnum, default: 'PENDING' },
  status:         { type: String, enum: orderStatusEnum, default: 'PENDING_ADDRESS' },
  address:        { type: String, default: '' },   // set when buyer submits address
  paymentMethod:  { type: String, enum: ['cash', 'online'], default: 'online' },
  deliveredAt:    { type: Date },
  razorpayOrderId:   { type: String },
  razorpayPaymentId: { type: String },
  isRatedByBuyer:    { type: Boolean, default: false },
  isRatedByFarmer:   { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);