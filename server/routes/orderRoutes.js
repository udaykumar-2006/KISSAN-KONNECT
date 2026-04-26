const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getUserOrders,
  getOrderById,
  getOrderByBargainId,
  submitAddress,
  createOrderFromBargainRoute,
  recordPayment,
  updateOrderStatus,
} = require('../controllers/orderController');

const router = express.Router();
router.use(protect);

router.get('/',                           getUserOrders);
router.get('/by-bargain/:bargainId',      getOrderByBargainId);
router.post('/from-bargain/:bargainId',   createOrderFromBargainRoute);
router.get('/:id',                        getOrderById);
router.patch('/:id/address', authorize('buyer'),  submitAddress);
router.patch('/:id/status',  authorize('farmer'), updateOrderStatus);
router.patch('/:id/payment', authorize('buyer'),  recordPayment);

module.exports = router;