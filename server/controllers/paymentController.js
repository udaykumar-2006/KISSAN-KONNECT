const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const { getIo } = require('./orderController'); // We can reuse the setIo from orderController or import it if needed

// Initialize Razorpay
// Environment variables should be in .env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
// Helper to get Razorpay instance with latest env vars
const getRazorpay = () => {
  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  
  if (!key_id || !key_secret) {
    console.error('[Payment] CRITICAL: Razorpay keys missing in process.env!');
    console.log('[Payment] Available env keys:', Object.keys(process.env).filter(k => k.includes('RAZORPAY')));
  }

  return new Razorpay({
    key_id: key_id || 'dummy_id',
    key_secret: key_secret || 'dummy_secret'
  });
};

// @desc    Create Razorpay Order
// @route   POST /api/payment/create-order
// @access  Private
const createPaymentOrder = async (req, res) => {
  try {
    const { orderId, paymentType } = req.body;
    console.log(`[Payment] create-order request: orderId=${orderId}, paymentType=${paymentType}`);
    
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!orderId || !['ADVANCE', 'REMAINING'].includes(paymentType)) {
      return res.status(400).json({ message: 'Invalid orderId or paymentType' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      console.error(`[Payment] Order not found: ${orderId}`);
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.buyerId.toString() !== req.user._id.toString()) {
      console.error(`[Payment] Unauthorized: Buyer ${order.buyerId} vs User ${req.user._id}`);
      return res.status(403).json({ message: 'Not authorized for this order' });
    }

    // Determine amount to charge
    let amountToCharge = 0;
    if (paymentType === 'ADVANCE') {
      if (order.advancePaid) return res.status(400).json({ message: 'Advance already paid' });
      amountToCharge = order.advanceAmount;
    } else if (paymentType === 'REMAINING') {
      if (order.remainingPaid) return res.status(400).json({ message: 'Remaining amount already paid' });
      if (!order.advancePaid) return res.status(400).json({ message: 'Advance not paid yet' });
      amountToCharge = order.remainingAmount;
    }

    console.log(`[Payment] Amount to charge: ${amountToCharge}`);

    // Razorpay requires amount in paise (multiply by 100)
    const options = {
      amount: Math.round(amountToCharge * 100),
      currency: "INR",
      receipt: `order_${order._id.toString().slice(-20)}`,
    };

    console.log(`[Payment] Razorpay options:`, options);

    const razorpay = getRazorpay();
    const razorpayOrder = await razorpay.orders.create(options);
    
    if (!razorpayOrder) {
      console.error(`[Payment] Razorpay order creation returned null`);
      return res.status(500).json({ message: 'Failed to create Razorpay order' });
    }

    console.log(`[Payment] Razorpay order created: ${razorpayOrder.id}`);

    // Save razorpay order ID to our DB
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.status(200).json({
      success: true,
      order: razorpayOrder,
      orderId: order._id,
      amount: amountToCharge,
    });
  } catch (error) {
    console.error('[Payment] Full error object:', error);
    const errorMsg = error.message || (typeof error === 'string' ? error : JSON.stringify(error));
    res.status(500).json({ message: `Server error creating payment order: ${errorMsg}` });
  }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/payment/verify
// @access  Private
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, paymentType } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId || !paymentType) {
      return res.status(400).json({ message: 'Missing payment verification details' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET?.trim())
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Update Order based on payment type
    order.razorpayPaymentId = razorpay_payment_id;

    if (paymentType === 'ADVANCE') {
      order.advancePaid = true;
      order.status = 'CONFIRMED';
      order.paymentStatus = 'PARTIAL';
    } else if (paymentType === 'REMAINING') {
      order.remainingPaid = true;
      order.status = 'DELIVERED';
      order.paymentStatus = 'FULL';
    }

    await order.save();

    // Emit socket event
    const orderCtrl = require('./orderController');
    if (orderCtrl && orderCtrl._emitOrderUpdate) {
      orderCtrl._emitOrderUpdate(order);
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      order
    });
  } catch (error) {
    console.error('Error verifying payment:', error.message);
    res.status(500).json({ message: `Server error verifying payment: ${error.message}` });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment
};
