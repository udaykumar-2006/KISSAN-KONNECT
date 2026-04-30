const Order   = require('../models/Order');
const mongoose = require('mongoose');
const Crop    = require('../models/Crop');
const Bargain = require('../models/Bargain');
const User    = require('../models/User');
const { createNotification } = require('./notificationController');

// ── Share io with this controller (set from socket.js on startup) ──
let _io = null;
const setIo = (io) => { _io = io; };
const getIo = () => _io;

// Helper: emit order_updated to the bargain room (farmerId_buyerId_cropId)
const _emitOrderUpdate = (order) => {
  if (!_io) return;
  const roomId = order.bargainId.toString();
  _io.to(roomId).emit('order_updated', {
    orderId: order._id,
    status: order.status,
    address: order.address,
    advancePaid: order.advancePaid,
    paymentStatus: order.paymentStatus,
    remainingAmount: order.remainingAmount,
    totalPrice: order.totalPrice
  });
};

// Linear status order — farmer cannot skip steps
const STATUS_ORDER = [
  'PENDING_ADDRESS', 'AWAITING_ADVANCE_PAYMENT', 'CONFIRMED',
  'FARMER_CONFIRMED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED',
];

const getUserOrders = async (req, res) => {
  try {
    let q = {};
    if      (req.user.role === 'buyer')  q.buyerId  = req.user._id;
    else if (req.user.role === 'farmer') q.farmerId = req.user._id;
    else return res.json([]);
    res.json(await Order.find(q).sort({ createdAt: -1 }));
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const uid = req.user._id.toString();
    if (order.buyerId.toString() !== uid && order.farmerId.toString() !== uid)
      return res.status(403).json({ message: 'Not authorized' });
    res.json(order);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const getOrderByBargainId = async (req, res) => {
  try {
    const order = await Order.findOne({ bargainId: req.params.bargainId });
    if (!order) return res.status(404).json({ message: 'No order for this bargain' });
    const uid = req.user._id.toString();
    if (order.buyerId.toString() !== uid && order.farmerId.toString() !== uid)
      return res.status(403).json({ message: 'Not authorized' });
    res.json(order);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

// ─────────────────────────────────────────────────────────
// @desc  Buyer submits delivery address
//        PENDING_ADDRESS → AWAITING_ADVANCE_PAYMENT
// @route PATCH /api/orders/:id/address
// @access Private (Buyer only)
// ─────────────────────────────────────────────────────────
const submitAddress = async (req, res) => {
  try {
    const { street, landmark, city, state, pincode } = req.body;
    if (!street || !city || !state || !pincode)
      return res.status(400).json({ message: 'Street, city, state and pincode are required' });
    if (!/^\d{6}$/.test(pincode))
      return res.status(400).json({ message: 'Pincode must be 6 digits' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.buyerId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the buyer can submit the address' });
    if (order.status !== 'PENDING_ADDRESS')
      return res.status(400).json({ message: `Address already submitted (status: ${order.status})` });

    const fullAddress = [street, landmark, city, state, pincode].filter(Boolean).join(', ');
    order.address = fullAddress;
    order.status  = 'AWAITING_ADVANCE_PAYMENT';
    await order.save();

    // Real-time update to both parties
    _emitOrderUpdate(order);

    await createNotification({
      userId:    order.farmerId,
      title:     'Buyer Submitted Address 📍',
      message:   `${order.buyerName} submitted delivery address for ${order.cropName}. Waiting for advance payment.`,
      type:      'order',
      relatedId: order._id,
    });

    res.json(order);
  } catch (err) {
    console.error('submitAddress:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────
// @desc  Manually create order from accepted bargain (fallback)
// @route POST /api/orders/from-bargain/:bargainId
// @access Private
// ─────────────────────────────────────────────────────────
const createOrderFromBargainRoute = async (req, res) => {
  try {
    const bargain = await Bargain.findById(req.params.bargainId);
    if (!bargain) return res.status(404).json({ message: 'Bargain not found' });
    const uid = req.user._id.toString();
    if (bargain.buyerId.toString() !== uid && bargain.farmerId.toString() !== uid)
      return res.status(403).json({ message: 'Not authorized' });
    if (bargain.status !== 'accepted')
      return res.status(400).json({ message: 'Bargain must be accepted first' });

    const existing = await Order.findOne({ bargainId: bargain._id });
    if (existing) return res.json(existing);

    const [buyer, farmer] = await Promise.all([
      User.findById(bargain.buyerId).select('phone'),
      User.findById(bargain.farmerId).select('phone')
    ]);

    const totalPrice    = bargain.finalPrice * bargain.finalQuantity;
    const advanceAmount = Math.round(totalPrice * 0.15);
    const order = await Order.create({
      bargainId: bargain._id, cropId: bargain.cropId, cropName: bargain.cropName, cropImage: bargain.cropImage,
      buyerId: bargain.buyerId, buyerName: bargain.buyerName, buyerPhone: buyer?.phone || '',
      farmerId: bargain.farmerId, farmerName: bargain.farmerName, farmerPhone: farmer?.phone || '',
      pricePerKg: bargain.finalPrice, quantityKg: bargain.finalQuantity, totalPrice,
      advanceAmount, remainingAmount: totalPrice - advanceAmount,
      advancePaid: false, paymentStatus: 'PENDING', status: 'PENDING_ADDRESS', address: '',
    });
    bargain.orderId = order._id; await bargain.save();
    res.status(201).json(order);
  } catch (err) {
    console.error('createOrderFromBargainRoute:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────
// @desc  Record payment (advance 15% or remaining 85%)
// @route PATCH /api/orders/:id/payment
// @access Private (Buyer only)
// ─────────────────────────────────────────────────────────
const recordPayment = async (req, res) => {
  try {
    const { type } = req.body; // 'advance' | 'remaining'
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.buyerId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the buyer can make payments' });

    if (type === 'advance') {
      if (order.status !== 'AWAITING_ADVANCE_PAYMENT')
        return res.status(400).json({ message: order.status === 'PENDING_ADDRESS' ? 'Please submit your delivery address first' : 'Order is not awaiting advance payment' });
      if (order.advancePaid)
        return res.status(400).json({ message: 'Advance already paid' });

      // Atomic stock deduction using $inc
      const updatedCrop = await Crop.findOneAndUpdate(
        { _id: order.cropId, availableQuantityKg: { $gte: order.quantityKg }, status: 'active' },
        { $inc: { availableQuantityKg: -order.quantityKg } },
        { new: true }
      );

      // If stock reached 0, mark as inactive
      if (updatedCrop && updatedCrop.availableQuantityKg <= 0) {
        updatedCrop.status = 'inactive';
        await updatedCrop.save();
      }
      if (!updatedCrop) {
        const cur = await Crop.findById(order.cropId).select('availableQuantityKg');
        return res.status(400).json({ message: `Insufficient stock. Only ${cur?.availableQuantityKg ?? 0} kg available.` });
      }

      order.advancePaid = true; order.paymentStatus = 'ADVANCE_PAID'; order.status = 'CONFIRMED';
      await order.save();

      // Real-time update to both parties
      _emitOrderUpdate(order);

      await createNotification({ userId: order.farmerId, title: 'Advance Received 💰', message: `${order.buyerName} paid ₹${order.advanceAmount.toLocaleString()} advance for ${order.cropName}.`, type: 'order', relatedId: order._id });
      return res.json(order);
    }

    if (type === 'remaining') {
      if (order.status !== 'OUT_FOR_DELIVERY')
        return res.status(400).json({ message: 'Remaining payment is only available when order is Out for Delivery' });
      if (!order.advancePaid)
        return res.status(400).json({ message: 'Advance not paid yet' });

      order.remainingAmount = 0; order.paymentStatus = 'FULLY_PAID'; order.status = 'DELIVERED';
      order.deliveredAt = new Date();
      await order.save();

      // Real-time update to both parties
      _emitOrderUpdate(order);

      await createNotification({ userId: order.farmerId, title: 'Final Payment Received ✅', message: `${order.buyerName} paid remaining amount for ${order.cropName}.`, type: 'order', relatedId: order._id });
      return res.json(order);
    }

    return res.status(400).json({ message: 'Invalid payment type. Use "advance" or "remaining".' });
  } catch (err) {
    console.error('recordPayment:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────
// @desc  Farmer updates order status (linear progression only)
// @route PATCH /api/orders/:id/status
// @access Private (Farmer only)
// ─────────────────────────────────────────────────────────
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const farmerStatuses = ['FARMER_CONFIRMED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED'];
    if (!status || !farmerStatuses.includes(status))
      return res.status(400).json({ message: `Farmer can set: ${farmerStatuses.join(', ')}` });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.farmerId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the farmer can update order status' });
    if (order.status === 'PENDING_ADDRESS')
      return res.status(400).json({ message: 'Buyer must submit address first' });
    if (order.status === 'AWAITING_ADVANCE_PAYMENT')
      return res.status(400).json({ message: 'Buyer must pay advance first' });

    // Enforce linear progression (no skipping)
    const currentIdx = STATUS_ORDER.indexOf(order.status);
    const targetIdx  = STATUS_ORDER.indexOf(status);
    if (targetIdx !== currentIdx + 1)
      return res.status(400).json({ message: `Cannot move from ${order.status} to ${status}. Next step: ${STATUS_ORDER[currentIdx + 1]}` });

    order.status = status;
    await order.save();

    // Real-time update to both parties
    _emitOrderUpdate(order);

    await createNotification({ userId: order.buyerId, title: 'Order Update 📦', message: `Your order for ${order.cropName} is now: ${status.replace(/_/g, ' ')}`, type: 'order', relatedId: order._id });
    res.json(order);
  } catch (err) {
    console.error('updateOrderStatus:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { setIo, getIo, getUserOrders, getOrderById, getOrderByBargainId, submitAddress, createOrderFromBargainRoute, recordPayment, updateOrderStatus, _emitOrderUpdate };