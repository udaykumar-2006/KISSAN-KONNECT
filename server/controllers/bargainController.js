const Bargain = require('../models/Bargain');
const Order   = require('../models/Order');
const Crop    = require('../models/Crop');
const User    = require('../models/User');
const { createNotification } = require('./notificationController');

let _io = null;
const setIo = (io) => { _io = io; };
const getIo = () => _io;

const initOrGetChat = async (req, res) => {
  try {
    const { cropId } = req.body;
    if (!cropId) return res.status(400).json({ message: 'cropId is required' });
    const crop = await Crop.findById(cropId);
    if (!crop || crop.status !== 'active') return res.status(400).json({ message: 'Crop not available' });
    if (crop.farmerId.toString() === req.user._id.toString())
      return res.status(400).json({ message: 'Cannot bargain on your own crop' });
    if (crop.availableQuantityKg === 0) return res.status(400).json({ message: 'Crop is sold out' });

    // Reuse ACTIVE chat only; closed chats → create new
    let bargain = await Bargain.findOne({ cropId: crop._id, buyerId: req.user._id, farmerId: crop.farmerId, status: 'active' });
    if (bargain) {
      bargain.availableQuantityKg = crop.availableQuantityKg;
      await bargain.save();
    } else {
      bargain = await Bargain.create({
        cropId: crop._id, cropName: crop.name, cropImage: crop.image,
        buyerId: req.user._id, buyerName: req.user.name,
        farmerId: crop.farmerId, farmerName: crop.farmerName,
        basePrice: crop.pricePerKg, minQuantity: crop.minQuantityKg,
        availableQuantityKg: crop.availableQuantityKg,
        status: 'active', lastSenderRole: null, messages: [],
      });
      await createNotification({ userId: crop.farmerId, title: 'New Bargain Request 💬', message: `${req.user.name} wants to bargain on ${crop.name}`, type: 'bargain', relatedId: bargain._id });
      if (_io) _io.to(bargain._id.toString()).emit('bargain_initiated', { bargainId: bargain._id, cropName: crop.name, buyerName: req.user.name });
    }
    res.status(200).json(bargain);
  } catch (err) {
    console.error('initOrGetChat:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserBargains = async (req, res) => {
  try {
    let query = req.user.role === 'buyer' ? { buyerId: req.user._id } : req.user.role === 'farmer' ? { farmerId: req.user._id } : null;
    if (!query) return res.json([]);
    res.json(await Bargain.find(query).sort({ updatedAt: -1 }));
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const getBargainById = async (req, res) => {
  try {
    const bargain = await Bargain.findById(req.params.id);
    if (!bargain) return res.status(404).json({ message: 'Bargain not found' });
    const uid = req.user._id.toString();
    if (bargain.buyerId.toString() !== uid && bargain.farmerId.toString() !== uid)
      return res.status(403).json({ message: 'Not authorized' });
    res.json(bargain);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
};

const processNewMessage = async ({ bargainId, type, pricePerKg, quantityKg, message, userId, userName }) => {
  const bargain = await Bargain.findById(bargainId);
  if (!bargain) throw new Error('Bargain not found');
  const isBuyer  = bargain.buyerId.toString()  === userId.toString();
  const isFarmer = bargain.farmerId.toString() === userId.toString();
  if (!isBuyer && !isFarmer) throw new Error('Not authorized');
  if (bargain.status !== 'active') throw new Error(`Bargain is already ${bargain.status}`);

  const senderRole = isBuyer ? 'buyer' : 'farmer';

  // Role-action rules
  if (isBuyer  && type === 'reject') throw new Error('Buyers cannot reject. Send a counter-offer instead.');
  if (isBuyer  && !['offer', 'counter', 'accept'].includes(type)) throw new Error('Buyers can only send offers, counters, or accept');
  if (isFarmer && !['counter', 'accept', 'reject'].includes(type)) throw new Error('Invalid action for farmer');

  // Turn enforcement
  const last = bargain.lastSenderRole;
  if (last === null && !isBuyer)   throw new Error('Buyer must send the first offer');
  if (last === 'buyer'  && isBuyer)  throw new Error('Waiting for farmer\'s response');
  if (last === 'farmer' && isFarmer) throw new Error('Waiting for buyer\'s response');

  let msgPrice = Number(pricePerKg) || 0;
  let msgQty   = Number(quantityKg)  || 0;
  if (!msgPrice || !msgQty) {
    const lm = bargain.messages[bargain.messages.length - 1];
    msgPrice = msgPrice || (lm?.pricePerKg ?? 0);
    msgQty   = msgQty   || (lm?.quantityKg  ?? 0);
  }

  if (type !== 'reject') {
    const crop = await Crop.findById(bargain.cropId).select('availableQuantityKg minQuantityKg status');
    if (!crop || crop.status !== 'active') throw new Error('Crop no longer available');
    if (msgQty > crop.availableQuantityKg)  throw new Error(`Only ${crop.availableQuantityKg} kg available`);
    if (msgQty < crop.minQuantityKg)        throw new Error(`Minimum quantity is ${crop.minQuantityKg} kg`);
    if (msgPrice <= 0)                      throw new Error('Price must be > 0');
    bargain.availableQuantityKg = crop.availableQuantityKg;
  }

  const newMsg = { senderId: userId, senderRole, type, pricePerKg: msgPrice, quantityKg: msgQty, totalPrice: msgPrice * msgQty, message: message || '', timestamp: new Date() };
  bargain.lastSenderRole = senderRole;

  if (type === 'accept') {
    bargain.status = 'accepted'; bargain.finalPrice = msgPrice; bargain.finalQuantity = msgQty;
    bargain.messages.push(newMsg); await bargain.save();
    const order = await _createOrderFromBargain(bargain);
    const other = isBuyer ? bargain.farmerId : bargain.buyerId;
    await createNotification({ userId: other, title: 'Bargain Accepted! 🎉', message: `${userName} accepted the deal for ${bargain.cropName}.`, type: 'bargain', relatedId: bargain._id });
    await createNotification({ userId, title: isBuyer ? 'Submit Your Address' : 'Deal Accepted 🎉', message: isBuyer ? `Submit your delivery address for ${bargain.cropName}.` : `Waiting for buyer's address.`, type: 'order', relatedId: order?._id });
    return { bargain, order };
  }

  if (type === 'reject') {
    bargain.status = 'rejected'; bargain.messages.push(newMsg); await bargain.save();
    await createNotification({ userId: bargain.buyerId, title: 'Bargain Rejected', message: `Farmer rejected your offer on ${bargain.cropName}. You may start a new bargain.`, type: 'bargain', relatedId: bargain._id });
    return { bargain, order: null };
  }

  bargain.messages.push(newMsg); await bargain.save();
  const other2 = isBuyer ? bargain.farmerId : bargain.buyerId;
  await createNotification({ userId: other2, title: 'Bargain Update 💬', message: `${userName} ${type === 'offer' ? 'made an offer' : 'sent a counter'} on ${bargain.cropName}`, type: 'bargain', relatedId: bargain._id });
  return { bargain, order: null };
};

const _createOrderFromBargain = async (bargain) => {
  try {
    const existing = await Order.findOne({ bargainId: bargain._id });
    if (existing) return existing;

    const [buyer, farmer] = await Promise.all([
      User.findById(bargain.buyerId).select('phone'),
      User.findById(bargain.farmerId).select('phone')
    ]);

    const totalPrice = bargain.finalPrice * bargain.finalQuantity;
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
    if (_io) _io.to(bargain._id.toString()).emit('order_created', { 
      orderId: order._id, 
      totalPrice, 
      advanceAmount, 
      remainingAmount: totalPrice - advanceAmount, 
      status: 'PENDING_ADDRESS',
      buyerPhone: buyer?.phone || '',
      farmerPhone: farmer?.phone || '',
      buyerName: bargain.buyerName,
      farmerName: bargain.farmerName
    });
    return order;
  } catch (err) { console.error('_createOrderFromBargain:', err.message); return null; }
};

const addMessage = async (req, res) => {
  try {
    const result = await processNewMessage({ bargainId: req.params.id, ...req.body, userId: req.user._id, userName: req.user.name });
    const { bargain } = result;
    const latestMsg = bargain.messages[bargain.messages.length - 1];
    if (_io) {
      const roomId = bargain._id.toString();
      _io.to(roomId).emit('receive_message', { bargainId: bargain._id, message: latestMsg, status: bargain.status, lastSenderRole: bargain.lastSenderRole, availableQuantityKg: bargain.availableQuantityKg, orderId: result.order?._id });
      if (bargain.status === 'accepted') _io.to(roomId).emit('bargain_accepted', { bargainId: bargain._id, finalPrice: bargain.finalPrice, finalQuantity: bargain.finalQuantity, orderId: result.order?._id, advanceAmount: result.order?.advanceAmount, totalPrice: result.order?.totalPrice });
      if (bargain.status === 'rejected') _io.to(roomId).emit('bargain_rejected', { bargainId: bargain._id });
    }
    res.json({ bargain, order: result.order });
  } catch (err) {
    const code = err.message.includes('not found') ? 404 : err.message.includes('authorized') ? 403 : 400;
    res.status(code).json({ message: err.message });
  }
};

module.exports = { setIo, getIo, initOrGetChat, getUserBargains, getBargainById, addMessage, processNewMessage, _createOrderFromBargain };